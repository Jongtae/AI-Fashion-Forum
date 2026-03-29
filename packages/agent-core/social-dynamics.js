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
      `배치 실행 ${rows.length}회가 seed와 정책 조합 전반에서 수행되었다.`,
      `가장 일관성이 높았던 실행: seed ${bestConsistency.seed} / ${bestConsistency.policy_flag} (${bestConsistency.average_consistency}).`,
      `가장 양극화가 높았던 실행: seed ${highestPolarization.seed} / ${highestPolarization.policy_flag} (${highestPolarization.polarization}).`,
    ],
    recommendations: [
      "정체성의 연속성이 중요할 때는 일관성이 높은 seed를 기본 시연값으로 사용한다.",
      "모더레이션이나 개입 아이디어를 시험할 때는 양극화가 높은 seed를 주의 깊게 본다.",
      "지나치게 중앙화된 흐름을 찾으려면 일관성과 함께 영향 집중도를 같이 비교한다.",
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
