import {
  countMatches,
  detectLanguageHint,
  extractTopicBag,
  normalizeText,
  splitSentences,
  summarizeText,
} from "./public-seed-corpus-utils.mjs";

const CATEGORY_KEYWORDS = {
  fashion: ["fashion", "style", "outfit", "ootd", "wear", "look", "jacket", "dress", "shirt", "blazer"],
  beauty: ["beauty", "makeup", "skincare", "fragrance", "perfume", "scent", "cosmetic"],
  celebrity: ["celebrity", "actor", "actress", "idol", "popstar", "portrait", "photo shoot", "cover", "iu", "rita ora", "sofia coppola", "ciara"],
  culture: ["culture", "art", "arthistory", "film", "movie", "music", "astrology", "writing", "magazine"],
  lifestyle: ["daily", "everyday", "home", "family", "life", "routine", "work", "office", "commute"],
  retail: ["price", "deal", "budget", "launch", "drop", "release", "restock", "limited", "sale"],
  travel: ["travel", "trip", "airport", "hotel", "flight", "vacation", "beach", "resort"],
  pets: ["dog", "cat", "puppy", "kitten", "pet", "walk", "grooming"],
  cars: ["car", "ev", "hybrid", "drive", "vehicle", "sedan", "suv"],
  retro: ["retro", "vintage", "archive", "90s", "2000s", "y2k", "nostalgia"],
  daily_life: ["today", "weekend", "morning", "night", "friend", "people", "community"],
};

const TOPIC_CATEGORY_HINTS = {
  fashion: ["fashion"],
  streetwear: ["fashion"],
  sizing_fit: ["fashion"],
  layering: ["fashion"],
  outerwear: ["fashion"],
  bottoms: ["fashion"],
  shoes: ["fashion"],
  accessories: ["fashion"],
  thrift: ["fashion", "retro"],
  tailoring: ["fashion"],
  price: ["retail"],
  color: ["fashion"],
  office_style: ["fashion", "lifestyle"],
  casualwear: ["fashion", "daily_life"],
  dress: ["fashion"],
  kfashion: ["fashion", "culture"],
  jfashion: ["fashion", "culture"],
  ootd: ["fashion", "daily_life"],
  new_drop: ["retail", "fashion"],
  opinion: ["daily_life"],
};

const ENTITY_STOPWORDS = new Set([
  "What",
  "How",
  "Which",
  "When",
  "The",
  "This",
  "That",
  "These",
  "Those",
  "Click",
  "More",
  "Your",
  "From",
  "And",
  "For",
]);

const GENERIC_ENTITY_TERMS = new Set([
  "Arts",
  "ArtHistory",
  "Beauty",
  "By",
  "Click",
  "Cover",
  "Culture",
  "Design",
  "Entertainment",
  "Fashion",
  "Fun",
  "Impact",
  "Korea",
  "More",
  "Portrait",
  "Post",
  "Recently",
  "Singer",
  "Style",
  "Stylish",
  "This",
  "Women",
]);

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildText(record = {}) {
  return normalizeText(
    [
      record.title,
      record.body,
      record.excerpt,
      ...(Array.isArray(record.tags) ? record.tags : []),
      record.sourceCommunity,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function cleanEventSegment(segment = "", title = "") {
  let cleaned = normalizeText(segment)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w.-]+\.(com|net|org|co|jp|kr|gy)\/\S*\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizedTitle = normalizeText(title);
  if (normalizedTitle && cleaned.startsWith(normalizedTitle) && cleaned.length > normalizedTitle.length + 12) {
    cleaned = cleaned.slice(normalizedTitle.length).trim();
  }

  cleaned = cleaned.replace(/^[-–—:|]+/, "").trim();
  return cleaned;
}

function isMeaningfulSignalText(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (/^https?:/i.test(normalized)) return false;
  if (/^[\w.-]+\.(com|net|org|co|jp|kr|gy)$/i.test(normalized)) return false;
  return normalized.length >= 4;
}

function countSignalKeyword(text = "", keyword = "") {
  const normalizedText = String(text).toLowerCase();
  const normalizedKeyword = String(keyword).toLowerCase().trim();
  if (!normalizedKeyword) return 0;

  if (/^[a-z0-9_-]+$/i.test(normalizedKeyword)) {
    const pattern = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const matches = normalizedText.match(pattern);
    return matches ? matches.length : 0;
  }

  const matches = normalizedText.match(new RegExp(normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
  return matches ? matches.length : 0;
}

function inferCategories(record = {}) {
  const text = buildText(record).toLowerCase();
  const topicBag = Array.isArray(record.topicBag)
    ? record.topicBag
    : extractTopicBag([record.title, record.body, record.excerpt], record.tags || []);
  const rawScores = new Map();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((sum, keyword) => sum + countSignalKeyword(text, keyword), 0);
    if (score > 0) rawScores.set(category, (rawScores.get(category) || 0) + score);
  }

  for (const topic of topicBag) {
    const hinted = TOPIC_CATEGORY_HINTS[topic.key] || [];
    for (const category of hinted) {
      rawScores.set(category, (rawScores.get(category) || 0) + Math.max(1, topic.count));
    }
  }

  if (!rawScores.size) {
    rawScores.set("fashion", 1);
  }

  const title = normalizeText(record.title).toLowerCase();
  const celebrityCue =
    countSignalKeyword(title, "cover") +
    countSignalKeyword(title, "photo shoot") +
    countSignalKeyword(title, "celebrity") +
    countSignalKeyword(title, "popstar") +
    countSignalKeyword(title, "rita ora") +
    countSignalKeyword(title, "sofia coppola") +
    countSignalKeyword(title, "iu") +
    countSignalKeyword(title, "byeon woo seok") +
    countSignalKeyword(title, "ciara miller");
  if (celebrityCue > 0) {
    rawScores.set("celebrity", (rawScores.get("celebrity") || 0) + celebrityCue * 3);
  }

  const cultureCue =
    countSignalKeyword(text, "culture") +
    countSignalKeyword(text, "art") +
    countSignalKeyword(text, "movie") +
    countSignalKeyword(text, "film") +
    countSignalKeyword(text, "astrology");
  if (cultureCue > 0) {
    rawScores.set("culture", (rawScores.get("culture") || 0) + cultureCue * 2);
  }

  const beautyCue =
    countSignalKeyword(text, "beauty") +
    countSignalKeyword(text, "fragrance") +
    countSignalKeyword(text, "perfume") +
    countSignalKeyword(text, "scent");
  if (beautyCue > 0) {
    rawScores.set("beauty", (rawScores.get("beauty") || 0) + beautyCue * 2);
  }

  const retailCue =
    countSignalKeyword(text, "drop") +
    countSignalKeyword(text, "launch") +
    countSignalKeyword(text, "release") +
    countSignalKeyword(text, "limited") +
    countSignalKeyword(text, "price");
  if (retailCue > 0) {
    rawScores.set("retail", (rawScores.get("retail") || 0) + retailCue * 2);
  }

  const fashionScore = rawScores.get("fashion") || 0;
  const celebrityScore = rawScores.get("celebrity") || 0;
  const cultureScore = rawScores.get("culture") || 0;
  const beautyScore = rawScores.get("beauty") || 0;
  const retailScore = rawScores.get("retail") || 0;

  if (celebrityCue >= 2 && celebrityScore >= Math.max(1, fashionScore * 0.6)) {
    rawScores.set("celebrity", celebrityScore + 3);
  }
  if (cultureCue >= 2 && cultureScore >= Math.max(1, fashionScore * 0.6)) {
    rawScores.set("culture", cultureScore + 2);
  }
  if (beautyCue >= 2 && beautyScore >= Math.max(1, fashionScore * 0.5)) {
    rawScores.set("beauty", beautyScore + 2);
  }
  if (retailCue >= 2 && retailScore >= Math.max(1, fashionScore * 0.5)) {
    rawScores.set("retail", retailScore + 2);
  }

  const sorted = [...rawScores.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([category, score]) => ({ category, score }));

  const total = sorted.reduce((sum, item) => sum + item.score, 0) || 1;

  return {
    primaryCategory: sorted[0].category,
    categoryScores: sorted.map((item) => ({
      category: item.category,
      score: round(item.score / total),
    })),
  };
}

function extractHashtags(text = "") {
  return uniq((text.match(/#[A-Za-z0-9_가-힣ァ-ンぁ-ん]+/g) || []).map((tag) => tag.replace(/^#/, ""))).slice(0, 12);
}

function extractNamedEntities(text = "") {
  const entities = [];
  const seen = new Set();

  for (const match of text.matchAll(/\b([A-Z]{2,10})\b/g)) {
    const value = normalizeText(match[1]);
    if (!value || seen.has(value) || GENERIC_ENTITY_TERMS.has(value)) continue;
    entities.push({ value, type: "uppercase_term" });
    seen.add(value);
  }

  for (const match of text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g)) {
    const value = normalizeText(match[1]);
    if (!value || seen.has(value)) continue;
    const parts = value.split(/\s+/);
    if (parts.some((part) => ENTITY_STOPWORDS.has(part) || GENERIC_ENTITY_TERMS.has(part))) continue;
    entities.push({ value, type: "named_term" });
    seen.add(value);
  }

  for (const tag of extractHashtags(text)) {
    if (seen.has(tag)) continue;
    entities.push({ value: tag, type: "hashtag" });
    seen.add(tag);
  }

  return entities.slice(0, 12);
}

function extractQuestionAnchors(sentences = []) {
  return uniq(
    sentences
      .filter((sentence) => /\?|？/.test(sentence) || /^(what|how|which|should|is|are|do|does|anyone)\b/i.test(sentence))
      .map((sentence) => summarizeText(sentence)),
  ).filter(isMeaningfulSignalText).slice(0, 3);
}

function extractComparisonAnchors(sentences = []) {
  return uniq(
    sentences.filter((sentence) =>
      /\b(vs|versus|better|worse|compare|comparison)\b/i.test(sentence) ||
      /\b(or)\b/i.test(sentence) ||
      /\bbetween\b/i.test(sentence),
    )
      .map((sentence) => summarizeText(sentence)),
  ).filter(isMeaningfulSignalText).slice(0, 3);
}

function extractClaimAnchors(segments = []) {
  return uniq(
    segments
      .filter((segment) => segment && !/\?|？/.test(segment))
      .map((segment) => summarizeText(segment.replace(/^#+\s*/, "").trim())),
  ).filter(isMeaningfulSignalText).slice(0, 3);
}

function extractFactAnchors(record = {}, segments = []) {
  const facts = [];
  const title = normalizeText(record.title);
  const excerpt = normalizeText(record.excerpt);
  const sourceCommunity = normalizeText(record.sourceCommunity);

  if (title && !/\?|？/.test(title)) facts.push(title);
  if (excerpt && excerpt !== title && !/\?|？/.test(excerpt)) facts.push(summarizeText(excerpt));
  for (const segment of segments.slice(0, 2)) {
    if (segment && !/\?|？/.test(segment)) facts.push(summarizeText(segment));
  }
  if (sourceCommunity) facts.push(`Observed in ${sourceCommunity}`);

  return uniq(facts).filter(isMeaningfulSignalText).slice(0, 4);
}

function classifyEventType(record = {}, anchors = {}, categories = {}) {
  const text = buildText(record).toLowerCase();
  if (anchors.questionAnchors.length > 0 && anchors.comparisonAnchors.length > 0) return "comparison_question";
  if (anchors.questionAnchors.length > 0) return "question_prompt";
  if (/\b(drop|launch|release|limited|restock)\b/i.test(text)) return "product_or_release_signal";
  if (categories.primaryCategory === "celebrity") return "celebrity_signal";
  if (categories.primaryCategory === "culture") return "culture_signal";
  if (/\b(price|worth|budget|deal)\b/i.test(text)) return "price_or_value_claim";
  return "fact_or_claim_signal";
}

function buildDiscussionHooks(record = {}, categories = {}, anchors = {}) {
  const hooks = [];
  const primaryCategory = categories.primaryCategory;

  for (const question of anchors.questionAnchors) {
    hooks.push(`Answer or challenge the source question: ${question}`);
  }
  for (const comparison of anchors.comparisonAnchors) {
    hooks.push(`Take a side on the comparison: ${comparison}`);
  }
  for (const claim of anchors.claimAnchors.slice(0, 2)) {
    hooks.push(`React with a personal example or counterexample: ${summarizeText(claim)}`);
  }

  if (primaryCategory === "celebrity") {
    hooks.push("Tie the signal to a celebrity-driven style reaction or fan/community split.");
  }
  if (primaryCategory === "beauty") {
    hooks.push("Turn the signal into a product-use reaction, scent reaction, or routine comparison.");
  }
  if (primaryCategory === "culture") {
    hooks.push("Use the source as a cultural talking point rather than a pure fashion recap.");
  }
  if (primaryCategory === "retail") {
    hooks.push("Ask whether the drop, sale, or price point is actually worth acting on.");
  }

  return uniq(hooks).slice(0, 6);
}

function buildSuggestedPostModes(eventType, categories = {}) {
  const modes = new Set(["react_with_context"]);
  if (eventType === "question_prompt" || eventType === "comparison_question") {
    modes.add("answer_with_personal_preference");
    modes.add("ask_the_feed_to_choose");
  }
  if (eventType === "product_or_release_signal" || categories.primaryCategory === "retail") {
    modes.add("signal_boost_with_take");
    modes.add("value_check_post");
  }
  if (categories.primaryCategory === "celebrity" || categories.primaryCategory === "culture") {
    modes.add("quote_and_expand");
  }
  if (categories.primaryCategory === "daily_life" || categories.primaryCategory === "lifestyle") {
    modes.add("relate_with_daily_example");
  }
  return [...modes];
}

function buildDetectionTriggers(record = {}, categories = {}, anchors = {}) {
  const triggers = [];
  const topTopics = Array.isArray(record.topicBag) ? record.topicBag.slice(0, 4).map((item) => item.key) : [];
  triggers.push(...topTopics.map((topic) => `topic:${topic}`));
  triggers.push(`category:${categories.primaryCategory}`);
  if (anchors.questionAnchors.length > 0) triggers.push("format:question");
  if (anchors.comparisonAnchors.length > 0) triggers.push("format:comparison");
  if (anchors.claimAnchors.length > 0) triggers.push("format:claim");
  if (Number(record.replyCount || 0) > 3) triggers.push("social:active-thread");
  if (Number(record.score || 0) > 5) triggers.push("social:high-signal");
  return uniq(triggers);
}

function buildFreshnessScore(createdAt) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0.3;
  const hoursAgo = Math.max(0, (Date.now() - created.getTime()) / (1000 * 60 * 60));
  if (hoursAgo <= 6) return 1;
  if (hoursAgo <= 24) return 0.85;
  if (hoursAgo <= 72) return 0.65;
  return 0.4;
}

function transformToWorldEventRecord(record = {}, index = 0) {
  const languageHint = record.languageHint || detectLanguageHint(buildText(record));
  const topicBag = Array.isArray(record.topicBag) && record.topicBag.length > 0
    ? record.topicBag
    : extractTopicBag([record.title, record.body, record.excerpt], record.tags || []);
  const sourceSegments = uniq(
    [record.title, record.excerpt, record.body]
      .map((value) => cleanEventSegment(value, record.title))
      .filter(isMeaningfulSignalText),
  );
  const sentences = splitSentences(sourceSegments.join(" "));
  const categories = inferCategories({ ...record, topicBag });
  const anchors = {
    factAnchors: extractFactAnchors({ ...record, topicBag }, sourceSegments),
    questionAnchors: extractQuestionAnchors(sentences),
    comparisonAnchors: extractComparisonAnchors(sentences),
    claimAnchors: extractClaimAnchors(sourceSegments),
    entities: extractNamedEntities(buildText(record)),
    hashtags: extractHashtags(buildText(record)),
  };
  const eventType = classifyEventType({ ...record, topicBag }, anchors, categories);

  return {
    signalId: `world-signal-${String(index + 1).padStart(4, "0")}`,
    source: {
      corpusId: record.corpusId,
      sourcePlatform: record.sourcePlatform,
      sourceCommunity: record.sourceCommunity,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
      createdAt: record.createdAt,
      languageHint,
    },
    raw: {
      title: normalizeText(record.title),
      excerpt: normalizeText(record.excerpt),
      body: normalizeText(record.body),
      tags: Array.isArray(record.tags) ? record.tags : [],
    },
    categories,
    eventType,
    topicBag,
    anchorPayload: {
      ...anchors,
      discussionHooks: buildDiscussionHooks({ ...record, topicBag }, categories, anchors),
    },
    normalizedSummary: summarizeText(record.excerpt || record.body || record.title),
    relevanceSignals: {
      freshnessScore: buildFreshnessScore(record.createdAt),
      conversationHeat: round(Math.min(1, Number(record.replyCount || 0) / 10)),
      sourceSignalScore: round(Math.min(1, Number(record.score || 0) / 20)),
    },
    agentHooks: {
      detectionTriggers: buildDetectionTriggers({ ...record, topicBag }, categories, anchors),
      suggestedPostModes: buildSuggestedPostModes(eventType, categories),
      ignoreWhen: [
        "The agent has no matching interest/category trigger and low curiosity.",
        "The event is stale and not connected to an active thread or relationship memory.",
      ],
      writeWhen: [
        "The signal matches the agent interest vector or recent memory shift.",
        "There is a question, comparison, or claim the agent can answer with a concrete take.",
      ],
    },
  };
}

function summarizeWorldEventRecords(records = []) {
  const categoryCounts = new Map();
  const eventTypeCounts = new Map();

  for (const record of records) {
    categoryCounts.set(record.categories.primaryCategory, (categoryCounts.get(record.categories.primaryCategory) || 0) + 1);
    eventTypeCounts.set(record.eventType, (eventTypeCounts.get(record.eventType) || 0) + 1);
  }

  const top = (map) =>
    [...map.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([key, count]) => ({ key, count }));

  return {
    categoryCounts: top(categoryCounts),
    eventTypeCounts: top(eventTypeCounts),
  };
}

export {
  inferCategories,
  transformToWorldEventRecord,
  summarizeWorldEventRecords,
};
