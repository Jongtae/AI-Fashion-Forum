import { Router } from "express";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { User } from "../models/User.js";
import { Interaction } from "../models/Interaction.js";
import { Report } from "../models/Report.js";
import { Feedback } from "../models/Feedback.js";
import { buildFeedbackFilter, buildInteractionFilter } from "../lib/engagement.js";

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

export default router;
