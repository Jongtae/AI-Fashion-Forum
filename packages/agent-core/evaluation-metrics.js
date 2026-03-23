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
