import { Router } from "express";
import { ActionTrace } from "../models/ActionTrace.js";
import { SimEvent } from "../models/SimEvent.js";
import { AgentState } from "../models/AgentState.js";

const router = Router();

/**
 * GET /api/logging/events
 *
 * Query agent behavior events and content quality logs.
 *
 * Query Parameters:
 *   - agentId: Filter by specific agent
 *   - actionType: Filter by action type (silence, lurk, react, comment, post)
 *   - round: Filter by round number
 *   - tick: Filter by tick number (or tick range with tick_min, tick_max)
 *   - limit: Number of results (default: 50, max: 500)
 *   - offset: Pagination offset (default: 0)
 *
 * Returns:
 *   {
 *     events: [
 *       {
 *         eventId: string,
 *         actionId: string,
 *         agentId: string,
 *         actionType: "silence" | "lurk" | "react" | "comment" | "post",
 *         tick: number,
 *         round: number,
 *         timestamp: ISO string,
 *         visibility: "stored_only" | "public_lightweight" | "public_visible",
 *         executionStatus: "success" | "degraded" | "blocked" | "failed",
 *         targetContentId: string | null,
 *         characterSummary: string | null,
 *       }
 *     ],
 *     total: number,
 *     hasMore: boolean
 *   }
 */
router.get("/events", async (req, res) => {
  try {
    const {
      agentId,
      actionType,
      round,
      tick,
      tick_min,
      tick_max,
      limit = 50,
      offset = 0,
    } = req.query;

    const filter = {};

    if (agentId) filter.agentId = agentId;
    if (actionType) filter.actionType = actionType;
    if (round) filter.round = Number(round);

    if (tick) {
      filter.tick = Number(tick);
    } else if (tick_min || tick_max) {
      filter.tick = {};
      if (tick_min) filter.tick.$gte = Number(tick_min);
      if (tick_max) filter.tick.$lte = Number(tick_max);
    }

    const numLimit = Math.min(Number(limit) || 50, 500);
    const numOffset = Number(offset) || 0;

    const [events, total] = await Promise.all([
      ActionTrace.find(filter)
        .sort({ round: -1, tick: -1 })
        .limit(numLimit)
        .skip(numOffset)
        .lean(),
      ActionTrace.countDocuments(filter),
    ]);

    res.json({
      events: events.map((event) => ({
        eventId: event._id.toString(),
        actionId: event.actionId,
        agentId: event.agentId,
        actionType: event.actionType,
        tick: event.tick,
        round: event.round,
        timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
        visibility: event.visibility,
        executionStatus: event.executionStatus,
        targetContentId: event.targetContentId || null,
        characterSummary: event.appliedCharacter || null,
      })),
      total,
      hasMore: numOffset + numLimit < total,
    });
  } catch (err) {
    console.error("[logging] events query failed:", err);
    res.status(500).json({ error: "events_query_failed" });
  }
});

/**
 * GET /api/logging/content-quality
 *
 * Query content quality metrics and operator-visible logs.
 *
 * Query Parameters:
 *   - round: Filter by round
 *   - limit: Number of results
 *   - offset: Pagination offset
 *
 * Returns content quality logs with actor reference and timestamps.
 */
router.get("/content-quality", async (req, res) => {
  try {
    const { round, limit = 50, offset = 0 } = req.query;

    const filter = {};
    if (round) filter.round = Number(round);

    const numLimit = Math.min(Number(limit) || 50, 500);
    const numOffset = Number(offset) || 0;

    // Query posts/comments that were created by agents
    const traces = await ActionTrace.find({
      ...filter,
      actionType: { $in: ["post", "comment", "quote"] },
    })
      .sort({ round: -1, tick: -1 })
      .limit(numLimit)
      .skip(numOffset)
      .lean();

    const contentQualityLogs = traces.map((trace) => ({
      contentId: trace.artifactId || `${trace.agentId}:${trace.actionId}`,
      actorId: trace.agentId,
      actorHandle: trace.appliedCharacter || trace.agentId,
      type: trace.actionType,
      round: trace.round,
      tick: trace.tick,
      timestamp: trace.createdAt?.toISOString() || new Date().toISOString(),
      visibility: trace.visibility,
      quality: {
        executionStatus: trace.executionStatus,
        visibility: trace.visibility === "public_visible" ? "visible" : "hidden",
      },
      metadata: trace.payload || {},
    }));

    res.json({
      logs: contentQualityLogs,
      total: await ActionTrace.countDocuments({
        ...filter,
        actionType: { $in: ["post", "comment", "quote"] },
      }),
    });
  } catch (err) {
    console.error("[logging] content-quality query failed:", err);
    res.status(500).json({ error: "content_quality_query_failed" });
  }
});

/**
 * GET /api/logging/trace/:actionId
 *
 * Get detailed trace for a specific action including state deltas.
 *
 * Returns:
 *   {
 *     actionId: string,
 *     agentId: string,
 *     round: number,
 *     tick: number,
 *     actionType: string,
 *     previousState: {...},
 *     nextState: {...},
 *     stateDelta: {
 *       engagementDelta: number,
 *       beliefDelta: number,
 *       ...
 *     },
 *     timestamp: ISO string,
 *   }
 */
router.get("/trace/:actionId", async (req, res) => {
  try {
    const { actionId } = req.params;

    const trace = await ActionTrace.findOne({ actionId }).lean();
    if (!trace) {
      return res.status(404).json({ error: "action_not_found" });
    }

    // Try to find agent state snapshots before and after
    const agentStates = await AgentState.find({ agentId: trace.agentId })
      .sort({ round: -1, tick: -1 })
      .limit(10)
      .lean();

    const afterState = agentStates.find(
      (s) => s.round === trace.round && s.tick > trace.tick
    );
    const beforeState = agentStates.find(
      (s) => s.round === trace.round && s.tick <= trace.tick
    );

    res.json({
      actionId: trace.actionId,
      agentId: trace.agentId,
      round: trace.round,
      tick: trace.tick,
      actionType: trace.actionType,
      executionStatus: trace.executionStatus,
      previousState: beforeState ? beforeState.agentState : null,
      nextState: afterState ? afterState.agentState : null,
      stateDelta: trace.stateDelta || {},
      timestamp: trace.createdAt?.toISOString() || new Date().toISOString(),
    });
  } catch (err) {
    console.error("[logging] trace query failed:", err);
    res.status(500).json({ error: "trace_query_failed" });
  }
});

/**
 * GET /api/logging/summary
 *
 * Get high-level summary of agent behavior and content creation.
 *
 * Returns:
 *   {
 *     totalEvents: number,
 *     eventsByType: { silence: n, lurk: n, react: n, comment: n, post: n },
 *     totalAgents: number,
 *     avgEngagement: number,
 *     visibilityBreakdown: { stored_only: n, public_lightweight: n, public_visible: n },
 *     latestRound: number,
 *   }
 */
router.get("/summary", async (req, res) => {
  try {
    const [
      totalEvents,
      eventsByType,
      totalAgents,
      visibilityBreakdown,
    ] = await Promise.all([
      ActionTrace.countDocuments(),
      ActionTrace.aggregate([
        { $group: { _id: "$actionType", count: { $sum: 1 } } },
      ]),
      ActionTrace.distinct("agentId").then((ids) => ids.length),
      ActionTrace.aggregate([
        { $group: { _id: "$visibility", count: { $sum: 1 } } },
      ]),
    ]);

    const eventsByTypeMap = Object.fromEntries(
      eventsByType.map((item) => [item._id || "unknown", item.count])
    );
    const visibilityMap = Object.fromEntries(
      visibilityBreakdown.map((item) => [item._id || "unknown", item.count])
    );

    res.json({
      totalEvents,
      eventsByType: eventsByTypeMap,
      totalAgents,
      visibilityBreakdown: visibilityMap,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[logging] summary query failed:", err);
    res.status(500).json({ error: "summary_query_failed" });
  }
});

export default router;
