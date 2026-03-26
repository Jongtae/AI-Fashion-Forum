import { Router } from "express";
import { ActionTrace } from "../models/ActionTrace.js";
import { SimEvent } from "../models/SimEvent.js";

const router = Router();

// ── GET /api/traces ───────────────────────────────────────────────────────────
// Query: agentId, round, actionType, limit

router.get("/", async (req, res) => {
  const { agentId, round, actionType } = req.query;
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));

  const filter = {};
  if (agentId) filter.agentId = agentId;
  if (round !== undefined) filter.round = parseInt(round);
  if (actionType) filter.actionType = actionType;

  const traces = await ActionTrace.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ traces, total: traces.length });
});

// ── GET /api/traces/:agentId/summary ─────────────────────────────────────────

router.get("/:agentId/summary", async (req, res) => {
  const { agentId } = req.params;

  const summary = await ActionTrace.aggregate([
    { $match: { agentId } },
    { $group: { _id: "$actionType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const totalTicks = await ActionTrace.countDocuments({ agentId });

  res.json({ agentId, totalTicks, actionBreakdown: summary });
});

// ── GET /api/events ───────────────────────────────────────────────────────────
// Query: eventType, agentId, round, limit

router.get("/events", async (req, res) => {
  const { eventType, agentId, round } = req.query;
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));

  const filter = {};
  if (eventType) filter.eventType = eventType;
  if (agentId) filter.agentId = agentId;
  if (round !== undefined) filter.round = parseInt(round);

  const events = await SimEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ events, total: events.length });
});

export default router;
