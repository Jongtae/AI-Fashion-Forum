#!/usr/bin/env node
/**
 * export-content-projections.mjs
 *
 * Read-only exporter that reinterprets the current MongoDB `posts` and `comments`
 * collections as agent-centered projections.
 *
 * This script does not mutate the source database. It reads the visible forum
 * surface and writes a JSON file that preserves the original documents while
 * adding a reconstruction-friendly layer:
 * - seed/content provenance
 * - agent-facing surface summary
 * - social feedback summary
 * - comment thread projection
 * - reconstruction hints
 *
 * Usage:
 *   node scripts/export-content-projections.mjs
 *   node scripts/export-content-projections.mjs --output tmp/content-projections.json
 *   node scripts/export-content-projections.mjs --limit 100
 *
 * Env:
 *   MONGODB_URI (default: mongodb://localhost:27017/ai-fashion-forum)
 */

import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";

import { Post } from "../apps/forum-server/src/models/Post.js";
import { Comment } from "../apps/forum-server/src/models/Comment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";
const DEFAULT_OUTPUT = path.resolve(__dirname, "../tmp/content-projections.json");

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT, limit: null };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--output" && next) {
      args.output = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    if (value === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.limit = parsed;
      }
      index += 1;
      continue;
    }
  }

  return args;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function clampText(text, maxLength = 160) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function countCommentsByType(comments) {
  return comments.reduce(
    (acc, comment) => {
      acc.total += 1;
      if (comment.authorType === "agent") {
        acc.agent += 1;
      } else if (comment.authorType === "user") {
        acc.user += 1;
      }

      if (comment.replyToCommentId || comment.replyTargetType === "comment") {
        acc.nested += 1;
      } else {
        acc.root += 1;
      }

      return acc;
    },
    { total: 0, agent: 0, user: 0, nested: 0, root: 0 },
  );
}

function deriveProjection(post, comments) {
  const commentStats = countCommentsByType(comments);
  const authorType = post.authorType || "unknown";
  const hasImages = Array.isArray(post.imageUrls) && post.imageUrls.length > 0;
  const engagementScore =
    (Number(post.likes || 0) * 3) +
    (Number(post.commentCount || commentStats.total || 0) * 2) +
    (post.reportCount ? Number(post.reportCount) * -2 : 0);

  const projectionType = authorType === "agent" ? "agent_projection" : "human_projection";
  const socialRole =
    commentStats.total === 0 ? "broadcast" : commentStats.nested > 0 ? "thread_seed" : "discussion_prompt";
  const readingIntent =
    commentStats.total > 4
      ? "high_attention"
      : commentStats.total > 1
        ? "medium_attention"
        : "light_attention";

  return {
    projectionType,
    source: {
      postId: String(post._id),
      authorId: post.authorId,
      authorType,
      createdAt: toIso(post.createdAt),
      updatedAt: toIso(post.updatedAt),
    },
    surface: {
      title: clampText(post.title || post.content, 90),
      bodyPreview: clampText(post.content, 240),
      tags: Array.isArray(post.tags) ? post.tags : [],
      hasImages,
      format: post.format || null,
    },
    socialSignals: {
      likes: Number(post.likes || 0),
      comments: commentStats,
      moderationStatus: post.moderationStatus || null,
      reportCount: Number(post.reportCount || 0),
      engagementScore,
    },
    agentReadingHints: {
      socialRole,
      readingIntent,
      threadDensity: commentStats.total > 0 ? Math.min(1, commentStats.total / 10) : 0,
      replyDepthHint: commentStats.nested > 0 ? "nested_discussion" : "flat_discussion",
    },
    reconstructionNotes: [
      authorType === "agent"
        ? "This post is already an agent projection and can be replayed as a visible action."
        : "This post should be treated as a human-origin projection and preserved as a user-initiated surface.",
      commentStats.total > 0
        ? "The comment thread captures social feedback and can be used to rebuild context-dependent memory."
        : "No comments exist yet, so the projection is limited to the post surface and its seed signals.",
      hasImages
        ? "Image-backed surface should be preserved for visual realism."
        : "Text-only surface can be reconstructed from content and engagement signals.",
    ],
    threadProjection: comments.map((comment) => ({
      commentId: String(comment._id),
      postId: String(comment.postId),
      authorId: comment.authorId,
      authorType: comment.authorType,
      createdAt: toIso(comment.createdAt),
      replyToCommentId: comment.replyToCommentId ? String(comment.replyToCommentId) : null,
      replyTargetType: comment.replyTargetType || null,
      replyTargetId: comment.replyTargetId || null,
      replyTargetAuthorId: comment.replyTargetAuthorId || null,
      replyTargetPreview: comment.replyTargetPreview || null,
      contentPreview: clampText(comment.content, 180),
      socialFunction:
        comment.replyToCommentId || comment.replyTargetType === "comment"
          ? "reply"
          : "reaction_or_response",
    })),
  };
}

async function main() {
  const { output, limit } = parseArgs(process.argv);
  await mongoose.connect(MONGODB_URI);

  const postQuery = Post.find({}).sort({ createdAt: 1 }).lean();
  const posts = limit ? await postQuery.limit(limit) : await postQuery;
  const comments = await Comment.find({ postId: { $in: posts.map((post) => post._id) } })
    .sort({ createdAt: 1 })
    .lean();

  const commentsByPostId = new Map();
  for (const comment of comments) {
    const key = String(comment.postId);
    const bucket = commentsByPostId.get(key) || [];
    bucket.push(comment);
    commentsByPostId.set(key, bucket);
  }

  const projections = posts.map((post) => {
    const threadComments = commentsByPostId.get(String(post._id)) || [];
    return deriveProjection(post, threadComments);
  });

  const result = {
    exportedAt: new Date().toISOString(),
    source: {
      mongodbUri: MONGODB_URI.replace(/:\/\/.*@/, "://***@"),
      postCount: posts.length,
      commentCount: comments.length,
    },
    model: "agent-content-projection",
    projections,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[content-projection-export] Wrote ${projections.length} projections to ${output}`);
  console.log(`[content-projection-export] Source posts=${posts.length} comments=${comments.length}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[content-projection-export] Failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect failures on the error path
  }
  process.exit(1);
});
