const HTML_ENTITY_MAP = new Map([
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&nbsp;", " "],
]);

const TOPIC_KEYWORDS = {
  fashion: ["fashion", "style", "outfit", "ootd", "fit", "looks", "lookbook"],
  streetwear: ["streetwear", "sneaker", "hoodie", "cargo", "cap", "graphic tee"],
  sizing_fit: ["fit", "size", "sizing", "runs small", "runs large", "size up", "size down", "too tight", "too loose"],
  layering: ["layer", "layering", "jacket", "coat", "cardigan", "blazer", "hoodie"],
  outerwear: ["coat", "jacket", "parka", "trench", "windbreaker", "puffer"],
  bottoms: ["pants", "jeans", "trousers", "skirt", "shorts", "denim"],
  shoes: ["shoes", "boots", "sneakers", "loafer", "heels", "sandals"],
  accessories: ["bag", "bags", "belt", "watch", "glasses", "jewelry", "accessories"],
  thrift: ["thrift", "secondhand", "vintage", "resale", "preloved"],
  tailoring: ["tailor", "tailoring", "hem", "alteration", "hemmed"],
  price: ["price", "expensive", "cheap", "worth", "cost", "deal", "budget"],
  color: ["black", "white", "beige", "navy", "gray", "color", "neutral"],
  office_style: ["office", "work", "meeting", "interview", "business", "smart casual"],
  casualwear: ["casual", "daily", "everyday", "comfortable", "lounge"],
  dress: ["dress", "skirt", "gown", "mini dress", "maxi dress"],
  kfashion: ["kfashion", "k-style", "seoul", "korean"],
  jfashion: ["jfashion", "harajuku", "tokyo", "japan", "japanese"],
  ootd: ["ootd", "outfit of the day"],
  new_drop: ["new drop", "drop", "release", "restock", "launch"],
  opinion: ["think", "opinion", "hot take", "thoughts", "honestly"],
};

const EMOTION_KEYWORDS = {
  curiosity: ["?", "wonder", "curious", "why", "how", "what", "which", "consider"],
  empathy: ["understand", "relate", "feel", "comfort", "support", "glad", "sorry", "hope"],
  amusement: ["lol", "haha", "funny", "cute", "playful", "joke", "joking", "laugh"],
  sadness: ["sad", "sigh", "miss", "regret", "lost", "unhappy", "down"],
  anger: ["angry", "annoyed", "frustrated", "mad", "irritated", "hate", "bad"],
  relief: ["finally", "glad", "relieved", "better", "okay", "fine", "solved"],
  anticipation: ["soon", "next", "coming", "waiting", "excited", "looking forward"],
  surprise: ["surprised", "unexpected", "didn't expect", "wow", "interesting", "unexpectedly"],
};

const KOREAN_GIVEN_NAMES = [
  "Minseo", "Jisoo", "Yuna", "Suhyun", "Haeun", "Jimin", "Seojun", "Hyunwoo", "Daehyun", "Jihwan",
  "Sora", "Nari", "Mina", "Yujeong", "Taeyang", "Seungmin", "Jiwoo", "Hayoon", "Junho", "Nayeon",
];

const KOREAN_FAMILY_NAMES = ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim", "Shin", "Seo"];
const JAPANESE_GIVEN_NAMES = [
  "Yui", "Haruto", "Mio", "Ren", "Aoi", "Yuto", "Hina", "Daiki", "Riko", "Sora", "Kaito", "Nana", "Yuna", "Rina", "Mei",
];
const JAPANESE_FAMILY_NAMES = [
  "Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yamada",
];

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function hashString(value = "") {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createRng(seed = "") {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function decodeHtmlEntities(value = "") {
  return String(value).replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (match) => HTML_ENTITY_MAP.get(match) || match);
}

function stripHtml(value = "") {
  return decodeHtmlEntities(String(value))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value = "") {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function splitSentences(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?。！？])\s+|[。！？]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectLanguageHint(text = "") {
  const normalized = normalizeText(text);
  const hangul = (normalized.match(/[가-힣]/g) || []).length;
  const kana = (normalized.match(/[ぁ-んァ-ン]/g) || []).length;
  const latin = (normalized.match(/[A-Za-z]/g) || []).length;

  if (hangul > kana && hangul > latin / 2) return "ko";
  if (kana > hangul && kana > latin / 3) return "ja";
  return "en";
}

function countMatches(text, keywords = []) {
  const normalized = normalizeText(text).toLowerCase();
  return keywords.reduce((sum, keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase();
    if (!escaped) return sum;
    const regex = new RegExp(escaped, "g");
    const hits = normalized.match(regex);
    return sum + (hits ? hits.length : 0);
  }, 0);
}

function extractTopicBag(parts = [], tagParts = []) {
  const text = [...(Array.isArray(parts) ? parts : []), ...(Array.isArray(tagParts) ? tagParts : [])]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Object.entries(TOPIC_KEYWORDS)
    .map(([key, keywords]) => ({
      key,
      count: countMatches(text, keywords),
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function deriveEmotionSignals(parts = []) {
  const text = (Array.isArray(parts) ? parts : [])
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const raw = Object.fromEntries(
    Object.entries(EMOTION_KEYWORDS).map(([emotion, keywords]) => [emotion, countMatches(text, keywords)]),
  );

  const sorted = Object.entries(raw)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((left, right) => right.count - left.count || left.emotion.localeCompare(right.emotion));

  const dominantEmotion = sorted[0]?.emotion || "curiosity";
  const secondaryEmotion = sorted[1]?.emotion || dominantEmotion;

  return {
    dominantEmotion,
    secondaryEmotion,
    weights: Object.fromEntries(
      Object.entries(raw).map(([emotion, count]) => [emotion, round(clamp(0.1 + count * 0.12))]),
    ),
  };
}

function deriveStyleMarkers(parts = []) {
  const text = (Array.isArray(parts) ? parts : [])
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ");
  const lowercase = text.toLowerCase();
  const playfulMarkers = [
    ...(lowercase.includes("ㅋㅋ") ? ["ㅋㅋ"] : []),
    ...(lowercase.includes("ㅎㅎ") ? ["ㅎㅎ"] : []),
    ...(lowercase.includes("!") ? ["!"] : []),
    ...(lowercase.includes("…") ? ["…"] : []),
  ];
  const openerMarkers = ["근데", "오히려", "맞아요", "저는", "솔직히", "사실", "이건", "음"].filter((marker) =>
    lowercase.includes(marker.toLowerCase()),
  );
  const endingMarkers = ["같아요", "보여요", "느껴져요", "더라고요", "네요", "싶어요", "입니다", "같네요"].filter((marker) =>
    lowercase.includes(marker.toLowerCase()),
  );
  const avgLength = splitSentences(text).reduce((sum, sentence) => sum + sentence.length, 0) / Math.max(1, splitSentences(text).length);
  const register =
    playfulMarkers.length > 0
      ? "casual_playful"
      : endingMarkers.includes("입니다")
        ? "semi_formal"
        : "casual_polite";
  const cadence =
    avgLength <= 32 ? "short_reply" : avgLength <= 64 ? "balanced_reply" : "thoughtful_reply";

  const voiceNotes = [
    "짧고 직접적으로 쓴다.",
    "한 문장에 너무 많은 설명을 넣지 않는다.",
    "번역투보다 대화체를 우선한다.",
    "문장 끝은 ~요, ~네, ~같아요, ~더라고요처럼 자연스럽게 마무리한다.",
  ];

  return {
    register,
    cadence,
    openerMarkers,
    endingMarkers,
    playfulMarkers,
    voiceNotes,
  };
}

function humanizeTopicLabel(topic = "") {
  return String(topic)
    .replace(/_/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .trim();
}

function pickLocaleHint(seed = "", text = "") {
  const language = detectLanguageHint(text);
  if (language !== "en") {
    return language;
  }
  const hash = hashString(seed);
  return hash % 100 < 58 ? "ko" : "ja";
}

function pickAvatarLocale(seed = "", text = "") {
  return pickLocaleHint(seed, text);
}

function topEntries(map = new Map(), limit = 5) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function buildTopicCounts(topicBag = []) {
  const map = new Map();
  for (const item of Array.isArray(topicBag) ? topicBag : []) {
    map.set(item.key, (map.get(item.key) || 0) + item.count);
  }
  return map;
}

function summarizeText(text = "") {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return normalizeText(text).slice(0, 120);
  }
  return sentences[0].slice(0, 120);
}

function buildSourceReference(post) {
  return {
    postId: post.sourceId,
    createdAt: post.createdAt,
    title: post.title,
    url: post.sourceUrl,
    sourcePlatform: post.sourcePlatform,
    sourceCommunity: post.sourceCommunity,
  };
}

export {
  TOPIC_KEYWORDS,
  EMOTION_KEYWORDS,
  clamp,
  round,
  hashString,
  createRng,
  decodeHtmlEntities,
  stripHtml,
  normalizeText,
  splitSentences,
  detectLanguageHint,
  countMatches,
  extractTopicBag,
  deriveEmotionSignals,
  deriveStyleMarkers,
  humanizeTopicLabel,
  pickLocaleHint,
  pickAvatarLocale,
  topEntries,
  buildTopicCounts,
  summarizeText,
  buildSourceReference,
};
