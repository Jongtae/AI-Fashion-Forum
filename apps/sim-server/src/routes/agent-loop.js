import { Router } from "express";
import {
  runTicks,
  createBaselineWorldRules,
  generateForumArtifact,
} from "@ai-fashion-forum/agent-core";
import {
  SAMPLE_STATE_SNAPSHOT,
  SPRINT1_AGENT_STATES,
} from "@ai-fashion-forum/shared-types";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { AgentState } from "../models/AgentState.js";
import { Interaction } from "../models/Interaction.js";

const router = Router();

// Lightweight in-memory world state between ticks (persisted per POST)
let currentWorld = null;
let currentRound = 0;

function buildInitialState() {
  return JSON.parse(JSON.stringify(SAMPLE_STATE_SNAPSHOT));
}

function agentToSeedAxes(agent) {
  return new Map(
    Object.entries({
      curiosity: agent.curiosity ?? agent.openness ?? 0.5,
      status_drive: agent.status_drive ?? 0.5,
      care_drive: agent.care_drive ?? 0.5,
      novelty_drive: agent.novelty_drive ?? agent.activity_level ?? 0.5,
      skepticism: agent.skepticism ?? 0.5,
      belonging_drive: agent.belonging_drive ?? agent.conformity ?? 0.5,
    })
  );
}

function agentToMutableAxes(agent) {
  return new Map(
    Object.entries({
      attention_bias: 0.5,
      belief_shift: 0,
      affect_intensity: agent.conflict_tolerance ?? 0.5,
      identity_confidence: 0.6,
      social_posture: agent.conformity ?? 0.5,
    })
  );
}

// ── POST /api/agent-loop/tick ─────────────────────────────────────────────────
// Run N agent ticks, persist generated posts/state to MongoDB.

router.post("/tick", async (req, res) => {
  const ticks = Math.min(20, Math.max(1, parseInt(req.body?.ticks) || 1));
  const seed = parseInt(req.body?.seed) || Date.now() % 100000;

  if (!currentWorld) {
    currentWorld = buildInitialState();
  }

  const result = runTicks({
    seed,
    tickCount: ticks,
    initialState: currentWorld,
    worldRules: createBaselineWorldRules(),
  });

  currentRound += 1;
  const round = currentRound;

  // Persist posts and comments from tick replay entries
  const postDocs = [];
  const commentDocs = [];

  for (const entry of result.entries) {
    const agent = result.snapshots[0]?.agents?.find((a) => a.agent_id === entry.actor_id)
      || SPRINT1_AGENT_STATES.find((a) => a.agent_id === entry.actor_id)
      || { agent_id: entry.actor_id, handle: entry.actor_id };

    if (entry.action === "post") {
      // Generate a realistic forum artifact using forum-generation
      let content;
      try {
        const targetAgent = result.snapshots[0]?.agents?.[0] || agent;
        const artifact = generateForumArtifact({
          actionRecord: entry,
          author: agent,
          targetContent: { title: "fashion topic", topics: ["style"], emotions: ["curiosity"] },
          targetAgent,
        });
        content = artifact?.content || artifact?.text || JSON.stringify(artifact);
      } catch {
        content = entry.reason || `${agent.handle || agent.agent_id} shared a new post.`;
      }

      postDocs.push({
        content,
        authorId: entry.actor_id,
        authorType: "agent",
        tags: agent.interest_vector ? Object.keys(agent.interest_vector).slice(0, 3) : [],
        likes: 0,
        likedBy: [],
        agentRound: round,
        agentTick: entry.tick,
      });
    } else if (entry.action === "comment") {
      // Find a recent post to comment on
      const recentPost = await Post.findOne({ authorType: "agent" }).sort({ createdAt: -1 });
      if (recentPost) {
        commentDocs.push({
          postId: recentPost._id,
          authorId: entry.actor_id,
          authorType: "agent",
          content: entry.reason || `${agent.handle || entry.actor_id} commented.`,
          agentRound: round,
          agentTick: entry.tick,
        });
      }
    }
  }

  const insertedPosts = postDocs.length > 0 ? await Post.insertMany(postDocs) : [];
  const insertedComments = commentDocs.length > 0 ? await Comment.insertMany(commentDocs) : [];

  // Persist agent state snapshots
  const finalSnapshot = result.snapshots[result.snapshots.length - 1];
  if (finalSnapshot?.agents) {
    for (const agent of finalSnapshot.agents) {
      await AgentState.findOneAndUpdate(
        { agentId: agent.agent_id, round },
        {
          $setOnInsert: {
            agentId: agent.agent_id,
            round,
            tick: result.tickCount,
            seedAxes: agentToSeedAxes(agent),
            mutableAxes: agentToMutableAxes(agent),
            archetype: agent.archetype,
            selfNarratives: agent.self_narrative ?? [],
            rawSnapshot: agent,
          },
        },
        { upsert: true }
      );
    }
  }

  // Record interaction logs for generated content
  const interactionDocs = insertedPosts.map((p) => ({
    actorId: p.authorId,
    actorType: "user", // treated as system-generated user interaction
    targetId: p._id.toString(),
    targetType: "post",
    eventType: "view",
    agentId: p.authorId,
    round,
  }));
  if (interactionDocs.length > 0) {
    await Interaction.insertMany(interactionDocs);
  }

  // Update world state for next tick
  currentWorld = finalSnapshot;

  res.json({
    round,
    ticks: result.tickCount,
    postsCreated: insertedPosts.length,
    commentsCreated: insertedComments.length,
    entries: result.entries.map((e) => ({ tick: e.tick, actor: e.actor_id, action: e.action })),
  });
});

// ── GET /api/agent-loop/status ────────────────────────────────────────────────

router.get("/status", async (req, res) => {
  const [totalPosts, totalAgentStates, latestState] = await Promise.all([
    Post.countDocuments({ authorType: "agent" }),
    AgentState.countDocuments(),
    AgentState.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    currentRound,
    worldInitialized: !!currentWorld,
    agentCount: currentWorld?.agents?.length ?? 0,
    db: {
      agentPostCount: totalPosts,
      agentStateSnapshots: totalAgentStates,
      latestRound: latestState?.round ?? 0,
    },
  });
});

// ── GET /api/agent-loop/states ────────────────────────────────────────────────

router.get("/states", async (req, res) => {
  const agentId = req.query.agentId;
  const filter = agentId ? { agentId } : {};
  const states = await AgentState.find(filter)
    .sort({ agentId: 1, round: -1 })
    .limit(50)
    .lean();
  res.json(states);
});

export default router;
