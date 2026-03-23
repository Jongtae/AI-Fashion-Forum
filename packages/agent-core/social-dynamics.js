import { SAMPLE_AGENT_STATES } from "@ai-fashion-forum/shared-types";

import { createEvaluationSample } from "./evaluation-metrics.js";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toCsv(rows) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => row[header]).join(","))].join("\n");
}

export function computeSocialDynamicsMetrics(evaluationSample) {
  const consistencySpread =
    Math.max(...evaluationSample.agentConsistency.map((entry) => entry.score)) -
    Math.min(...evaluationSample.agentConsistency.map((entry) => entry.score));
  const clusterSignals = SAMPLE_AGENT_STATES.map((agent) =>
    average(Object.values(agent.interest_vector || {})),
  );
  const clusterMetric = clamp(average(clusterSignals));
  const polarizationMetric = clamp(consistencySpread);
  const totalTrust = SAMPLE_AGENT_STATES.reduce(
    (sum, agent) => sum + (agent.relationship_summary?.trust_circle_size || 0),
    0,
  );
  const influenceConcentration = clamp(
    Math.max(
      ...SAMPLE_AGENT_STATES.map(
        (agent) => (agent.relationship_summary?.trust_circle_size || 0) / Math.max(totalTrust, 1),
      ),
    ),
  );

  return {
    clusterCohesion: clusterMetric,
    polarization: polarizationMetric,
    influenceConcentration,
  };
}

function buildBatchRow(seed, policyFlag, evaluationSample) {
  const social = computeSocialDynamicsMetrics(evaluationSample);
  const finalTickMetric = evaluationSample.tickMetrics[evaluationSample.tickMetrics.length - 1];

  return {
    seed,
    policy_flag: policyFlag,
    cluster_cohesion: social.clusterCohesion,
    polarization: social.polarization,
    influence_concentration: social.influenceConcentration,
    visible_participation: finalTickMetric.visibleParticipationRate,
    average_consistency: finalTickMetric.averageConsistency,
  };
}

export function runBatchExperiments({
  seeds = Array.from({ length: 10 }, (_, index) => 42 + index),
  policyFlags = ["baseline"],
  tickCount = 8,
} = {}) {
  const rows = seeds.flatMap((seed) =>
    policyFlags.map((policyFlag) => {
      const evaluationSample = createEvaluationSample({
        seed,
        tickCount,
      });

      return buildBatchRow(seed, policyFlag, evaluationSample);
    }),
  );

  return {
    runs: rows,
    csv: toCsv(rows),
    report: createBatchReport(rows),
  };
}

export function createBatchReport(rows) {
  const bestConsistency = [...rows].sort((left, right) => right.average_consistency - left.average_consistency)[0];
  const highestPolarization = [...rows].sort((left, right) => right.polarization - left.polarization)[0];

  return {
    summary: [
      `Batch executed ${rows.length} runs across seed and policy combinations.`,
      `Highest consistency run: seed ${bestConsistency.seed} / ${bestConsistency.policy_flag} (${bestConsistency.average_consistency}).`,
      `Highest polarization run: seed ${highestPolarization.seed} / ${highestPolarization.policy_flag} (${highestPolarization.polarization}).`,
    ],
    recommendations: [
      "Use higher-consistency seeds as baseline demos when identity continuity is the priority.",
      "Watch high-polarization seeds when testing moderation or intervention ideas.",
      "Compare influence concentration alongside consistency to detect over-centralized dynamics.",
    ],
  };
}

export function createBatchExperimentSample() {
  return runBatchExperiments({
    seeds: Array.from({ length: 12 }, (_, index) => 42 + index),
    policyFlags: ["baseline", "dampen_aggression"],
    tickCount: 10,
  });
}
