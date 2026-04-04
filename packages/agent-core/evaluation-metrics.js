import { SAMPLE_AGENT_STATES } from "@ai-fashion-forum/shared-types";

import { createIdentityScenarioSuite } from "./identity-update-rules.js";
import { createBaselineWorldRules, runTicks } from "./tick-engine.js";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

export const CORE_METRIC_FORMULAS = Object.freeze({
  identityDifferentiation:
    "Average pairwise distance across agent belief vectors and interest vectors for the current tick.",
  visibleParticipationRate:
    "Visible actions (comment + post + react) divided by total tick actions in the replay window.",
  consistencyScore:
    "Weighted agreement between an agent's latest actions, self-narrative, and prior belief anchors.",
  conflictHeat:
    "Share of tick actions or exposures that contain frustration, rivalry, or backlash-coded signals.",
  contentDiversity:
    "Distinct meaning frames across generated posts divided by total posts. 1.0 = every post has a unique frame.",
  echoChamberIndex:
    "Proportion of agents whose top two exposure reactions share the same meaning frame (reinforce ratio). 0 = no echo, 1 = full echo.",
  moderationFlagRate:
    "Proportion of generated posts with skeptical or sharp stance signal, used as a moderation flag proxy.",
  divergenceLegible:
    "Boolean. True when at least two distinct meaning frames appear across generated posts.",
});

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeVectorDistance(left, right) {
  const keys = [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])];
  if (keys.length === 0) {
    return 0;
  }

  return average(keys.map((key) => Math.abs((left[key] || 0) - (right[key] || 0))));
}

export function computeAgentPairwiseDistanceMetrics(agents = []) {
  const pairwiseDistances = [];
  let nearestPair = null;
  let farthestPair = null;

  agents.forEach((agent, agentIndex) => {
    agents.slice(agentIndex + 1).forEach((otherAgent) => {
      const distance = average([
        computeVectorDistance(agent.belief_vector, otherAgent.belief_vector),
        computeVectorDistance(agent.interest_vector, otherAgent.interest_vector),
      ]);

      const pair = {
        left_agent_id: agent.agent_id,
        right_agent_id: otherAgent.agent_id,
        distance: clamp(distance),
      };

      pairwiseDistances.push(pair.distance);

      if (!nearestPair || pair.distance < nearestPair.distance) {
        nearestPair = pair;
      }

      if (!farthestPair || pair.distance > farthestPair.distance) {
        farthestPair = pair;
      }
    });
  });

  return {
    pair_count: pairwiseDistances.length,
    average_distance: clamp(average(pairwiseDistances)),
    min_distance: nearestPair?.distance ?? 0,
    max_distance: farthestPair?.distance ?? 0,
    nearest_pair: nearestPair,
    farthest_pair: farthestPair,
  };
}

export function classifyDifferentiationTrend(timeline = [], thresholds = {}) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return {
      verdict: "insufficient_data",
      reason: "No timeline data available.",
      thresholds: {
        convergenceDropRatio: thresholds.convergenceDropRatio ?? 0.08,
        divergenceRiseRatio: thresholds.divergenceRiseRatio ?? 0.08,
        stableBand: thresholds.stableBand ?? 0.03,
      },
    };
  }

  const convergenceDropRatio = thresholds.convergenceDropRatio ?? 0.08;
  const divergenceRiseRatio = thresholds.divergenceRiseRatio ?? 0.08;
  const stableBand = thresholds.stableBand ?? 0.03;
  const frozenBand = thresholds.frozenBand ?? 0.0005;
  const first = timeline[0]?.average_distance ?? 0;
  const last = timeline[timeline.length - 1]?.average_distance ?? 0;
  const delta = clamp(Math.abs(last - first));
  const ratio = first > 0 ? (last - first) / first : 0;
  const averages = timeline.map((entry) => entry?.average_distance ?? 0);
  const span = averages.length > 0 ? Math.max(...averages) - Math.min(...averages) : 0;

  if (first === 0 && last > stableBand) {
    return {
      verdict: "diverging",
      reason: "Initial distance was near zero and later rounds became measurably differentiated.",
      thresholds: {
        convergenceDropRatio,
        divergenceRiseRatio,
        stableBand,
        frozenBand,
      },
    };
  }

  if (timeline.length > 1 && span <= frozenBand) {
    return {
      verdict: "frozen",
      reason: `Average pairwise distance moved by less than ${frozenBand.toFixed(4)} across rounds.`,
      thresholds: {
        convergenceDropRatio,
        divergenceRiseRatio,
        stableBand,
        frozenBand,
      },
    };
  }

  if (ratio <= -convergenceDropRatio) {
    return {
      verdict: "converging",
      reason: `Average pairwise distance dropped by ${(Math.abs(ratio) * 100).toFixed(1)}% across rounds.`,
      thresholds: {
        convergenceDropRatio,
        divergenceRiseRatio,
        stableBand,
        frozenBand,
      },
    };
  }

  if (ratio >= divergenceRiseRatio) {
    return {
      verdict: "diverging",
      reason: `Average pairwise distance increased by ${(ratio * 100).toFixed(1)}% across rounds.`,
      thresholds: {
        convergenceDropRatio,
        divergenceRiseRatio,
        stableBand,
        frozenBand,
      },
    };
  }

  if (delta <= stableBand) {
    return {
      verdict: "stable",
      reason: `Average pairwise distance stayed within a ${stableBand.toFixed(2)} band across rounds.`,
      thresholds: {
        convergenceDropRatio,
        divergenceRiseRatio,
        stableBand,
        frozenBand,
      },
    };
  }

  return {
    verdict: "stable",
    reason: "Agents changed over time but did not collapse or separate sharply enough to classify as convergence or divergence.",
    thresholds: {
      convergenceDropRatio,
      divergenceRiseRatio,
      stableBand,
      frozenBand,
    },
  };
}

export function createDifferentiationTimeline(runResults = []) {
  return runResults.map((result, index) => {
    const snapshot = result?.finalState || result?.snapshot || {};
    const agents = Array.isArray(snapshot?.agents) ? snapshot.agents : [];
    const pairwise = computeAgentPairwiseDistanceMetrics(agents);

    return {
      round: index + 1,
      seed: result?.seed ?? null,
      tick_count: result?.tickCount ?? result?.tick_count ?? 0,
      final_tick: result?.finalTick ?? result?.final_tick ?? 0,
      agent_count: agents.length,
      ...pairwise,
    };
  });
}

export function computeAgentConsistencyScore(agentState, replayEntries = []) {
  const beliefAnchors = Object.keys(agentState.belief_vector || {});
  const narrative = (agentState.self_narrative || []).join(" ").toLowerCase();
  const latestEntries = replayEntries.filter((entry) => entry.actor_id === agentState.agent_id).slice(-4);
  const actionStability =
    latestEntries.length <= 1
      ? 1
      : average(
          latestEntries.slice(1).map((entry, index) =>
            entry.action === latestEntries[index].action ? 1 : 0.55,
          ),
        );
  const narrativeAlignment = average(
    beliefAnchors.map((belief) => (narrative.includes(belief.split("-")[0]) ? 1 : 0.62)),
  );
  const relationshipStability = clamp(
    0.55 +
      Math.min((agentState.relationship_summary?.trust_circle_size || 0) / 12, 0.25) -
      Math.min((agentState.relationship_summary?.rivalry_edges || 0) / 15, 0.2),
  );

  return clamp(actionStability * 0.34 + narrativeAlignment * 0.38 + relationshipStability * 0.28);
}

export function computeTickLevelMetrics(runResult) {
  return runResult.snapshots.map((snapshot, index) => {
    const entriesThroughTick = runResult.entries.slice(0, index);
    const visibleActions = entriesThroughTick.filter((entry) =>
      ["comment", "post", "react"].includes(entry.action),
    ).length;
    const pairwiseDistances = [];

    snapshot.agents.forEach((agent, agentIndex) => {
      snapshot.agents.slice(agentIndex + 1).forEach((otherAgent) => {
        pairwiseDistances.push(
          average([
            computeVectorDistance(agent.belief_vector, otherAgent.belief_vector),
            computeVectorDistance(agent.interest_vector, otherAgent.interest_vector),
          ]),
        );
      });
    });

    const conflictHeat = average(
      entriesThroughTick.map((entry) =>
        entry.reason.includes("threshold") || entry.reason.includes("aligned") ? 0.42 : 0.18,
      ),
    );

    return {
      tick: index,
      identityDifferentiation: clamp(average(pairwiseDistances)),
      visibleParticipationRate:
        entriesThroughTick.length === 0 ? 0 : clamp(visibleActions / entriesThroughTick.length),
      conflictHeat: clamp(conflictHeat),
      averageConsistency: clamp(
        average(snapshot.agents.map((agent) => computeAgentConsistencyScore(agent, entriesThroughTick))),
      ),
    };
  });
}

// ── Sprint 1 / run-level metrics ──────────────────────────────────────────────

export function computeContentDiversity(generatedPosts) {
  if (!generatedPosts || generatedPosts.length === 0) {
    return 0;
  }

  const distinctFrames = new Set(generatedPosts.map((p) => p.meaning_frame).filter(Boolean)).size;
  return clamp(distinctFrames / generatedPosts.length);
}

export function computeEchoChamberIndex(exposureByAgent) {
  // exposureByAgent: { agent_id: { reaction_records: [...] } }
  const entries = Object.values(exposureByAgent || {});

  if (entries.length === 0) {
    return 0;
  }

  const reinforced = entries.filter((agentExposure) => {
    const reactions = agentExposure?.reaction_records ?? [];
    if (reactions.length < 2) {
      return false;
    }

    return reactions[0].meaning_frame === reactions[1].meaning_frame;
  }).length;

  return clamp(reinforced / entries.length);
}

export function computeModerationFlagRate(generatedPosts) {
  if (!generatedPosts || generatedPosts.length === 0) {
    return 0;
  }

  const flagged = generatedPosts.filter((p) =>
    p.stance_signal === "skeptical" || p.stance_signal === "sharp",
  ).length;

  return clamp(flagged / generatedPosts.length);
}

// ── Run-level report ──────────────────────────────────────────────────────────

export function createRunReport({
  runId,
  seed,
  ticks,
  createdAt,
  generatedPosts = [],
  exposureByAgent = {},
  tickMetrics = [],
  agentConsistency = [],
  sprint1Verdicts = {},
} = {}) {
  const lastTickMetric = tickMetrics[tickMetrics.length - 1] ?? {};
  const contentDiversity = computeContentDiversity(generatedPosts);
  const echoChamberIndex = computeEchoChamberIndex(exposureByAgent);
  const moderationFlagRate = computeModerationFlagRate(generatedPosts);
  const avgConsistency = agentConsistency.length > 0
    ? clamp(average(agentConsistency.map((a) => a.consistency_score ?? 0)))
    : 0;

  return {
    run_id: runId,
    seed,
    ticks,
    created_at: createdAt ?? new Date().toISOString(),
    metric_formulas: CORE_METRIC_FORMULAS,
    metrics: {
      identityDifferentiation: lastTickMetric.identityDifferentiation ?? 0,
      visibleParticipationRate: lastTickMetric.visibleParticipationRate ?? 0,
      consistencyScore: avgConsistency,
      conflictHeat: lastTickMetric.conflictHeat ?? 0,
      contentDiversity,
      echoChamberIndex,
      moderationFlagRate,
      divergenceLegible: sprint1Verdicts.divergence_legible ?? false,
    },
    sprint1_verdicts: sprint1Verdicts,
    agent_consistency: agentConsistency,
    tick_timeline: tickMetrics,
    post_summary: {
      total: generatedPosts.length,
      meaning_frame_distribution: Object.fromEntries(
        [...new Set(generatedPosts.map((p) => p.meaning_frame).filter(Boolean))].map((f) => [
          f,
          generatedPosts.filter((p) => p.meaning_frame === f).length,
        ]),
      ),
      stance_distribution: Object.fromEntries(
        [...new Set(generatedPosts.map((p) => p.stance_signal).filter(Boolean))].map((s) => [
          s,
          generatedPosts.filter((p) => p.stance_signal === s).length,
        ]),
      ),
    },
  };
}

export function createScenarioExpectations() {
  const identitySuite = createIdentityScenarioSuite();

  return [
    {
      name: "pricing-radicalization",
      expectedOutcome: "Contrarian pricing belief becomes more extreme and conflict heat rises.",
      source: identitySuite.scenarios.find((scenario) => scenario.name === "radicalization"),
    },
    {
      name: "gentle-feedback-softening",
      expectedOutcome: "Empathetic responder softens certainty but does not fully abandon core belief.",
      source: identitySuite.scenarios.find((scenario) => scenario.name === "softening"),
    },
    {
      name: "weekday-practicality-stability",
      expectedOutcome: "Practical weekday agent keeps high consistency while visible participation remains steady.",
      source: {
        agent_id: "A02",
        expectation: "Consistency score should remain high relative to more novelty-driven agents.",
      },
    },
  ];
}

export function createEvaluationSample({
  seed = 42,
  tickCount = 8,
} = {}) {
  const runResult = runTicks({
    seed,
    tickCount,
    worldRules: createBaselineWorldRules(),
  });

  return {
    formulas: CORE_METRIC_FORMULAS,
    scenarios: createScenarioExpectations(),
    agentConsistency: SAMPLE_AGENT_STATES.map((agent) => ({
      agent_id: agent.agent_id,
      handle: agent.handle,
      score: computeAgentConsistencyScore(agent, runResult.entries),
    })),
    tickMetrics: computeTickLevelMetrics(runResult),
  };
}
