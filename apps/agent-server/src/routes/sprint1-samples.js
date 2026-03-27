import { Router } from "express";
import {
  createSprint1ExposureSample,
  createSprint1ForumPostSample,
  createSprint1MemoryWritebackSample,
  createEvaluationSample,
  runTicks,
  createBaselineWorldRules,
} from "@ai-fashion-forum/agent-core";
import { SAMPLE_STATE_SNAPSHOT } from "@ai-fashion-forum/shared-types";

const router = Router();

// ── GET /api/sprint1-agent-seed-sample ───────────────────────────────────────
// Returns the 6 seed agents from SAMPLE_STATE_SNAPSHOT.

router.get("/sprint1-agent-seed-sample", (_req, res) => {
  res.json({ agents: SAMPLE_STATE_SNAPSHOT.agents });
});

// ── GET /api/sprint1-exposure-sample?agent=A01 ───────────────────────────────
// Returns ranked content candidates + reaction records for one agent.

router.get("/sprint1-exposure-sample", async (req, res) => {
  const agentId = req.query.agent || "A01";
  const sample = await createSprint1ExposureSample({ agentId });
  res.json(sample);
});

// ── GET /api/sprint1-memory-writeback-sample?agent=A01 ───────────────────────
// Returns memory timeline after exposure reactions are written back.

router.get("/sprint1-memory-writeback-sample", async (req, res) => {
  const agentId = req.query.agent || "A01";
  const sample = await createSprint1MemoryWritebackSample({ agentId });
  res.json(sample);
});

// ── GET /api/sprint1-forum-post-sample ───────────────────────────────────────
// Returns posts generated from per-agent state updates after shared stimulus.

router.get("/sprint1-forum-post-sample", async (_req, res) => {
  const sample = await createSprint1ForumPostSample();
  res.json(sample);
});

// ── GET /api/sprint1-evaluation-sample ───────────────────────────────────────
// Returns Sprint 1 acceptance verdicts plus general evaluation metrics.

router.get("/sprint1-evaluation-sample", async (_req, res) => {
  const [postSample, generalEval] = await Promise.all([
    createSprint1ForumPostSample(),
    Promise.resolve(createEvaluationSample({ seed: 42, tickCount: 8 })),
  ]);

  const verdicts = computeSprint1Verdicts(postSample);

  res.json({
    verdicts,
    postSample,
    generalEval,
  });
});

// ── GET /api/run-sample?seed=42&ticks=10 ─────────────────────────────────────
// Runs a quick in-memory simulation and returns replay entries + snapshots.

router.get("/run-sample", (req, res) => {
  const seed = parseInt(req.query.seed) || 42;
  const ticks = Math.min(20, Math.max(1, parseInt(req.query.ticks) || 10));

  const result = runTicks({
    seed,
    tickCount: ticks,
    worldRules: createBaselineWorldRules(),
  });

  res.json({
    seed,
    ticks: result.tickCount,
    entries: result.entries,
    snapshots: result.snapshots,
  });
});

// ── Sprint 1 verdict helpers ──────────────────────────────────────────────────

/**
 * Compute the three Sprint 1 acceptance criteria from a forum post sample.
 *
 * divergence_legible        — at least 2 distinct meaning frames AND 2 distinct
 *                             stance signals exist across posts for the same stimulus
 * traceability_complete     — every post has source_content_id, source_reaction_id,
 *                             meaning_frame, and stance_signal populated
 * shared_stimulus_consistent — all posts point to the same source_content_id
 */
function computeSprint1Verdicts(postSample) {
  const posts = postSample?.posts ?? [];

  const meaningFrames = new Set(posts.map((p) => p.meaning_frame).filter(Boolean));
  const stanceSignals = new Set(posts.map((p) => p.stance_signal).filter(Boolean));
  const divergence_legible = meaningFrames.size >= 2 && stanceSignals.size >= 2;

  const traceFields = ["source_content_id", "source_reaction_id", "meaning_frame", "stance_signal"];
  const traceability_complete =
    posts.length > 0 &&
    posts.every((p) => traceFields.every((field) => Boolean(p[field])));

  const contentIds = new Set(posts.map((p) => p.source_content_id).filter(Boolean));
  const shared_stimulus_consistent = contentIds.size === 1;

  return {
    divergence_legible,
    traceability_complete,
    shared_stimulus_consistent,
    detail: {
      meaningFrames: [...meaningFrames],
      stanceSignals: [...stanceSignals],
      postCount: posts.length,
      contentIds: [...contentIds],
    },
  };
}

export default router;
