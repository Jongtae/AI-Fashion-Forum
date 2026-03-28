import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import {
  createSprint1ExposureSample,
  rememberSprint1Reaction,
  createMemoryRuntime,
  buildSprint1PostTitle,
  buildSprint1PostBody,
  runTicks,
  createBaselineWorldRules,
  computeTickLevelMetrics,
  computeAgentConsistencyScore,
  createRunReport,
} from "@ai-fashion-forum/agent-core";
import {
  SAMPLE_AGENT_STATES,
  SAMPLE_STATE_SNAPSHOT,
  createStateSnapshot,
} from "@ai-fashion-forum/shared-types";
import { SimEvent } from "../models/SimEvent.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPLAY_DIR = path.resolve(__dirname, "../../../../data/replays");

const FORUM_SERVER_URL = process.env.FORUM_SERVER_URL || "http://localhost:4000";

async function postToForum(urlPath, body) {
  const res = await fetch(`${FORUM_SERVER_URL}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`forum-server ${urlPath} failed: ${err.error || res.status}`);
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

  const runtime = createMemoryRuntime({
    state: createStateSnapshot({
      agents: JSON.parse(JSON.stringify(SAMPLE_AGENT_STATES)),
      contents: [],
      nodes: [],
      relations: [],
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
  const generatedPosts = runtime.state.agents.map((updatedAgent) => {
    const exposureSample = exposureByAgent[updatedAgent.agent_id];
    const topReaction = exposureSample?.reaction_records?.[0];
    const topContent = exposureSample?.exposure?.selected?.[0];

    if (!topReaction || !topContent) {
      return null;
    }

    return {
      post_id: `${runId}:post:${updatedAgent.agent_id}`,
      agent_id: updatedAgent.agent_id,
      handle: updatedAgent.handle,
      source_content_id: topReaction.content_id,
      source_reaction_id: topReaction.reaction_id,
      meaning_frame: topReaction.meaning_frame,
      stance_signal: topReaction.stance_signal,
      title: buildSprint1PostTitle(updatedAgent, topReaction),
      body: buildSprint1PostBody(updatedAgent, topReaction, topContent),
      trace: {
        dominant_feeling: topReaction.dominant_feeling,
        resonance_score: topReaction.resonance_score,
        self_narrative_summary: updatedAgent.mutable_state?.self_narrative_summary || "",
        recent_arc: updatedAgent.mutable_state?.recent_arc || "stable",
      },
    };
  }).filter(Boolean);

  // ── Step 3: Post to forum-server ──────────────────────────────────────────
  const createdPosts = [];
  for (const post of generatedPosts) {
    try {
      const result = await postToForum("/api/posts", {
        content: `${post.title}\n\n${post.body}`,
        authorId: post.agent_id,
        authorType: "agent",
        tags: [post.meaning_frame, post.stance_signal].filter(Boolean),
      });
      createdPosts.push({ ...post, forumPostId: result._id?.toString() ?? null });
    } catch (err) {
      console.warn(`[run] forum post failed for ${post.agent_id}:`, err.message);
      createdPosts.push({ ...post, forumPostId: null, postError: err.message });
    }
  }

  // ── Step 4: Tick engine (deterministic with seed) ─────────────────────────
  const tickResult = runTicks({
    seed,
    tickCount: ticks,
    initialState: JSON.parse(JSON.stringify(SAMPLE_STATE_SNAPSHOT)),
    worldRules: createBaselineWorldRules(),
  });

  // ── Step 5: Evaluation metrics ────────────────────────────────────────────
  const tickMetrics = computeTickLevelMetrics(tickResult);
  const agentConsistency = runtime.state.agents.map((agent) => ({
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
  });

  // ── Step 7: Replay export ─────────────────────────────────────────────────
  const replayExport = {
    run_id: runId,
    seed,
    ticks,
    created_at: createdAt,
    agents: runtime.state.agents.map((a) => ({
      agent_id: a.agent_id,
      handle: a.handle,
      archetype: a.archetype,
      mutable_state: a.mutable_state ?? null,
      self_narrative: a.self_narrative ?? [],
    })),
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
  });
});

// ── GET /api/run/report/latest ────────────────────────────────────────────────
// Returns the most recently generated evaluation report JSON.

router.get("/report/latest", (_req, res) => {
  if (!fs.existsSync(REPLAY_DIR)) {
    return res.status(404).json({ error: "no_reports_yet" });
  }

  const files = fs
    .readdirSync(REPLAY_DIR)
    .filter((f) => f.endsWith("-report.json"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(REPLAY_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    return res.status(404).json({ error: "no_reports_yet" });
  }

  const content = JSON.parse(fs.readFileSync(path.join(REPLAY_DIR, files[0].name), "utf8"));
  res.json(content);
});

// ── GET /api/run/replay/latest ────────────────────────────────────────────────
// Returns the most recently saved replay JSON.

router.get("/replay/latest", (_req, res) => {
  if (!fs.existsSync(REPLAY_DIR)) {
    return res.status(404).json({ error: "no_replays_yet" });
  }

  const files = fs
    .readdirSync(REPLAY_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith("-report.json"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(REPLAY_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    return res.status(404).json({ error: "no_replays_yet" });
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
