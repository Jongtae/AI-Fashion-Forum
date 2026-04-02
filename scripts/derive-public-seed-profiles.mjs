#!/usr/bin/env node
/**
 * derive-public-seed-profiles.mjs
 *
 * Turn the normalized public seed corpus into 1000 derived seed profiles.
 *
 * Usage:
 *   node scripts/derive-public-seed-profiles.mjs
 *   node scripts/derive-public-seed-profiles.mjs --input data/seed-corpus/public/recent-fashion-corpus.json
 *   node scripts/derive-public-seed-profiles.mjs --output data/seed-corpus/public/recent-fashion-seed-profiles.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveAuthorIdentity } from "@ai-fashion-forum/shared-types";

import {
  buildSourceReference,
  clamp,
  createRng,
  deriveEmotionSignals,
  deriveStyleMarkers,
  extractTopicBag,
  humanizeTopicLabel,
  normalizeText,
  pickAvatarLocale,
  round,
  splitSentences,
} from "./public-seed-corpus-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-corpus.json");
const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-seed-profiles.json");
const DEFAULT_LIMIT = 1000;

const VARIANT_TEMPLATES = [
  {
    name: "quiet_observer",
    primaryMode: "quiet_observer",
    responseStyle: "selective_response",
    memoryPriority: "topic_weighted",
    moodWeight: { curiosity: 0.04, care: 0.02, skepticism: 0.02, belonging: 0.01, novelty: 0.02 },
  },
  {
    name: "supportive_responder",
    primaryMode: "thread_participant",
    responseStyle: "dialogue_first",
    memoryPriority: "high_social_feedback",
    moodWeight: { curiosity: 0.01, care: 0.08, skepticism: -0.01, belonging: 0.06, novelty: 0.01 },
  },
  {
    name: "curious_questioner",
    primaryMode: "thread_participant",
    responseStyle: "question_first",
    memoryPriority: "topic_weighted",
    moodWeight: { curiosity: 0.1, care: 0.02, skepticism: 0.01, belonging: 0.01, novelty: 0.04 },
  },
  {
    name: "analytical_comparator",
    primaryMode: "analytical_observer",
    responseStyle: "compare_and_refine",
    memoryPriority: "topic_weighted",
    moodWeight: { curiosity: 0.05, care: 0.01, skepticism: 0.06, belonging: 0, novelty: 0.02 },
  },
  {
    name: "playful_commenter",
    primaryMode: "playful_observer",
    responseStyle: "light_reply",
    memoryPriority: "social_feedback",
    moodWeight: { curiosity: 0.02, care: 0.03, skepticism: -0.02, belonging: 0.05, novelty: 0.08 },
  },
  {
    name: "reflective_storyteller",
    primaryMode: "reflective_observer",
    responseStyle: "story_first",
    memoryPriority: "experience_weighted",
    moodWeight: { curiosity: 0.02, care: 0.05, skepticism: 0.01, belonging: 0.03, novelty: 0.02 },
  },
  {
    name: "skeptical_taster",
    primaryMode: "contrarian_observer",
    responseStyle: "challenge_and_refine",
    memoryPriority: "conflict_sensitive",
    moodWeight: { curiosity: 0.03, care: -0.01, skepticism: 0.1, belonging: -0.01, novelty: 0.03 },
  },
  {
    name: "trend_tracker",
    primaryMode: "trend_setter",
    responseStyle: "broadcast_first",
    memoryPriority: "engagement_weighted",
    moodWeight: { curiosity: 0.03, care: 0.01, skepticism: 0, belonging: 0.03, novelty: 0.09 },
  },
  {
    name: "empathetic_reassurer",
    primaryMode: "supportive_responder",
    responseStyle: "concise_support",
    memoryPriority: "relationship_weighted",
    moodWeight: { curiosity: 0.02, care: 0.1, skepticism: -0.01, belonging: 0.08, novelty: 0.01 },
  },
  {
    name: "discussion_nudger",
    primaryMode: "thread_participant",
    responseStyle: "dialogue_first",
    memoryPriority: "high_social_feedback",
    moodWeight: { curiosity: 0.08, care: 0.03, skepticism: 0.02, belonging: 0.04, novelty: 0.05 },
  },
];

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, limit: DEFAULT_LIMIT };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--input" && next) {
      args.input = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
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

function pickTopTopics(topicBag = [], limit = 5) {
  return Array.isArray(topicBag) ? topicBag.slice(0, limit) : [];
}

function deriveBaseSignals(record) {
  const title = normalizeText(record.title);
  const body = normalizeText(record.body);
  const text = [title, body, ...(record.tags || [])].join(" ");
  const questionCount = (text.match(/\?/g) || []).length;
  const exclamationCount = (text.match(/!/g) || []).length;
  const firstPersonCount = (text.match(/\b(i|i'm|i’ve|i've|we|we're|we've|저는|나는|우리)\b/gi) || []).length;
  const mediaCount = Number(record.mediaCount || 0);
  const replyCount = Number(record.replyCount || 0);
  const score = Number(record.score || 0);
  const tags = Array.isArray(record.tags) ? record.tags : [];
  const topicBag = Array.isArray(record.topicBag) ? record.topicBag : extractTopicBag([title, body], tags);
  const topicCount = topicBag.length;
  const tagCount = tags.length;
  const emotion = deriveEmotionSignals([title, body, tags.join(" ")]);
  const style = deriveStyleMarkers([title, body]);

  return {
    text,
    questionCount,
    exclamationCount,
    firstPersonCount,
    mediaCount,
    replyCount,
    score,
    tagCount,
    topicBag,
    topicCount,
    emotion,
    style,
    dominantTopics: pickTopTopics(topicBag, 5),
    titleSentence: splitSentences(title)[0] || title,
    bodySentence: splitSentences(body)[0] || body,
  };
}

function deriveAxes(base, template, variantRng) {
  const engagement = clamp(base.score / 120);
  const conversation = clamp(base.replyCount / 50);
  const visual = clamp(base.mediaCount / 4);
  const topicDiversity = clamp(base.topicCount / 8);
  const curiosityBoost = clamp(0.16 + base.questionCount * 0.09 + topicDiversity * 0.2 + template.moodWeight.curiosity);
  const careBoost = clamp(0.14 + conversation * 0.28 + base.firstPersonCount * 0.03 + template.moodWeight.care);
  const noveltyBoost = clamp(0.15 + visual * 0.2 + topicDiversity * 0.18 + template.moodWeight.novelty);
  const lowerText = base.text.toLowerCase();
  const skepticismBoost = clamp(0.12 + (lowerText.includes("price") || lowerText.includes("cost") ? 0.12 : 0) + template.moodWeight.skepticism);
  const belongingBoost = clamp(0.14 + conversation * 0.2 + base.firstPersonCount * 0.02 + template.moodWeight.belonging);
  const statusBoost = clamp(0.14 + engagement * 0.16 + (lowerText.includes("drop") ? 0.08 : 0));

  const jitter = () => (variantRng() - 0.5) * 0.06;

  return {
    curiosity: round(clamp(curiosityBoost + jitter())),
    status_drive: round(clamp(statusBoost + jitter())),
    care_drive: round(clamp(careBoost + jitter())),
    novelty_drive: round(clamp(noveltyBoost + jitter())),
    skepticism: round(clamp(skepticismBoost + jitter())),
    belonging_drive: round(clamp(belongingBoost + jitter())),
  };
}

function deriveBehaviorHints(template, base, variantIndex) {
  const hasQuestion = base.questionCount > 0;
  const hasReplies = base.replyCount > 0;
  const isVisual = base.mediaCount > 0;

  const memoryPriority =
    template.memoryPriority === "high_social_feedback" || hasReplies
      ? "high_social_feedback"
      : template.memoryPriority === "conflict_sensitive"
        ? "conflict_sensitive"
        : template.memoryPriority === "engagement_weighted"
          ? "engagement_weighted"
          : template.memoryPriority;

  const responseStyle =
    template.responseStyle === "question_first" && !hasQuestion
      ? "selective_response"
      : template.responseStyle === "broadcast_first" && isVisual
        ? "broadcast_first"
        : template.responseStyle;

  return {
    primaryMode: template.primaryMode,
    responseStyle,
    memoryPriority,
    stance: hasQuestion ? "curious" : hasReplies ? "dialogue_ready" : "observant",
    variantIndex,
  };
}

function deriveDominantMood(base, template) {
  const dominantEmotion = base.emotion.dominantEmotion;
  const moodMap = {
    curiosity: "observant",
    empathy: "supportive",
    amusement: "playful",
    sadness: "reflective",
    anger: "skeptical",
    relief: "calm",
    anticipation: "anticipatory",
    surprise: "reactive",
  };
  const baseMood = moodMap[dominantEmotion] || "observant";
  if (template.primaryMode === "contrarian_observer") return "skeptical";
  if (template.primaryMode === "playful_observer") return "playful";
  if (template.primaryMode === "supportive_responder") return "supportive";
  if (template.primaryMode === "trend_setter") return "anticipatory";
  return baseMood;
}

function deriveVoiceNotes(record, base, template) {
  const topicLabels = (base.dominantTopics || []).map((item) => humanizeTopicLabel(item.key)).filter(Boolean);
  const notes = [
    `톤은 ${template.name.replace(/_/g, " ")}에 맞춘다.`,
    base.style.register === "casual_playful" ? "가벼운 웃음표현은 한 번만 쓴다." : "말끝은 대화체로 자연스럽게 닫는다.",
    topicLabels.length > 0 ? `주요 관심사는 ${topicLabels.slice(0, 3).join(", ")}.` : "주제는 짧게 잡고 바로 본문으로 들어간다.",
    record.languageHint === "ja" ? "일본어 감각의 짧은 리듬을 참고한다." : record.languageHint === "ko" ? "한국어 대화 리듬을 우선한다." : "짧고 직접적인 커뮤니티 말투를 우선한다.",
  ];
  return [...new Set(notes)];
}

function deriveMemoryPromptHints(record, base, template) {
  const topicLabels = (base.dominantTopics || []).map((item) => humanizeTopicLabel(item.key)).filter(Boolean);
  const sourceSentence = normalizeText(record.excerpt || record.body || record.title).slice(0, 120);
  return [
    `Seeded from a recent public ${record.sourcePlatform} post in ${record.sourceCommunity}.`,
    topicLabels.length > 0 ? `Primary topics: ${topicLabels.slice(0, 3).join(", ")}.` : "Primary topics are broad fashion/community reactions.",
    `Behavior template: ${template.name.replace(/_/g, " ")}.`,
    sourceSentence ? `Source excerpt: ${sourceSentence}` : "Source excerpt unavailable.",
  ];
}

function buildSeedProfile(record, variantIndex, template) {
  const base = deriveBaseSignals(record);
  const seedId = `pubseed:${record.sourcePlatform}:${record.corpusId}:v${String(variantIndex + 1).padStart(2, "0")}`;
  const sourceAuthorId = `${seedId}:agent`;
  const seedRng = createRng(`${seedId}:${record.createdAt}`);
  const identity = resolveAuthorIdentity({
    authorId: sourceAuthorId,
    authorType: "agent",
    localeHint: pickAvatarLocale(sourceAuthorId, `${record.title} ${record.body}`),
  });

  const dominantTopics = base.dominantTopics.length > 0 ? base.dominantTopics : [{ key: "fashion", count: 1 }];
  const dominantTopicLabel = humanizeTopicLabel(dominantTopics[0]?.key || "fashion");
  const profileRole = template.primaryMode === "trend_setter" ? "public_trend_seed" : "public_reference_seed";

  return {
    seedProfileId: seedId,
    sourceAuthorId,
    sourceAuthorType: "agent",
    profileRole,
    displayLabel: identity.displayName,
    displayName: identity.displayName,
    handle: identity.handle,
    avatarUrl: identity.avatarUrl,
    avatarLocale: identity.avatarLocale,
    localeHint: identity.avatarLocale,
    dominantMood: deriveDominantMood(base, template),
    seedAxes: deriveAxes(base, template, seedRng),
    behaviorHints: deriveBehaviorHints(template, base, variantIndex),
    topicalMemory: {
      dominantTopics: dominantTopics,
      topFormats: [{ key: record.sourceCommunity, count: 1 }],
      totalPosts: 1,
      totalLikes: Number(record.score || 0),
      totalComments: Number(record.replyCount || 0),
      nestedComments: 0,
      imageBackedPosts: Number(record.mediaCount || 0) > 0 ? 1 : 0,
      uniqueTopicCount: dominantTopics.length,
    },
    emotionalBias: base.emotion.weights,
    emotionSignature: {
      dominantEmotion: base.emotion.dominantEmotion,
      secondaryEmotion: base.emotion.secondaryEmotion,
      notes: [`source_language=${record.languageHint || "en"}`, `template=${template.name}`],
    },
    surfaceSignals: {
      avgLikes: round(Number(record.score || 0)),
      avgComments: round(Number(record.replyCount || 0)),
      nestedCommentRate: 0,
      postVolume: 1,
      diversityScore: round(clamp((dominantTopics.length + 1) / 7)),
    },
    commentStyle: {
      register: base.style.register,
      cadence: base.style.cadence,
      openerMarkers: base.style.openerMarkers,
      endingMarkers: base.style.endingMarkers,
      playfulMarkers: base.style.playfulMarkers,
    },
    voiceNotes: deriveVoiceNotes(record, base, template),
    memoryPromptHints: deriveMemoryPromptHints(record, base, template),
    sourceReferences: [buildSourceReference(record)],
    timeRange: {
      firstSeenAt: record.createdAt,
      lastSeenAt: record.createdAt,
    },
    exposureSummary: {
      source_post_count: 1,
      source_comment_count: Number(record.replyCount || 0),
      dominant_topics: dominantTopics.map((topic) => topic.key),
      engagement: {
        score: Number(record.score || 0),
        replyCount: Number(record.replyCount || 0),
        mediaCount: Number(record.mediaCount || 0),
      },
    },
    selfNarratives: [
      `Starts from a public ${record.sourcePlatform} post about ${dominantTopicLabel}.`,
      `Template bias: ${template.name.replace(/_/g, " ")}.`,
      ...deriveMemoryPromptHints(record, base, template).slice(0, 2),
    ],
    rawSnapshot: {
      sourceRecord: record,
      variantIndex,
      template: template.name,
      baseSignals: base,
    },
  };
}

async function main() {
  const { input, output, limit } = parseArgs(process.argv);
  const raw = await fs.readFile(input, "utf8");
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed.records) ? parsed.records.slice(0, 100) : [];

  if (records.length === 0) {
    throw new Error(`No source records found in ${input}`);
  }

  const profiles = [];
  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    const record = records[recordIndex];
    for (let variantIndex = 0; variantIndex < VARIANT_TEMPLATES.length; variantIndex += 1) {
      profiles.push(buildSeedProfile(record, variantIndex, VARIANT_TEMPLATES[variantIndex]));
      if (profiles.length >= limit) break;
    }
    if (profiles.length >= limit) break;
  }

  const result = {
    exportedAt: new Date().toISOString(),
    source: {
      inputFile: input,
      recordCount: records.length,
    },
    model: "public-seed-profiles",
    profiles,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[public-seed-profiles] Wrote ${profiles.length} profiles to ${output}`);
  console.log(`[public-seed-profiles] Input records=${records.length}`);
}

main().catch((error) => {
  console.error("[public-seed-profiles] Failed:", error);
  process.exit(1);
});
