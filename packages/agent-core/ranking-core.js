import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
} from "@ai-fashion-forum/shared-types";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

export const RANKING_EXPERIMENT_FLAGS = Object.freeze({
  baseline: "baseline",
  noveltyBoost: "novelty_boost",
  trustBoost: "trust_boost",
  controversyDampen: "controversy_dampen",
});

function getAgent(agentId) {
  return (
    SAMPLE_AGENT_STATES.find((agent) => agent.agent_id === agentId) ||
    SAMPLE_AGENT_STATES[0]
  );
}

function computeSignals(agentState, contentRecord) {
  const interestMatch =
    contentRecord.topics.reduce(
      (sum, topic) => sum + (agentState.interest_vector[topic] || 0),
      0,
    ) / Math.max(contentRecord.topics.length, 1);

  const trustSignal = clamp((agentState.relationship_summary.trust_circle_size || 0) / 10);
  const noveltySignal = clamp(
    0.4 +
      (contentRecord.emotions.includes("curiosity") || contentRecord.emotions.includes("uncertainty")
        ? 0.22
        : 0) +
      agentState.openness * 0.2,
  );
  const controversySignal = clamp(
    contentRecord.emotions.includes("frustration") || contentRecord.emotions.includes("anxiety")
      ? 0.72
      : 0.18,
  );
  const recencySignal = clamp(1 - contentRecord.created_tick / 20);

  return {
    interestMatch,
    trustSignal,
    noveltySignal,
    controversySignal,
    recencySignal,
  };
}

function getWeights(flag) {
  const weights = {
    [RANKING_EXPERIMENT_FLAGS.baseline]: {
      interest: 0.34,
      trust: 0.2,
      novelty: 0.2,
      controversy: 0.14,
      recency: 0.12,
    },
    [RANKING_EXPERIMENT_FLAGS.noveltyBoost]: {
      interest: 0.28,
      trust: 0.16,
      novelty: 0.34,
      controversy: 0.1,
      recency: 0.12,
    },
    [RANKING_EXPERIMENT_FLAGS.trustBoost]: {
      interest: 0.28,
      trust: 0.34,
      novelty: 0.16,
      controversy: 0.1,
      recency: 0.12,
    },
    [RANKING_EXPERIMENT_FLAGS.controversyDampen]: {
      interest: 0.34,
      trust: 0.22,
      novelty: 0.2,
      controversy: 0.04,
      recency: 0.2,
    },
  };

  return weights[flag] || weights[RANKING_EXPERIMENT_FLAGS.baseline];
}

export function rankFeed({
  agentId = "A01",
  experimentFlag = RANKING_EXPERIMENT_FLAGS.baseline,
  contents = SAMPLE_CONTENT_RECORDS,
} = {}) {
  const agentState = getAgent(agentId);
  const weights = getWeights(experimentFlag);

  const ranked = contents.map((contentRecord) => {
    const signals = computeSignals(agentState, contentRecord);
    const score =
      signals.interestMatch * weights.interest +
      signals.trustSignal * weights.trust +
      signals.noveltySignal * weights.novelty +
      (1 - signals.controversySignal) * weights.controversy +
      signals.recencySignal * weights.recency;

    return {
      content_id: contentRecord.content_id,
      title: contentRecord.title,
      format: contentRecord.format,
      score: clamp(score),
      score_breakdown: signals,
      reason: `Ranked for ${agentState.handle} with ${experimentFlag}: interest=${signals.interestMatch.toFixed(3)}, trust=${signals.trustSignal.toFixed(3)}, novelty=${signals.noveltySignal.toFixed(3)}, controversy=${signals.controversySignal.toFixed(3)}, recency=${signals.recencySignal.toFixed(3)}.`,
    };
  });

  return ranked.sort((left, right) => right.score - left.score);
}

export function createRankingSample() {
  const baseline = rankFeed({
    agentId: "A01",
    experimentFlag: RANKING_EXPERIMENT_FLAGS.baseline,
  }).slice(0, 5);

  const noveltyBoost = rankFeed({
    agentId: "A01",
    experimentFlag: RANKING_EXPERIMENT_FLAGS.noveltyBoost,
  }).slice(0, 5);

  return {
    experimentFlags: Object.values(RANKING_EXPERIMENT_FLAGS),
    baselineTop: baseline,
    noveltyBoostTop: noveltyBoost,
  };
}
