#!/usr/bin/env node
/**
 * judge-content-quality.mjs
 *
 * Local judge for recent forum posts/comments.
 * Produces a reproducible quality report without external API calls.
 *
 * Usage:
 *   node scripts/judge-content-quality.mjs
 *   node scripts/judge-content-quality.mjs --limit 20 --output data/judgements/latest.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { Post } from "../apps/forum-server/src/models/Post.js";
import { Comment } from "../apps/forum-server/src/models/Comment.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";

function parseArgs(argv) {
  const args = {
    limit: 20,
    output: "data/judgements/content-quality-latest.json",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed)) args.limit = parsed;
      index += 1;
      continue;
    }
    if (value === "--output" && next) {
      args.output = next;
      index += 1;
    }
  }

  return args;
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 1);
}

function jaccard(left = "", right = "") {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

function countHangul(text) {
  return (String(text).match(/[가-힣]/g) || []).length;
}

function countLatin(text) {
  return (String(text).match(/[A-Za-z]/g) || []).length;
}

function isNaturalLanguage(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return countHangul(normalized) + countLatin(normalized) > 8;
}

const HARD_FAIL_PHRASES = [
  "이 에이전트가",
  "현재 주제 흐름",
  "prompt",
  "agent",
  "operator",
  "workflow",
  "moderation",
  "judge",
  "이 글은",
];

function scoreItem(item) {
  const content = String(item.content || "");
  const title = String(item.title || "");
  const text = `${title} ${content}`.trim();
  const tokens = tokenize(text);
  const uniqueRatio = tokens.length ? new Set(tokens).size / tokens.length : 0;
  const length = content.length;
  const hasQuestion = text.includes("?");
  const hasHookWords = /(같이|왜|어떻게|느껴|보이|궁금|달라|이유|생각)/.test(text);
  const hasHardFailPhrase = HARD_FAIL_PHRASES.some((phrase) => text.includes(phrase));
  const repeatedFirstTokens = tokens.slice(0, 4).join(" ");
  const humanLikeLength = length >= 25 && length <= 260 ? 1 : length < 25 ? 0.28 : 0.64;
  const communityFit = clamp(
    0.4 +
      (hasQuestion ? 0.18 : 0) +
      (hasHookWords ? 0.18 : 0) +
      (item.kind === "comment" ? 0.14 : 0.08),
  );
  const humanLikeness = clamp(
    humanLikeLength * 0.35 +
      uniqueRatio * 0.25 +
      (isNaturalLanguage(text) ? 0.2 : 0.05) +
      (hasHardFailPhrase ? 0 : 0.2),
  );
  const socialPull = clamp(
    0.25 +
      (hasQuestion ? 0.23 : 0) +
      (hasHookWords ? 0.18 : 0) +
      (item.kind === "comment" ? 0.18 : 0.12) +
      (content.includes("같이") ? 0.09 : 0),
  );
  const variety = clamp(
    uniqueRatio * 0.5 +
      (repeatedFirstTokens.split(" ").length >= 3 ? 0.1 : 0.02) +
      (hasHardFailPhrase ? 0 : 0.32),
  );
  const consistency = clamp(
    0.5 +
      (item.authorDisplayName ? 0.08 : 0) +
      (item.authorType === "agent" ? 0.06 : 0) +
      (item.replyTargetType ? 0.1 : 0.04),
  );

  const overall_score = clamp(
    humanLikeness * 0.35 +
      socialPull * 0.22 +
      variety * 0.18 +
      consistency * 0.1 +
      communityFit * 0.15,
  );

  const verdict = hasHardFailPhrase
    ? "fail"
    : overall_score >= 0.72
      ? "pass"
      : overall_score >= 0.52
        ? "needs_revision"
        : "fail";

  const issues = [];
  if (hasHardFailPhrase) issues.push("Contains internal/system-like phrases.");
  if (uniqueRatio < 0.46) issues.push("Lexical variety is low.");
  if (length < 35) issues.push("Content is very short.");
  if (length > 260) issues.push("Content is a bit long for a feed item.");
  if (!hasQuestion && !hasHookWords) issues.push("Social hook is weak.");

  const strengths = [];
  if (hasQuestion) strengths.push("Has a reply-inviting question.");
  if (hasHookWords) strengths.push("Contains a conversational hook.");
  if (isNaturalLanguage(text)) strengths.push("Reads like natural language.");
  if (!hasHardFailPhrase) strengths.push("Avoids obvious system-language leakage.");

  return {
    id: item.id,
    kind: item.kind,
    author: item.authorDisplayName || null,
    overall_score,
    verdict,
    dimension_scores: {
      human_likeness: humanLikeness,
      social_pull: socialPull,
      variety,
      consistency,
      community_fit: communityFit,
    },
    summary:
      verdict === "pass"
        ? "Feels human, specific, and thread-worthy."
        : verdict === "needs_revision"
          ? "Usable, but repetition or hook strength could be improved."
          : "Too repetitive, synthetic, or low-signal for the community feed.",
    strengths,
    issues,
  };
}

function computeCorpusReport(items, itemReports) {
  const score = average(itemReports.map((report) => report.overall_score));
  const topSimilarity = Math.max(
    0,
    ...items.flatMap((left, index) =>
      items.slice(index + 1).map((right) =>
        jaccard(`${left.title || ""} ${left.content || ""}`, `${right.title || ""} ${right.content || ""}`),
      ),
    ),
  );
  const postCount = items.filter((item) => item.kind === "post").length;
  const commentCount = items.filter((item) => item.kind === "comment").length;
  const topicCounts = new Map();
  for (const item of items) {
    for (const tag of item.tags || []) {
      topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
    }
  }
  const topicDistribution = [...topicCounts.values()];
  const maxTopicShare = topicDistribution.length
    ? Math.max(...topicDistribution) / topicDistribution.reduce((sum, value) => sum + value, 0)
    : 0;
  const diversity = clamp(1 - maxTopicShare);
  const sociality = clamp(commentCount / Math.max(postCount, 1) / 2);
  const repetitionPenalty = clamp(topSimilarity);
  const overall_score = clamp(score * 0.55 + diversity * 0.2 + sociality * 0.2 - repetitionPenalty * 0.15);
  const verdict =
    overall_score >= 0.72
      ? "pass"
      : overall_score >= 0.52
        ? "needs_revision"
        : "fail";

  return {
    overall_score,
    verdict,
    dimension_scores: {
      human_likeness: clamp(score),
      social_pull: sociality,
      variety: diversity,
      consistency: clamp(
        average(itemReports.map((report) => report.dimension_scores.consistency)),
      ),
      community_fit: clamp(
        average(itemReports.map((report) => report.dimension_scores.community_fit)),
      ),
    },
    summary:
      verdict === "pass"
        ? "The latest world feels human and sufficiently varied."
        : verdict === "needs_revision"
          ? "The latest world is promising, but repetition or weak hooks still remain."
          : "The latest world still feels too synthetic or repetitive.",
    strengths: [
      `Average item score ${score.toFixed(2)}.`,
      `Comment/post ratio ${commentCount}:${postCount}.`,
      `Topic diversity score ${diversity.toFixed(2)}.`,
    ],
    issues: [
      topSimilarity > 0.45 ? `High pairwise similarity detected (${topSimilarity.toFixed(2)}).` : "No major repetition spike detected.",
    ],
    repetition: {
      top_pairwise_similarity: topSimilarity,
      topic_concentration: maxTopicShare,
      comment_post_ratio: postCount ? commentCount / postCount : 0,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  await mongoose.connect(MONGODB_URI);

  const posts = await Post.find({}, {
    content: 1,
    title: 1,
    authorDisplayName: 1,
    authorType: 1,
    tags: 1,
    createdAt: 1,
  })
    .sort({ createdAt: -1 })
    .limit(args.limit)
    .lean();

  const comments = await Comment.find({}, {
    content: 1,
    authorDisplayName: 1,
    authorType: 1,
    replyTargetType: 1,
    tags: 1,
    createdAt: 1,
  })
    .sort({ createdAt: -1 })
    .limit(args.limit)
    .lean();

  const items = [
    ...posts.map((post) => ({
      id: post._id.toString(),
      kind: "post",
      title: post.title || "",
      content: post.content || "",
      authorDisplayName: post.authorDisplayName || "",
      authorType: post.authorType || "agent",
      tags: post.tags || [],
      createdAt: post.createdAt,
    })),
    ...comments.map((comment) => ({
      id: comment._id.toString(),
      kind: "comment",
      title: "",
      content: comment.content || "",
      authorDisplayName: comment.authorDisplayName || "",
      authorType: comment.authorType || "agent",
      replyTargetType: comment.replyTargetType || null,
      tags: [],
      createdAt: comment.createdAt,
    })),
  ];

  const itemReports = items.map(scoreItem);
  const corpusReport = computeCorpusReport(items, itemReports);
  const report = {
    created_at: new Date().toISOString(),
    source: {
      posts: posts.length,
      comments: comments.length,
      total_items: items.length,
      limit: args.limit,
    },
    judge_prompt_path: "docs/core-systems/judge-agent-prompt.md",
    corpus: corpusReport,
    items: itemReports,
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[judge] Wrote report to ${path.resolve(args.output)}`);
  console.log(`[judge] Corpus verdict=${corpusReport.verdict} score=${corpusReport.overall_score.toFixed(3)} top_similarity=${corpusReport.repetition.top_pairwise_similarity.toFixed(3)}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("[judge] Failed:", error);
  process.exit(1);
});
