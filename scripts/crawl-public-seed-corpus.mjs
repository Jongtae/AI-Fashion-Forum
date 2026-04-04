#!/usr/bin/env node
/**
 * crawl-public-seed-corpus.mjs
 *
 * Collect recent public fashion/community posts from the report's reference
 * source family and store them as a normalized local corpus.
 *
 * Default output:
 *   data/seed-corpus/public/recent-fashion-corpus.json
 *
 * Usage:
 *   node scripts/crawl-public-seed-corpus.mjs
 *   node scripts/crawl-public-seed-corpus.mjs --output data/seed-corpus/public/recent-fashion-corpus.json
 *   node scripts/crawl-public-seed-corpus.mjs --limit 100
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  detectLanguageHint,
  extractTopicBag,
  normalizeText,
  splitSentences,
  stripHtml,
} from "./public-seed-corpus-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-corpus.json");
const USER_AGENT = process.env.CRAWL_USER_AGENT || "AI-Fashion-Forum/1.0 (public-seed-corpus-crawler)";
const TARGET_LIMIT = 100;

const REDDIT_COMMUNITIES = [
  "fashion",
  "streetwear",
  "outfits",
  "mensfashion",
  "femalefashionadvice",
  "ootd",
  "style",
  "malefashionadvice",
];

const MASTODON_TAGS = [
  "fashion",
  "ootd",
  "streetwear",
  "outfit",
  "style",
  "kfashion",
  "jfashion",
  "mensfashion",
  "womensfashion",
  "outfitcheck",
];

const RELEVANCE_KEYWORDS = [
  "fashion",
  "style",
  "outfit",
  "ootd",
  "fit",
  "sneaker",
  "streetwear",
  "wardrobe",
  "look",
  "dress",
  "jacket",
  "coat",
  "bag",
  "shoes",
  "pants",
  "jeans",
  "thrift",
  "vintage",
  "tailor",
  "office",
  "work",
  "kfashion",
  "jfashion",
  "minimal",
  "accessory",
  "sizing",
  "price",
];

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT, limit: TARGET_LIMIT };

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
    }
  }

  return args;
}

function hasRelevantKeyword(text = "") {
  const lower = normalizeText(text).toLowerCase();
  return RELEVANCE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function buildExcerpt(text = "", maxLength = 220) {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  const sentences = splitSentences(normalized);
  const firstSentence = sentences[0] || normalized;
  return firstSentence.slice(0, maxLength);
}

function makeId(prefix, value) {
  return `${prefix}:${String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
}

function normalizeRedditItem(subreddit, post) {
  const title = normalizeText(post.title || "");
  const selftext = normalizeText(post.selftext || "");
  const combined = [title, selftext].filter(Boolean).join("\n\n");
  const tags = [subreddit, ...(Array.isArray(post.link_flair_richtext) ? post.link_flair_richtext.map((item) => item?.t).filter(Boolean) : [])];
  return {
    sourcePlatform: "reddit",
    sourceCommunity: `r/${subreddit}`,
    sourceId: String(post.id || post.name || post.permalink || title),
    sourceUrl: `https://www.reddit.com${post.permalink || ""}`,
    sourceAuthorId: String(post.author || "unknown"),
    sourceAuthorName: String(post.author || "unknown"),
    createdAt: new Date((post.created_utc || 0) * 1000).toISOString(),
    title: title || buildExcerpt(selftext || "Reddit fashion post", 120),
    body: selftext,
    text: combined || title,
    excerpt: buildExcerpt(combined || title, 220),
    tags,
    score: Number(post.score || 0),
    replyCount: Number(post.num_comments || 0),
    languageHint: detectLanguageHint(combined || title),
    mediaCount: Array.isArray(post.preview?.images) ? post.preview.images.length : post.is_gallery ? 1 : 0,
  };
}

function normalizeMastodonItem(tag, post) {
  const content = stripHtml(post.content || "");
  const tags = Array.isArray(post.tags) ? post.tags.map((item) => item?.name).filter(Boolean) : [];
  const contentForTitle = content.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();
  const fallbackLabel = [tag, ...tags].filter(Boolean).slice(0, 2).join(" · ") || tag;
  const title = buildExcerpt(contentForTitle, 120) || `${fallbackLabel} note`;
  const excerptCandidate = buildExcerpt(content, 220);
  const excerpt = /^https?:\/\/\S+/i.test(excerptCandidate || "") || /^https?:\/\/www\./i.test(excerptCandidate || "")
    ? title
    : excerptCandidate || title;
  return {
    sourcePlatform: "mastodon",
    sourceCommunity: `tag:${tag}`,
    sourceId: String(post.id || post.url || content.slice(0, 40)),
    sourceUrl: String(post.url || ""),
    sourceAuthorId: String(post.account?.acct || post.account?.username || "unknown"),
    sourceAuthorName: String(post.account?.display_name || post.account?.acct || "unknown"),
    createdAt: new Date(post.created_at || Date.now()).toISOString(),
    title,
    body: content,
    text: content,
    excerpt,
    tags: [tag, ...tags],
    score: Number(post.favourites_count || 0),
    replyCount: Number(post.replies_count || 0),
    boostCount: Number(post.reblogs_count || 0),
    languageHint: detectLanguageHint(content),
    mediaCount: Array.isArray(post.media_attachments) ? post.media_attachments.length : 0,
  };
}

async function fetchRedditSubreddit(subreddit, limit = 25) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}&raw_json=1`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Reddit fetch failed for ${subreddit}: ${response.status}`);
  }
  const payload = await response.json();
  const children = Array.isArray(payload?.data?.children) ? payload.data.children : [];
  return children.map((child) => normalizeRedditItem(subreddit, child.data || {}));
}

async function fetchMastodonTag(tag, limit = 20) {
  const url = `https://mastodon.social/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Mastodon fetch failed for ${tag}: ${response.status}`);
  }
  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : [];
  return items.map((item) => normalizeMastodonItem(tag, item));
}

function relevanceScore(record) {
  const text = `${record.title || ""} ${record.body || ""} ${(record.tags || []).join(" ")}`;
  const lower = normalizeText(text).toLowerCase();
  const matches = RELEVANCE_KEYWORDS.reduce((sum, keyword) => sum + (lower.includes(keyword) ? 1 : 0), 0);
  const topicHits = extractTopicBag([record.title, record.body], record.tags).length;
  return matches * 2 + topicHits;
}

function dedupeCorpus(records) {
  const seen = new Set();
  const deduped = [];
  for (const record of records) {
    const key = [
      record.sourcePlatform,
      record.sourceCommunity,
      normalizeText(record.title).toLowerCase(),
      normalizeText(record.body).toLowerCase(),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }
  return deduped;
}

function sortByNewest(records = []) {
  return [...records].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function pickBalancedSelection(records = [], limit = 100) {
  const reddit = sortByNewest(records.filter((record) => record.sourcePlatform === "reddit"));
  const mastodon = sortByNewest(records.filter((record) => record.sourcePlatform === "mastodon"));
  const half = Math.floor(limit / 2);
  const selected = [
    ...reddit.slice(0, half),
    ...mastodon.slice(0, limit - half),
  ];

  if (selected.length >= limit) {
    return sortByNewest(selected).slice(0, limit);
  }

  const used = new Set(selected.map((record) => record.corpusId));
  const remaining = sortByNewest(records).filter((record) => !used.has(record.corpusId));
  return sortByNewest([...selected, ...remaining.slice(0, limit - selected.length)]).slice(0, limit);
}

async function main() {
  const { output, limit } = parseArgs(process.argv);
  const redditLimitPerSub = 25;
  const mastodonLimitPerTag = 20;

  const redditResults = [];
  const redditErrors = [];
  for (const subreddit of REDDIT_COMMUNITIES) {
    try {
      const items = await fetchRedditSubreddit(subreddit, redditLimitPerSub);
      redditResults.push(...items);
      console.log(`[crawl] Reddit r/${subreddit}: ${items.length}`);
    } catch (error) {
      redditErrors.push({ subreddit, error: String(error?.message || error) });
      console.warn(`[crawl] Reddit r/${subreddit} failed: ${error?.message || error}`);
    }
  }

  const mastodonResults = [];
  const mastodonErrors = [];
  for (const tag of MASTODON_TAGS) {
    try {
      const items = await fetchMastodonTag(tag, mastodonLimitPerTag);
      mastodonResults.push(...items);
      console.log(`[crawl] Mastodon #${tag}: ${items.length}`);
    } catch (error) {
      mastodonErrors.push({ tag, error: String(error?.message || error) });
      console.warn(`[crawl] Mastodon #${tag} failed: ${error?.message || error}`);
    }
  }

  const all = dedupeCorpus([...redditResults, ...mastodonResults])
    .filter((record) => hasRelevantKeyword(`${record.title} ${record.body} ${(record.tags || []).join(" ")}`))
    .map((record) => ({
      ...record,
      corpusId: makeId(record.sourcePlatform, `${record.sourceCommunity}:${record.sourceId}`),
      fetchedAt: new Date().toISOString(),
      topicBag: extractTopicBag([record.title, record.body], record.tags),
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const selected = pickBalancedSelection(all, limit);

  const result = {
    exportedAt: new Date().toISOString(),
    topic: "fashion-community",
    selectionLimit: limit,
    sourceSummary: {
      reddit: { communities: REDDIT_COMMUNITIES, limitPerCommunity: redditLimitPerSub, totalFetched: redditResults.length, errors: redditErrors },
      mastodon: { tags: MASTODON_TAGS, limitPerTag: mastodonLimitPerTag, totalFetched: mastodonResults.length, errors: mastodonErrors },
      totalCandidates: all.length,
      totalSelected: selected.length,
    },
    records: selected.map((record) => ({
      corpusId: record.corpusId,
      sourcePlatform: record.sourcePlatform,
      sourceCommunity: record.sourceCommunity,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
      sourceAuthorId: record.sourceAuthorId,
      sourceAuthorName: record.sourceAuthorName,
      createdAt: record.createdAt,
      title: record.title,
      body: record.body,
      text: record.text,
      excerpt: record.excerpt,
      tags: record.tags,
      score: record.score,
      replyCount: record.replyCount,
      boostCount: record.boostCount || 0,
      mediaCount: record.mediaCount || 0,
      languageHint: record.languageHint,
      topicBag: record.topicBag,
    })),
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[crawl] Wrote ${selected.length} source posts to ${output}`);
  console.log(`[crawl] Candidates seen=${all.length}, selected=${selected.length}`);
}

main().catch((error) => {
  console.error("[crawl] Failed:", error);
  process.exit(1);
});
