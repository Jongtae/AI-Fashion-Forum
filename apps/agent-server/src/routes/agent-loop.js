import { Router } from "express";
import {
  runTicks,
  createBaselineWorldRules,
  generateForumArtifact,
} from "@ai-fashion-forum/agent-core";
import {
  SAMPLE_STATE_SNAPSHOT,
  createActionExecutionResult,
  createPersistedAgentSnapshot,
  getActionVisibility,
} from "@ai-fashion-forum/shared-types";
import { AgentState } from "../models/AgentState.js";
import { ActionTrace } from "../models/ActionTrace.js";
import { SimEvent } from "../models/SimEvent.js";
import { StoredAction } from "../models/StoredAction.js";

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
  const latestEntryByAgent = new Map();

  // ── Create posts and comments via forum-server API ────────────────────────
  const createdPosts = [];
  const createdComments = [];
  const artifactResults = new Map();

  for (const entry of result.entries) {
    latestEntryByAgent.set(entry.actor_id, entry);
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
        artifactResults.set(entry.action_id, { artifactId: post._id.toString(), artifactType: "post" });
      } catch (err) {
        console.warn("[agent-loop] post creation failed:", err.message);
        artifactResults.set(entry.action_id, {
          errorClass: "forum_post_failed",
          executionStatus: "failed",
        });
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
          artifactResults.set(entry.action_id, {
            artifactId: comment._id.toString(),
            artifactType: "comment",
          });
        } else {
          artifactResults.set(entry.action_id, {
            executionStatus: "degraded",
            blockReason: "missing_target_post",
          });
        }
      } catch (err) {
        console.warn("[agent-loop] comment creation failed:", err.message);
        artifactResults.set(entry.action_id, {
          errorClass: "forum_comment_failed",
          executionStatus: "failed",
        });
      }
    }
  }

  // ── Persist ActionTrace records ───────────────────────────────────────────
  const traceDocs = result.entries.map((entry, i) => {
    const artifactResult = artifactResults.get(entry.action_id) || {};
    const execution = createActionExecutionResult({
      action_id: entry.action_id || `ACT:${entry.actor_id}:${entry.tick}:${entry.action}:${i}`,
      agent_id: entry.actor_id,
      tick: entry.tick,
      round,
      action_type: entry.action,
      visibility: entry.visibility || getActionVisibility(entry.action),
      target_content_id: entry.target_content_id ?? null,
      execution_status: artifactResult.executionStatus || "success",
      block_reason: artifactResult.blockReason || null,
      error_class: artifactResult.errorClass || null,
      artifact_refs: {
        artifact_id: artifactResult.artifactId || null,
        artifact_type: artifactResult.artifactType || null,
      },
      persistence: {
        trace_written: true,
        event_written: true,
        artifact_written: Boolean(artifactResult.artifactId),
        snapshot_written: false,
      },
      payload: entry,
    });

    return {
      actionId: execution.action_id,
      agentId: execution.agent_id,
      tick: execution.tick,
      round: execution.round,
      actionType: execution.action_type,
      visibility: execution.visibility,
      executionStatus: execution.execution_status,
      blockReason: execution.block_reason,
      errorClass: execution.error_class,
      targetContentId: execution.target_content_id,
      payload: execution.payload,
      persistence: execution.persistence,
      artifactId: execution.artifact_refs.artifact_id,
      artifactType: execution.artifact_refs.artifact_type,
    };
  });

  const storedActionDocs = traceDocs.map((traceDoc) => ({
    actionId: traceDoc.actionId,
    agentId: traceDoc.agentId,
    round: traceDoc.round,
    tick: traceDoc.tick,
    actionType: traceDoc.actionType,
    visibility: traceDoc.visibility,
    executionStatus: traceDoc.executionStatus,
    targetContentId: traceDoc.targetContentId,
    artifactId: traceDoc.artifactId,
    artifactType: traceDoc.artifactType,
    persistence: traceDoc.persistence,
    payload: traceDoc.payload,
  }));

  if (traceDocs.length > 0) {
    await ActionTrace.insertMany(traceDocs, { ordered: false }).catch(() => {});
    await StoredAction.insertMany(storedActionDocs, { ordered: false }).catch(() => {});
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
      actionId: entry.action_id,
      executionStatus: traceDocs.find((traceDoc) => traceDoc.actionId === entry.action_id)?.executionStatus || "success",
      payload: entry,
      relatedId:
        traceDocs.find((traceDoc) => traceDoc.actionId === entry.action_id)?.artifactId ||
        entry.action_id,
      relatedType:
        traceDocs.find((traceDoc) => traceDoc.actionId === entry.action_id)?.artifactType ||
        "action",
    })),
  ];
  await SimEvent.insertMany(simEvents).catch(() => {});

  // ── Persist AgentState snapshots ──────────────────────────────────────────
  const finalSnapshot = result.snapshots[result.snapshots.length - 1];
  if (finalSnapshot?.agents) {
    for (const agent of finalSnapshot.agents) {
      const latestEntry = latestEntryByAgent.get(agent.agent_id) || null;
      const persistedSnapshot = createPersistedAgentSnapshot({
        snapshot_id: `SNAP:${agent.agent_id}:${round}:${result.tickCount}`,
        agent_id: agent.agent_id,
        round,
        tick: result.tickCount,
        source_action_id: latestEntry?.action_id || null,
        execution_status: "success",
        writeback_ids: [],
        exposure_summary: latestEntry
          ? {
              action_type: latestEntry.action,
              reason: latestEntry.reason,
              target_content_id: latestEntry.target_content_id || null,
            }
          : {},
        reaction_summary: latestEntry?.action === "react" ? { lastReactionActionId: latestEntry.action_id } : {},
        memory_writebacks: [],
        raw_snapshot: agent,
      });

      await AgentState.findOneAndUpdate(
        { agentId: agent.agent_id, round },
        {
          $set: {
            snapshotId: persistedSnapshot.snapshot_id,
            agentId: agent.agent_id,
            round,
            tick: result.tickCount,
            sourceActionId: persistedSnapshot.source_action_id,
            executionStatus: persistedSnapshot.execution_status,
            writebackIds: persistedSnapshot.writeback_ids,
            seedAxes: agentToSeedAxes(agent),
            mutableAxes: agentToMutableAxes(agent),
            archetype: agent.archetype,
            selfNarratives: agent.self_narrative ?? [],
            exposureSummary: persistedSnapshot.exposure_summary,
            reactionSummary: persistedSnapshot.reaction_summary,
            memoryWritebacks: persistedSnapshot.memory_writebacks,
            rawSnapshot: persistedSnapshot.raw_snapshot,
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
