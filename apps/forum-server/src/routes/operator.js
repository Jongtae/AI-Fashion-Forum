import { Router } from "express";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { User } from "../models/User.js";
import { Interaction } from "../models/Interaction.js";
import { Report } from "../models/Report.js";
import { Feedback } from "../models/Feedback.js";
import { buildFeedbackFilter, buildInteractionFilter } from "../lib/engagement.js";
import { buildModerationState } from "../lib/moderation.js";
import {
  getPendingNotifications,
  acknowledgeNotification,
  recordEscalationAction,
  getEscalationStatistics,
} from "../lib/notification.js";

const router = Router();

// ── GET /api/operator/metrics ─────────────────────────────────────────────────
// 운영자 대시보드용 집계 메트릭.
// 사용자 참여 지표, 콘텐츠 현황, 에이전트 활동량을 반환한다.

router.get("/metrics", async (req, res) => {
  const since = req.query.since
    ? new Date(req.query.since)
    : new Date(Date.now() - 24 * 60 * 60 * 1000); // 기본: 최근 24시간

  const [
    totalPosts,
    totalComments,
    totalUsers,
    agentPosts,
    userPosts,
    totalLikes,
    flaggedPosts,
    pendingReports,
    pendingFeedback,
    recentInteractions,
    recentFeedback,
    topTags,
  ] = await Promise.all([
    Post.countDocuments(),
    Comment.countDocuments(),
    User.countDocuments(),
    Post.countDocuments({ authorType: "agent" }),
    Post.countDocuments({ authorType: "user" }),
    Post.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }]),
    Post.countDocuments({ moderationStatus: "flagged" }),
    Report.countDocuments({ status: "pending" }),
    Feedback.countDocuments({ status: "pending" }),
    // 최근 기간의 사용자 interaction 이벤트 카운트
    Interaction.aggregate([
      { $match: { createdAt: { $gte: since }, actorType: "user" } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Feedback.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$category", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
      { $sort: { count: -1 } },
    ]),
    // 인기 태그 Top 10
    Post.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    since: since.toISOString(),
    content: {
      totalPosts,
      userPosts,
      agentPosts,
      totalComments,
      totalLikes: totalLikes[0]?.total ?? 0,
    },
    users: {
      totalUsers,
    },
    moderation: {
      flaggedPosts,
      pendingReports,
      pendingFeedback,
    },
    engagement: {
      recentInteractions: Object.fromEntries(
        recentInteractions.map((r) => [r._id, r.count])
      ),
      recentFeedback: recentFeedback.map((item) => ({
        category: item._id,
        count: item.count,
        avgRating: item.avgRating ? Number(item.avgRating.toFixed(2)) : null,
      })),
    },
    topTags: topTags.map((t) => ({ tag: t._id, count: t.count })),
  });
});

// ── GET /api/operator/logs ────────────────────────────────────────────────────
// 원시 행동 로그 조회. 이상 행동 탐지 및 분석에 사용.
// Query: actorType, eventType, actorId, since, limit

router.get("/logs", async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
  const filter = buildInteractionFilter(req.query);

  const logs = await Interaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ logs, total: logs.length });
});

router.get("/feedback", async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const filter = buildFeedbackFilter(req.query);

  const feedback = await Feedback.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ feedback, total: feedback.length });
});

router.get("/feedback/summary", async (req, res) => {
  const since = req.query.since
    ? new Date(req.query.since)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const summary = await Feedback.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { category: "$category", status: "$status" },
        count: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
    { $sort: { "_id.category": 1, "_id.status": 1 } },
  ]);

  res.json({
    since: since.toISOString(),
    summary: summary.map((item) => ({
      category: item._id.category,
      status: item._id.status,
      count: item.count,
      avgRating: item.avgRating ? Number(item.avgRating.toFixed(2)) : null,
    })),
  });
});

router.get("/moderation/queue", async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const minScore = typeof req.query.minScore === "string" ? Number(req.query.minScore) : 0.45;
  const status = req.query.status || "flagged";

  const posts = await Post.find({
    moderationStatus: status,
    moderationScore: { $gte: Number.isFinite(minScore) ? minScore : 0.45 },
  })
    .sort({ moderationScore: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    posts: posts.map((post) => ({
      id: post._id,
      content: post.content,
      moderationStatus: post.moderationStatus,
      moderationLabel: post.moderationLabel,
      moderationScore: post.moderationScore,
      moderationReasons: post.moderationReasons ?? [],
      moderationCategories: post.moderationCategories ?? [],
      moderationModelVersion: post.moderationModelVersion ?? null,
      moderationEvaluatedAt: post.moderationEvaluatedAt ?? null,
      reportCount: post.reportCount,
      createdAt: post.createdAt,
    })),
    total: posts.length,
  });
});

router.post("/moderation/recheck/:postId", async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  Object.assign(
    post,
    buildModerationState({
      content: post.content,
      tags: post.tags,
      existingStatus: post.moderationStatus,
    })
  );

  await post.save();

  res.json({
    id: post._id,
    moderationStatus: post.moderationStatus,
    moderationLabel: post.moderationLabel,
    moderationScore: post.moderationScore,
    moderationReasons: post.moderationReasons,
    moderationCategories: post.moderationCategories,
    moderationModelVersion: post.moderationModelVersion,
    moderationEvaluatedAt: post.moderationEvaluatedAt,
  });
});

// ── GET /api/operator/dashboard ──────────────────────────────────────────────
// MVP 1-page operator dashboard: 5 sections in a single call.
// Sections: flag rate, high-conflict threads, moderation queue,
//           low-engagement posts, engagement summary.

router.get("/dashboard", async (req, res) => {
  const { AgentState } = await import("../models/AgentState.js");

  const [
    totalPosts,
    flaggedCount,
    highConflictPosts,
    moderationQueue,
    lowEngagementPosts,
    recentFeedbackCounts,
    agentStates,
  ] = await Promise.all([
    Post.countDocuments(),

    Post.countDocuments({ moderationStatus: "flagged" }),

    // 논쟁성 높은 스레드 Top 5: reportCount DESC, then moderationScore DESC
    Post.find({ reportCount: { $gt: 0 } })
      .sort({ reportCount: -1, moderationScore: -1 })
      .limit(5)
      .select("content tags reportCount moderationScore moderationLabel createdAt authorId authorType")
      .lean(),

    // 규칙 위반 후보 (moderation queue) — flagged posts, up to 10
    Post.find({ moderationStatus: "flagged" })
      .sort({ moderationScore: -1, createdAt: -1 })
      .limit(10)
      .select("content tags moderationScore moderationLabel moderationReasons moderationStatus createdAt authorId authorType")
      .lean(),

    // 유저 반응 저하 포스트: likes=0, commentCount=0, not agent
    Post.find({ likes: 0, commentCount: 0 })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("content tags likes commentCount createdAt authorId authorType")
      .lean(),

    // Feedback 요약 (최근 7일)
    Feedback.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } },
      { $group: { _id: "$category", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
      { $sort: { count: -1 } },
    ]),

    // 급격한 정체성 변화 에이전트 — 마지막 두 라운드 비교
    AgentState.aggregate([
      { $sort: { agentId: 1, round: -1 } },
      { $group: { _id: "$agentId", states: { $push: "$$ROOT" } } },
      { $limit: 100 },
    ]),
  ]);

  // Identity shift 계산: 각 에이전트의 마지막 두 라운드 비교
  const identityShiftThreshold = 0.3;
  const identityShiftAgents = [];

  for (const agent of agentStates) {
    const states = agent.states;
    if (states.length < 2) continue;

    const [latest, previous] = states;
    if (!latest.mutableAxes || !previous.mutableAxes) continue;

    // mutableAxes의 변화도 계산
    let totalShift = 0;
    let axisCount = 0;
    // lean() 쿼리로 인해 Map이 객체로 변환되므로 Object.entries() 사용
    for (const [key, latestValue] of Object.entries(latest.mutableAxes || {})) {
      const prevValue = (previous.mutableAxes && previous.mutableAxes[key]) ?? 0;
      const shift = Math.abs(latestValue - prevValue);
      totalShift += shift;
      axisCount++;
    }

    const avgShift = axisCount > 0 ? totalShift / axisCount : 0;

    if (avgShift > identityShiftThreshold) {
      identityShiftAgents.push({
        agentId: agent._id,
        shift_magnitude: Number(avgShift.toFixed(3)),
        archetype: latest.archetype,
        round: latest.round,
      });
    }
  }

  // shift magnitude 내림차순 정렬, Top 5
  identityShiftAgents.sort((a, b) => b.shift_magnitude - a.shift_magnitude);

  const flagRate = totalPosts > 0 ? Number((flaggedCount / totalPosts).toFixed(4)) : 0;

  res.json({
    computed_at: new Date().toISOString(),
    summary: {
      total_posts: totalPosts,
      flagged_posts: flaggedCount,
      flag_rate: flagRate,
    },
    high_conflict_threads: highConflictPosts.map((p) => ({
      id: p._id,
      content_preview: p.content?.slice(0, 120),
      report_count: p.reportCount,
      moderation_score: p.moderationScore,
      moderation_label: p.moderationLabel,
      author_type: p.authorType,
      created_at: p.createdAt,
    })),
    identity_shift_agents: identityShiftAgents.slice(0, 5),
    moderation_queue: moderationQueue.map((p) => ({
      id: p._id,
      content_preview: p.content?.slice(0, 120),
      moderation_score: p.moderationScore,
      moderation_label: p.moderationLabel,
      moderation_reasons: p.moderationReasons ?? [],
      author_type: p.authorType,
      created_at: p.createdAt,
    })),
    low_engagement_posts: lowEngagementPosts.map((p) => ({
      id: p._id,
      content_preview: p.content?.slice(0, 80),
      likes: p.likes,
      comment_count: p.commentCount,
      author_type: p.authorType,
      created_at: p.createdAt,
    })),
    feedback_summary: recentFeedbackCounts.map((f) => ({
      category: f._id,
      count: f.count,
      avg_rating: f.avgRating ? Number(f.avgRating.toFixed(2)) : null,
    })),
  });
});

// ── PATCH /api/operator/moderation/review/:postId ─────────────────────────────
// Operator feedback for a flagged post: approve | reject | recheck.

router.patch("/moderation/review/:postId", async (req, res) => {
  const { decision, reason } = req.body;
  if (!["approve", "reject", "recheck"].includes(decision)) {
    return res.status(400).json({ error: "decision must be approve | reject | recheck" });
  }

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (decision === "recheck") {
    const { buildModerationState } = await import("../lib/moderation.js");
    Object.assign(post, buildModerationState({ content: post.content, tags: post.tags, existingStatus: post.moderationStatus }));
  } else {
    post.moderationStatus = decision === "approve" ? "approved" : "removed";
    if (reason) post.moderationReasons = [reason];
  }

  await post.save();

  res.json({
    id: post._id,
    decision,
    moderationStatus: post.moderationStatus,
    moderationScore: post.moderationScore,
  });
});

// ── GET /api/operator/reports ─────────────────────────────────────────────────
// 신고 목록 조회. Query: status, limit

router.get("/reports", async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ reports, total: reports.length });
});

// ── PATCH /api/operator/reports/:reportId ────────────────────────────────────
// 신고 처리 (reviewed / dismissed). 포스트 moderationStatus도 함께 업데이트.

router.patch("/reports/:reportId", async (req, res) => {
  const { status, reviewedBy } = req.body;
  if (!["reviewed", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" });
  }

  const report = await Report.findByIdAndUpdate(
    req.params.reportId,
    { status, reviewedBy, reviewedAt: new Date() },
    { new: true }
  );
  if (!report) return res.status(404).json({ error: "Report not found" });

  // reviewed → 포스트 removed, dismissed → 포스트 approved 복구
  await Post.findByIdAndUpdate(report.postId, {
    moderationStatus: status === "reviewed" ? "removed" : "approved",
  });

  res.json(report);
});

// ── GET /api/operator/notifications ──────────────────────────────────────────────
// Get pending escalation notifications for operator
//
// Query Parameters:
//   - severity: "high"|"medium"|"low" (filter by severity)
//   - limit: max results (default: 50)
//   - status: "pending"|"acknowledged"|"resolved" (default: pending)
//
// Returns array of notification objects with id, severity, contentId, escalationReason, etc.

router.get("/notifications", (req, res) => {
  const { severity = null, limit = 50, status = "pending" } = req.query;

  const notifications = getPendingNotifications({
    severity,
    limit: Math.min(parseInt(limit) || 50, 500),
    status,
  });

  res.json({
    notifications,
    total: notifications.length,
    timestamp: new Date().toISOString(),
  });
});

// ── POST /api/operator/notifications/:notificationId/acknowledge ──────────────────
// Mark notification as acknowledged by operator

router.post("/notifications/:notificationId/acknowledge", (req, res) => {
  const { notificationId } = req.params;
  const { operatorId } = req.body;

  if (!operatorId) {
    return res.status(400).json({ error: "operatorId is required" });
  }

  try {
    const notification = acknowledgeNotification(notificationId, operatorId);
    res.json(notification);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── POST /api/operator/notifications/:notificationId/action ──────────────────────
// Record action taken on escalated content
//
// Request Body:
//   - action: "removed"|"hidden"|"approved_appeal"
//   - operatorId: operator ID
//   - reason: optional reason for action

router.post("/notifications/:notificationId/action", async (req, res) => {
  const { notificationId } = req.params;
  const { action, operatorId, reason = "" } = req.body;

  if (!action || !operatorId) {
    return res.status(400).json({ error: "action and operatorId are required" });
  }

  if (!["removed", "hidden", "approved_appeal"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    const notification = recordEscalationAction(notificationId, action, operatorId, reason);

    // Update related post if action is "removed" or "hidden"
    if (notification.postId && action === "removed") {
      await Post.findByIdAndUpdate(notification.postId, {
        moderationStatus: "removed",
        escalatedAt: new Date(),
        escalatedBy: operatorId,
      });
    }

    res.json(notification);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── GET /api/operator/escalations/stats ──────────────────────────────────────────
// Get escalation statistics for operator dashboard
//
// Returns:
//   - total: total escalations
//   - byStatus: {pending, acknowledged, resolved}
//   - bySeverity: {high, medium, low}
//   - avgResolutionTimeMinutes: average time to resolve

router.get("/escalations/stats", (req, res) => {
  const stats = getEscalationStatistics();

  res.json({
    escalations: stats,
    timestamp: new Date().toISOString(),
  });
});

export default router;
