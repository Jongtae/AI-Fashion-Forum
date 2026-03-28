/**
 * content-consumption-merge.js
 *
 * Defines state read/write rules for internal forum and external web content consumption.
 * Both consumption paths merge into a unified memory writeback flow.
 *
 * This module handles:
 * - Internal forum content → state update (belief, interest, relationship impact)
 * - External web content → state update (perspective broadening, conviction shifts)
 * - Merge logic for combining both signals
 * - Impact on characteristic, belief, and memory
 */

import {
  createMemoryWritebackRecord,
  serializeSnapshot,
} from "@ai-fashion-forum/shared-types";

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function cloneAgent(agentState) {
  return serializeSnapshot(agentState);
}

/**
 * INTERNAL FORUM CONTENT consumption
 *
 * Forum posts expose the agent to peer perspectives.
 * Impact is modulated by:
 * - Author relationship (affinity/engagement with the author)
 * - Topic alignment (agent interest in topic)
 * - Social proof (likes, reply count, network visibility)
 * - Contradiction (conflicts with current belief)
 */
export function applyInternalContentConsumption({
  agentState,
  contentRecord,
  authorId = null,
  tick = 0,
  round = 0,
  action_id = null,
} = {}) {
  const nextAgent = cloneAgent(agentState);

  // State READ: Use relationship state to modulate receptivity
  const authorRelationship = nextAgent.relationship_state?.[authorId] || {
    engagement: 0.5,
    affinity: 0.5,
  };

  // Topic relevance
  const topicAffinities = contentRecord.topics?.map(
    (topic) => nextAgent.interest_vector?.[topic] || 0.5
  ) || [0.5];
  const avgTopicAffinity = topicAffinities.reduce((a, b) => a + b) / topicAffinities.length;

  // Social proof signal (likes, replies indicate credibility)
  const socialProof = clampUnit((contentRecord.likes || 0) / Math.max(10, (contentRecord.likes || 0) + 10) +
    (contentRecord.reply_count || 0) / Math.max(5, (contentRecord.reply_count || 0) + 5)) / 2;

  // Receptivity: How much does this content affect the agent?
  const authorReceptivity = authorRelationship.affinity * 0.4 + authorRelationship.engagement * 0.2;
  const topicReceptivity = avgTopicAffinity * 0.3;
  const socialReceptivity = socialProof * 0.1;
  const totalReceptivity = clampUnit(authorReceptivity + topicReceptivity + socialReceptivity);

  // State WRITE: Update belief based on content direction and receptivity
  const previousBeliefStrength = nextAgent.belief_strength || 0.6;
  const contentDirection = contentRecord.direction || 0;
  const beliefDelta = clampUnit(totalReceptivity * 0.08 * (contentDirection >= 0 ? 1 : 0.6));

  nextAgent.belief_strength = clampUnit(previousBeliefStrength + beliefDelta);

  // Interest update: High-engagement forum content increases interest
  if (contentRecord.topics && contentRecord.topics.length > 0) {
    const dominantTopic = contentRecord.topics[0];
    const previousInterest = nextAgent.interest_vector?.[dominantTopic] || 0.5;
    const interestDelta = clampUnit(totalReceptivity * 0.06);
    nextAgent.interest_vector = nextAgent.interest_vector || {};
    nextAgent.interest_vector[dominantTopic] = clampUnit(previousInterest + interestDelta);
  }

  // Relationship update: Reading someone's post slightly increases engagement
  if (authorId) {
    const prev = nextAgent.relationship_state?.[authorId] || { engagement: 0.5, affinity: 0.5 };
    nextAgent.relationship_state = nextAgent.relationship_state || {};
    nextAgent.relationship_state[authorId] = {
      engagement: clampUnit(prev.engagement + 0.02),
      affinity: prev.affinity, // Affinity only changes on direct interaction
      last_consumed_tick: tick,
    };
  }

  // Memory narrative entry
  if (!nextAgent.self_narrative) nextAgent.self_narrative = [];
  nextAgent.self_narrative.push({
    type: "consumed_internal_content",
    timestamp: Date.now(),
    tick,
    author_id: authorId,
    topics: contentRecord.topics || [],
    receptivity: totalReceptivity,
    social_proof: socialProof,
  });

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      round,
      agent_id: nextAgent.agent_id,
      consumption_type: "internal",
      author_id: authorId,
      topics: contentRecord.topics || [],
      author_receptivity: authorReceptivity,
      topic_receptivity: topicReceptivity,
      social_receptivity: socialReceptivity,
      total_receptivity: totalReceptivity,
      belief_before: previousBeliefStrength,
      belief_after: nextAgent.belief_strength,
      belief_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
      social_proof: socialProof,
    },
    writebackRecord: createMemoryWritebackRecord({
      writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:internal_content`,
      action_id,
      agent_id: nextAgent.agent_id,
      round,
      tick,
      execution_status: "success",
      memory_channel: "content_internal",
      consumption_type: "internal",
      author_id: authorId,
      topics: contentRecord.topics || [],
      summary: `Consumed internal content (receptivity: ${totalReceptivity.toFixed(3)})`,
      state_delta: {
        belief_delta: clampUnit(nextAgent.belief_strength - previousBeliefStrength),
        receptivity: totalReceptivity,
        social_proof: socialProof,
      },
    }),
  };
}

/**
 * EXTERNAL WEB CONTENT consumption
 *
 * External content (news, blogs, external fashion authorities) provides
 * perspective from outside the forum echo chamber.
 *
 * Impact is modulated by:
 * - Content authority (is the source reputable?)
 * - Novelty (does this present new perspectives?)
 * - Contradiction with current beliefs (creates tension, forces reconsideration)
 * - Agent openness (how receptive is the agent to new views?)
 */
export function applyExternalContentConsumption({
  agentState,
  contentRecord,
  authorityScore = 0.5,
  tick = 0,
  round = 0,
  action_id = null,
} = {}) {
  const nextAgent = cloneAgent(agentState);

  // State READ: Use agent openness to modulate receptivity
  const agentOpenness = nextAgent.openness || 0.5;
  const agentConflictTolerance = nextAgent.conflict_tolerance || 0.5;

  // External content authority (domain reputation, author credentials)
  const authority = clampUnit(authorityScore);

  // Novelty: How different is this from current interests?
  const topicAffinities = contentRecord.topics?.map(
    (topic) => nextAgent.interest_vector?.[topic] || 0.5
  ) || [0.5];
  const avgTopicAffinity = topicAffinities.reduce((a, b) => a + b) / topicAffinities.length;
  const novelty = clampUnit(1 - avgTopicAffinity); // High novelty = low prior interest

  // Contradiction signal (does it conflict with current beliefs?)
  const currentBeliefStrength = nextAgent.belief_strength || 0.6;
  const contentDirection = contentRecord.direction || 0;
  const contradiction = currentBeliefStrength > 0.7 && contentDirection < 0 ? 1 : 0;

  // Receptivity: External content requires higher openness
  const authorityReceptivity = authority * 0.4;
  const noveltyReceptivity = novelty * 0.3 * (agentOpenness * 0.5 + 0.5); // Openness amplifies novelty
  const contradictionReceptivity = contradiction * 0.3 * agentConflictTolerance;
  const totalReceptivity = clampUnit(authorityReceptivity + noveltyReceptivity + contradictionReceptivity);

  // State WRITE: Belief update (external content can shift beliefs more dramatically)
  const previousBeliefStrength = nextAgent.belief_strength || 0.6;

  let beliefDelta = 0;
  if (contradiction > 0) {
    // Contradictory external content: can soften or harden belief
    if (agentConflictTolerance > 0.6 && agentOpenness > 0.6) {
      // Open agent: reconsidering
      beliefDelta = -clampUnit(totalReceptivity * 0.12); // Belief softens
    } else {
      // Closed agent: backlash
      beliefDelta = clampUnit(totalReceptivity * 0.06); // Belief hardens
    }
  } else {
    // Reinforcing content
    beliefDelta = clampUnit(totalReceptivity * 0.1);
  }

  nextAgent.belief_strength = clampUnit(previousBeliefStrength + beliefDelta);

  // Perspective index: Track exposure to external viewpoints
  if (!nextAgent.perspective_breadth) nextAgent.perspective_breadth = 0;
  nextAgent.perspective_breadth = clampUnit(nextAgent.perspective_breadth + novelty * 0.05);

  // Interest update: External content can expand interests
  if (contentRecord.topics && contentRecord.topics.length > 0) {
    const dominantTopic = contentRecord.topics[0];
    const previousInterest = nextAgent.interest_vector?.[dominantTopic] || 0.5;
    const interestDelta = clampUnit(novelty * totalReceptivity * 0.08); // External content drives interest
    nextAgent.interest_vector = nextAgent.interest_vector || {};
    nextAgent.interest_vector[dominantTopic] = clampUnit(previousInterest + interestDelta);
  }

  // Memory narrative entry
  if (!nextAgent.self_narrative) nextAgent.self_narrative = [];
  nextAgent.self_narrative.push({
    type: "consumed_external_content",
    timestamp: Date.now(),
    tick,
    authority_source: contentRecord.source || "unknown",
    topics: contentRecord.topics || [],
    novelty,
    receptivity: totalReceptivity,
    caused_contradiction: contradiction > 0,
  });

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      round,
      agent_id: nextAgent.agent_id,
      consumption_type: "external",
      source: contentRecord.source || "unknown",
      topics: contentRecord.topics || [],
      authority: authority,
      novelty,
      contradiction: contradiction > 0,
      openness_factor: agentOpenness,
      total_receptivity: totalReceptivity,
      belief_before: previousBeliefStrength,
      belief_after: nextAgent.belief_strength,
      belief_delta: beliefDelta,
      perspective_breadth: nextAgent.perspective_breadth,
    },
    writebackRecord: createMemoryWritebackRecord({
      writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:external_content`,
      action_id,
      agent_id: nextAgent.agent_id,
      round,
      tick,
      execution_status: "success",
      memory_channel: "content_external",
      consumption_type: "external",
      source: contentRecord.source || "unknown",
      topics: contentRecord.topics || [],
      summary: `Consumed external content (authority: ${authority.toFixed(2)}, novelty: ${novelty.toFixed(2)})`,
      state_delta: {
        belief_delta: beliefDelta,
        receptivity: totalReceptivity,
        perspective_breadth: nextAgent.perspective_breadth,
      },
    }),
  };
}

/**
 * MERGE consumption paths
 *
 * Combines internal and external consumption writebacks into a unified state.
 * The merge resolves competing updates and produces a final agent state.
 */
export function mergeConsumptionPaths({
  agentState,
  internalConsumptions = [],
  externalConsumptions = [],
  tick = 0,
  round = 0,
} = {}) {
  let nextAgent = cloneAgent(agentState);
  const allWritebacks = [];

  // Apply internal content consumptions
  internalConsumptions.forEach((consumption) => {
    const result = applyInternalContentConsumption({
      agentState: nextAgent,
      contentRecord: consumption,
      tick,
      round,
    });
    nextAgent = result.agent;
    allWritebacks.push(result.writebackRecord);
  });

  // Apply external content consumptions
  externalConsumptions.forEach((consumption) => {
    const result = applyExternalContentConsumption({
      agentState: nextAgent,
      contentRecord: consumption,
      tick,
      round,
    });
    nextAgent = result.agent;
    allWritebacks.push(result.writebackRecord);
  });

  return {
    agent: nextAgent,
    writebacks: allWritebacks,
    consumption_count: internalConsumptions.length + externalConsumptions.length,
    internal_count: internalConsumptions.length,
    external_count: externalConsumptions.length,
  };
}

/**
 * Test scenario suite for content consumption
 */
export function createConsumptionScenarios() {
  const baseAgent = {
    agent_id: "A01",
    belief_strength: 0.6,
    openness: 0.6,
    conflict_tolerance: 0.5,
    engagement_level: 0.5,
    interest_vector: { fashion: 0.4, fit: 0.6, pricing: 0.3 },
    relationship_state: { U123: { engagement: 0.7, affinity: 0.6 } },
    self_narrative: [],
    perspective_breadth: 0.2,
  };

  // Scenario 1: Internal content from trusted author
  const internalResult = applyInternalContentConsumption({
    agentState: baseAgent,
    contentRecord: {
      topics: ["fit", "fashion"],
      likes: 15,
      reply_count: 5,
      direction: 1,
    },
    authorId: "U123",
    tick: 0,
    round: 1,
  });

  // Scenario 2: Contradictory external content
  const externalResult = applyExternalContentConsumption({
    agentState: baseAgent,
    contentRecord: {
      topics: ["pricing"],
      source: "vogue.com",
      direction: -0.5, // Contradicts common opinion
    },
    authorityScore: 0.85,
    tick: 1,
    round: 1,
  });

  // Scenario 3: Merged path
  const mergedResult = mergeConsumptionPaths({
    agentState: baseAgent,
    internalConsumptions: [
      {
        topics: ["fit"],
        likes: 20,
        reply_count: 8,
        direction: 1,
      },
    ],
    externalConsumptions: [
      {
        topics: ["pricing"],
        source: "economist.com",
        direction: 0,
      },
    ],
    tick: 2,
    round: 1,
  });

  return {
    scenarios: [
      { name: "internal_trusted_author", result: internalResult },
      { name: "external_contradictory", result: externalResult },
      { name: "merged_dual_path", result: mergedResult },
    ],
  };
}
