import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DISCUSSION_SEEDS_PATH = path.resolve(
  __dirname,
  "../../../../data/crawled-documents/discussion-seeds.json",
);

const discussionSeedCache = new Map();

function normalizeText(value = "") {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function mergeUnique(left = [], right = []) {
  return unique([...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]);
}

function tokenizeKoreanLike(value = "") {
  return unique(
    normalizeText(value)
      .toLowerCase()
      .split(/[^0-9a-z가-힣]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

export function loadDiscussionSeeds(seedPath = DEFAULT_DISCUSSION_SEEDS_PATH) {
  const resolvedPath = path.resolve(seedPath);
  if (discussionSeedCache.has(resolvedPath)) {
    return discussionSeedCache.get(resolvedPath);
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw);
    const bundle = {
      seedPath: resolvedPath,
      extractedAt: parsed?.extractedAt || null,
      seeds: Array.isArray(parsed?.seeds) ? parsed.seeds : [],
    };
    discussionSeedCache.set(resolvedPath, bundle);
    return bundle;
  } catch {
    const empty = { seedPath: resolvedPath, extractedAt: null, seeds: [] };
    discussionSeedCache.set(resolvedPath, empty);
    return empty;
  }
}

export function createDiscussionSeedSignalHints(discussionSeed = null) {
  if (!discussionSeed) {
    return null;
  }

  const reactionType = normalizeText(discussionSeed.reactionType);
  const primaryCategory = normalizeText(discussionSeed.categoryTags?.[0] || "daily");
  const eventTypeMap = {
    comparison_reaction: "comparison_question",
    price_reaction: "question_prompt",
    celebrity_reaction: "celebrity_signal",
    event_reaction: "culture_signal",
    trend_reaction: "question_prompt",
    season_reaction: "question_prompt",
    product_reaction: "question_prompt",
    general_reaction: "question_prompt",
  };
  const suggestedPostModesMap = {
    comparison_reaction: ["ask_the_feed_to_choose", "react_with_context"],
    price_reaction: ["value_check_post", "ask_the_feed_to_choose"],
    celebrity_reaction: ["signal_boost_with_take", "react_with_context"],
    event_reaction: ["signal_boost_with_take", "react_with_context"],
    trend_reaction: ["react_with_context", "ask_the_feed_to_choose"],
    season_reaction: ["react_with_context", "answer_with_personal_preference"],
    product_reaction: ["value_check_post", "react_with_context"],
    general_reaction: ["react_with_context", "answer_with_personal_preference"],
  };

  return {
    eventType: eventTypeMap[reactionType] || "question_prompt",
    primaryCategory,
    suggestedPostModes: suggestedPostModesMap[reactionType] || ["react_with_context"],
    anchors: unique([
      discussionSeed.subjectKo,
      discussionSeed.contextKo,
      discussionSeed.tensionPoint,
      ...(discussionSeed.possibleAngles || []),
    ]),
    discussionHooks: unique([
      discussionSeed.tensionPoint,
      ...(discussionSeed.possibleAngles || []),
    ]),
  };
}

function buildQuestionAnchors(discussionSeed = null, hints = null) {
  if (!discussionSeed) {
    return [];
  }

  const anchors = [];
  if (hints?.eventType === "comparison_question") {
    anchors.push(discussionSeed.tensionPoint, ...(discussionSeed.possibleAngles || []));
  } else if (hints?.eventType === "question_prompt") {
    anchors.push(discussionSeed.tensionPoint);
  }
  return unique(anchors.map(normalizeText));
}

function buildComparisonAnchors(discussionSeed = null, hints = null) {
  if (!discussionSeed || hints?.eventType !== "comparison_question") {
    return [];
  }

  return unique([
    discussionSeed.subjectKo,
    discussionSeed.contextKo,
    discussionSeed.tensionPoint,
    ...(discussionSeed.possibleAngles || []),
  ].map(normalizeText));
}

function buildClaimAnchors(discussionSeed = null) {
  if (!discussionSeed) {
    return [];
  }

  return unique([
    discussionSeed.tensionPoint,
    ...(discussionSeed.possibleAngles || []).filter((angle) => /이유|포인트|호불호|분석|후기|반응/.test(angle || "")),
  ].map(normalizeText));
}

function buildDetectionTriggers(discussionSeed = null, hints = null) {
  if (!discussionSeed) {
    return [];
  }

  const triggers = ["source:discussion_seed"];
  if (discussionSeed.seedId) {
    triggers.push(`seed:${discussionSeed.seedId}`);
  }
  if (hints?.eventType === "comparison_question") {
    triggers.push("format:comparison");
  } else if (hints?.eventType === "question_prompt") {
    triggers.push("format:question");
  } else {
    triggers.push("format:claim");
  }
  if (hints?.primaryCategory) {
    triggers.push(`topic:${hints.primaryCategory}`);
  }
  return unique(triggers.map(normalizeText));
}

function buildControversySignal(discussionSeed = null, hints = null) {
  if (!discussionSeed) {
    return 0.18;
  }

  if (hints?.eventType === "comparison_question") {
    return 0.65;
  }
  if ((discussionSeed.possibleAngles || []).some((angle) => /호불호|갈림|논쟁|반응/.test(angle || ""))) {
    return 0.45;
  }
  return 0.28;
}

export function createDiscussionSeedContentRecord({
  contentRecord = null,
  discussionSeed = null,
} = {}) {
  if (!discussionSeed) {
    return contentRecord;
  }

  const baseRecord = contentRecord && typeof contentRecord === "object" ? contentRecord : {};
  const baseMetadata = baseRecord.source_metadata && typeof baseRecord.source_metadata === "object"
    ? baseRecord.source_metadata
    : {};
  const baseAnchorPayload = baseMetadata.anchor_payload && typeof baseMetadata.anchor_payload === "object"
    ? baseMetadata.anchor_payload
    : {};
  const baseHooks = baseMetadata.agent_hooks && typeof baseMetadata.agent_hooks === "object"
    ? baseMetadata.agent_hooks
    : {};
  const hints = createDiscussionSeedSignalHints(discussionSeed);
  const seedTopics = Array.isArray(discussionSeed.categoryTags) ? discussionSeed.categoryTags : [];
  const mergedTopics = mergeUnique(baseRecord.topics || [], seedTopics);
  const synthesizedBody = unique([
    normalizeText(discussionSeed.contextKo),
    normalizeText(discussionSeed.tensionPoint),
    ...((discussionSeed.possibleAngles || []).map(normalizeText)),
  ])
    .filter(Boolean)
    .join(" ");

  return {
    ...baseRecord,
    title: normalizeText(discussionSeed.rawTitle || discussionSeed.subjectKo || baseRecord.title),
    body: normalizeText(baseRecord.body || baseRecord.content || synthesizedBody),
    content: normalizeText(baseRecord.content || baseRecord.body || synthesizedBody),
    topics: mergedTopics,
    source_metadata: {
      ...baseMetadata,
      origin: "world_event_signal",
      signal_id: discussionSeed.seedId || baseMetadata.signal_id || null,
      event_type: hints?.eventType || normalizeText(baseMetadata.event_type || ""),
      primary_category: hints?.primaryCategory || normalizeText(baseMetadata.primary_category || ""),
      anchor_payload: {
        ...baseAnchorPayload,
        questionAnchors: mergeUnique(baseAnchorPayload.questionAnchors || [], buildQuestionAnchors(discussionSeed, hints)),
        comparisonAnchors: mergeUnique(baseAnchorPayload.comparisonAnchors || [], buildComparisonAnchors(discussionSeed, hints)),
        factAnchors: mergeUnique(baseAnchorPayload.factAnchors || [], [
          discussionSeed.subjectKo,
          discussionSeed.contextKo,
        ].map(normalizeText)),
        claimAnchors: mergeUnique(baseAnchorPayload.claimAnchors || [], buildClaimAnchors(discussionSeed)),
        discussionHooks: mergeUnique(baseAnchorPayload.discussionHooks || [], [
          discussionSeed.tensionPoint,
          ...(discussionSeed.possibleAngles || []),
        ].map(normalizeText)),
        entities: mergeUnique(baseAnchorPayload.entities || [], discussionSeed.subjectKo ? [{
          value: normalizeText(discussionSeed.subjectKo),
          type: "discussion_subject",
        }] : []),
      },
      relevance_signals: {
        ...(baseMetadata.relevance_signals || {}),
        freshnessScore: Number(discussionSeed.freshnessScore || baseMetadata.relevance_signals?.freshnessScore || 0),
      },
      agent_hooks: {
        ...baseHooks,
        detectionTriggers: mergeUnique(baseHooks.detectionTriggers || [], buildDetectionTriggers(discussionSeed, hints)),
        suggestedPostModes: mergeUnique(baseHooks.suggestedPostModes || [], hints?.suggestedPostModes || []),
      },
      source_url: discussionSeed.sourceUrl || baseMetadata.source_url || "",
      popularity_score: Number(baseMetadata.popularity_score || 0.3),
      controversy_signal: buildControversySignal(discussionSeed, hints),
      novelty_bucket:
        Number(discussionSeed.freshnessScore || 0) >= 0.85
          ? "fresh"
          : Number(discussionSeed.freshnessScore || 0) >= 0.55
            ? "resurfacing"
            : "steady",
    },
  };
}

export function selectDiscussionSeedForContent({
  contentRecord = null,
  discussionSeeds = [],
  variationSeed = 0,
} = {}) {
  if (!Array.isArray(discussionSeeds) || discussionSeeds.length === 0) {
    return null;
  }

  const topics = Array.isArray(contentRecord?.topics) ? contentRecord.topics : [];
  const haystack = [
    contentRecord?.title,
    contentRecord?.body,
    contentRecord?.content,
    ...(contentRecord?.source_metadata?.anchor_payload?.questionAnchors || []),
    ...(contentRecord?.source_metadata?.anchor_payload?.factAnchors || []),
    ...(contentRecord?.source_metadata?.anchor_payload?.comparisonAnchors || []),
    ...(contentRecord?.source_metadata?.anchor_payload?.claimAnchors || []),
  ]
    .filter(Boolean)
    .join(" ");
  const haystackTokens = new Set(tokenizeKoreanLike(haystack));
  const topicSet = new Set(topics.map((topic) => normalizeText(topic)));

  const scored = discussionSeeds.map((seed, index) => {
    const seedTags = Array.isArray(seed.categoryTags) ? seed.categoryTags.map((tag) => normalizeText(tag)) : [];
    const seedTokens = tokenizeKoreanLike([
      seed.subjectKo,
      seed.contextKo,
      seed.tensionPoint,
      seed.rawTitle,
      ...(seed.possibleAngles || []),
    ].filter(Boolean).join(" "));

    const topicOverlap = seedTags.filter((tag) => topicSet.has(tag)).length;
    const lexicalOverlap = seedTokens.filter((token) => haystackTokens.has(token)).length;
    const freshness = Number(seed.freshnessScore || 0);
    const score = (topicOverlap * 3) + (lexicalOverlap * 2) + freshness;

    return {
      seed,
      score,
      order: Math.abs(Number(variationSeed || 0) + index) % discussionSeeds.length,
    };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.order - right.order;
  });

  return scored[0]?.seed || discussionSeeds[Math.abs(Number(variationSeed || 0)) % discussionSeeds.length] || null;
}
