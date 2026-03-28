import { Router } from "express";
import { RANKING_EXPERIMENT_FLAGS } from "@ai-fashion-forum/agent-core";
import { SAMPLE_AGENT_STATES } from "@ai-fashion-forum/shared-types";
import { Post } from "../models/Post.js";
import { Interaction } from "../models/Interaction.js";
import { AgentState } from "../models/AgentState.js";

const router = Router();

// Convert a DB Post document into a content-record compatible object
// so ranking-core signals can be computed.
function postToContentRecord(post) {
  return {
    content_id: post._id.toString(),
    title: post.content.slice(0, 60),
    format: post.format || "forum_post",
    topics: post.tags ?? [],
    emotions: [],            // enrichment hook — left empty for now
    source_type: post.authorType === "agent" ? "forum_post" : "forum_post",
    created_tick: 0,         // not tracked at post level; recency via createdAt
    _post: post,             // pass through for final response
  };
}

// Lightweight ranking that mirrors ranking-core signal logic
// without requiring the full SAMPLE_CONTENT_RECORDS format.
function computeScore({ agentState, contentRecord, weights, recencyMs }) {
  const interests = Object.entries(
    agentState.interest_vector || agentState.rawSnapshot?.interest_vector || {}
  );
  const interestMatch =
    interests.length === 0
      ? 0
      : interests.reduce((sum, [topic, weight]) => {
          return sum + (contentRecord.topics.includes(topic) ? weight : 0);
        }, 0) / interests.length;

  const trustSignal = Math.min(
    1,
    ((agentState.relationship_summary || agentState.rawSnapshot?.relationship_summary)?.trust_circle_size || 0) / 10
  );
  const noveltySignal = 0.4 + (agentState.openness || agentState.rawSnapshot?.openness || 0.5) * 0.2;

  // Recency: posts within last 1 hour score 1.0, decays over 24h
  const ageHours = recencyMs / 3_600_000;
  const recencySignal = Math.max(0, 1 - ageHours / 24);

  return (
    interestMatch * weights.interest +
    trustSignal * weights.trust +
    noveltySignal * weights.novelty +
    0 * weights.controversy +
    recencySignal * weights.recency
  );
}

const WEIGHTS_BY_FLAG = {
  [RANKING_EXPERIMENT_FLAGS.baseline]:           { interest: 0.34, trust: 0.2, novelty: 0.2, controversy: 0.14, recency: 0.12 },
  [RANKING_EXPERIMENT_FLAGS.noveltyBoost]:       { interest: 0.28, trust: 0.16, novelty: 0.34, controversy: 0.1, recency: 0.12 },
  [RANKING_EXPERIMENT_FLAGS.trustBoost]:         { interest: 0.28, trust: 0.34, novelty: 0.16, controversy: 0.1, recency: 0.12 },
  [RANKING_EXPERIMENT_FLAGS.controversyDampen]:  { interest: 0.34, trust: 0.22, novelty: 0.2, controversy: 0.04, recency: 0.2 },
};

// ── GET /api/feed ─────────────────────────────────────────────────────────────
// Returns a personalised post feed for a user (or agent).
//
// Query params:
//   userId        — user or agent ID (used to look up agent state for ranking)
//   experimentFlag — one of RANKING_EXPERIMENT_FLAGS (default: baseline)
//   limit          — max posts to return (default: 20)

router.get("/", async (req, res) => {
  const userId = req.query.userId || "user-guest";
  const flag = RANKING_EXPERIMENT_FLAGS[req.query.experimentFlag] || RANKING_EXPERIMENT_FLAGS.baseline;
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  // Fetch recent posts (2× limit to allow ranking to reorder)
  const rawPosts = await Post.find()
    .sort({ createdAt: -1 })
    .limit(limit * 2)
    .lean();

  if (rawPosts.length === 0) {
    return res.json({ feed: [], ranked: false, userId });
  }

  // Resolve agent state for ranking (try DB first, fall back to SAMPLE_AGENT_STATES)
  let agentState = await AgentState
    .findOne({ agentId: userId })
    .sort({ round: -1 })
    .lean();

  if (!agentState) {
    const sample = SAMPLE_AGENT_STATES.find((a) => a.agent_id === userId);
    agentState = sample ? { ...sample, interest_vector: sample.interest_vector || {} } : {
      interest_vector: {},
      openness: 0.5,
      relationship_summary: { trust_circle_size: 3 },
    };
  } else {
    agentState = {
      ...agentState,
      interest_vector: agentState.interest_vector || agentState.rawSnapshot?.interest_vector || {},
      relationship_summary:
        agentState.relationship_summary || agentState.rawSnapshot?.relationship_summary || {},
      openness: agentState.openness ?? agentState.rawSnapshot?.openness ?? 0.5,
    };
  }

  const weights = WEIGHTS_BY_FLAG[flag] || WEIGHTS_BY_FLAG[RANKING_EXPERIMENT_FLAGS.baseline];
  const now = Date.now();

  // Rank posts
  const ranked = rawPosts
    .map((post) => {
      const record = postToContentRecord(post);
      const recencyMs = now - new Date(post.createdAt).getTime();
      const score = computeScore({ agentState, contentRecord: record, weights, recencyMs });
      return { post, score: Number(score.toFixed(4)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Record feed view interactions in background (don't await to keep response fast)
  const interactions = ranked.map((r, i) => ({
    actorId: userId,
    actorType: "user",
    targetId: r.post._id.toString(),
    targetType: "feed_slot",
    eventType: "view",
    feedPosition: i,
    agentId: r.post.authorType === "agent" ? r.post.authorId : undefined,
  }));
  Interaction.insertMany(interactions).catch(() => {});

  res.json({
    feed: ranked.map((r) => ({ ...r.post, _score: r.score })),
    ranked: true,
    userId,
    experimentFlag: flag,
  });
});

export default router;
