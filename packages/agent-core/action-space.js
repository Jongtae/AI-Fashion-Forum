import {
  LIGHT_REACTION_TYPES,
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
  createActionRecord,
  createLightReactionPayload,
} from "@ai-fashion-forum/shared-types";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function getReactionType(agentState, contentRecord) {
  if (contentRecord.emotions.includes("empathy")) {
    return "support";
  }

  if (contentRecord.emotions.includes("curiosity") || contentRecord.emotions.includes("uncertainty")) {
    return "curious";
  }

  if (contentRecord.emotions.includes("amusement")) {
    return "laugh";
  }

  return LIGHT_REACTION_TYPES[agentState.agent_id.charCodeAt(2) % LIGHT_REACTION_TYPES.length];
}

export function chooseForumAction({
  agentState,
  contentRecord,
  tick = 0,
} = {}) {
  const topicAffinity =
    contentRecord.topics.reduce(
      (sum, topic) => sum + (agentState.interest_vector[topic] || 0),
      0,
    ) / Math.max(contentRecord.topics.length, 1);

  if (agentState.activity_level < 0.4 && topicAffinity < 0.2) {
    return createActionRecord({
      action_id: `ACT:${agentState.agent_id}:${tick}:silence`,
      tick,
      agent_id: agentState.agent_id,
      type: "silence",
      visibility: "stored_only",
      payload: {
        reason: "low_activity_low_affinity",
      },
      ui: {
        label: "Stayed silent",
        icon: "moon",
      },
    });
  }

  if (topicAffinity < 0.28) {
    return createActionRecord({
      action_id: `ACT:${agentState.agent_id}:${tick}:lurk`,
      tick,
      agent_id: agentState.agent_id,
      type: "lurk",
      target_content_id: contentRecord.content_id,
      visibility: "stored_only",
      payload: {
        dwell_score: clamp(agentState.openness * 0.5 + 0.25),
        reason: "observed_without_visible_feedback",
      },
      ui: {
        label: "Lurked on thread",
        secondaryText: contentRecord.title,
      },
    });
  }

  if (topicAffinity < 0.58) {
    const reactionPayload = createLightReactionPayload({
      reaction_type: getReactionType(agentState, contentRecord),
      target_content_id: contentRecord.content_id,
      intensity: clamp(topicAffinity * 0.6 + 0.3),
      reason: "lightweight_feedback_without_full_generation",
    });

    return createActionRecord({
      action_id: `ACT:${agentState.agent_id}:${tick}:react`,
      tick,
      agent_id: agentState.agent_id,
      type: "react",
      target_content_id: contentRecord.content_id,
      visibility: "public_lightweight",
      payload: reactionPayload,
      ui: {
        label: `Reacted with ${reactionPayload.reaction_type}`,
        icon: reactionPayload.reaction_type,
        secondaryText: contentRecord.title,
      },
    });
  }

  return createActionRecord({
    action_id: `ACT:${agentState.agent_id}:${tick}:comment`,
    tick,
    agent_id: agentState.agent_id,
    type: "comment",
    target_content_id: contentRecord.content_id,
    visibility: "public_visible",
    payload: {
      draft_mode: "deferred_generation",
      reason: "high_affinity_requires_visible_followup",
    },
    ui: {
      label: "Queued comment",
      secondaryText: contentRecord.title,
    },
  });
}

export function createActionSample({
  tick = 12,
} = {}) {
  const pairings = [
    [SAMPLE_AGENT_STATES[0], SAMPLE_CONTENT_RECORDS[19]],
    [SAMPLE_AGENT_STATES[1], SAMPLE_CONTENT_RECORDS[0]],
    [SAMPLE_AGENT_STATES[2], SAMPLE_CONTENT_RECORDS[7]],
    [SAMPLE_AGENT_STATES[3], SAMPLE_CONTENT_RECORDS[13]],
  ];

  const records = pairings.map(([agentState, contentRecord], index) =>
    chooseForumAction({
      agentState,
      contentRecord,
      tick: tick + index,
    }),
  );

  return {
    actionTypes: records.map((record) => record.type),
    records,
  };
}
