import { Router } from "express";
import {
  serializeTickState,
  deserializeTickState,
} from "@ai-fashion-forum/agent-core";
import { SimCheckpoint } from "../models/SimCheckpoint.js";

const router = Router();

// ── POST /api/checkpoints ────────────────────────────────────────────────────
// Save a checkpoint from a tick-engine result.
//
// Body: { simulationId, seed, tickResult, label? }
// tickResult must contain: { seed, tickCount, finalTick, finalState, entries, snapshots? }

router.post("/", async (req, res) => {
  const { simulationId, tickResult, label } = req.body || {};

  if (!simulationId || !tickResult?.finalState) {
    return res.status(400).json({ error: "simulationId and tickResult.finalState are required" });
  }

  const serialized = serializeTickState(tickResult);
  const checkpointId = `chk-${simulationId}-t${serialized.finalTick}-${Date.now()}`;

  const doc = await SimCheckpoint.create({
    checkpointId,
    simulationId,
    seed: serialized.seed,
    tick: serialized.finalTick,
    tickCount: serialized.tickCount,
    finalTick: serialized.finalTick,
    stateSnapshot: serialized.finalState,
    entries: serialized.entries,
    label: label || "",
  });

  res.json({
    checkpointId: doc.checkpointId,
    simulationId: doc.simulationId,
    tick: doc.tick,
    createdAt: doc.createdAt,
  });
});

// ── GET /api/checkpoints ─────────────────────────────────────────────────────
// List checkpoints, optionally filtered by simulationId.

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.simulationId) {
    filter.simulationId = req.query.simulationId;
  }

  const checkpoints = await SimCheckpoint.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .select("checkpointId simulationId seed tick tickCount label createdAt restoredFrom")
    .lean();

  res.json(checkpoints);
});

// ── GET /api/checkpoints/:checkpointId ───────────────────────────────────────
// Get a single checkpoint (without full state, unless ?full=true).

router.get("/:checkpointId", async (req, res) => {
  const doc = await SimCheckpoint.findOne({ checkpointId: req.params.checkpointId }).lean();

  if (!doc) {
    return res.status(404).json({ error: "checkpoint_not_found" });
  }

  if (req.query.full !== "true") {
    const { stateSnapshot: _s, entries: _e, ...summary } = doc;
    return res.json({ ...summary, agentCount: _s?.agents?.length ?? 0, entryCount: _e?.length ?? 0 });
  }

  res.json(doc);
});

// ── POST /api/checkpoints/:checkpointId/restore ─────────────────────────────
// Restore a checkpoint: returns the deserialized state ready for runTicks().

router.post("/:checkpointId/restore", async (req, res) => {
  const doc = await SimCheckpoint.findOne({ checkpointId: req.params.checkpointId }).lean();

  if (!doc) {
    return res.status(404).json({ error: "checkpoint_not_found" });
  }

  const restored = deserializeTickState({
    seed: doc.seed,
    tickCount: doc.tickCount,
    finalTick: doc.finalTick,
    finalState: doc.stateSnapshot,
    entries: doc.entries,
  });

  // Mark the checkpoint as having been restored
  await SimCheckpoint.updateOne(
    { checkpointId: doc.checkpointId },
    { $set: { restoredFrom: doc.checkpointId } }
  ).catch(() => {});

  res.json({
    checkpointId: doc.checkpointId,
    restored: {
      seed: restored.seed,
      finalTick: restored.finalTick,
      agentCount: restored.finalState?.agents?.length ?? 0,
      entryCount: restored.entries?.length ?? 0,
    },
    initialState: restored.finalState,
  });
});

// ── DELETE /api/checkpoints/:checkpointId ────────────────────────────────────

router.delete("/:checkpointId", async (req, res) => {
  const result = await SimCheckpoint.deleteOne({ checkpointId: req.params.checkpointId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "checkpoint_not_found" });
  }

  res.json({ deleted: true, checkpointId: req.params.checkpointId });
});

export default router;
