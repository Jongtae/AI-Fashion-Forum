/**
 * cross-exposure.js
 *
 * Feeds agents content written by other agents in previous rounds.
 * Each agent sees a biased sample of recent posts filtered by interest overlap.
 * After exposure, belief and interest vectors shift toward or away from
 * what was read, producing genuine identity drift over rounds.
 */

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

/**
 * Compute interest overlap between agent and a post's topics.
 * Returns 0..1 — higher means the post is more relevant to this agent.
 */
function topicOverlap(agentInterests, postTopics) {
  if (!agentInterests || !postTopics || postTopics.length === 0) return 0.1;
  const keys = Object.keys(agentInterests);
  if (keys.length === 0) return 0.1;

  let overlap = 0;
  for (const topic of postTopics) {
    const lowerTopic = String(topic).toLowerCase();
    for (const key of keys) {
      if (lowerTopic.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerTopic)) {
        overlap += agentInterests[key] || 0.3;
      }
    }
  }
  return clamp(overlap / Math.max(1, postTopics.length));
}

/**
 * Select a biased exposure set for one agent from a pool of recent posts.
 * Posts by the agent itself are excluded.
 * Posts with higher topic overlap get higher selection probability.
 *
 * @param {object} agent - Agent state
 * @param {object[]} recentPosts - Posts from previous rounds
 * @param {number} maxExposure - Max posts to expose (default 5)
 * @param {function} rng - Random number generator (0..1)
 * @returns {{ exposedPosts: object[], scores: object[] }}
 */
export function selectExposure({ agent, recentPosts, maxExposure = 5, rng = Math.random }) {
  const candidates = (recentPosts || []).filter(
    (p) => p.agent_id !== agent.agent_id && (p.body || p.content)
  );

  if (candidates.length === 0) {
    return { exposedPosts: [], scores: [] };
  }

  // Score each candidate by topic overlap + small random jitter
  const scored = candidates.map((post) => {
    const topics = post.tags || post.topics || [];
    const overlap = topicOverlap(agent.interest_vector, topics);
    const jitter = rng() * 0.2;
    return { post, score: overlap + jitter };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxExposure);

  return {
    exposedPosts: selected.map((s) => s.post),
    scores: selected.map((s) => ({
      post_id: s.post.post_id || s.post._id || null,
      agent_id: s.post.agent_id || s.post.authorId || null,
      score: round2(s.score),
    })),
  };
}

/**
 * Apply identity drift based on what the agent was exposed to.
 * Modifies agent state in-place and returns a drift record.
 *
 * Drift rules:
 * - Topics mentioned in exposed posts boost agent's interest_vector toward those topics
 * - If a post contradicts agent beliefs (opposite stance), conflict_tolerance adjusts
 * - If a post aligns strongly, conformity nudges up
 *
 * All changes are small (±0.02~0.05) to avoid runaway drift.
 *
 * @param {object} agent - Agent state (mutated in place)
 * @param {object[]} exposedPosts - Posts the agent was exposed to
 * @returns {{ driftRecord: object }}
 */
export function applyExposureDrift({ agent, exposedPosts, rng = Math.random }) {
  const drift = {
    agent_id: agent.agent_id,
    interest_deltas: {},
    belief_deltas: {},
    trait_deltas: {},
    exposureCount: exposedPosts.length,
  };

  if (!exposedPosts || exposedPosts.length === 0) {
    return { driftRecord: drift };
  }

  // Interest vector drift: boost topics seen in exposed posts
  for (const post of exposedPosts) {
    const topics = post.tags || post.topics || [];
    for (const topic of topics) {
      const key = String(topic).toLowerCase().replace(/\s+/g, "_");
      const current = agent.interest_vector?.[key] || 0;
      const delta = round2(0.02 + rng() * 0.03); // +0.02~0.05
      const newVal = round2(clamp(current + delta));
      if (agent.interest_vector) {
        agent.interest_vector[key] = newVal;
      }
      drift.interest_deltas[key] = (drift.interest_deltas[key] || 0) + delta;
    }
  }

  // Belief vector drift: posts with strong stance signals nudge beliefs
  for (const post of exposedPosts) {
    const frame = post.meaning_frame || post.tags?.[0];
    const stance = post.stance_signal || post.tags?.[1];
    if (!frame) continue;

    const beliefKey = String(frame).toLowerCase().replace(/\s+/g, "-");
    const current = agent.belief_vector?.[beliefKey] || 0.5;

    // Supportive stance → reinforce, skeptical → small counter-push
    let delta = 0;
    if (stance === "supportive" || stance === "enthusiastic") {
      delta = round2(0.01 + rng() * 0.02);
    } else if (stance === "skeptical" || stance === "critical") {
      delta = round2(-(0.01 + rng() * 0.02));
    } else {
      delta = round2((rng() - 0.5) * 0.02);
    }

    if (agent.belief_vector) {
      agent.belief_vector[beliefKey] = round2(clamp(current + delta));
    }
    drift.belief_deltas[beliefKey] = (drift.belief_deltas[beliefKey] || 0) + delta;
  }

  // Trait drift: many aligned posts → conformity up; conflicting → conflict_tolerance up
  const alignedCount = exposedPosts.filter(
    (p) => p.stance_signal === "supportive" || p.stance_signal === "enthusiastic"
  ).length;
  const conflictCount = exposedPosts.filter(
    (p) => p.stance_signal === "skeptical" || p.stance_signal === "critical"
  ).length;

  if (alignedCount > conflictCount && agent.conformity != null) {
    const d = round2(0.01 * (alignedCount - conflictCount));
    agent.conformity = round2(clamp(agent.conformity + d));
    drift.trait_deltas.conformity = d;
  }

  if (conflictCount > 0 && agent.conflict_tolerance != null) {
    const d = round2(0.01 * conflictCount);
    agent.conflict_tolerance = round2(clamp(agent.conflict_tolerance + d));
    drift.trait_deltas.conflict_tolerance = d;
  }

  return { driftRecord: drift };
}

/**
 * Measure how much an agent has drifted between two snapshots.
 * Returns a numeric distance (0 = no change, higher = more drift).
 */
export function measureDrift(before, after) {
  let totalDelta = 0;
  let dimensions = 0;

  // Interest vector diff
  const allInterestKeys = new Set([
    ...Object.keys(before.interest_vector || {}),
    ...Object.keys(after.interest_vector || {}),
  ]);
  for (const key of allInterestKeys) {
    const bv = (before.interest_vector || {})[key] || 0;
    const av = (after.interest_vector || {})[key] || 0;
    totalDelta += Math.abs(av - bv);
    dimensions += 1;
  }

  // Belief vector diff
  const allBeliefKeys = new Set([
    ...Object.keys(before.belief_vector || {}),
    ...Object.keys(after.belief_vector || {}),
  ]);
  for (const key of allBeliefKeys) {
    const bv = (before.belief_vector || {})[key] || 0;
    const av = (after.belief_vector || {})[key] || 0;
    totalDelta += Math.abs(av - bv);
    dimensions += 1;
  }

  // Trait diffs
  for (const trait of ["openness", "conformity", "conflict_tolerance"]) {
    const bv = before[trait] ?? 0.5;
    const av = after[trait] ?? 0.5;
    totalDelta += Math.abs(av - bv);
    dimensions += 1;
  }

  return dimensions > 0 ? round2(totalDelta / dimensions) : 0;
}
