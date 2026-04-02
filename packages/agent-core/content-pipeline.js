import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_PROVIDER_INTERFACE,
  createProviderRecord,
  normalizeProviderRecord,
} from "@ai-fashion-forum/shared-types";

import {
  deriveEmotionSignals,
  extractTopicBag,
  normalizeText,
  stripHtml,
} from "../../scripts/public-seed-corpus-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PUBLIC_SEED_CORPUS_PATH = path.resolve(
  __dirname,
  "../../data/seed-corpus/public/recent-fashion-corpus.json",
);

const publicSeedCorpusCache = new Map();

function assertContentProvider(provider) {
  if (!provider || typeof provider.getRecords !== "function") {
    throw new Error("provider must implement ContentProvider.getRecords(context)");
  }
}

function sanitizeSeedText(value = "") {
  return normalizeText(stripHtml(String(value || "")))
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readCorpusText(record = {}) {
  const fields = [
    record.title,
    record.body,
    record.text,
    record.excerpt,
  ];

  const normalized = fields
    .map((value) => sanitizeSeedText(value))
    .find((value) => Boolean(value));

  return normalized || "";
}

function resolvePublicSeedCorpusPath(explicitPath) {
  if (explicitPath) {
    return path.resolve(process.cwd(), explicitPath);
  }

  if (process.env.PUBLIC_SEED_CORPUS_FILE) {
    return path.resolve(process.cwd(), process.env.PUBLIC_SEED_CORPUS_FILE);
  }

  return DEFAULT_PUBLIC_SEED_CORPUS_PATH;
}

async function loadPublicSeedCorpusBundle({ corpusPath } = {}) {
  const resolvedPath = resolvePublicSeedCorpusPath(corpusPath);
  if (publicSeedCorpusCache.has(resolvedPath)) {
    return publicSeedCorpusCache.get(resolvedPath);
  }

  try {
    const raw = await fs.readFile(resolvedPath, "utf8");
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed?.records) ? parsed.records : [];
    const bundle = {
      corpusPath: resolvedPath,
      exportedAt: parsed?.exportedAt || null,
      topic: parsed?.topic || null,
      selectionLimit: parsed?.selectionLimit || null,
      sourceSummary: parsed?.sourceSummary || null,
      records,
    };
    publicSeedCorpusCache.set(resolvedPath, bundle);
    return bundle;
  } catch (error) {
    publicSeedCorpusCache.set(resolvedPath, null);
    return null;
  }
}

function hasQuestionSignal(text = "") {
  return /\?/u.test(text) || /\b(why|what|how|which|when|where|궁금|어떻게|왜|무슨)\b/i.test(text);
}

function hasPricingSignal(text = "") {
  return /\b(price|cost|budget|worth|cheap|expensive|pricing|value|가격|비용|가성비)\b/i.test(text);
}

function hasSizingSignal(text = "") {
  return /\b(size|sizing|fit|small|large|tight|loose|핏|사이즈|여유)\b/i.test(text);
}

function hasStyleSignal(record = {}, text = "") {
  return (
    record.mediaCount > 0 ||
    /\b(style|ootd|outfit|look|fitcheck|코디|스타일|착장|룩)\b/i.test(text)
  );
}

function derivePublicSourceType(record = {}, text = "") {
  if (Number(record.mediaCount || 0) > 0) {
    return "image_description";
  }

  if (
    /\bhttps?:\/\/\S+/i.test(text) ||
    /\b(article|review|news|feature|guide|blog|announcement|launch)\b/i.test(text)
  ) {
    return "external_article";
  }

  return "social_post";
}

function derivePublicFormat(record = {}, sourceType = "social_post", text = "") {
  if (sourceType === "image_description") {
    return /cat|dog|pet|강아지|고양이|반려/i.test(text) ? "pet_episode" : "scene_note";
  }

  if (sourceType === "external_article") {
    if (hasPricingSignal(text)) {
      return "buy_decision";
    }
    return "trend_report";
  }

  if (hasSizingSignal(text)) {
    return "size_help";
  }
  if (hasPricingSignal(text)) {
    return "buy_decision";
  }
  if (hasStyleSignal(record, text)) {
    return record.replyCount > 20 ? "empathy_post" : "style_signal";
  }
  if (hasQuestionSignal(text)) {
    return "empathy_post";
  }

  return "daily_snapshot";
}

function derivePublicTopics(record = {}, text = "") {
  const topicBag = Array.isArray(record.topicBag) && record.topicBag.length > 0
    ? record.topicBag
    : extractTopicBag([record.title, record.body, record.text, record.excerpt], record.tags || []);
  const topics = topicBag
    .map((item) => item?.key)
    .filter(Boolean);

  if (topics.length > 0) {
    return [...new Set(topics)].slice(0, 6);
  }

  if (hasPricingSignal(text)) {
    return ["pricing", "tradeoff"];
  }
  if (hasSizingSignal(text)) {
    return ["sizing_fit", "fit"];
  }
  if (hasStyleSignal(record, text)) {
    return ["fashion", "style"];
  }

  return ["community"];
}

function derivePublicEmotions(record = {}, text = "") {
  const derived = deriveEmotionSignals([record.title, record.body, record.text, record.excerpt, text]);
  const emotions = [derived.dominantEmotion, derived.secondaryEmotion]
    .map((emotion) => normalizeText(emotion).toLowerCase())
    .filter(Boolean);

  return [...new Set(emotions.length > 0 ? emotions : ["curiosity"])];
}

function buildPublicProviderRecord(record, index) {
  const text = readCorpusText(record);
  const title = sanitizeSeedText(record.title || record.excerpt || text).slice(0, 140) || "public seed";
  const body = sanitizeSeedText(record.body || record.text || record.excerpt || record.title || text) || title;
  const sourceType = derivePublicSourceType(record, `${title} ${body}`);
  const sourcePlatform = sanitizeSeedText(record.sourcePlatform || "public");
  const providerFormat = derivePublicFormat(record, sourceType, `${title} ${body}`);
  const topics = derivePublicTopics(record, `${title} ${body}`);
  const emotions = derivePublicEmotions(record, `${title} ${body}`);
  const authorId = sanitizeSeedText(record.sourceAuthorId || record.sourceAuthorName || `public-${index}`) || `public-${index}`;

  return createProviderRecord({
    provider_id: "public-seed-corpus",
    provider_item_id: record.corpusId || `${sourcePlatform}:${record.sourceId || index}`,
    source_type: sourceType,
    format: providerFormat,
    author_id: `public:${authorId}`,
    created_tick: index,
    title,
    body,
    topics,
    emotions,
    source_metadata: {
      source_platform: record.sourcePlatform || "public",
      source_community: record.sourceCommunity || null,
      source_id: record.sourceId || null,
      source_url: record.sourceUrl || null,
      source_author_id: record.sourceAuthorId || null,
      source_author_name: record.sourceAuthorName || null,
      created_at: record.createdAt || null,
      score: Number(record.score || 0),
      reply_count: Number(record.replyCount || 0),
      boost_count: Number(record.boostCount || 0),
      media_count: Number(record.mediaCount || 0),
      language_hint: record.languageHint || null,
      topic_bag: Array.isArray(record.topicBag) ? record.topicBag : extractTopicBag([title, body], record.tags || []),
      origin: "public_seed_corpus",
    },
  });
}

export function createMockContentProvider({
  providerId = "mock-signal-wire",
  authorId = "system:signal-wire",
} = {}) {
  return {
    provider_id: providerId,
    interface: CONTENT_PROVIDER_INTERFACE,
    async getRecords({ startTick = 0 } = {}) {
      return [
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick,
          title: "평일 오피스룩은 화려함보다 손이 자주 가는 쪽이 오래 남는다는 기사 요약",
          body: "실용적인 출근복은 반짝 유행보다 오래 살아남는다는 내용을 다루며, 결국 자주 손이 가는 옷이 기준이 된다는 점을 짚는다.",
          topics: ["pricing", "office_style", "utility"],
          emotions: ["curiosity", "caution"],
          source_metadata: {
            publisher: "Signal Wire Weekly",
            url: "https://example.com/articles/article-001",
            ingest_channel: "rss_mock",
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-014",
          source_type: "social_post",
          format: "style_signal",
          author_id: authorId,
          created_tick: startTick + 1,
          title: "출근 전에 찍은 한 장이 오전에 오래 남는 이유",
          body: "아침에 올린 단정한 사진이 유독 오래 저장되는 흐름을 보며, 과한 꾸밈보다 자연스럽게 읽히는 장면이 더 오래 기억된다고 적었다.",
          topics: ["commute", "soft_tailoring", "morning_signal"],
          emotions: ["interest", "aspiration"],
          source_metadata: {
            network: "mock-social",
            permalink: "https://example.com/social/social-014",
            engagement: { saves: 182, replies: 17 },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "image-021",
          source_type: "image_description",
          format: "scene_note",
          author_id: authorId,
          created_tick: startTick + 2,
          title: "문 앞에 놓인 가방과 강아지 발자국이 같이 보인 장면",
          body: "현관 근처에 놓인 토트백과 로퍼, 그리고 문 앞에서 기다리는 강아지가 한 장면에 겹치면서 생활감 있는 스타일 습관이 자연스럽게 드러난다.",
          topics: ["bags", "dogs", "entryway"],
          emotions: ["warmth", "amusement"],
          source_metadata: {
            detector: "vision-caption-mock",
            asset_id: "image-021",
            capture_mode: "scene_description",
          },
        }),
      ];
    },
  };
}

export function createSprint1StarterContentProvider({
  providerId = "sprint1-curated-pack",
  authorId = "system:sprint1-curator",
} = {}) {
  return {
    provider_id: providerId,
    interface: CONTENT_PROVIDER_INTERFACE,
    async getRecords({ startTick = 0 } = {}) {
      return [
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-care-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick,
          title: "길고양이 돌봄 계정과 조용한 일상복 계정의 팔로워가 겹친다는 분석",
          body: "돌봄 콘텐츠를 보는 사람들과 소소한 일상복 계정을 즐겨 보는 사람들이 같은 흐름 안에서 만나고, 그 취향이 꽤 자주 겹친다는 관찰을 정리한다.",
          topics: ["care", "cats", "daily_life", "quiet_style"],
          emotions: ["curiosity", "warmth"],
          source_metadata: {
            publisher: "Forum Signals Review",
            url: "https://example.com/sprint1/article-care-001",
            exposure_tags: {
              value_axes: ["care", "soft_routine", "community"],
              tension_axes: ["care_vs_status"],
              audience_lenses: ["empathetic_reader", "quiet_observer"],
              novelty_level: "low",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-office-001",
          source_type: "social_post",
          format: "style_signal",
          author_id: authorId,
          created_tick: startTick + 1,
          title: "자주 입는 출근룩이 새 신상보다 더 오래 남는 이유",
          body: "반복해서 입을 수 있는 출근룩이 새 옷보다 더 오래 저장되는 흐름을 보며, 평일 아침에는 실용적인 선택이 더 오래 기억된다고 적는다.",
          topics: ["office_style", "utility", "repeat_wear", "mirror"],
          emotions: ["interest", "calm"],
          source_metadata: {
            network: "signal-feed",
            permalink: "https://example.com/sprint1/social-office-001",
            engagement: { saves: 241, replies: 32 },
            exposure_tags: {
              value_axes: ["practicality", "repeatability"],
              tension_axes: ["utility_vs_novelty"],
              audience_lenses: ["community_regular", "practical_reviewer"],
              novelty_level: "steady",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-pricing-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick + 2,
          title: "이번 주엔 예쁜 것보다 가격 납득 가능성이 더 오래 이야기된다는 요약",
          body: "이번 주 커뮤니티에서는 예쁜가보다 가격이 납득되는가가 더 오래 이야기되었고, 같은 제품이 반복해서 보일수록 가격 민감도가 더 강해졌다는 흐름을 정리한다.",
          topics: ["pricing", "hype", "tradeoffs", "brand_signal"],
          emotions: ["caution", "frustration"],
          source_metadata: {
            publisher: "Signal Wire Weekly",
            url: "https://example.com/sprint1/article-pricing-001",
            exposure_tags: {
              value_axes: ["fairness", "skepticism"],
              tension_axes: ["price_vs_hype", "signal_vs_value"],
              audience_lenses: ["contrarian_commenter", "value_checker"],
              novelty_level: "medium",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-mirror-001",
          source_type: "social_post",
          format: "daily_snapshot",
          author_id: authorId,
          created_tick: startTick + 3,
          title: "아침에 올린 사진이 오래 저장되는 평일 리듬",
          body: "집을 나서기 전에 남긴 사진이 예상보다 오래 저장되는 아침 분위기를 적으면서, 완벽하게 꾸민 장면보다 생활감 있는 기록이 더 쉽게 반응을 부른다고 적는다.",
          topics: ["mirror", "entryway", "daily_life", "practical_feedback"],
          emotions: ["curiosity", "empathy"],
          source_metadata: {
            network: "signal-feed",
            permalink: "https://example.com/sprint1/social-mirror-001",
            engagement: { saves: 173, replies: 41 },
            exposure_tags: {
              value_axes: ["lived_context", "realism"],
              tension_axes: ["polish_vs_realness"],
              audience_lenses: ["empathetic_responder", "quiet_observer"],
              novelty_level: "steady",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "image-cat-knit-001",
          source_type: "image_description",
          format: "pet_episode",
          author_id: authorId,
          created_tick: startTick + 4,
          title: "니트를 펼치자 고양이가 먼저 자리를 차지한 주말",
          body: "니트를 바닥에 펼치자마자 고양이가 먼저 올라가 자리를 잡는 바람에, 옷 사진보다 집안 풍경이 먼저 기억에 남는 순간을 담는다.",
          topics: ["cats", "knitwear", "home", "pet_episode"],
          emotions: ["amusement", "warmth"],
          source_metadata: {
            detector: "human-curated-scene-note",
            asset_id: "sprint1-image-cat-knit-001",
            capture_mode: "episode_description",
            exposure_tags: {
              value_axes: ["warmth", "home_life", "care"],
              tension_axes: ["order_vs_interruptions"],
              audience_lenses: ["care_reader", "lifestyle_observer"],
              novelty_level: "low",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-trend-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick + 5,
          title: "새 실루엣이 나오면 포럼의 기준이 바로 갈린다",
          body: "새로운 실루엣이 나타나는 순간 조용해 보이던 포럼도 취향이 나뉘고 기준이 달라진다는 점을 짚어낸다.",
          topics: ["novelty", "silhouette", "signal", "trend_shift"],
          emotions: ["interest", "anticipation"],
          source_metadata: {
            publisher: "Trend Pulse Briefing",
            url: "https://example.com/sprint1/article-trend-001",
            exposure_tags: {
              value_axes: ["novelty", "signal"],
              tension_axes: ["freshness_vs_safety"],
              audience_lenses: ["trend_seeker", "status_reader"],
              novelty_level: "high",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-argument-001",
          source_type: "social_post",
          format: "empathy_post",
          author_id: authorId,
          created_tick: startTick + 6,
          title: "예쁘다는 말보다 가격이 먼저 걸린다는 토론",
          body: "예쁘다는 반응이 많아도 가격 앞에서 계속 망설인다는 글이 오히려 더 큰 공감을 얻었고, 실용성과 욕구 사이의 충돌이 댓글로 이어졌다.",
          topics: ["pricing", "hesitation", "forum_discourse", "daily_utility"],
          emotions: ["empathy", "frustration"],
          source_metadata: {
            network: "signal-feed",
            permalink: "https://example.com/sprint1/social-argument-001",
            engagement: { saves: 98, replies: 57 },
            exposure_tags: {
              value_axes: ["fairness", "self_justification"],
              tension_axes: ["desire_vs_restraint"],
              audience_lenses: ["empathetic_responder", "contrarian_commenter"],
              novelty_level: "medium",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "image-dog-entryway-001",
          source_type: "image_description",
          format: "pet_episode",
          author_id: authorId,
          created_tick: startTick + 7,
          title: "문 앞에서 리드줄을 기다리는 강아지와 가방, 로퍼",
          body: "외출 준비를 끝내지 못한 순간, 문 앞에서 강아지가 리드줄을 기다리고 가방과 로퍼가 놓여 있는 장면이 일상의 리듬을 또렷하게 보여준다.",
          topics: ["dogs", "entryway", "bags", "routine"],
          emotions: ["warmth", "anticipation"],
          source_metadata: {
            detector: "human-curated-scene-note",
            asset_id: "sprint1-image-dog-entryway-001",
            capture_mode: "episode_description",
            exposure_tags: {
              value_axes: ["routine", "companionship", "daily_life"],
              tension_axes: ["speed_vs_attention"],
              audience_lenses: ["care_reader", "practical_reviewer"],
              novelty_level: "low",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-quality-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick + 8,
          title: "작은 집과 반복된 착장이 품질 기준을 더 엄격하게 만든다는 기사 요약",
          body: "작은 집에서 반복된 착장을 자주 마주할수록 품질과 편안함에 대한 기준이 더 엄격해지고, 결국 반복 착용이 가능한 옷만 남는다는 논지를 정리한다.",
          topics: ["quality", "repeat_wear", "comfort", "daily_life"],
          emotions: ["reflection", "curiosity"],
          source_metadata: {
            publisher: "Routine Objects Journal",
            url: "https://example.com/sprint1/article-quality-001",
            exposure_tags: {
              value_axes: ["comfort", "quality", "repeatability"],
              tension_axes: ["comfort_vs_signal"],
              audience_lenses: ["quiet_observer", "community_regular"],
              novelty_level: "low",
            },
          },
        }),
      ];
    },
  };
}

export async function createPublicSeedContentProvider({
  corpusPath,
} = {}) {
  const corpusBundle = await loadPublicSeedCorpusBundle({ corpusPath });
  if (!corpusBundle) {
    return null;
  }

  return {
    provider_id: "public-seed-corpus",
    interface: CONTENT_PROVIDER_INTERFACE,
    async getRecords({ startTick = 0 } = {}) {
      return corpusBundle.records.map((record, index) =>
        buildPublicProviderRecord(record, startTick + index),
      );
    },
  };
}

export async function collectNormalizedProviderContent({
  provider,
  startTick = 0,
} = {}) {
  assertContentProvider(provider);

  const rawRecords = await provider.getRecords({ startTick });
  const normalizedRecords = rawRecords.map((record, index) =>
    normalizeProviderRecord(record, {
      created_tick: startTick + index,
    }),
  );

  return {
    provider_id: provider.provider_id || "unknown-provider",
    raw_count: rawRecords.length,
    normalized_count: normalizedRecords.length,
    rawRecords,
    normalizedRecords,
  };
}

export async function createMockNormalizedContentBundle(options = {}) {
  return collectNormalizedProviderContent({
    provider: createMockContentProvider(options),
    startTick: options.startTick || 0,
  });
}

export async function createSprint1StarterPackBundle(options = {}) {
  const publicSeedProvider = await createPublicSeedContentProvider(options);
  if (publicSeedProvider) {
    return collectNormalizedProviderContent({
      provider: publicSeedProvider,
      startTick: options.startTick || 0,
    });
  }

  return collectNormalizedProviderContent({
    provider: createSprint1StarterContentProvider(options),
    startTick: options.startTick || 0,
  });
}
