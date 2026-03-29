import { Router } from "express";
import mongoose from "mongoose";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { Interaction } from "../models/Interaction.js";
import { Report } from "../models/Report.js";
import { normalizeInteractionPayload } from "../lib/engagement.js";
import { buildModerationState, classifyDecisionType } from "../lib/moderation.js";
import { recordModerationDecision } from "../lib/moderation-decision.js";
import { publishForumPostCreated, publishForumCommentCreated } from "../lib/redis.js";
import { checkAgentWriteRateLimit } from "../lib/write-rate-limit.js";
import { verifyToken } from "../middleware/auth.js";

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

function getAuthedUsername(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const decoded = verifyToken(header.slice(7));
    return decoded?.username || null;
  } catch {
    return null;
  }
}

function requireUserAuth(req, res, expectedUsername = null) {
  const authedUsername = getAuthedUsername(req);
  if (!authedUsername) {
    res.status(401).json({ error: "missing_or_invalid_token" });
    return null;
  }

  if (expectedUsername && authedUsername !== expectedUsername) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }

  return authedUsername;
}

async function loadSavedBookmarkMap(actorId, targetIds = []) {
  const query = {
    actorId,
    actorType: "user",
    targetType: "post",
    eventType: "bookmark",
  };

  if (Array.isArray(targetIds) && targetIds.length > 0) {
    query.targetId = { $in: targetIds.map((id) => String(id)) };
  }

  const bookmarks = await Interaction.find(query).sort({ createdAt: -1 }).lean();
  const bookmarkMap = new Map();

  for (const bookmark of bookmarks) {
    const key = String(bookmark.targetId);
    if (!bookmarkMap.has(key)) {
      bookmarkMap.set(key, bookmark);
    }
  }

  return bookmarkMap;
}

function attachSavedState(post, savedBookmarkMap = new Map()) {
  const postId = String(post._id);
  const savedBookmark = savedBookmarkMap.get(postId) || null;

  return {
    ...post,
    savedByCurrentUser: Boolean(savedBookmark),
    savedAt: savedBookmark?.createdAt || null,
  };
}

async function fetchSavedPostsPage(actorId, page, limit) {
  const bookmarkMap = await loadSavedBookmarkMap(actorId);
  const orderedIds = [];
  const seen = new Set();

  for (const bookmark of bookmarkMap.values()) {
    const targetId = String(bookmark.targetId);
    if (seen.has(targetId)) continue;
    seen.add(targetId);
    orderedIds.push(targetId);
  }

  const total = orderedIds.length;
  const skip = (page - 1) * limit;
  const pageIds = orderedIds.slice(skip, skip + limit);

  if (!pageIds.length) {
    return { posts: [], total };
  }

  const posts = await Post.find({ _id: { $in: pageIds } }).lean();
  const postMap = new Map(posts.map((post) => [String(post._id), post]));
  const pageBookmarks = new Map(pageIds.map((id) => [id, bookmarkMap.get(id)]));

  return {
    posts: pageIds
      .map((id) => postMap.get(id))
      .filter(Boolean)
      .map((post) => attachSavedState(post, pageBookmarks)),
    total,
  };
}

// ── POST /api/posts ───────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const errors = validatePost(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  if (req.body.authorType === "user") {
    const authedUsername = requireUserAuth(req, res, req.body.authorId);
    if (!authedUsername) return;
  }

  const rateLimit = await checkAgentWriteRateLimit({
    authorId: req.body.authorId,
    authorType: req.body.authorType,
    PostModel: Post,
    CommentModel: Comment,
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: "agent_write_rate_limited",
      limit: rateLimit.limit,
      window_ms: rateLimit.windowMs,
      current_count: rateLimit.currentCount,
      remaining: rateLimit.remaining,
      since: rateLimit.since.toISOString(),
    });
  }

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
    generationContext: req.body.generationContext ?? null,
    ...moderationState,
  });

  await post.save();

  const publishedAt = post.createdAt ? new Date(post.createdAt) : new Date();

  // Record moderation decision to audit log
  try {
    if (mongoose.connection.readyState === 1) {
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
    }
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
        generationContext: post.generationContext ?? null,
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
  const tag = req.query.tag;
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const savedOnly = String(req.query.saved || "").toLowerCase() === "true";
  const viewerId = getAuthedUsername(req);

  if (savedOnly) {
    if (!viewerId) {
      return res.status(401).json({ error: "missing_or_invalid_token" });
    }

    const { posts, total } = await fetchSavedPostsPage(viewerId, page, limit);

    return res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }

  const filter = tag ? { tags: tag } : {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { content: { $regex: escaped, $options: "i" } },
      { authorId: { $regex: escaped, $options: "i" } },
      { tags: { $regex: escaped, $options: "i" } },
    ];
  }

  const posts = await Post.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  const total = await Post.countDocuments(filter);
  const savedBookmarkMap = viewerId ? await loadSavedBookmarkMap(viewerId, posts.map((post) => post._id)) : new Map();

  res.json({
    posts: posts.map((post) => attachSavedState(post, savedBookmarkMap)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ── GET /api/posts/:postId ────────────────────────────────────────────────────

router.get("/saved", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const authedUsername = requireUserAuth(req, res);
  if (!authedUsername) return;

  const { posts, total } = await fetchSavedPostsPage(authedUsername, page, limit);

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

router.get("/:postId", async (req, res) => {
  const post = await Post.findById(req.params.postId).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });

  const viewerId = getAuthedUsername(req);
  if (!viewerId) {
    return res.json(post);
  }

  const savedBookmarkMap = await loadSavedBookmarkMap(viewerId, [post._id]);
  res.json(attachSavedState(post, savedBookmarkMap));
});

// ── PUT /api/posts/:postId ────────────────────────────────────────────────────

router.put("/:postId", async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (post.authorType === "user") {
    const authedUsername = requireUserAuth(req, res, post.authorId);
    if (!authedUsername) return;
  }

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
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (post.authorType === "user") {
    const authedUsername = requireUserAuth(req, res, post.authorId);
    if (!authedUsername) return;
  }

  await Post.findByIdAndDelete(req.params.postId);

  // Cascade delete comments
  await Comment.deleteMany({ postId: req.params.postId });

  res.json({ deleted: true, postId: req.params.postId });
});

// ── POST /api/posts/:postId/like ──────────────────────────────────────────────

router.post("/:postId/like", async (req, res) => {
  const authedUsername = requireUserAuth(req, res);
  if (!authedUsername) return;
  const userId = authedUsername;

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

// ── POST /api/posts/:postId/save ─────────────────────────────────────────────

router.post("/:postId/save", async (req, res) => {
  const authedUsername = requireUserAuth(req, res);
  if (!authedUsername) return;

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const existingBookmark = await Interaction.findOne({
    actorId: authedUsername,
    actorType: "user",
    targetId: req.params.postId,
    targetType: "post",
    eventType: "bookmark",
  });

  if (!existingBookmark) {
    const bookmark = await new Interaction(
      normalizeInteractionPayload({
        actorId: authedUsername,
        actorType: "user",
        targetId: req.params.postId,
        targetType: "post",
        eventType: "bookmark",
        agentId: post.authorType === "agent" ? post.authorId : undefined,
        source: "post_save",
      }),
    ).save();

    return res.status(201).json({
      saved: true,
      savedAt: bookmark.createdAt || new Date().toISOString(),
    });
  }

  return res.json({
    saved: true,
    savedAt: existingBookmark.createdAt || null,
  });
});

// ── DELETE /api/posts/:postId/save ──────────────────────────────────────────

router.delete("/:postId/save", async (req, res) => {
  const authedUsername = requireUserAuth(req, res);
  if (!authedUsername) return;

  await Interaction.deleteMany({
    actorId: authedUsername,
    actorType: "user",
    targetId: req.params.postId,
    targetType: "post",
    eventType: "bookmark",
  });

  res.json({ saved: false, postId: req.params.postId });
});

// ── POST /api/posts/:postId/comments ─────────────────────────────────────────

router.post("/:postId/comments", async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const errors = validateComment(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  if (req.body.authorType === "user") {
    const authedUsername = requireUserAuth(req, res, req.body.authorId);
    if (!authedUsername) return;
  }

  const rateLimit = await checkAgentWriteRateLimit({
    authorId: req.body.authorId,
    authorType: req.body.authorType,
    PostModel: Post,
    CommentModel: Comment,
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: "agent_write_rate_limited",
      limit: rateLimit.limit,
      window_ms: rateLimit.windowMs,
      current_count: rateLimit.currentCount,
      remaining: rateLimit.remaining,
      since: rateLimit.since.toISOString(),
    });
  }

  const replyToCommentId = req.body.replyToCommentId || null;
  let replyTarget = null;
  if (replyToCommentId) {
    replyTarget = await Comment.findOne({
      _id: replyToCommentId,
      postId: req.params.postId,
    }).lean();
    if (!replyTarget) {
      return res.status(404).json({ error: "Reply target comment not found" });
    }
  }

  const comment = new Comment({
    postId: req.params.postId,
    authorId: req.body.authorId,
    authorType: req.body.authorType,
    content: req.body.content.trim(),
    generationContext: req.body.generationContext ?? null,
    replyToCommentId,
    replyTargetType: replyTarget ? "comment" : "post",
    replyTargetId: replyTarget ? replyTarget._id.toString() : req.params.postId,
    replyTargetAuthorId: replyTarget ? replyTarget.authorId : post.authorId,
    replyTargetPreview: (replyTarget?.content || post.content || "").trim().slice(0, 180),
    agentRound: req.body.agentRound,
    agentTick: req.body.agentTick,
  });

  await comment.save();
  post.commentCount = (post.commentCount || 0) + 1;
  await post.save();

  const createdAt = comment.createdAt ? new Date(comment.createdAt) : new Date();

  try {
    await publishForumCommentCreated({
      eventId: `comment:${comment._id}:${createdAt.getTime()}`,
      eventType: "comment.created",
      occurredAt: createdAt.toISOString(),
      post: {
        _id: post._id.toString(),
        content: post.content,
        authorId: post.authorId,
        authorType: post.authorType,
        tags: post.tags ?? [],
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : createdAt.toISOString(),
      },
      comment: {
        _id: comment._id.toString(),
        postId: comment.postId.toString(),
        content: comment.content,
        authorId: comment.authorId,
        authorType: comment.authorType,
        generationContext: comment.generationContext ?? null,
        replyToCommentId: comment.replyToCommentId ? comment.replyToCommentId.toString() : null,
        replyTargetType: comment.replyTargetType,
        replyTargetId: comment.replyTargetId,
        replyTargetAuthorId: comment.replyTargetAuthorId,
        replyTargetPreview: comment.replyTargetPreview,
        createdAt: createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.warn("[forum-server] failed to publish comment.created:", err.message);
  }

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

  const post = await Post.findById(req.params.postId);
  if (post) {
    post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
    await post.save();
  }

  res.json({ deleted: true, commentId: req.params.commentId });
});

// ── POST /api/posts/:postId/report ────────────────────────────────────────────

router.post("/:postId/report", async (req, res) => {
  const { reporterId, reason, detail } = req.body;

  if (!reporterId) return res.status(400).json({ error: "reporterId is required" });
  const authedUsername = requireUserAuth(req, res, reporterId);
  if (!authedUsername) return;

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
