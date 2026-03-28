/**
 * conflict-detection.js
 *
 * Defines conflict detection rules and agent response protocols.
 * Conflicts emerge from low-affinity + high-engagement + belief contradiction.
 *
 * Response strategies:
 * - Retreat (silence): Withdraw from interaction
 * - Engagement escalation (react/comment): Direct confrontation
 * - Belief reinforcement (post): Counter-narrative
 * - Disengagement (lurk): Observe without interaction
 */

import { createMemoryWritebackRecord, serializeSnapshot } from "@ai-fashion-forum/shared-types";

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function cloneAgent(agentState) {
  return serializeSnapshot(agentState);
}

/**
 * Conflict Detection
 *
 * A conflict emerges when:
 * 1. Low affinity with an author (< 0.4)
 * 2. High engagement from that author (> 0.6)
 * 3. Belief contradiction (agent's belief ≠ content direction)
 */
export function detectConflict({
  agentState,
  targetAuthorId,
  contentRecord,
  recentInteractionHistory = [],
} = {}) {
  const relationship = agentState.relationship_state?.[targetAuthorId] || {
    engagement: 0.5,
    affinity: 0.5,
  };

  // Conflict indicators
  const lowAffinity = relationship.affinity < 0.4;
  const highEngagement = relationship.engagement > 0.6;
  const agentBeliefStrength = agentState.belief_strength || 0.6;

  // Belief contradiction: agent believes one way, content goes another
  const contentDirection = contentRecord.direction || 0;
  const beliefContradiction = agentBeliefStrength > 0.65 && contentDirection < -0.3;

  // Recent interaction intensity (how much has agent interacted with this author recently?)
  const recentWithAuthor = recentInteractionHistory.filter(
    (evt) => evt.target_author_id === targetAuthorId
  ).length;
  const recentEngagementIntensity = clampUnit(recentWithAuthor / Math.max(1, 3));

  // Conflict strength
  const conflictStrength = clampUnit(
    (lowAffinity ? 0.3 : 0) + // Low affinity: major factor
      (highEngagement ? 0.3 : 0) + // High engagement: visible involvement
      (beliefContradiction ? 0.2 : 0) + // Belief contradiction
      recentEngagementIntensity * 0.2 // Recent interaction intensity
  );

  const conflictLevel =
    conflictStrength > 0.7
      ? "severe"
      : conflictStrength > 0.5
        ? "moderate"
        : conflictStrength > 0.3
          ? "mild"
          : "none";

  return {
    has_conflict: conflictStrength >= 0.3,
    conflict_strength: conflictStrength,
    conflict_level: conflictLevel,
    lowAffinity,
    highEngagement,
    beliefContradiction,
    recentEngagementIntensity,
    indicators: {
      affinity: relationship.affinity,
      engagement: relationship.engagement,
      agent_belief_strength: agentBeliefStrength,
      content_direction: contentDirection,
    },
  };
}

/**
 * Conflict Resolution Strategy
 *
 * Determines how the agent should respond based on personality traits
 * and conflict characteristics.
 */
export function determineConflictResponse({
  agentState,
  conflictAnalysis,
} = {}) {
  const openness = agentState.openness || 0.5;
  const conflictTolerance = agentState.conflict_tolerance || 0.5;
  const beliefStrength = agentState.belief_strength || 0.6;

  const { conflict_strength, lowAffinity, beliefContradiction } = conflictAnalysis;

  // Response strategy matrix
  let strategy = "disengage"; // Default
  let action_priority = [];

  // High conflict tolerance + openness → Engagement (seeking dialogue)
  if (conflictTolerance > 0.6 && openness > 0.6) {
    strategy = "dialogue";
    action_priority = ["comment", "react", "lurk", "silence"];
  }
  // High belief strength + low conflict tolerance → Escalation (assertion)
  else if (beliefStrength > 0.7 && conflictTolerance < 0.5) {
    strategy = "escalate";
    action_priority = ["post", "comment", "react", "silence"];
  }
  // Moderate openness + moderate tolerance → Cautious engagement
  else if (openness > 0.4 && conflictTolerance > 0.4) {
    strategy = "careful";
    action_priority = ["react", "lurk", "comment", "silence"];
  }
  // Low openness + low tolerance → Withdrawal
  else {
    strategy = "withdraw";
    action_priority = ["silence", "lurk", "react", "comment"];
  }

  // Strength-based priority boost
  if (conflict_strength > 0.8) {
    // Severe conflict: prioritize strongest response
    if (strategy === "escalate") {
      action_priority = ["post", "comment", "silence", "lurk"];
    } else if (strategy === "withdraw") {
      action_priority = ["silence", "lurk"];
    }
  }

  return {
    strategy,
    action_priority,
    confidence: clampUnit(1 - (openness * 0.5)), // Assertiveness
    explanation: {
      openness_factor: openness,
      tolerance_factor: conflictTolerance,
      belief_strength_factor: beliefStrength,
    },
  };
}

/**
 * Apply Conflict State Delta
 *
 * Conflict alters:
 * - conflict_activation: Raised during/after conflict
 * - belief_entrenchment: Conflict can harden or soften belief
 * - relationship_state: Affinity may decrease further
 * - behavioral_stance: Tendency toward assertion or withdrawal
 */
export function applyConflictDelta({
  agentState,
  targetAuthorId,
  conflictAnalysis,
  response,
  tick = 0,
  round = 0,
  action_id = null,
} = {}) {
  const nextAgent = cloneAgent(agentState);

  // Conflict activation: short-term state flag
  if (!nextAgent.conflict_activation) nextAgent.conflict_activation = {};
  nextAgent.conflict_activation[targetAuthorId] = {
    level: conflictAnalysis.conflict_level,
    strength: conflictAnalysis.conflict_strength,
    tick,
    strategy: response.strategy,
  };

  // Belief entrenchment
  const previousBeliefStrength = nextAgent.belief_strength || 0.6;
  let beliefDelta = 0;

  if (response.strategy === "escalate") {
    // Escalation hardens belief
    beliefDelta = clampUnit(conflictAnalysis.conflict_strength * 0.12);
  } else if (response.strategy === "dialogue") {
    // Dialogue can soften belief (openness to reconsideration)
    beliefDelta = -clampUnit(conflictAnalysis.conflict_strength * 0.06);
  } else if (response.strategy === "withdraw") {
    // Withdrawal reinforces isolation but not belief change
    beliefDelta = clampUnit(conflictAnalysis.conflict_strength * 0.03);
  }

  nextAgent.belief_strength = clampUnit(previousBeliefStrength + beliefDelta);

  // Relationship deterioration
  const relationship = nextAgent.relationship_state?.[targetAuthorId] || {
    engagement: 0.5,
    affinity: 0.5,
  };
  nextAgent.relationship_state = nextAgent.relationship_state || {};

  // Conflict typically worsens affinity
  const affinityDelta = -clampUnit(conflictAnalysis.conflict_strength * 0.15);
  const engagementDelta =
    response.strategy === "escalate"
      ? clampUnit(conflictAnalysis.conflict_strength * 0.1) // Escalation increases engagement
      : -clampUnit(conflictAnalysis.conflict_strength * 0.08); // Other strategies reduce engagement

  nextAgent.relationship_state[targetAuthorId] = {
    engagement: clampUnit(relationship.engagement + engagementDelta),
    affinity: clampUnit(relationship.affinity + affinityDelta),
    conflict_tick: tick,
    conflict_level: conflictAnalysis.conflict_level,
  };

  // Behavioral stance
  // Conflict responses bias future action selection
  if (response.strategy === "escalate") {
    nextAgent.action_bias_post = clampUnit((nextAgent.action_bias_post || 0.3) + 0.15);
    nextAgent.action_bias_comment = clampUnit((nextAgent.action_bias_comment || 0.4) + 0.12);
  } else if (response.strategy === "dialogue") {
    nextAgent.action_bias_comment = clampUnit((nextAgent.action_bias_comment || 0.4) + 0.15);
    nextAgent.action_bias_react = clampUnit((nextAgent.action_bias_react || 0.5) * 0.7);
  } else if (response.strategy === "withdraw") {
    nextAgent.action_bias_silence = clampUnit((nextAgent.action_bias_silence || 0.2) + 0.2);
    nextAgent.action_bias_react = clampUnit((nextAgent.action_bias_react || 0.5) * 0.6);
  }

  // Memory: Conflict narrative
  if (!nextAgent.self_narrative) nextAgent.self_narrative = [];
  nextAgent.self_narrative.push({
    type: "conflict_event",
    timestamp: Date.now(),
    tick,
    target_author_id: targetAuthorId,
    conflict_level: conflictAnalysis.conflict_level,
    response_strategy: response.strategy,
    belief_before: previousBeliefStrength,
    belief_after: nextAgent.belief_strength,
  });

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      round,
      agent_id: nextAgent.agent_id,
      event_type: "conflict",
      target_author_id: targetAuthorId,
      conflict_level: conflictAnalysis.conflict_level,
      conflict_strength: conflictAnalysis.conflict_strength,
      response_strategy: response.strategy,
      belief_before: previousBeliefStrength,
      belief_after: nextAgent.belief_strength,
      belief_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
      affinity_delta: affinityDelta,
      engagement_delta: engagementDelta,
    },
    writebackRecord: createMemoryWritebackRecord({
      writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:conflict`,
      action_id,
      agent_id: nextAgent.agent_id,
      round,
      tick,
      execution_status: "success",
      memory_channel: "conflict_resolution",
      conflict_level: conflictAnalysis.conflict_level,
      response_strategy: response.strategy,
      target_author_id: targetAuthorId,
      summary: `Conflict with ${targetAuthorId} (${conflictAnalysis.conflict_level}), strategy: ${response.strategy}`,
      state_delta: {
        belief_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
        affinity_delta: affinityDelta,
        engagement_delta: engagementDelta,
        conflict_activation: nextAgent.conflict_activation[targetAuthorId],
      },
    }),
  };
}

/**
 * Test scenario suite
 */
export function createConflictScenarios() {
  // Scenario 1: Severe conflict with escalation response
  const agent1 = {
    agent_id: "A01",
    belief_strength: 0.8,
    openness: 0.3,
    conflict_tolerance: 0.3,
    relationship_state: {
      U999: { engagement: 0.8, affinity: 0.2 }, // Low trust, high engagement
    },
    self_narrative: [],
  };

  const content1 = {
    topics: ["fit"],
    direction: -0.8, // Contradicts agent's belief
    likes: 5,
  };

  const conflict1 = detectConflict({
    agentState: agent1,
    targetAuthorId: "U999",
    contentRecord: content1,
  });

  const response1 = determineConflictResponse({
    agentState: agent1,
    conflictAnalysis: conflict1,
  });

  const result1 = applyConflictDelta({
    agentState: agent1,
    targetAuthorId: "U999",
    conflictAnalysis: conflict1,
    response: response1,
    tick: 0,
    round: 1,
  });

  // Scenario 2: Mild conflict with dialogue response
  const agent2 = {
    agent_id: "A02",
    belief_strength: 0.6,
    openness: 0.75,
    conflict_tolerance: 0.7,
    relationship_state: {
      U888: { engagement: 0.5, affinity: 0.6 }, // Moderate relationship
    },
    self_narrative: [],
  };

  const content2 = {
    topics: ["pricing"],
    direction: -0.3, // Mild contradiction
    likes: 8,
  };

  const conflict2 = detectConflict({
    agentState: agent2,
    targetAuthorId: "U888",
    contentRecord: content2,
  });

  const response2 = determineConflictResponse({
    agentState: agent2,
    conflictAnalysis: conflict2,
  });

  const result2 = applyConflictDelta({
    agentState: agent2,
    targetAuthorId: "U888",
    conflictAnalysis: conflict2,
    response: response2,
    tick: 0,
    round: 1,
  });

  // Scenario 3: Severe conflict with withdrawal response
  const agent3 = {
    agent_id: "A03",
    belief_strength: 0.55,
    openness: 0.2,
    conflict_tolerance: 0.2,
    relationship_state: {
      U777: { engagement: 0.7, affinity: 0.3 }, // Low trust, moderately engaged
    },
    self_narrative: [],
  };

  const content3 = {
    topics: ["fashion"],
    direction: -0.6, // Strong contradiction
    likes: 12,
  };

  const conflict3 = detectConflict({
    agentState: agent3,
    targetAuthorId: "U777",
    contentRecord: content3,
  });

  const response3 = determineConflictResponse({
    agentState: agent3,
    conflictAnalysis: conflict3,
  });

  const result3 = applyConflictDelta({
    agentState: agent3,
    targetAuthorId: "U777",
    conflictAnalysis: conflict3,
    response: response3,
    tick: 0,
    round: 1,
  });

  return {
    scenarios: [
      {
        name: "severe_escalation",
        conflict: conflict1,
        response: response1,
        result: result1,
      },
      {
        name: "mild_dialogue",
        conflict: conflict2,
        response: response2,
        result: result2,
      },
      {
        name: "severe_withdrawal",
        conflict: conflict3,
        response: response3,
        result: result3,
      },
    ],
  };
}
