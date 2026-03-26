import { Router } from "express";
import {
  runTicks,
  createBaselineWorldRules,
  generateForumArtifact,
} from "@ai-fashion-forum/agent-core";
import { SAMPLE_STATE_SNAPSHOT } from "@ai-fashion-forum/shared-types";
import { AgentState } from "../models/AgentState.js";
import { ActionTrace } from "../models/ActionTrace.js";
import { SimEvent } from "../models/SimEvent.js";

const router = Router();

const FORUM_SERVER_URL = process.env.FORUM_SERVER_URL || "http://localhost:4000";

// ── Forum server HTTP client ──────────────────────────────────────────────────

async function forumPost(path, body) {
  const res = await fetch(`${FORUM_SERVER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`forum-server ${path} failed: ${err.error || res.status}`);
  }
  return res.json();
}

async function forumGet(path) {
  const res = await fetch(`${FORUM_SERVER_URL}${path}`);
  if (!res.ok) return null;
  return res.json();
}

// ── In-memory world state between ticks ──────────────────────────────────────

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
// Run N agent ticks. Posts/comments are created via forum-server API.

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

  // ── Create posts and comments via forum-server API ────────────────────────
  const createdPosts = [];
  const createdComments = [];

  for (const entry of result.entries) {
    const agent = result.snapshots[0]?.agents?.find((a) => a.agent_id === entry.actor_id)
      || { agent_id: entry.actor_id, handle: entry.actor_id };

    if (entry.action === "post") {
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

      try {
        const post = await forumPost("/api/posts", {
          content,
          authorId: entry.actor_id,
          authorType: "agent",
          tags: agent.interest_vector ? Object.keys(agent.interest_vector).slice(0, 3) : [],
          agentRound: round,
          agentTick: entry.tick,
        });
        createdPosts.push(post);
      } catch (err) {
        console.warn("[agent-loop] post creation failed:", err.message);
      }
    } else if (entry.action === "comment") {
      // Find a recent agent post to comment on via forum-server
      try {
        const feedResult = await forumGet("/api/posts?limit=1&authorType=agent");
        const recentPost = feedResult?.posts?.[0];
        if (recentPost) {
          const comment = await forumPost(`/api/posts/${recentPost._id}/comments`, {
            authorId: entry.actor_id,
            authorType: "agent",
            content: entry.reason || `${agent.handle || entry.actor_id} commented.`,
            agentRound: round,
            agentTick: entry.tick,
          });
          createdComments.push(comment);
        }
      } catch (err) {
        console.warn("[agent-loop] comment creation failed:", err.message);
      }
    }
  }

  // ── Persist ActionTrace records ───────────────────────────────────────────
  const traceDocs = result.entries.map((entry, i) => ({
    actionId: entry.action_id || `ACT:${entry.actor_id}:${entry.tick}:${entry.action}:${i}`,
    agentId: entry.actor_id,
    tick: entry.tick,
    round,
    actionType: entry.action,
    visibility:
      entry.action === "silence" || entry.action === "lurk"
        ? "stored_only"
        : entry.action === "react"
        ? "public_lightweight"
        : "public_visible",
    payload: entry,
  }));

  if (traceDocs.length > 0) {
    await ActionTrace.insertMany(traceDocs, { ordered: false }).catch(() => {});
  }

  // ── Emit SimEvents ────────────────────────────────────────────────────────
  const simEvents = [
    { eventType: "agent_tick_start", round, tick: 0, payload: { seed, ticks } },
    { eventType: "agent_tick_end", round, tick: result.tickCount, payload: { postsCreated: createdPosts.length } },
    ...result.entries.map((entry) => ({
      eventType: `action_${entry.action}`,
      agentId: entry.actor_id,
      round,
      tick: entry.tick,
      payload: entry,
    })),
  ];
  await SimEvent.insertMany(simEvents).catch(() => {});

  // ── Persist AgentState snapshots ──────────────────────────────────────────
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

  currentWorld = finalSnapshot;

  res.json({
    round,
    ticks: result.tickCount,
    postsCreated: createdPosts.length,
    commentsCreated: createdComments.length,
    entries: result.entries.map((e) => ({ tick: e.tick, actor: e.actor_id, action: e.action })),
  });
});

// ── GET /api/agent-loop/status ────────────────────────────────────────────────

router.get("/status", async (req, res) => {
  const [totalAgentStates, latestState] = await Promise.all([
    AgentState.countDocuments(),
    AgentState.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    currentRound,
    worldInitialized: !!currentWorld,
    agentCount: currentWorld?.agents?.length ?? 0,
    db: {
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
