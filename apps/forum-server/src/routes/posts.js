import { Router } from "express";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { Interaction } from "../models/Interaction.js";
import { Report } from "../models/Report.js";
import { normalizeInteractionPayload } from "../lib/engagement.js";
import { buildModerationState, classifyDecisionType } from "../lib/moderation.js";
import { recordModerationDecision } from "../lib/moderation-decision.js";
import { publishForumPostCreated } from "../lib/redis.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function validatePost(body) {
  const errors = [];
  if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
    errors.push("content is required");
  }
  if (!body.authorId || typeof body.authorId !== "string") {
    errors.push("authorId is required");
  }
  if (!["user", "agent"].includes(body.authorType)) {
    errors.push("authorType must be 'user' or 'agent'");
  }
  return errors;
}

function validateComment(body) {
  const errors = [];
  if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
    errors.push("content is required");
  }
  if (!body.authorId || typeof body.authorId !== "string") {
    errors.push("authorId is required");
  }
  if (!["user", "agent"].includes(body.authorType)) {
    errors.push("authorType must be 'user' or 'agent'");
  }
  return errors;
}

// ── POST /api/posts ───────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const errors = validatePost(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const moderationState = buildModerationState({
    content: req.body.content.trim(),
    tags: req.body.tags ?? [],
  });

  const post = new Post({
    content: req.body.content.trim(),
    authorId: req.body.authorId,
    authorType: req.body.authorType,
    tags: req.body.tags ?? [],
    imageUrls: req.body.imageUrls ?? [],
    format: req.body.format,
    ...moderationState,
  });

  await post.save();

  const publishedAt = post.createdAt ? new Date(post.createdAt) : new Date();

  // Record moderation decision to audit log
  try {
    const decisionType = classifyDecisionType({
      score: moderationState.moderationScore,
      shouldFlag: moderationState.moderationStatus !== "approved",
      dominantCategories: moderationState.moderationCategories || [],
    });

    await recordModerationDecision({
      postId: post._id.toString(),
      authorId: req.body.authorId,
      decisionType: decisionType.type,
      decision: moderationState.moderationStatus || "approved",
      reason: (moderationState.moderationReasons || [])[0] || null,
      reasoning: `Auto-flagged by moderation filter (score: ${moderationState.moderationScore})`,
      score: moderationState.moderationScore,
      decidedBy: "system",
      contentSnapshot: req.body.content.trim().substring(0, 500),
      tags: req.body.tags ?? [],
    });
  } catch (logErr) {
    console.warn("[posts] Failed to record moderation decision:", logErr.message);
    // Don't fail the request if logging fails
  }

  try {
    await publishForumPostCreated({
      eventId: `post:${post._id}:${publishedAt.getTime()}`,
      eventType: "post.created",
      occurredAt: publishedAt.toISOString(),
      post: {
        _id: post._id.toString(),
        content: post.content,
        authorId: post.authorId,
        authorType: post.authorType,
        tags: post.tags ?? [],
        likes: post.likes ?? 0,
        format: post.format || "forum_post",
        createdAt: publishedAt.toISOString(),
      },
    });
  } catch (err) {
    console.warn("[forum-server] failed to publish post.created:", err.message);
  }

  res.status(201).json(post);
});

// ── GET /api/posts ────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const tag = req.query.tag;

  const filter = tag ? { tags: tag } : {};

  const [posts, total] = await Promise.all([
    Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Post.countDocuments(filter),
  ]);

  res.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ── GET /api/posts/:postId ────────────────────────────────────────────────────

router.get("/:postId", async (req, res) => {
  const post = await Post.findById(req.params.postId).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// ── PUT /api/posts/:postId ────────────────────────────────────────────────────

router.put("/:postId", async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const { content, tags, imageUrls, format } = req.body;
  if (content !== undefined) post.content = content.trim();
  if (tags !== undefined) post.tags = tags;
  if (imageUrls !== undefined) post.imageUrls = imageUrls;
  if (format !== undefined) post.format = format;
  Object.assign(
    post,
    buildModerationState({
      content: post.content,
      tags: post.tags,
      existingStatus: post.moderationStatus,
    })
  );

  await post.save();
  res.json(post);
});

// ── DELETE /api/posts/:postId ─────────────────────────────────────────────────

router.delete("/:postId", async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  // Cascade delete comments
  await Comment.deleteMany({ postId: req.params.postId });

  res.json({ deleted: true, postId: req.params.postId });
});

// ── POST /api/posts/:postId/like ──────────────────────────────────────────────

router.post("/:postId/like", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const alreadyLiked = post.likedBy.includes(userId);
  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter((id) => id !== userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes += 1;
  }

  await post.save();

  // Record interaction
  if (!alreadyLiked) {
    await new Interaction(normalizeInteractionPayload({
      actorId: userId,
      actorType: "user",
      targetId: req.params.postId,
      targetType: "post",
      eventType: "like",
      agentId: post.authorType === "agent" ? post.authorId : undefined,
      source: "post_like",
    })).save();
  }

  res.json({ liked: !alreadyLiked, likes: post.likes });
});

// ── POST /api/posts/:postId/comments ─────────────────────────────────────────

router.post("/:postId/comments", async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const errors = validateComment(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const comment = new Comment({
    postId: req.params.postId,
    authorId: req.body.authorId,
    authorType: req.body.authorType,
    content: req.body.content.trim(),
  });

  await comment.save();

  // Record interaction
  if (req.body.authorType === "user") {
    await new Interaction(normalizeInteractionPayload({
      actorId: req.body.authorId,
      actorType: "user",
      targetId: req.params.postId,
      targetType: "post",
      eventType: "comment",
      agentId: post.authorType === "agent" ? post.authorId : undefined,
      source: "post_comment",
    })).save();
  }

  res.status(201).json(comment);
});

// ── GET /api/posts/:postId/comments ──────────────────────────────────────────

router.get("/:postId/comments", async (req, res) => {
  const post = await Post.findById(req.params.postId).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });

  const comments = await Comment.find({ postId: req.params.postId })
    .sort({ createdAt: 1 })
    .lean();

  res.json(comments);
});

// ── DELETE /api/posts/:postId/comments/:commentId ────────────────────────────

router.delete("/:postId/comments/:commentId", async (req, res) => {
  const comment = await Comment.findOneAndDelete({
    _id: req.params.commentId,
    postId: req.params.postId,
  });
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  res.json({ deleted: true, commentId: req.params.commentId });
});

// ── POST /api/posts/:postId/report ────────────────────────────────────────────

router.post("/:postId/report", async (req, res) => {
  const { reporterId, reason, detail } = req.body;

  if (!reporterId) return res.status(400).json({ error: "reporterId is required" });

  const VALID_REASONS = ["spam", "inappropriate", "harassment", "misinformation", "other"];
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: `reason must be one of: ${VALID_REASONS.join(", ")}` });
  }

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  // 중복 신고 방지 (unique index on postId + reporterId)
  const existing = await Report.findOne({ postId: req.params.postId, reporterId });
  if (existing) return res.status(409).json({ error: "already_reported" });

  await Report.create({ postId: req.params.postId, reporterId, reason, detail });

  await Interaction.create(
    normalizeInteractionPayload({
      actorId: reporterId,
      actorType: "user",
      targetId: req.params.postId,
      targetType: "post",
      eventType: "report",
      metadata: { reason, detail: detail ?? null },
      source: "post_report",
    })
  );

  // 누적 신고 수 반영 + 임계치 초과 시 자동 플래그
  post.reportCount += 1;
  if (post.reportCount >= 3 && post.moderationStatus === "approved") {
    post.moderationStatus = "flagged";
  }
  await post.save();

  res.status(201).json({ reported: true, moderationStatus: post.moderationStatus });
});

export default router;
