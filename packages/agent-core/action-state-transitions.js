/**
 * action-state-transitions.js
 *
 * Defines state transitions for post/comment/react actions.
 * Each action type produces a deterministic delta to:
 * - characteristic (engagement level, voice consistency)
 * - belief (opinion strength through expression)
 * - memory (self-narrative, relationship updates)
 *
 * This module provides the mapping from action execution to agent state change.
 */

import { createMemoryWritebackRecord, serializeSnapshot } from "@ai-fashion-forum/shared-types";

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function cloneAgent(agentState) {
  return serializeSnapshot(agentState);
}

/**
 * POST action state delta
 *
 * Posting increases:
 * - engagement_level: visible output requires commitment
 * - belief_strength: articulating a position reinforces it
 * - self_narrative: posting is self-defining behavior
 *
 * Also increases bias toward posting in future (action affinity)
 */
export function applyPostActionDelta({
  agentState,
  targetContentId = null,
  topicRelevance = 0.5,
  tick = 0,
  round = 0,
  action_id = null,
} = {}) {
  const nextAgent = cloneAgent(agentState);
  const previousEngagement = nextAgent.engagement_level || 0.5;
  const previousBeliefStrength = nextAgent.belief_strength || 0.6;

  // Posting is a high-commitment action
  // engagement_level increases by 0.08-0.12 (capped at 0.95)
  const engagementDelta = clampUnit(0.08 + topicRelevance * 0.04);
  nextAgent.engagement_level = clampUnit(previousEngagement + engagementDelta);

  // Articulating belief strengthens it
  // belief_strength increases by 0.06-0.10
  const beliefDelta = clampUnit(0.06 + topicRelevance * 0.04);
  nextAgent.belief_strength = clampUnit(previousBeliefStrength + beliefDelta);

  // Posting adds to self-narrative (implicit action memory)
  if (!nextAgent.self_narrative) nextAgent.self_narrative = [];
  nextAgent.self_narrative.push({
    type: "action_post",
    timestamp: Date.now(),
    tick,
    topic_relevance: topicRelevance,
    engagement_boost: engagementDelta,
  });

  // Action bias: increases likelihood of posting again
  // (affects chooseForumAction decision thresholds)
  nextAgent.action_bias_post = clampUnit((nextAgent.action_bias_post || 0.3) + 0.15);

  // Reduces bias toward lurking/silence (switching to active mode)
  nextAgent.action_bias_silence = clampUnit((nextAgent.action_bias_silence || 0.2) * 0.7);

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      round,
      agent_id: nextAgent.agent_id,
      action_type: "post",
      target_content_id: targetContentId,
      topic_relevance: topicRelevance,
      engagement_before: previousEngagement,
      engagement_after: nextAgent.engagement_level,
      engagement_delta: clampUnit(nextAgent.engagement_level - previousEngagement),
      belief_strength_before: previousBeliefStrength,
      belief_strength_after: nextAgent.belief_strength,
      belief_strength_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
      action_bias_post: nextAgent.action_bias_post,
      narrative_entries: nextAgent.self_narrative.length,
    },
    writebackRecord: createMemoryWritebackRecord({
      writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:post`,
      action_id,
      agent_id: nextAgent.agent_id,
      round,
      tick,
      execution_status: "success",
      memory_channel: "action_post",
      action_type: "post",
      target_content_id: targetContentId,
      summary: `Posted with engagement boost (${engagementDelta.toFixed(3)})`,
      state_delta: {
        engagement_delta: clampUnit(nextAgent.engagement_level - previousEngagement),
        belief_strength_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
        action_bias_post: nextAgent.action_bias_post,
      },
    }),
  };
}

/**
 * COMMENT action state delta
 *
 * Commenting increases:
 * - engagement_level: visible participation, but less than posting
 * - relationship_state: direct response to someone, builds connection
 * - belief_strength: responding means taking a stance
 *
 * Also increases bias toward commenting/replying
 */
export function applyCommentActionDelta({
  agentState,
  targetContentId = null,
  targetAuthorId = null,
  topicRelevance = 0.5,
  disagreement = 0,
  tick = 0,
  round = 0,
  action_id = null,
} = {}) {
  const nextAgent = cloneAgent(agentState);
  const previousEngagement = nextAgent.engagement_level || 0.5;
  const previousBeliefStrength = nextAgent.belief_strength || 0.6;

  // Commenting is medium commitment
  // engagement_level increases by 0.05-0.09
  const engagementDelta = clampUnit(0.05 + topicRelevance * 0.04);
  nextAgent.engagement_level = clampUnit(previousEngagement + engagementDelta);

  // Responding strengthens belief, especially if disagreeing
  // belief_strength increases by 0.04-0.09
  const disagreementMultiplier = 1 + Math.abs(disagreement) * 0.3;
  const beliefDelta = clampUnit((0.04 + topicRelevance * 0.05) * disagreementMultiplier);
  nextAgent.belief_strength = clampUnit(previousBeliefStrength + beliefDelta);

  // Update relationship state (implicit graph)
  if (!nextAgent.relationship_state) nextAgent.relationship_state = {};
  if (targetAuthorId) {
    const prev = nextAgent.relationship_state[targetAuthorId] || { engagement: 0.5, affinity: 0.5 };
    // Commenting increases engagement with target
    const engagementBoost = disagreement < -0.2 ? -0.08 : 0.06;
    const affinityBoost = disagreement < -0.2 ? -0.05 : 0.04;
    nextAgent.relationship_state[targetAuthorId] = {
      engagement: clampUnit(prev.engagement + engagementBoost),
      affinity: clampUnit(prev.affinity + affinityBoost),
      last_interaction_tick: tick,
    };
  }

  // Add to self-narrative
  if (!nextAgent.self_narrative) nextAgent.self_narrative = [];
  nextAgent.self_narrative.push({
    type: "action_comment",
    timestamp: Date.now(),
    tick,
    target_author_id: targetAuthorId,
    topic_relevance: topicRelevance,
    disagreement,
    engagement_boost: engagementDelta,
  });

  // Action bias: increases likelihood of commenting
  nextAgent.action_bias_comment = clampUnit((nextAgent.action_bias_comment || 0.4) + 0.12);

  // Slightly increases belief_strength bias for future actions
  nextAgent.belief_assertion_tendency = clampUnit((nextAgent.belief_assertion_tendency || 0.4) + 0.06);

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      round,
      agent_id: nextAgent.agent_id,
      action_type: "comment",
      target_content_id: targetContentId,
      target_author_id: targetAuthorId,
      topic_relevance: topicRelevance,
      disagreement_level: disagreement,
      engagement_before: previousEngagement,
      engagement_after: nextAgent.engagement_level,
      engagement_delta: clampUnit(nextAgent.engagement_level - previousEngagement),
      belief_strength_before: previousBeliefStrength,
      belief_strength_after: nextAgent.belief_strength,
      belief_strength_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
      action_bias_comment: nextAgent.action_bias_comment,
      relationship_updated: !!targetAuthorId,
    },
    writebackRecord: createMemoryWritebackRecord({
      writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:comment`,
      action_id,
      agent_id: nextAgent.agent_id,
      round,
      tick,
      execution_status: "success",
      memory_channel: "action_comment",
      action_type: "comment",
      target_content_id: targetContentId,
      target_author_id: targetAuthorId,
      summary: `Commented on ${targetAuthorId ? targetAuthorId : "content"} (disagreement: ${disagreement.toFixed(2)})`,
      state_delta: {
        engagement_delta: clampUnit(nextAgent.engagement_level - previousEngagement),
        belief_strength_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
        action_bias_comment: nextAgent.action_bias_comment,
      },
    }),
  };
}

/**
 * REACT action state delta
 *
 * Reacting (likes, emoji reactions) increases:
 * - engagement_level: very light, but accumulates
 * - relationship_state: small positive signal to target author
 * - behavior_frequency: reacting is repeatable, low-cost
 *
 * Does NOT significantly increase belief_strength (light action)
 * Increases bias toward reacting/liking behavior
 */
export function applyReactActionDelta({
  agentState,
  targetContentId = null,
  targetAuthorId = null,
  reactionType = "support",
  tick = 0,
  round = 0,
  action_id = null,
} = {}) {
  const nextAgent = cloneAgent(agentState);
  const previousEngagement = nextAgent.engagement_level || 0.5;

  // Reacting is low-commitment
  // engagement_level increases by 0.01-0.03 (accumulates over many reactions)
  const engagementDelta = clampUnit(0.01 + (reactionType === "support" ? 0.02 : 0.01));
  nextAgent.engagement_level = clampUnit(previousEngagement + engagementDelta);

  // Reacting does NOT strengthen belief significantly
  // (it's more about endorsement than articulation)
  // but it updates relationship slightly
  if (!nextAgent.relationship_state) nextAgent.relationship_state = {};
  if (targetAuthorId) {
    const prev = nextAgent.relationship_state[targetAuthorId] || { engagement: 0.5, affinity: 0.5 };
    // Small positive affinity boost
    const affinityBoost = reactionType === "support" ? 0.03 : 0.01;
    nextAgent.relationship_state[targetAuthorId] = {
      engagement: clampUnit(prev.engagement + 0.01),
      affinity: clampUnit(prev.affinity + affinityBoost),
      last_interaction_tick: tick,
    };
  }

  // Add lightweight narrative entry
  if (!nextAgent.self_narrative) nextAgent.self_narrative = [];
  nextAgent.self_narrative.push({
    type: "action_react",
    timestamp: Date.now(),
    tick,
    target_author_id: targetAuthorId,
    reaction_type: reactionType,
  });

  // Action bias: increases likelihood of reacting
  // (reacting is habitual, low-cost)
  nextAgent.action_bias_react = clampUnit((nextAgent.action_bias_react || 0.5) + 0.08);

  // Reaction frequency metric (how often reacting vs deep engagement)
  nextAgent.reaction_frequency_index = clampUnit((nextAgent.reaction_frequency_index || 0.3) + 0.02);

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      round,
      agent_id: nextAgent.agent_id,
      action_type: "react",
      target_content_id: targetContentId,
      target_author_id: targetAuthorId,
      reaction_type: reactionType,
      engagement_before: previousEngagement,
      engagement_after: nextAgent.engagement_level,
      engagement_delta: clampUnit(nextAgent.engagement_level - previousEngagement),
      action_bias_react: nextAgent.action_bias_react,
      reaction_frequency_index: nextAgent.reaction_frequency_index,
    },
    writebackRecord: createMemoryWritebackRecord({
      writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:react`,
      action_id,
      agent_id: nextAgent.agent_id,
      round,
      tick,
      execution_status: "success",
      memory_channel: "action_react",
      action_type: "react",
      target_content_id: targetContentId,
      target_author_id: targetAuthorId,
      summary: `반응 ${reactionType}로 참여를 남겼다 (engagement +${engagementDelta.toFixed(3)})`,
      state_delta: {
        engagement_delta: clampUnit(nextAgent.engagement_level - previousEngagement),
        action_bias_react: nextAgent.action_bias_react,
        reaction_frequency_index: nextAgent.reaction_frequency_index,
      },
    }),
  };
}

/**
 * Determines bias toward next action based on current state and history.
 * This is a high-level scoring function that chooseForumAction can use
 * to make the next decision more deterministic given the agent's recent behavior.
 */
export function calculateActionBias(agentState = {}) {
  return {
    post_bias: (agentState.action_bias_post || 0.3) * (1 + (agentState.belief_assertion_tendency || 0) * 0.2),
    comment_bias: (agentState.action_bias_comment || 0.4) * (1 + (agentState.engagement_level || 0.5) * 0.15),
    react_bias: (agentState.action_bias_react || 0.5) * (1 - (agentState.engagement_level || 0.5) * 0.1),
    silence_bias: (1 - (agentState.engagement_level || 0.5)) * 0.5,
  };
}

/**
 * Test scenario suite for action state transitions
 */
export function createActionStateScenarios() {
  const baseAgent = {
    agent_id: "A01",
    engagement_level: 0.4,
    belief_strength: 0.6,
    relationship_state: {},
    self_narrative: [],
    action_bias_post: 0.3,
    action_bias_comment: 0.4,
    action_bias_react: 0.5,
  };

  // Scenario 1: Posting increases commitment
  const postScenario = applyPostActionDelta({
    agentState: baseAgent,
    topicRelevance: 0.8,
    tick: 0,
    round: 1,
  });

  // Scenario 2: Comment with disagreement
  const commentScenario = applyCommentActionDelta({
    agentState: postScenario.agent,
    targetAuthorId: "U123",
    topicRelevance: 0.7,
    disagreement: -0.3,
    tick: 1,
    round: 1,
  });

  // Scenario 3: Multiple reactions accumulate light engagement
  let reactAgent = commentScenario.agent;
  const reactScenarios = [];
  for (let i = 0; i < 3; i++) {
    const result = applyReactActionDelta({
      agentState: reactAgent,
      targetAuthorId: `U${200 + i}`,
      reactionType: i % 2 === 0 ? "support" : "curious",
      tick: 2 + i,
      round: 1,
    });
    reactAgent = result.agent;
    reactScenarios.push(result);
  }

  return {
    scenarios: [
      { name: "post_commitment", result: postScenario },
      { name: "comment_disagreement", result: commentScenario },
      { name: "reactions_accumulation", results: reactScenarios, final_agent: reactAgent },
    ],
  };
}
