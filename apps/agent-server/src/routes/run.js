import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import {
  createSprint1ExposureSample,
  rememberSprint1Reaction,
  createMemoryRuntime,
  createRunPostDraft,
  runTicks,
  createBaselineWorldRules,
  computeTickLevelMetrics,
  computeAgentConsistencyScore,
  createRunReport,
} from "@ai-fashion-forum/agent-core";
import {
  SAMPLE_AGENT_STATES,
  createStateSnapshot,
} from "@ai-fashion-forum/shared-types";
import {
  createSpawnedAgentState,
} from "../lib/agent-state.js";
import { loadAgentStartupStateSnapshot } from "../lib/agent-startup-state.js";
import { SimEvent } from "../models/SimEvent.js";
import {
  buildPopulationGrowthPlan,
  DEFAULT_INITIAL_AGENT_COUNT,
} from "../lib/population-growth.js";
import { buildAgentEvolutionTimeline } from "../lib/agent-evolution.js";
import { getForumWritebackMode, shouldWriteForumArtifacts } from "../lib/forum-writeback.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPLAY_DIR = path.resolve(__dirname, "../../../../data/replays");

const FORUM_SERVER_URL = process.env.FORUM_SERVER_URL || "http://localhost:4000";
const SIMULATION_OPENAI_API_KEY =
  process.env.OPENAI_SIMULATION_ENABLED === "true" ? process.env.OPENAI_API_KEY || "" : "";

async function postToForum(urlPath, body) {
  const res = await fetch(`${FORUM_SERVER_URL}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(`forum-server ${urlPath} failed: ${err.error || res.status}`);
    error.status = res.status;
    error.payload = err;
    throw error;
  }
  return res.json();
}

// ── POST /api/run ─────────────────────────────────────────────────────────────
// End-to-end vertical slice (M2-1):
//   per-agent biased exposure → memory writeback → state-driven post generation
//   → forum-server posts → tick engine → eval metrics → replay export
//
// Body params:
//   seed   (number, default 42)  — deterministic seed for the tick engine
//   ticks  (number, default 5)   — tick count (1–10)
//
// Replay JSON is saved to data/replays/<run-id>.json
// Returns: run summary with metrics and replay file path.

router.post("/", async (req, res) => {
  const seed = parseInt(req.body?.seed) || 42;
  const requestedTicks = Math.min(10, Math.max(1, parseInt(req.body?.ticks) || 5));
  const speed = Math.min(10, Math.max(1, parseInt(req.body?.speed) || 1));
  const ticks = Math.min(50, requestedTicks * speed);
  const runId = `run-${seed}-${Date.now()}`;
  const startupStateSnapshot = loadAgentStartupStateSnapshot();

  const runtime = createMemoryRuntime({
    state: createStateSnapshot({
      agents: JSON.parse(JSON.stringify(startupStateSnapshot.agents || SAMPLE_AGENT_STATES)),
      contents: JSON.parse(JSON.stringify(startupStateSnapshot.contents || [])),
      nodes: JSON.parse(JSON.stringify(startupStateSnapshot.graph?.nodes || [])),
      relations: JSON.parse(JSON.stringify(startupStateSnapshot.graph?.relations || [])),
    }),
  });

  // ── Step 1: Per-agent biased exposure + memory writeback ──────────────────
  const exposureByAgent = {};
  const writebacksByAgent = {};

  for (const agent of runtime.state.agents) {
    const exposureSample = await createSprint1ExposureSample({ agentId: agent.agent_id });

    const writes = exposureSample.reaction_records
      .filter((r) => r.memory_write_hint.should_write)
      .map((r) => rememberSprint1Reaction(runtime, r));

    exposureByAgent[agent.agent_id] = exposureSample;
    writebacksByAgent[agent.agent_id] = writes.filter(Boolean).length;
  }

  // ── Step 2: State-driven post generation (after memory writeback) ─────────
  const generatedPosts = [];
  const recentDraftTexts = [];
  for (const [index, updatedAgent] of runtime.state.agents.entries()) {
    const exposureSample = exposureByAgent[updatedAgent.agent_id];
    const reactions = exposureSample?.reaction_records || [];
    const selectedContents = exposureSample?.exposure?.selected || [];
    const variationSeed = seed + index;
    const reactionIndex = reactions.length ? variationSeed % reactions.length : 0;
    const contentIndex = selectedContents.length ? variationSeed % selectedContents.length : 0;
    const selectedReaction = reactions[reactionIndex] || reactions[0] || null;
    const selectedContent = selectedContents[contentIndex] || selectedContents[0] || null;

    if (!selectedReaction || !selectedContent) {
      continue;
    }

    const draft = await createRunPostDraft({
      updatedAgent,
      reactionRecord: selectedReaction,
      contentRecord: selectedContent,
      styleProfile: updatedAgent?.seed_profile?.comment_style || null,
      comparisonTexts: [
        ...recentDraftTexts.slice(-8),
        selectedContent?.title || "",
        selectedContent?.content || "",
        selectedContent?.body || "",
        selectedReaction?.meaning_frame || "",
        selectedReaction?.stance_signal || "",
      ].filter(Boolean),
      variationSeed,
      apiKey: SIMULATION_OPENAI_API_KEY,
    });

    if (draft.content) {
      recentDraftTexts.push(draft.content);
    }
    generatedPosts.push({
      post_id: `${runId}:post:${updatedAgent.agent_id}`,
      agent_id: updatedAgent.agent_id,
      handle: updatedAgent.handle,
      display_name: updatedAgent.display_name,
      avatar_url: updatedAgent.avatar_url,
      avatar_locale: updatedAgent.avatar_locale,
      source_content_id: selectedReaction.content_id,
      source_reaction_id: selectedReaction.reaction_id,
      meaning_frame: selectedReaction.meaning_frame,
      stance_signal: selectedReaction.stance_signal,
      title: draft.title || null,
      body: draft.content,
      generationContext: draft.generationContext,
      contextPool: draft.contextPool,
      trace: {
        dominant_feeling: selectedReaction.dominant_feeling,
        resonance_score: selectedReaction.resonance_score,
        self_narrative_summary: updatedAgent.mutable_state?.self_narrative_summary || "",
        recent_arc: updatedAgent.mutable_state?.recent_arc || "stable",
        selected_content_id: selectedContent.content_id,
        variation_seed: variationSeed,
      },
    });
  }

  // ── Step 3: Post to forum-server ──────────────────────────────────────────
  const createdPosts = [];
  const writebackMode = getForumWritebackMode();
  const writeForumArtifacts = shouldWriteForumArtifacts();
  for (const post of generatedPosts) {
    if (!writeForumArtifacts) {
      createdPosts.push({
        ...post,
        forumPostId: null,
        writeSkipped: true,
        writeSkipReason: "forum_writeback_disabled",
      });
      continue;
    }

    try {
      const result = await postToForum("/api/posts", {
        title: post.title || null,
        content: post.body,
        authorId: post.agent_id,
        authorType: "agent",
        authorDisplayName: post.display_name || post.handle || post.agent_id,
        authorHandle: post.handle || post.display_name || post.agent_id,
        authorAvatarUrl: post.avatar_url || "",
        authorLocale: post.avatar_locale || "",
        tags: [post.meaning_frame, post.stance_signal].filter(Boolean),
        generationContext: post.generationContext,
      });
      createdPosts.push({ ...post, forumPostId: result._id?.toString() ?? null });
    } catch (err) {
      const rateLimited = err.status === 429;
      console.warn(`[run] forum post failed for ${post.agent_id}:`, err.message);
      createdPosts.push({
        ...post,
        forumPostId: null,
        postError: rateLimited ? "agent_write_rate_limited" : err.message,
        writeBlocked: rateLimited,
      });
    }
  }

  // ── Step 4: Tick engine (deterministic with seed) ─────────────────────────
  const tickResult = runTicks({
    seed,
    tickCount: ticks,
    initialState: JSON.parse(JSON.stringify(startupStateSnapshot)),
    worldRules: createBaselineWorldRules(),
    spawnAgent: ({ world, tick: currentTick }) => {
      const growthPlan = buildPopulationGrowthPlan({
        currentCount: world.state.agents.length,
        elapsedTicks: currentTick,
        initialCount: DEFAULT_INITIAL_AGENT_COUNT,
      });

      if (!growthPlan.shouldSpawn) {
        return null;
      }

      return {
        ...createSpawnedAgentState({
          existingAgents: world.state.agents,
          seed,
          round: 1,
          tick: currentTick,
          spawnIndex: world.state.agents.length - DEFAULT_INITIAL_AGENT_COUNT,
        }),
      };
    },
  });

  // ── Step 5: Evaluation metrics ────────────────────────────────────────────
  const tickMetrics = computeTickLevelMetrics(tickResult);
  const finalAgents = tickResult.finalState?.agents || runtime.state.agents;
  const growthPlan = buildPopulationGrowthPlan({
    currentCount: finalAgents.length,
    elapsedTicks: ticks,
    initialCount: DEFAULT_INITIAL_AGENT_COUNT,
  });
  const agentEvolution = buildAgentEvolutionTimeline({
    snapshots: tickResult.snapshots,
  });
  const agentConsistency = finalAgents.map((agent) => ({
    agent_id: agent.agent_id,
    handle: agent.handle,
    consistency_score: computeAgentConsistencyScore(agent, tickResult.entries),
  }));

  const meaningFrames = generatedPosts.map((p) => p.meaning_frame);
  const stanceSignals = generatedPosts.map((p) => p.stance_signal);
  const sprint1Verdicts = {
    divergence_legible: new Set(meaningFrames).size >= 2,
    distinct_meaning_frames: new Set(meaningFrames).size,
    distinct_stance_signals: new Set(stanceSignals).size,
    traceability_complete: generatedPosts.every(
      (p) => p.source_content_id && p.meaning_frame && p.stance_signal
    ),
    meaning_frame_distribution: Object.fromEntries(
      [...new Set(meaningFrames)].map((f) => [f, meaningFrames.filter((x) => x === f).length])
    ),
  };

  const lastTickMetric = tickMetrics[tickMetrics.length - 1] ?? null;
  const createdAt = new Date().toISOString();

  // ── Step 6: Evaluation report ─────────────────────────────────────────────
  const report = createRunReport({
    runId,
    seed,
    ticks,
    createdAt,
    generatedPosts,
    exposureByAgent,
    tickMetrics,
    agentConsistency,
    sprint1Verdicts,
    agentGrowth: {
      initialCount: DEFAULT_INITIAL_AGENT_COUNT,
      currentCount: finalAgents.length,
      desiredCount: growthPlan.desiredCount,
      growthInterval: growthPlan.growthInterval,
      maxCount: growthPlan.maxCount,
      growthStage: growthPlan.growthStage,
      ticksUntilNextSpawn: growthPlan.ticksUntilNextSpawn,
    },
    agentEvolution,
  });

  // ── Step 7: Replay export ─────────────────────────────────────────────────
  const replayExport = {
    run_id: runId,
    seed,
    ticks,
    created_at: createdAt,
    agents: finalAgents.map((a) => ({
      agent_id: a.agent_id,
      handle: a.handle,
      display_name: a.display_name,
      avatar_url: a.avatar_url || null,
      avatar_locale: a.avatar_locale || null,
      archetype: a.archetype,
      mutable_state: a.mutable_state ?? null,
      self_narrative: a.self_narrative ?? [],
    })),
    agent_growth: report.agent_growth,
    agent_evolution: agentEvolution,
    exposures: Object.fromEntries(
      Object.entries(exposureByAgent).map(([id, s]) => [
        id,
        {
          selected_content_ids: s.exposure?.selected?.map((c) => c.content_id) ?? [],
          reaction_count: s.reaction_records?.length ?? 0,
          writebacks: writebacksByAgent[id] ?? 0,
        },
      ])
    ),
    posts: createdPosts,
    tick_entries: tickResult.entries,
    report,
  };

  fs.mkdirSync(REPLAY_DIR, { recursive: true });
  const replayFile = `${runId}.json`;
  const reportFile = `${runId}-report.json`;
  fs.writeFileSync(path.join(REPLAY_DIR, replayFile), JSON.stringify(replayExport, null, 2), "utf8");
  fs.writeFileSync(path.join(REPLAY_DIR, reportFile), JSON.stringify(report, null, 2), "utf8");

  await SimEvent.insertMany([
    {
      eventType: "run_complete",
      payload: {
        run_id: runId,
        seed,
        ticks,
        posts_created: createdPosts.filter((p) => !p.postError).length,
        sprint1_verdicts: sprint1Verdicts,
        replay_file: replayFile,
        report_file: reportFile,
      },
    },
  ]).catch(() => {});

  res.json({
    run_id: runId,
    seed,
    requested_ticks: requestedTicks,
    speed,
    ticks,
    posts_created: createdPosts.filter((p) => !p.postError).length,
    replay_file: replayFile,
    report_file: reportFile,
    report: report.metrics,
    sprint1_verdicts: sprint1Verdicts,
    agent_growth: report.agent_growth,
    agent_evolution: agentEvolution,
    writeback_mode: writebackMode,
    writeback_disabled: !writeForumArtifacts,
  });
});

// ── GET /api/run/report/latest ────────────────────────────────────────────────
// Returns the most recently generated evaluation report JSON.

router.get("/report/latest", (_req, res) => {
  if (!fs.existsSync(REPLAY_DIR)) {
    return res.json(null);
  }

  const files = fs
    .readdirSync(REPLAY_DIR)
    .filter((f) => f.endsWith("-report.json"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(REPLAY_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    return res.json(null);
  }

  const content = JSON.parse(fs.readFileSync(path.join(REPLAY_DIR, files[0].name), "utf8"));
  res.json(content);
});

// ── GET /api/run/replay/latest ────────────────────────────────────────────────
// Returns the most recently saved replay JSON.

router.get("/replay/latest", (_req, res) => {
  if (!fs.existsSync(REPLAY_DIR)) {
    return res.json(null);
  }

  const files = fs
    .readdirSync(REPLAY_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith("-report.json"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(REPLAY_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    return res.json(null);
  }

  const content = JSON.parse(fs.readFileSync(path.join(REPLAY_DIR, files[0].name), "utf8"));
  res.json(content);
});

// ── GET /api/run/replay/:runId ────────────────────────────────────────────────
// Returns a specific replay JSON by run ID.

router.get("/replay/:runId", (req, res) => {
  const replayPath = path.join(REPLAY_DIR, `${req.params.runId}.json`);

  if (!fs.existsSync(replayPath)) {
    return res.status(404).json({ error: "replay_not_found" });
  }

  const content = JSON.parse(fs.readFileSync(replayPath, "utf8"));
  res.json(content);
});

export default router;
