import { Router } from "express";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { User } from "../models/User.js";
import { Interaction } from "../models/Interaction.js";
import { Report } from "../models/Report.js";

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
    recentInteractions,
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
    // 최근 기간의 사용자 interaction 이벤트 카운트
    Interaction.aggregate([
      { $match: { createdAt: { $gte: since }, actorType: "user" } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
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
    },
    engagement: {
      recentInteractions: Object.fromEntries(
        recentInteractions.map((r) => [r._id, r.count])
      ),
    },
    topTags: topTags.map((t) => ({ tag: t._id, count: t.count })),
  });
});

// ── GET /api/operator/logs ────────────────────────────────────────────────────
// 원시 행동 로그 조회. 이상 행동 탐지 및 분석에 사용.
// Query: actorType, eventType, actorId, since, limit

router.get("/logs", async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
  const filter = {};

  if (req.query.actorType) filter.actorType = req.query.actorType;
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.actorId) filter.actorId = req.query.actorId;
  if (req.query.since) filter.createdAt = { $gte: new Date(req.query.since) };

  const logs = await Interaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ logs, total: logs.length });
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
