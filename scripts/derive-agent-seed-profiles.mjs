#!/usr/bin/env node
/**
 * derive-agent-seed-profiles.mjs
 *
 * Read-only derivation script that turns current MongoDB posts/comments into
 * agent seed profile candidates.
 *
 * The goal is to support the "seed corpus -> agent initialization" step without
 * mutating the source database. This script groups content by author, then
 * derives stable-ish seed fields from topic frequency, thread participation,
 * comment depth, and engagement signals.
 *
 * Usage:
 *   node scripts/derive-agent-seed-profiles.mjs
 *   node scripts/derive-agent-seed-profiles.mjs --output tmp/agent-seeds.json
 *   node scripts/derive-agent-seed-profiles.mjs --limit 100
 *
 * Env:
 *   MONGODB_URI (default: mongodb://localhost:27017/ai-fashion-forum)
 */

import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";

import { resolveAuthorIdentity } from "@ai-fashion-forum/shared-types";
import { Post } from "../apps/forum-server/src/models/Post.js";
import { Comment } from "../apps/forum-server/src/models/Comment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";
const DEFAULT_OUTPUT = path.resolve(__dirname, "../tmp/agent-seed-profiles.json");

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

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildCommentsByPost(comments) {
  const map = new Map();
  for (const comment of comments) {
    const key = String(comment.postId);
    const bucket = map.get(key) || [];
    bucket.push(comment);
    map.set(key, bucket);
  }
  return map;
}

function countCommentDepth(comments) {
  return comments.reduce(
    (acc, comment) => {
      if (comment.replyToCommentId || comment.replyTargetType === "comment") {
        acc.nested += 1;
      } else {
        acc.root += 1;
      }
      return acc;
    },
    { root: 0, nested: 0 },
  );
}

function derivePostFingerprint(post, comments) {
  const depth = countCommentDepth(comments);
  return {
    postId: String(post._id),
    authorId: post.authorId,
    authorType: post.authorType || "unknown",
    title: normalizeText(post.title || post.content).slice(0, 120),
    contentPreview: normalizeText(post.content).slice(0, 200),
    tags: Array.isArray(post.tags) ? post.tags : [],
    likes: Number(post.likes || 0),
    commentCount: Number(post.commentCount || comments.length || 0),
    rootComments: depth.root,
    nestedComments: depth.nested,
    createdAt: toIso(post.createdAt),
    hasImages: Array.isArray(post.imageUrls) && post.imageUrls.length > 0,
    format: post.format || null,
    moderationStatus: post.moderationStatus || null,
  };
}

function bumpCount(map, key, delta = 1) {
  const current = map.get(key) || 0;
  map.set(key, current + delta);
}

function toTopEntries(map, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function deriveSeedAxes(stats, topicCount, diversityScore) {
  const normalizedEngagement = clamp(stats.avgLikes / 20);
  const normalizedDialogue = clamp(stats.avgComments / 12);
  const normalizedThreadDepth = clamp(stats.nestedCommentRate);
  const normalizedTopicDiversity = clamp(diversityScore);
  const hasContrarianTopics = ["pricing", "anti_hype", "forum_drama"].some((topic) => stats.topics.has(topic));

  return {
    curiosity: round(clamp(0.35 + normalizedTopicDiversity * 0.35 + normalizedDialogue * 0.15)),
    status_drive: round(clamp(0.25 + normalizedEngagement * 0.4 + stats.postVolumeScore * 0.15)),
    care_drive: round(clamp(0.2 + normalizedDialogue * 0.4 + normalizedThreadDepth * 0.2)),
    novelty_drive: round(clamp(0.3 + normalizedTopicDiversity * 0.3 + stats.formatDiversityScore * 0.2)),
    skepticism: round(clamp(0.25 + (hasContrarianTopics ? 0.35 : 0) + normalizedThreadDepth * 0.1)),
    belonging_drive: round(clamp(0.25 + normalizedDialogue * 0.3 + stats.replyPresenceScore * 0.25)),
  };
}

function deriveBehaviorHints(stats) {
  if (stats.avgComments >= 3 || stats.nestedCommentRate > 0.2) {
    return {
      primaryMode: "thread_participant",
      responseStyle: "dialogue_first",
      memoryPriority: "high_social_feedback",
    };
  }

  if (stats.avgLikes >= 4 || stats.postVolume >= 10) {
    return {
      primaryMode: "trend_setter",
      responseStyle: "broadcast_first",
      memoryPriority: "engagement_weighted",
    };
  }

  if (stats.topics.has("pricing") || stats.topics.has("anti_hype")) {
    return {
      primaryMode: "contrarian",
      responseStyle: "challenge_and_refine",
      memoryPriority: "conflict_sensitive",
    };
  }

  return {
    primaryMode: "quiet_observer",
    responseStyle: "selective_response",
    memoryPriority: "topic_weighted",
  };
}

async function main() {
  const { output, limit } = parseArgs(process.argv);
  await mongoose.connect(MONGODB_URI);

  const posts = limit
    ? await Post.find({}).sort({ createdAt: 1 }).limit(limit).lean()
    : await Post.find({}).sort({ createdAt: 1 }).lean();
  const comments = await Comment.find({ postId: { $in: posts.map((post) => post._id) } })
    .sort({ createdAt: 1 })
    .lean();

  const commentsByPost = buildCommentsByPost(comments);
  const postFingerprints = posts.map((post) => derivePostFingerprint(post, commentsByPost.get(String(post._id)) || []));

  const byAuthor = new Map();
  for (const fingerprint of postFingerprints) {
    const current = byAuthor.get(fingerprint.authorId) || {
      authorId: fingerprint.authorId,
      authorType: fingerprint.authorType,
      postIds: [],
      titles: [],
      topics: new Map(),
      formats: new Map(),
      likes: 0,
      comments: 0,
      nestedComments: 0,
      hasImages: 0,
      postVolume: 0,
      firstSeenAt: fingerprint.createdAt,
      lastSeenAt: fingerprint.createdAt,
      sources: [],
    };

    current.postIds.push(fingerprint.postId);
    current.titles.push(fingerprint.title);
    current.likes += fingerprint.likes;
    current.comments += fingerprint.commentCount;
    current.nestedComments += fingerprint.nestedComments;
    current.hasImages += fingerprint.hasImages ? 1 : 0;
    current.postVolume += 1;

    if (fingerprint.createdAt) {
      if (!current.firstSeenAt || fingerprint.createdAt < current.firstSeenAt) {
        current.firstSeenAt = fingerprint.createdAt;
      }
      if (!current.lastSeenAt || fingerprint.createdAt > current.lastSeenAt) {
        current.lastSeenAt = fingerprint.createdAt;
      }
    }

    for (const tag of fingerprint.tags) {
      bumpCount(current.topics, tag);
    }
    if (fingerprint.format) {
      bumpCount(current.formats, fingerprint.format);
    }

    current.sources.push({
      postId: fingerprint.postId,
      createdAt: fingerprint.createdAt,
      title: fingerprint.title,
      commentCount: fingerprint.commentCount,
    });

    byAuthor.set(fingerprint.authorId, current);
  }

  const seedProfiles = [...byAuthor.values()]
    .map((stats) => {
      const uniqueTopics = stats.topics.size;
      const uniqueFormats = stats.formats.size;
      const avgComments = stats.postVolume > 0 ? stats.comments / stats.postVolume : 0;
      const avgLikes = stats.postVolume > 0 ? stats.likes / stats.postVolume : 0;
      const nestedCommentRate = stats.comments > 0 ? stats.nestedComments / stats.comments : 0;
      const replyPresenceScore = stats.comments > 0 ? Math.min(1, stats.nestedComments / Math.max(1, stats.comments)) : 0;
      const diversityScore = stats.postVolume > 0 ? Math.min(1, (uniqueTopics + uniqueFormats) / (stats.postVolume + 2)) : 0;
      const postVolumeScore = Math.min(1, stats.postVolume / 20);
      const formatDiversityScore = Math.min(1, uniqueFormats / 6);
      const topTopics = toTopEntries(stats.topics, 5);
      const topFormats = toTopEntries(stats.formats, 3);
      const dominantMood =
        topTopics[0]?.key === "pricing"
          ? "critical"
          : topTopics[0]?.key === "anti_hype"
            ? "skeptical"
            : topTopics[0]?.key === "empathy"
              ? "supportive"
              : "observant";

      const identity = resolveAuthorIdentity({
        authorId: stats.authorId,
        authorType: stats.authorType,
      });

      return {
        seedProfileId: `seed:${stats.authorId}`,
        sourceAuthorId: stats.authorId,
        sourceAuthorType: stats.authorType,
        profileRole: stats.authorType === "agent" ? "agent_seed" : "reference_profile",
        displayLabel: identity.displayName,
        displayName: identity.displayName,
        handle: identity.handle,
        avatarUrl: identity.avatarUrl,
        avatarLocale: identity.avatarLocale,
        localeHint: identity.avatarLocale,
        dominantMood,
        seedAxes: deriveSeedAxes(
          {
            avgLikes,
            avgComments,
            nestedCommentRate,
            postVolumeScore,
            formatDiversityScore,
            replyPresenceScore,
            topics: stats.topics,
          },
          uniqueTopics,
          diversityScore,
        ),
        behaviorHints: deriveBehaviorHints({
          avgLikes,
          avgComments,
          nestedCommentRate,
          postVolume: stats.postVolume,
          topics: stats.topics,
        }),
        topicalMemory: {
          dominantTopics: topTopics,
          topFormats,
          totalPosts: stats.postVolume,
          totalLikes: stats.likes,
          totalComments: stats.comments,
          nestedComments: stats.nestedComments,
          imageBackedPosts: stats.hasImages,
          uniqueTopicCount: uniqueTopics,
        },
        surfaceSignals: {
          avgLikes: round(avgLikes),
          avgComments: round(avgComments),
          nestedCommentRate: round(nestedCommentRate),
          postVolume: stats.postVolume,
          diversityScore: round(diversityScore),
        },
        sourceReferences: stats.sources.slice(0, 20),
        memoryPromptHints: [
          `This profile is grounded in ${stats.postVolume} observed post projections.`,
          topTopics.length > 0
            ? `The strongest recurring topics are ${topTopics.map((topic) => topic.key).join(", ")}.`
            : "No dominant topic pattern emerged.",
          stats.comments > 0
            ? "The profile should remember reply depth and social feedback."
            : "The profile should favor broadcast-style observation and sparse reaction.",
        ],
        timeRange: {
          firstSeenAt: stats.firstSeenAt,
          lastSeenAt: stats.lastSeenAt,
        },
      };
    })
    .sort((a, b) => b.surfaceSignals.postVolume - a.surfaceSignals.postVolume);

  const result = {
    exportedAt: new Date().toISOString(),
    source: {
      mongodbUri: MONGODB_URI.replace(/:\/\/.*@/, "://***@"),
      postCount: posts.length,
      commentCount: comments.length,
    },
    model: "agent-seed-profiles",
    profiles: seedProfiles,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[agent-seed-profiles] Wrote ${seedProfiles.length} profiles to ${output}`);
  console.log(`[agent-seed-profiles] Source posts=${posts.length} comments=${comments.length}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[agent-seed-profiles] Failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect failures on the error path
  }
  process.exit(1);
});
