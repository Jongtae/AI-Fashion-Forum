import { classifySourceIntent, deriveDiscussionAnchors, scoreCommunityDraft } from "./content-quality.js";
import { requestLLMContexts, extractLLMResponseText, resolveLLMConfig, DEFAULT_CLAUDE_MODEL, DEFAULT_OPENAI_MODEL } from "./llm-gateway.js";

function pickBySeed(items = [], seed = 0) {
  if (!items.length) {
    return null;
  }

  const index = Math.abs(Number(seed) || 0) % items.length;
  return items[index];
}

function pickDistinctBySeed(items = [], seed = 0, excluded = []) {
  const normalizedExcluded = uniqueNormalizedList(excluded);
  const pool = uniqueNormalizedList(items).filter((item) => !normalizedExcluded.includes(item));
  return pickBySeed(pool.length ? pool : uniqueNormalizedList(items), seed);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function localizeSourceTitle(value = "", sourceTopics = [], sourceIntent = "") {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  const primaryTopic = localizeTopicLabel(Array.isArray(sourceTopics) && sourceTopics.length ? sourceTopics[0] : "");
  const secondaryTopic = localizeTopicLabel(Array.isArray(sourceTopics) && sourceTopics.length > 1 ? sourceTopics[1] : primaryTopic);
  const topicPair = joinKoreanTopicList([primaryTopic, secondaryTopic]);

  if (sourceIntent === "question" || /[?？]/.test(normalized) || /(what do you all think|what do you think|need advice|pair with|what goes with|what to wear with|how do you|which one|which is better)/i.test(lower)) {
    if (/pair with|goes with|wear with/i.test(lower)) {
      return `${primaryTopic}엔 뭐가 잘 맞을까?`;
    }
    if (/which one|which is better|vs\.?|versus|better/i.test(lower)) {
      return `${topicPair} 중 뭐가 더 나을까?`;
    }
    if (/what do you all think|what do you think|thoughts?|opinion/i.test(lower)) {
      return sourceTopics.length > 1 ? `${topicPair}은 어떻게 보세요?` : `${primaryTopic}은 어떻게 보세요?`;
    }
    if (/need advice|advice/i.test(lower)) {
      return sourceTopics.length > 1 ? `${topicPair} 쪽 조언이 필요한 글` : `${primaryTopic} 쪽 조언이 필요한 글`;
    }
    if (/how do you|how would you|how to/i.test(lower)) {
      return sourceTopics.length > 1 ? `${topicPair}는 어떻게 보세요?` : `${primaryTopic}는 어떻게 보세요?`;
    }
    if (/why/i.test(lower)) {
      return "왜 이렇게 보이는지 궁금해요";
    }
    return sourceTopics.length > 1 ? `${topicPair}은 어떻게 보세요?` : `${primaryTopic}은 어떻게 보세요?`;
  }

  if (sourceIntent === "comparison") {
    return `${topicPair} 중 뭐가 더 나을까?`;
  }

  if (sourceIntent === "controversy") {
    return `${topicPair} 쪽에서 의견이 갈릴 수 있어요`;
  }

  if (sourceIntent === "fact") {
    return normalized.length <= 48 ? normalized : `${topicPair} 관련 신호`;
  }

  return sanitizeForumLanguage(normalized);
}

function sanitizeForumLanguage(value = "") {
  return normalizeText(value)
    .replace(/생활감/g, "일상")
    .replace(/장면/g, "사진")
    .replace(/됩니다/g, "돼요")
    .replace(/읽히는 느낌/g, "보이는 느낌")
    .replace(/실용적인 기준/g, "현실적인 기준")
    .replace(/평일 리듬/g, "평일 패턴")
    .replace(/오래 남는 타입/g, "오래 남아요")
    .replace(/기억이 정리됩니다/g, "기억에 남아요");
}

function uniqueNormalizedList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => sanitizeForumLanguage(value)).filter(Boolean))];
}

function joinKoreanTopicList(values = []) {
  const items = uniqueNormalizedList(values);
  if (items.length === 0) {
    return "일상";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${attachKoreanParticle(items[0], "with")} ${items[1]}`;
  }

  const prefix = items.slice(0, -2).join(", ");
  const middle = attachKoreanParticle(items[items.length - 2], "with");
  const suffix = items[items.length - 1];
  return prefix ? `${prefix}, ${middle} ${suffix}` : `${middle} ${suffix}`;
}

function summarizeContentRecord(contentRecord = {}) {
  const title = sanitizeForumLanguage(contentRecord.title) || "스레드";
  const topics = Array.isArray(contentRecord.topics) && contentRecord.topics.length
    ? contentRecord.topics.map((topic) => sanitizeForumLanguage(topic)).filter(Boolean).join(", ")
    : "일반 포럼 신호";
  const body = sanitizeForumLanguage(contentRecord.body);
  const content = sanitizeForumLanguage(contentRecord.content);
  const text = body || content;
  const bodySnippet = body ? body.split(/(?<=[.!?])\s+/)[0].slice(0, 160) : "";

  return {
    title,
    topics,
    text,
    bodySnippet,
  };
}

function shortenHookTitle(value = "", maxLength = 28) {
  const text = normalizeText(value).replace(/[.?!…:|]+$/g, "").trim();
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function stringSeed(...parts) {
  return parts
    .filter(Boolean)
    .join(":")
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function countHangul(text) {
  return (text.match(/[가-힣]/g) || []).length;
}

function countLatin(text) {
  return (text.match(/[A-Za-z]/g) || []).length;
}

function hasFinalConsonant(word = "") {
  const text = normalizeText(word);
  if (!text) {
    return false;
  }

  const lastChar = text[text.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    return false;
  }

  return (code - 0xac00) % 28 !== 0;
}

function normalizeKoreanParticlePairs(text = "") {
  return normalizeText(text).replace(
    /([A-Za-z0-9가-힣]+)(은\(는\)|는\(은\)|이\(가\)|가\(이\)|을\(를\)|를\(을\)|과\(와\)|와\(과\)|으로\(로\)|로\(으로\))/g,
    (_, word, pair) => {
      const hasBatchim = hasFinalConsonant(word);
      const resolved = {
        "은(는)": hasBatchim ? "은" : "는",
        "는(은)": hasBatchim ? "은" : "는",
        "이(가)": hasBatchim ? "이" : "가",
        "가(이)": hasBatchim ? "이" : "가",
        "을(를)": hasBatchim ? "을" : "를",
        "를(을)": hasBatchim ? "을" : "를",
        "과(와)": hasBatchim ? "과" : "와",
        "와(과)": hasBatchim ? "과" : "와",
        "으로(로)": hasBatchim ? "으로" : "로",
        "로(으로)": hasBatchim ? "으로" : "로",
      }[pair];
      return `${word}${resolved || ""}`;
    }
  );
}

function attachKoreanParticle(word = "", particleType = "subject") {
  const text = normalizeText(word).replace(/[.?!…]+$/u, "");
  if (!text) {
    return "";
  }

  const hasBatchim = hasFinalConsonant(text);
  const particleMap = {
    subject: hasBatchim ? "은" : "는",
    object: hasBatchim ? "을" : "를",
    topic: hasBatchim ? "은" : "는",
    contrast: hasBatchim ? "은" : "는",
    with: hasBatchim ? "과" : "와",
    direction: hasBatchim ? "으로" : "로",
    location: hasBatchim ? "에" : "에",
  };

  return `${text}${particleMap[particleType] || ""}`;
}

function tokenizeForSimilarity(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 1);
}

function jaccardSimilarity(left = "", right = "") {
  const leftSet = new Set(tokenizeForSimilarity(left));
  const rightSet = new Set(tokenizeForSimilarity(right));
  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0;
  }

  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

function sanitizeDraftContent(value = "") {
  return dedupeAdjacentSentences(
    normalizeKoreanParticlePairs(value)
    .replace(/이 에이전트가/g, "")
    .replace(/현재 주제 흐름/g, "")
    .replace(/이 글은/g, "이건")
    .replace(/다시 읽어보니/g, "다시 보니")
    .replace(/더 현실적으로 보여요/g, "더 실감나요")
    .replace(/\bagent\b/gi, "")
    .replace(/\b이 사람이\b/g, "저는")
    .replace(/\b이 사람은\b/g, "저는")
    .replace(/에 맞춰 답글을 남겼다\.?/g, "짧게 답을 남겼다.")
    .replace(/현재 주제 흐름에 맞춰 답글을 남겼다\.?/g, "짧게 답을 남겼다.")
    .replace(/생활감는/g, "일상은")
    .replace(/생활감를/g, "일상을")
    .replace(/생활감을/g, "일상을")
    .replace(/생활감/g, "일상")
    .replace(/장면/g, "사진")
    .replace(/됩니다\./g, "돼요.")
    .replace(/됩니다/g, "돼요")
    .replace(/읽히는 느낌/g, "보이는 느낌")
    .replace(/실용적인 기준/g, "현실적인 기준")
    .replace(/신호을/g, "신호를")
    .replace(/이 신호을/g, "이 신호를")
    .replace(/\s+(보여요|같아요|네요|맞아요|있어요|더라고요|입니다|랍니다)$/u, "")
    .replace(/\s+/g, " ")
    .trim(),
  );
}

function extractMemoryText(entry = "") {
  if (!entry) {
    return "";
  }

  if (typeof entry === "string") {
    return sanitizeForumLanguage(entry);
  }

  return sanitizeForumLanguage(
    entry.summary ||
      entry.text ||
      entry.narrative ||
      entry.reason ||
      entry.note ||
      "",
  );
}

function buildMemoryContext(memoryContext = {}) {
  const recentMemories = Array.isArray(memoryContext?.recentMemories)
    ? memoryContext.recentMemories
    : [];
  const selfNarratives = Array.isArray(memoryContext?.selfNarratives)
    ? memoryContext.selfNarratives
    : [];
  const recentMemoryTexts = uniqueNormalizedList(
    recentMemories.map((entry) => extractMemoryText(entry)).filter(Boolean),
  );
  const selfNarrativeTexts = uniqueNormalizedList(
    selfNarratives.map((entry) => extractMemoryText(entry)).filter(Boolean),
  );
  const recentMemorySummary = recentMemoryTexts.slice(-3).join(" / ");
  const selfNarrativeSummary = selfNarrativeTexts.slice(-3).join(" / ");

  return {
    recentMemories,
    selfNarratives,
    recentMemoryTexts,
    selfNarrativeTexts,
    recentMemorySummary,
    selfNarrativeSummary,
    memoryCount: recentMemories.length,
    narrativeCount: selfNarratives.length,
  };
}

function composeReadableBody(...parts) {
  const text = parts
    .flat()
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .map((part) => (/[.!?…。]$/u.test(part) ? part : `${part}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return dedupeAdjacentSentences(text);
}

function dedupeAdjacentSentences(value = "") {
  const sentences = normalizeText(value)
    .split(/(?<=[.!?…。])\s+/)
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean);

  const deduped = [];
  for (const sentence of sentences) {
    const previous = deduped[deduped.length - 1];
    if (previous && previous === sentence) {
      continue;
    }
    deduped.push(sentence);
  }

  return deduped.join(" ").trim();
}

const EMOTION_KEY_ALIASES = {
  care: "empathy",
  warmth: "empathy",
  kindness: "empathy",
  empathetic: "empathy",
  empathy: "empathy",
  공감: "empathy",
  배려: "empathy",
  따뜻: "empathy",
  humor: "amusement",
  funny: "amusement",
  amused: "amusement",
  amusing: "amusement",
  amusement: "amusement",
  funnybone: "amusement",
  재미: "amusement",
  웃음: "amusement",
  curious: "curiosity",
  curiosity: "curiosity",
  interest: "curiosity",
  intrigue: "curiosity",
  intrigued: "curiosity",
  궁금: "curiosity",
  호기심: "curiosity",
  sadness: "sadness",
  sad: "sadness",
  sorrow: "sadness",
  gloomy: "sadness",
  슬픔: "sadness",
  아쉬움: "sadness",
  anger: "anger",
  angry: "anger",
  frustration: "anger",
  annoyed: "anger",
  upset: "anger",
  화: "anger",
  답답: "anger",
  relief: "relief",
  relieved: "relief",
  calm: "relief",
  reassurance: "relief",
  안도: "relief",
  다행: "relief",
  anticipation: "anticipation",
  anticipate: "anticipation",
  excited: "anticipation",
  기대: "anticipation",
  surprise: "surprise",
  surprised: "surprise",
  wonder: "surprise",
  unexpected: "surprise",
  의외: "surprise",
  놀람: "surprise",
};

function normalizeEmotionKey(value = "") {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return "";
  }

  return EMOTION_KEY_ALIASES[normalized] || EMOTION_KEY_ALIASES[normalizeText(value)] || normalized;
}

function normalizeEmotionProfile(profile = {}) {
  const source = profile && typeof profile === "object" && !Array.isArray(profile)
    ? (profile.weights && typeof profile.weights === "object" ? profile.weights : profile)
    : {};

  const weights = Object.entries(source)
    .filter(([, value]) => typeof value === "number" && !Number.isNaN(value))
    .reduce((acc, [key, value]) => {
      const normalizedKey = normalizeEmotionKey(key);
      acc[normalizedKey] = (acc[normalizedKey] || 0) + Number(value);
      return acc;
    }, {});

  const sorted = Object.entries(weights).sort((left, right) => right[1] - left[1]);
  const dominantEmotion = normalizeText(profile?.dominantEmotion || profile?.dominant_emotion || sorted[0]?.[0] || "curiosity").toLowerCase();
  const secondaryEmotion = normalizeText(profile?.secondaryEmotion || profile?.secondary_emotion || sorted[1]?.[0] || sorted[0]?.[0] || dominantEmotion).toLowerCase();

  return {
    dominantEmotion,
    secondaryEmotion,
    weights,
  };
}

function buildEmotionTonePack(emotionProfile = {}, mode = "run") {
  const emotion = normalizeEmotionProfile(emotionProfile);
  const isComment = mode === "comment";
  const emotionOpeners = {
    curiosity: isComment
      ? ["이 부분부터 보였어요", "처음 걸린 건 이거예요", "문득 이 부분이 보였어요", "가만히 보면 먼저 보이네요", "처음 눈에 걸린 건 이 쪽이에요"]
      : ["먼저 보이는 건 이 쪽이에요", "처음엔 이 부분부터 봤어요", "처음 눈에 걸린 건 이 쪽이에요", "문득 이 부분이 먼저 보여요", "가만히 보면 먼저 보이네요", "보니까 바로 남는 쪽이 있어요"],
    empathy: isComment
      ? ["마음이 쓰여서", "그 마음이 먼저 와서", "괜히 공감돼서", "조금 마음이 가서", "읽다 보니 공감이 먼저 됐어요"]
      : ["마음이 쓰여서", "그 마음이 먼저 와서", "괜히 공감돼서", "조금 마음이 가서", "읽다 보니 공감이 먼저 됐어요"],
    amusement: isComment
      ? ["살짝 웃겨서", "생각보다 재밌어서", "괜히 웃음이 나서", "보자마자 웃겨서", "은근 웃겨서"]
      : ["살짝 웃기게도", "생각보다 재밌게", "괜히 웃음이 나서", "보자마자 웃겨서", "은근 웃겨서"],
    sadness: isComment
      ? ["조금 아쉬워서", "괜히 허전해서", "마음이 조금 가라앉아서", "왠지 허전해서", "보고 나니 아쉬워서"]
      : ["조금 아쉽게", "괜히 허전하게", "생각보다 씁쓸하게", "왠지 허전하게", "보고 나니 아쉽게"],
    anger: isComment
      ? ["솔직히 좀 답답해서", "조금 화가 나서", "이건 꽤 불편해서", "보자마자 답답해서", "생각보다 거슬려서"]
      : ["솔직히 좀 답답하게", "조금 화가 나서", "의외로 불만스럽게", "보자마자 답답하게", "생각보다 거슬리게"],
    relief: isComment
      ? ["생각보다 다행이라서", "괜히 안심돼서", "그래도 편하게 느껴져서", "보니까 다행이라서", "한숨 놓이게 돼서"]
      : ["생각보다 다행스럽게", "괜히 안심돼서", "이건 좀 편하게 읽혔어요", "보니까 다행스럽게", "한숨 놓이게"],
    anticipation: isComment
      ? ["다음이 궁금해서", "계속 이어질 것 같아서", "이 뒤가 더 궁금해져서", "다음 말이 궁금해서", "이후가 더 궁금해져서"]
      : ["다음이 궁금해서", "앞으로가 기대돼서", "계속 지켜보게 돼요", "다음 흐름이 궁금해서", "이후가 더 궁금해져서"],
    surprise: isComment
      ? ["의외라서", "생각보다 새로워서", "뜻밖이라서", "갑자기 눈에 걸려서", "예상보다 낯설어서"]
      : ["의외로", "생각보다", "뜻밖에", "갑자기 눈에 들어와서", "예상보다 낯설게"],
  };
  const emotionHooks = {
    curiosity: isComment
      ? ["어느 쪽을 먼저 보셨는지 궁금해요.", "이 부분을 어떻게 먼저 보셨는지 궁금해요.", "처음 어떤 단서가 걸렸는지도 궁금해요.", "같이 보면 어떤 쪽이 먼저 보이셨는지도 궁금해요."]
      : ["어느 쪽을 먼저 보셨는지 궁금해요.", "어떤 쪽이 더 먼저 보이는지 궁금해요."],
    empathy: ["그 마음이 남는 지점이 있네요.", "마음 쓰이는 부분이 조금 길게 남아요."],
    amusement: ["이건 살짝 웃겨서 남네요.", "웃음이 나는 지점이 꽤 오래 가요."],
    sadness: ["괜히 아쉬운 마음이 조금 남아요.", "조금 허전하게 읽히는 부분이 있어요."],
    anger: ["이 부분은 꽤 답답하게 남네요.", "조금 불편하게 읽히는 지점이 있어요."],
    relief: ["생각보다 다행스럽게 읽히네요.", "괜히 안심되는 지점이 있어요."],
    anticipation: ["다음 반응이 더 궁금해지네요.", "이 뒤가 어떻게 이어질지 좀 더 보고 싶어요."],
    surprise: ["생각보다 의외의 지점이 있네요.", "뜻밖의 포인트가 먼저 보였어요."],
  };
  const emotionClosings = {
    curiosity: isComment
      ? [
          "같이 보면 조금 더 또렷해요.",
          "이렇게 보면 흐름이 더 보여요.",
          "앞뒤를 묶어 보면 맥락이 더 살아나요.",
          "한 번 더 보면 다른 기준도 보여요.",
          "댓글까지 붙이면 판단이 조금 달라져요.",
        ]
      : ["이 기준은 사람마다 다를 것 같아요.", "저는 이쪽이 조금 더 남아요."],
    empathy: ["그 마음이 남는 지점이 있네요.", "괜히 마음이 가는 부분이 있어요."],
    amusement: ["조금 웃겨서 오래 남네요.", "이런 사진이 은근 기억에 남아요."],
    sadness: ["괜히 아쉬운 마음이 조금 남아요.", "조금 허전하게 남는 지점이 있어요."],
    anger: ["이 부분은 꽤 답답하게 남네요.", "조금 불편하게 오래 남는 지점이 있어요."],
    relief: ["그래도 생각보다 다행스럽네요.", "이건 좀 편하게 받아들여져요."],
    anticipation: ["다음이 더 궁금해지는 글이네요.", "앞으로가 어떻게 될지 조금 더 보고 싶어요."],
    surprise: ["생각보다 의외의 여운이 남네요.", "뜻밖의 포인트가 오래 남아요."],
  };

  return {
    dominantEmotion: emotion.dominantEmotion,
    secondaryEmotion: emotion.secondaryEmotion,
    leadPool: emotionOpeners[emotion.dominantEmotion] || emotionOpeners.curiosity,
    hookPool: emotionHooks[emotion.dominantEmotion] || emotionHooks.curiosity,
    closingPool: emotionClosings[emotion.dominantEmotion] || emotionClosings.curiosity,
  };
}

function resolveEmotionProfile({
  seedProfile = null,
  mutableState = null,
  reactionRecord = null,
  contentRecord = null,
  targetContent = null,
  targetComment = null,
  emotionProfile = null,
} = {}) {
  const mergedWeights = {};
  const addWeights = (weights = {}, multiplier = 1) => {
    const normalized = normalizeEmotionProfile(weights);
    for (const [emotion, value] of Object.entries(normalized.weights || {})) {
      mergedWeights[emotion] = (mergedWeights[emotion] || 0) + Number(value) * multiplier;
    }
  };
  const signatureSources = [
    emotionProfile?.dominantEmotion,
    emotionProfile?.dominant_emotion,
    mutableState?.affect_state?.emotion_signature?.dominantEmotion,
    mutableState?.affect_state?.emotion_signature?.dominant_emotion,
    seedProfile?.emotion_signature?.dominantEmotion,
    seedProfile?.emotion_signature?.dominant_emotion,
    reactionRecord?.dominant_feeling,
    reactionRecord?.stance_signal,
    contentRecord?.emotions?.[0],
    targetContent?.emotions?.[0],
    targetComment?.emotions?.[0],
  ].map((value) => normalizeEmotionKey(value)).filter(Boolean);

  addWeights(seedProfile?.emotional_bias || seedProfile?.emotion_bias || {}, 1);
  addWeights(mutableState?.affect_state?.emotional_bias || {}, 0.8);
  addWeights(emotionProfile || {}, 1);

  const reactionEmotion = normalizeEmotionKey(reactionRecord?.dominant_feeling || reactionRecord?.stance_signal || "");
  if (reactionEmotion) {
    mergedWeights[reactionEmotion] = (mergedWeights[reactionEmotion] || 0) + 0.2;
  }

  const contentEmotion = normalizeEmotionKey(
    contentRecord?.emotions?.[0] ||
      targetContent?.emotions?.[0] ||
      targetComment?.emotions?.[0] ||
      "",
  );
  if (contentEmotion) {
    mergedWeights[contentEmotion] = (mergedWeights[contentEmotion] || 0) + 0.12;
  }

  const normalized = normalizeEmotionProfile({
    ...emotionProfile,
    weights: mergedWeights,
    dominantEmotion: emotionProfile?.dominantEmotion || emotionProfile?.dominant_emotion || signatureSources[0] || null,
    secondaryEmotion:
      emotionProfile?.secondaryEmotion ||
      emotionProfile?.secondary_emotion ||
      signatureSources[1] ||
      signatureSources[0] ||
      null,
  });

  return normalized;
}

function isKoreanDominant(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }

  return countHangul(normalized) >= countLatin(normalized);
}

function localizeSourceLabel(value, fallback) {
  const normalized = sanitizeForumLanguage(value);
  if (!normalized) {
    return fallback;
  }

  return isKoreanDominant(normalized) ? normalized : fallback;
}

const KO_TOPIC_LABELS = {
  style: "스타일",
  fashion: "패션",
  fit: "핏",
  brand: "브랜드",
  color: "색감",
  outerwear: "아우터",
  layering: "레이어링",
  office: "오피스",
  commute: "출퇴근",
  pricing: "가격",
  trend_fatigue: "트렌드 피로",
  forum_drama: "포럼 이슈",
  status_signal: "상태 신호",
  designer_labels: "디자이너 라벨",
};

function localizeTopicLabel(value) {
  const normalized = sanitizeForumLanguage(value);
  if (!normalized) {
    return "일상";
  }

  if (KO_TOPIC_LABELS[normalized]) {
    return KO_TOPIC_LABELS[normalized];
  }

  return isKoreanDominant(normalized) ? normalized : "일상";
}

function parseContextsPayload(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const contexts = Array.isArray(value.contexts) ? value.contexts : [];
  return contexts
    .map((context, index) => {
      if (!context || typeof context !== "object") {
        return null;
      }

      const content = normalizeText(context.content || context.body);
      if (!content || !isKoreanDominant(content)) {
        return null;
      }

      return {
        contextId: normalizeText(context.context_id) || `ctx-${index + 1}`,
        contextLabel: normalizeText(context.context_label) || `맥락 ${index + 1}`,
        angle: normalizeText(context.angle) || "",
        content,
        tone: normalizeText(context.tone) || null,
      };
    })
    .filter(Boolean);
}

// extractResponseText moved to llm-gateway.js as extractLLMResponseText

function parseJsonFromResponseText(text) {
  const cleaned = normalizeText(text);
  if (!cleaned) {
    return null;
  }

  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || cleaned;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace
    ? candidate.slice(firstBrace, lastBrace + 1)
    : candidate;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

const RUN_TITLE_HOOKS = [
  {
    contextLabel: "출근 전",
    titles: [
      "출근 전에 먼저 보인 이유",
      "평소 입을 때 더 보이는 포인트",
      "아침에 다시 보게 된 이유",
      "오늘 다시 본 기준",
      "출근길에 다시 읽은 포인트",
      "오늘 아침에 더 남은 이유",
    ],
  },
  {
    contextLabel: "첫인상",
    titles: [
      "처음 보인 포인트",
      "먼저 걸린 단서",
      "눈에 먼저 들어온 이유",
      "첫인상을 바꾼 지점",
      "처음 보이고 오래 남은 이유",
      "먼저 눈에 걸린 기준",
    ],
  },
  {
    contextLabel: "가격 체크",
    titles: [
      "가격보다 먼저 본 것",
      "몇 번 입을지 먼저 본 이유",
      "손이 갈지 먼저 본 메모",
      "좋아 보여도 다시 본 이유",
      "가격보다 오래 남는 쪽",
      "가격을 다시 보게 된 이유",
    ],
  },
  {
    contextLabel: "댓글 반응",
    titles: [
      "댓글이 바꾼 시선",
      "반응 보고 다시 본 글",
      "대화가 먼저 붙은 글",
      "댓글이 넓힌 말",
      "댓글까지 보고 다시 본 이유",
      "반응이 갈린 지점",
    ],
  },
  {
    contextLabel: "디테일",
    titles: [
      "작은 차이가 먼저 보인 이유",
      "디테일 하나가 남은 글",
      "먼저 걸린 디테일",
      "작은 부분이 바꾼 판단",
      "작은 부분이 오래 남은 이유",
      "디테일이 먼저 남은 글",
    ],
  },
  {
    contextLabel: "내 경험",
    titles: [
      "비슷한 옷이 먼저 떠오른 이유",
      "전에 본 느낌과 닮은 지점",
      "기억이 먼저 걸린 포인트",
      "내 경험이 먼저 반응한 글",
      "기억이 먼저 붙은 이유",
      "내 경험이 다시 떠오른 글",
    ],
  },
];

const COMMENT_TITLE_HOOKS = [
  {
    contextLabel: "대화 이어가기",
    titles: [
      "대화를 다시 잇는 말",
      "답을 이어 붙인 자리",
      "흐름을 놓치지 않은 답",
      "이야기를 계속 잇는 댓글",
      "대화를 조금 더 잇는 말",
      "흐름을 다시 잡은 댓글",
    ],
  },
  {
    contextLabel: "질문",
    titles: [
      "한 번 더 묻게 된 지점",
      "기준이 궁금해진 부분",
      "다시 물어보고 싶은 이유",
      "질문이 남은 포인트",
      "기준이 더 궁금해진 말",
      "한 번 더 묻게 된 이유",
    ],
  },
  {
    contextLabel: "보완",
    titles: [
      "다른 시선이 붙은 이유",
      "조금 더 보태고 싶은 말",
      "부드럽게 다른 쪽을 본 답",
      "보완해서 읽은 댓글",
      "다르게 보인 한 줄",
      "조금 더 보태고 싶은 이유",
    ],
  },
  {
    contextLabel: "스레드",
    titles: [
      "댓글까지 봐야 보이는 결",
      "글과 댓글을 다시 잇는 쪽",
      "대화 흐름을 묶은 메모",
      "스레드 전체를 다시 읽은 말",
      "댓글까지 봐야 보이는 포인트",
      "흐름을 묶어 읽은 댓글",
    ],
  },
  {
    contextLabel: "공감",
    titles: [
      "먼저 공감이 간 부분",
      "고개가 먼저 끄덕여진 말",
      "비슷하게 느낀 지점",
      "공감부터 남긴 댓글",
      "먼저 마음이 간 부분",
      "비슷하게 읽힌 한 줄",
    ],
  },
  {
    contextLabel: "반대",
    titles: [
      "같은 글을 다르게 읽은 이유",
      "조금 다른 쪽에서 본 답",
      "반대로 보인 한 지점",
      "다른 결로 읽은 댓글",
      "다르게 읽힌 이유",
      "조금 다른 쪽에서 남긴 말",
    ],
  },
];

export function buildReadablePostTitle({
  mode,
  sourceTitle,
  sourceTopics,
  sourceSignal,
  sourceSnippet,
  sourceBody,
  selectedContext,
  selectedContextLabel,
  variationSeed = 0,
  sourceIntent = "",
} = {}) {
  const normalizedTopics = uniqueNormalizedList((Array.isArray(sourceTopics) ? sourceTopics : []).map(localizeTopicLabel));
  const primaryTopic = normalizedTopics[0] || localizeTopicLabel(selectedContext?.contextLabel || selectedContextLabel || "");
  const secondaryTopic = normalizedTopics[1] || primaryTopic;
  const topicPair = joinKoreanTopicList([primaryTopic, secondaryTopic]);
  const primaryTopicObject = attachKoreanParticle(primaryTopic, "object");
  const secondaryTopicObject = attachKoreanParticle(secondaryTopic, "object");
  const contextLabel = normalizeText(selectedContext?.contextLabel || selectedContextLabel);
  const signal = sanitizeForumLanguage(sourceSignal);
  const localizedSourceTitle = localizeSourceTitle(sourceTitle, sourceTopics, sourceIntent);
  const referenceText = [
    localizedSourceTitle,
    sanitizeForumLanguage(sourceSnippet),
    sanitizeForumLanguage(sourceBody),
    sanitizeForumLanguage(selectedContext?.content),
    sanitizeForumLanguage(signal),
  ]
    .filter(Boolean)
    .join(" ");

  const pool = [];
  const priorityTitles = [];

  if (sourceIntent === "question") {
    priorityTitles.push(
      localizedSourceTitle && localizedSourceTitle.length <= 36 ? localizedSourceTitle : null,
      `${topicPair} 중 뭐가 더 나을까?`,
      `${primaryTopic}은 어떻게 보세요?`,
    );
  } else if (sourceIntent === "comparison") {
    priorityTitles.push(
      `${topicPair} 중 뭐가 더 나을까?`,
      `${topicPair}을 같이 비교한 이유`,
      `${topicPair} 사이의 기준`,
    );
  } else if (sourceIntent === "controversy") {
    priorityTitles.push(
      `${topicPair} 쪽에서 의견이 갈리는 이유`,
      `${topicPair} 반응이 갈리는 지점`,
      `${topicPair}에서 의견이 나뉘는 포인트`,
    );
  } else if (sourceIntent === "fact") {
    priorityTitles.push(
      localizedSourceTitle && localizedSourceTitle.length <= 48 ? localizedSourceTitle : null,
      `${topicPair} 관련 신호`,
      `${primaryTopicObject}에서 먼저 보인 내용`,
    );
  }

  if (mode === "comment") {
    const hookSet = COMMENT_TITLE_HOOKS.find((entry) => entry.contextLabel === contextLabel) || null;
    pool.push(...priorityTitles);
    pool.push(...(hookSet?.titles || []));
    pool.push(
      localizedSourceTitle && localizedSourceTitle.length <= 28 ? localizedSourceTitle : null,
      `${primaryTopicObject} 보고 남긴 짧은 말`,
      `${secondaryTopicObject} 같이 본 뒤의 생각`,
      `대화를 이어 붙인 한 줄`,
      `댓글 흐름에서 남은 포인트`,
      `한 번 더 물어본 이유`,
      `${primaryTopicObject} 다시 읽고 남긴 말`,
      `${secondaryTopic} 쪽이 더 남는 이유`,
      `${contextLabel || "댓글"}에서 먼저 남은 말`,
      `${contextLabel || "댓글"}로 이어진 짧은 반응`,
      `${primaryTopicObject} 보고 남긴 답`,
      `${primaryTopicObject} 다시 보게 된 댓글`,
      `${attachKoreanParticle(topicPair, "object")} 같이 본 말`,
      `${contextLabel || "댓글"}에서 ${primaryTopicObject} 다시 본 이유`,
      `${attachKoreanParticle(topicPair, "object")} 두고 남긴 말`,
    );
  } else {
    const hookSet = RUN_TITLE_HOOKS.find((entry) => entry.contextLabel === contextLabel) || null;
    pool.push(...priorityTitles);
    pool.push(...(hookSet?.titles || []));
    pool.push(
      localizedSourceTitle && localizedSourceTitle.length <= 28 ? localizedSourceTitle : null,
      `${primaryTopicObject} 먼저 보게 된 이유`,
      `${secondaryTopic}까지 같이 본 기준`,
      `오늘 다시 읽은 포인트`,
      `이 글이 오래 남는 이유`,
      `한 번 더 보게 된 사진`,
      `${primaryTopicObject} 다시 본 기준`,
      `${secondaryTopic} 쪽이 더 남는 이유`,
      `${contextLabel || "이번 글"}에서 먼저 보인 ${primaryTopic}`,
      `${contextLabel || "이번 글"}로 다시 읽은 기준`,
      `${primaryTopic}보다 먼저 보인 포인트`,
      `${primaryTopic}이 더 남는 이유`,
      `${attachKoreanParticle(topicPair, "object")} 같이 본 글`,
      `${contextLabel || "이번 글"}에서 ${primaryTopicObject} 다시 본 이유`,
      `${attachKoreanParticle(topicPair, "object")} 같이 보게 된 글`,
      `${topicPair} 사이의 기준`,
    );
  }

  if (sourceIntent === "question") {
    pool.push(
      "이 조합 괜찮을까?",
      "어떤 쪽이 더 나을까?",
      "다들 어떻게 보세요?",
      `${primaryTopic}은 어떻게 보세요?`,
      `${topicPair} 중 뭐가 더 나을까?`,
    );
  } else if (sourceIntent === "comparison") {
    pool.push(
      `${joinKoreanTopicList([primaryTopic, secondaryTopic])} 중 뭐가 더 나을까?`,
      "둘 중 어느 쪽이 더 먼저 보이나요?",
      "비교해보면 결이 갈려요",
      "어느 쪽이 더 자연스러워 보이나요?",
    );
  } else if (sourceIntent === "controversy") {
    pool.push(
      "반응이 갈릴 수밖에 없는 이유가 있어요",
      "이 지점은 의견이 나뉘겠어요",
      "왜 갈리는지 보게 돼요",
    );
  } else if (sourceIntent === "fact") {
    pool.push(
      `${primaryTopic} 관련 신호를 먼저 보게 돼요`,
      `${primaryTopic}에서 먼저 눈에 걸린 내용`,
      `${topicPair}를 같이 보게 된 이유`,
    );
  }

  if (contextLabel) {
    if (mode === "comment") {
      pool.push(
        `${contextLabel}에서 다시 읽은 말`,
        `${contextLabel}로 이어진 한 줄`,
        `${contextLabel}에서 남은 짧은 생각`,
      );
    } else {
      pool.push(
        `${contextLabel}에서 먼저 보인 포인트`,
        `${contextLabel}로 다시 읽은 기준`,
        `${contextLabel}에서 더 남는 이유`,
      );
    }
  }

  const selectionSeed = stringSeed(
    variationSeed,
    sourceTitle,
    sourceSnippet,
    sourceBody,
    signal,
    contextLabel,
    normalizedTopics.join(","),
  );
  const priorityCandidates = uniqueNormalizedList(priorityTitles)
    .map((candidate) => shortenHookTitle(candidate, 28))
    .filter(Boolean)
    .filter((candidate) => {
      if (!referenceText) {
        return true;
      }
      return jaccardSimilarity(candidate, referenceText) < 0.7;
    });
  const candidates = uniqueNormalizedList(pool)
    .map((candidate) => shortenHookTitle(candidate, 28))
    .filter(Boolean)
    .filter((candidate) => {
      if (!referenceText) {
        return true;
      }
      return jaccardSimilarity(candidate, referenceText) < 0.7;
    });

  if (
    priorityCandidates.length &&
    ["question", "comparison", "controversy", "fact", "reason"].includes(sourceIntent) &&
    Math.abs(selectionSeed) % 100 < 80
  ) {
    return priorityCandidates[Math.abs(selectionSeed) % priorityCandidates.length];
  }

  if (!candidates.length) {
    return shortenHookTitle(
      mode === "comment"
        ? "댓글이 남긴 작은 포인트"
        : "오늘 다시 읽은 기준",
      28,
    );
  }

  const index = Math.abs(selectionSeed) % candidates.length;
  return candidates[index];
}

function buildSourceClaimLead({
  sourceIntent = "",
  sourceAnchorStem = "",
  sourceAnchorTitle = "",
  sourceTopics = [],
  baseSignal = "",
  mode = "run",
  contextLabel = "",
} = {}) {
  const topicLabel = Array.isArray(sourceTopics) && sourceTopics.length
    ? joinKoreanTopicList(sourceTopics.map(localizeTopicLabel))
    : "이 주제";
  const anchorSource = normalizeText(sourceAnchorStem) || normalizeText(sourceAnchorTitle);
  const anchor = anchorSource && isKoreanDominant(anchorSource) ? anchorSource : topicLabel;
  const anchorSubject = attachKoreanParticle(anchor, "subject");
  const anchorObject = attachKoreanParticle(anchor, "object");
  const signalLabel = normalizeText(baseSignal) || "이 포인트";
  const isComment = mode === "comment";

  if (sourceIntent === "question") {
    return isComment
      ? `${anchorSubject} 먼저 궁금해졌어요`
      : `${anchorSubject} 먼저 궁금해져요`;
  }

  if (sourceIntent === "comparison") {
    return isComment
      ? `${attachKoreanParticle(topicLabel, "object")} 같이 보면 어느 쪽이 더 나은지 바로 갈려요`
      : `${attachKoreanParticle(topicLabel, "object")} 같이 보면 어느 쪽이 더 나은지 바로 보여요`;
  }

  if (sourceIntent === "controversy") {
    return isComment
      ? `${anchorObject} 둘러싼 반응이 갈릴 만해 보여요`
      : `${anchorObject} 둘러싼 반응이 갈릴 만해 보여요`;
  }

  if (sourceIntent === "fact") {
    return isComment
      ? `${anchor}에서 ${attachKoreanParticle(signalLabel, "subject")} 먼저 보여요`
      : `${anchor}에서 ${attachKoreanParticle(signalLabel, "subject")} 먼저 보여요`;
  }

  if (sourceIntent === "reason") {
    return isComment
      ? `${anchorSubject} 왜 이렇게 읽히는지 먼저 보게 돼요`
      : `${anchorSubject} 왜 이렇게 읽히는지 먼저 보게 돼요`;
  }

  if (contextLabel) {
    return isComment
      ? `${contextLabel}에서 ${anchorSubject} 먼저 보여요`
      : `${contextLabel}에서 ${anchorSubject} 먼저 보여요`;
  }

  return isComment
    ? `${anchorSubject} 먼저 보여요`
    : `${anchorSubject} 먼저 보여요`;
}

function buildLLMPrompt({
  mode,
  agentHandle,
  sourceTitle,
  sourceTopics,
  sourceSignal,
  sourceSnippet,
  sourceBody,
  sourceCommentPreview,
  replyTargetType,
  styleProfile = null,
  emotionProfile = null,
  sourceAnchorTerms = [],
  memoryContext = null,
} = {}) {
  const promptTitle = localizeSourceLabel(sourceTitle, "이 글");
  const sourceTopicText = Array.isArray(sourceTopics) && sourceTopics.length
    ? uniqueNormalizedList(sourceTopics.map(localizeTopicLabel)).join(", ")
    : "이번 글";
  const promptSignal = localizeSourceLabel(sourceSignal, "이 신호");
  const promptSnippet = isKoreanDominant(sourceSnippet)
    ? normalizeText(sourceSnippet)
    : "이 본문 단서는 한국어로 재해석해라.";
  const promptBody = isKoreanDominant(sourceBody)
    ? normalizeText(sourceBody)
    : "원문 전체가 영어 단서라면 한국어 커뮤니티 문장으로 다시 써라.";
  const styleOpeners = uniqueNormalizedList(styleProfile?.openers || styleProfile?.openerMarkers || []);
  const styleEndings = uniqueNormalizedList(styleProfile?.endings || styleProfile?.endingMarkers || []);
  const emotionTone = buildEmotionTonePack(emotionProfile, mode);
  const styleSamples = uniqueNormalizedList(styleProfile?.sampleComments || []);
  const resolvedMemoryContext = buildMemoryContext(memoryContext || {});
  const memoryLines = [
    resolvedMemoryContext.recentMemorySummary
      ? `최근 읽은 기억: ${resolvedMemoryContext.recentMemorySummary}`
      : null,
    resolvedMemoryContext.selfNarrativeSummary
      ? `최근 자기 서사: ${resolvedMemoryContext.selfNarrativeSummary}`
      : null,
  ].filter(Boolean);

  const modeLabel = mode === "live" ? "실시간 에이전트 글" : "배치 생성 글";

  return [
    "너는 패션 포럼 시뮬레이션의 한국어 글 생성기다.",
    `${modeLabel}를 위해 서로 다른 맥락의 후보 4개를 만들어야 한다.`,
    "반드시 한국어로만 작성하고, 영어는 고유명사나 불가피한 용어를 제외하고 쓰지 마라.",
    "출력은 설명 없이 JSON만 반환한다.",
    '형식은 {"contexts":[{"context_id":"...","context_label":"...","angle":"...","content":"...","tone":"..."}]} 이다.',
    "contexts는 정확히 4개를 권장하며, 각 항목은 서로 다른 맥락과 다른 문장 흐름을 가져야 한다.",
    "content는 최소 2문장 이상인 한글 자연문으로, 커뮤니티 글처럼 읽혀야 하며 너무 과장된 템플릿 문구를 반복하지 말아라.",
    "각 context는 한 턴의 역할이 분명해야 한다. 첫 문장은 원천 질문/사실/비교/논쟁의 앵커를 직접 드러내고, 둘째 문장은 내 반응이나 관찰, 마지막 문장은 질문/공감/반박/여운 중 하나로 끝내라.",
    "문장 끝은 끊긴 메모처럼 남기지 말고, 본문 자체가 읽히도록 완결된 문장으로 마무리해라.",
    "본문 첫 단어를 '맞아요', '그렇죠', '그래요' 같은 동의 표현으로 시작하지 말고, 바로 상황이나 관찰로 들어가라.",
    "seed에 질문, 사실, 비교, 논쟁 포인트가 있으면 그것을 그대로 앵커로 살리고, 추상적인 감상문으로 뭉개지 말아라.",
    "외부 컨텐츠의 사실과 쟁점은 대화가 열리도록 구체적으로 유지하고, 패션과 일상, 기준, 포인트 같은 추상어로만 압축하지 말아라.",
    "본문 첫 문장은 source claim이 읽히는 문장이어야 하며, 요약문이나 에세이식 설명으로 먼저 밀지 말아라.",
    "희로애락 같은 감정은 이름으로 설명하기보다, 문장 리듬과 선택 단어로 드러내라.",
    "제목은 본문 요약처럼 쓰지 말고, 짧은 훅과 관점 차이가 드러나게 따로 잡아라.",
    "댓글인 경우에는 실제 커뮤니티 댓글처럼 간결하고 구어체로 쓰고, 주어를 굳이 설명하지 마라.",
    "번역투보다 실제 커뮤니티 댓글의 짧은 리듬과 맞장구, 질문, 부드러운 반박을 우선해라.",
    "같은 제목 구조나 같은 문장 시작을 반복하지 말고, 출근 전, 가격 체크, 첫인상, 댓글 반응, 내 경험 같은 서로 다른 관점으로 분기해라.",
    "생활감, 장면, 됩니다, 읽히는 느낌, 실용적인 기준, 다시 읽어보니, 더 현실적으로 보여요 같은 에세이형 표현은 쓰지 말고 더 직접적인 말로 바꿔라.",
    `작성자 표시명: ${agentHandle || "익명"}`,
    `대상 글 제목: ${sourceTitle || "스레드"} / 본문에서는 "${promptTitle}"처럼 한국어로 재해석해라.`,
    `대상 토픽: ${sourceTopicText}`,
    `상황 단서: ${promptSignal || "맥락 없음"}`,
    sourceAnchorTerms.length ? `앵커 단서: ${sourceAnchorTerms.slice(0, 6).join(", ")}` : null,
    styleProfile?.register ? `말투 레지스터: ${styleProfile.register}` : null,
    styleProfile?.cadence ? `말투 리듬: ${styleProfile.cadence}` : null,
    styleOpeners.length ? `참고 시작어: ${styleOpeners.join(", ")}` : null,
    styleEndings.length ? `참고 끝맺음: ${styleEndings.join(", ")}` : null,
    styleSamples.length ? `참고 댓글 샘플: ${styleSamples.slice(0, 3).join(" / ")}` : null,
    memoryLines.length ? memoryLines.join("\n") : null,
    "최근 읽은 기억이 있다면 그 기억을 다음 글의 근거로 써라. 왜 생각이 조금 바뀌었는지 드러내고, 같은 말만 반복하지 마라.",
    emotionTone?.dominantEmotion ? `감정 기조: ${emotionTone.dominantEmotion} / ${emotionTone.secondaryEmotion}` : null,
    promptSnippet ? `대상 본문 단서: ${promptSnippet}` : null,
    promptBody ? `대상 본문 전체: ${promptBody}` : null,
    sourceCommentPreview ? `대상 댓글 단서: ${sanitizeForumLanguage(sourceCommentPreview)}` : null,
    replyTargetType ? `답글 대상: ${replyTargetType === "comment" ? "댓글" : "게시글"}` : null,
    mode === "live"
      ? "실시간 글인 경우 현재 읽은 글이나 상황 단서를 바탕으로 반응의 방향을 넓게 분기해라."
      : mode === "comment"
        ? "댓글 글인 경우 게시글 또는 다른 댓글에 대한 반응이 자연스럽게 드러나야 하며, 지나치게 긴 설명은 피하고 한국어 커뮤니티 말투를 유지해라."
      : "배치 글인 경우 에이전트의 읽기 기준과 반응 차이를 맥락별로 넓게 드러내라.",
  ].filter(Boolean).join("\n");
}

function buildFallbackContexts({
  mode,
  agentHandle,
  sourceTitle,
  sourceTopics,
  sourceSignal,
  sourceSnippet,
  sourceBody,
  sourceCommentPreview,
  replyTargetType,
  variationSeed = 0,
  reactionRecord = null,
  contentRecord = null,
  styleProfile = null,
  emotionProfile = null,
  sourceIntent = "",
} = {}) {
  const title = sanitizeForumLanguage(sourceTitle) || "스레드";
  const inferredIntent = sourceIntent || classifySourceIntent({ title, body: sourceBody || sourceSnippet || "", topics: sourceTopics || [] });
  const discussionAnchors = deriveDiscussionAnchors({ title, body: sourceBody || sourceSnippet || "", topics: sourceTopics || [] });
  const displayTitle = localizeSourceLabel(title, "이 글");
  const intentTitle = localizeSourceTitle(title, sourceTopics, inferredIntent);
  const topics = Array.isArray(sourceTopics) && sourceTopics.length
    ? joinKoreanTopicList(sourceTopics.map(localizeTopicLabel))
    : "이번 글";
  const normalizedSignal = sanitizeForumLanguage(sourceSignal);
  const baseSignal =
    normalizedSignal && normalizedSignal.length <= 10 && !/[\s.?!]/.test(normalizedSignal)
      ? localizeSourceLabel(normalizedSignal, "이 신호")
      : "이번 신호";
  const signalWithObject = attachKoreanParticle(baseSignal, "object");
  const topicsWithObject = attachKoreanParticle(topics, "object");
  const sourceCommentLabel = isKoreanDominant(sourceCommentPreview)
    ? sanitizeForumLanguage(sourceCommentPreview)
    : "앞선 댓글";
  const sourceAnchorTitle = intentTitle || discussionAnchors.questionAnchor || discussionAnchors.factualAnchor || displayTitle;
  const sourceAnchorStem = sanitizeForumLanguage(sourceAnchorTitle)
    .replace(/\s*(은 어떻게 보세요\?|는 어떻게 보세요\?|중 뭐가 더 나을까\?|쪽에서 의견이 갈릴 수 있어요|관련 신호)$/u, "")
    .replace(/[?？]+$/u, "")
    .trim() || sourceAnchorTitle;
  const sourceAnchorTerms = uniqueNormalizedList([
    sourceAnchorTitle,
    displayTitle,
    intentTitle,
    discussionAnchors.questionAnchor,
    discussionAnchors.factualAnchor,
    discussionAnchors.comparisonAnchor,
    discussionAnchors.controversyAnchor,
    ...(Array.isArray(sourceTopics) ? sourceTopics.map(localizeTopicLabel) : []),
  ]);
  const buildClaimLead = (contextLabelForClaim = "") => buildSourceClaimLead({
    sourceIntent: inferredIntent,
    sourceAnchorStem,
    sourceAnchorTitle,
    sourceTopics,
    baseSignal,
    mode,
    contextLabel: contextLabelForClaim,
  });
  const localizedContentRecord = {
    ...(contentRecord || {}),
    title: intentTitle || displayTitle,
    body: isKoreanDominant(sourceBody || sourceSnippet || "")
      ? sanitizeForumLanguage(sourceBody || sourceSnippet || "")
      : "이 글의 본문 단서를 한국어로 다시 읽었다.",
    topics: Array.isArray(sourceTopics) && sourceTopics.length
      ? sourceTopics.map(localizeTopicLabel)
      : ["일반"],
  };
  const styleOpeners = uniqueNormalizedList(styleProfile?.openers || styleProfile?.openerMarkers || []);
  const styleEndings = uniqueNormalizedList(styleProfile?.endings || styleProfile?.endingMarkers || []);
  const emotionTone = buildEmotionTonePack(emotionProfile, mode);
  const postFallbackOpeners = ["", "근데", "오히려", "솔직히", "개인적으로", "이번엔", "조용히 보면", "문득", "가만히 보면", "처음엔", "한 번 더 보면", "왠지", "보니까", "결국", "생각보다"];
  const commentFallbackOpeners = ["", "근데", "오히려", "솔직히", "개인적으로", "음", "이 부분은", "그 포인트는", "문득", "가만히 보면", "한 번 더 보면", "왠지", "처음엔", "생각보다", "보니까"];
  const intentOpeners = {
    question: mode === "comment"
      ? ["이건 질문부터 보였어요", "먼저 궁금해지는 건", "다들 어떻게 보셨는지", "어떤 쪽이 더 나은지", "이 부분이 먼저 궁금해요"]
      : ["이건 질문부터 보여요", "먼저 궁금해지는 건", "다들 어떻게 보세요?", "어떤 쪽이 더 나은지", "이 부분이 먼저 보여요"],
    comparison: mode === "comment"
      ? ["둘 중 어느 쪽이 더 낫냐면", "비교해보면", "저는 다른 쪽이 먼저 보여서", "이쪽과 저쪽을 같이 보면", "조금 다르게 보였어요"]
      : ["둘 중 어느 쪽이 더 나을까", "비교해보면", "저는 다른 쪽이 먼저 보여요", "이쪽과 저쪽을 같이 보면", "조금 다르게 보였어요"],
    controversy: mode === "comment"
      ? ["의견이 갈릴 만해서", "반응이 나뉘는 이유가 보여서", "이 지점은 좀 갈려서", "조금은 불편하지만", "생각보다 반응이 갈려서"]
      : ["의견이 갈릴 만해서", "반응이 나뉘는 이유가 보여요", "이 지점은 좀 갈려요", "조금은 불편하지만", "생각보다 반응이 갈려요"],
    fact: mode === "comment"
      ? ["사실 먼저 보자면", "이 내용부터 붙들면", "본문 단서를 보면", "먼저 나온 내용을 보면", "이 신호를 보면"]
      : ["사실 먼저 보자면", "이 내용부터 붙들면", "본문 단서를 보면", "먼저 나온 내용을 보면", "이 신호를 보면"],
    reason: mode === "comment"
      ? ["이유를 먼저 보면", "왜 그런지 보면", "배경부터 보면", "이런 흐름이면", "기준을 잡아보면"]
      : ["이유를 먼저 보면", "왜 그런지 보면", "배경부터 보면", "이런 흐름이면", "기준을 잡아보면"],
    discussion: mode === "comment"
      ? ["개인적으로는", "조금 다르게 보면", "생각보다", "문득", "가만히 보면"]
      : ["개인적으로는", "조금 다르게 보면", "생각보다", "문득", "가만히 보면"],
  };
  const isAgreementOpener = (value = "") => /^(맞아요|그렇죠|그래요|네|응)([\s,!.?].*)?$/u.test(normalizeText(value));
  const filteredStyleOpeners = styleOpeners.filter((opener) => !isAgreementOpener(opener));
  const openerPool =
    mode === "comment"
      ? (filteredStyleOpeners.length ? filteredStyleOpeners : commentFallbackOpeners)
      : (filteredStyleOpeners.length
        ? filteredStyleOpeners
        : postFallbackOpeners);
  const intentOpenersPool = intentOpeners[inferredIntent] || intentOpeners.discussion;
  const wrapUpPool = styleEndings.length
    ? styleEndings.filter((ending) => /[.!?…。]$/u.test(ending))
    : [
        "그래서 이런 글은 나중에도 다시 보게 돼요.",
        "이런 기준이 있으면 비슷한 글도 조금 다르게 보여요.",
        "결국은 자주 손이 가는 쪽이 더 남아요.",
        "이렇게 읽으면 판단이 빨라져요.",
      ];
  const questionTailPool = [
    "어느 기준으로 보셨는지 궁금해요",
    "이 포인트를 어떻게 잡으셨는지 궁금해요",
    "다른 단서도 같이 보셨는지 궁금해요",
    "저는 다른 쪽도 같이 보게 돼요",
    "어느 부분을 가장 크게 보셨는지 궁금해요",
    "이 부분은 어떤 식으로 읽히셨는지 궁금해요",
    "비슷한 글이랑 비교해보셨는지도 궁금해요",
    "처음 어떤 단서가 걸렸는지 궁금해요",
  ];
  const supportTailPool = [
    "그 느낌은 충분히 이해돼요",
    "그렇게 느끼는 것도 자연스러워 보여요",
    "저도 비슷하게 봤어요",
    "그 말은 꽤 공감돼요",
    "고개가 끄덕여져요",
    "그 얘기 들으니 더 또렷해져요",
    "말한 의도가 좀 더 살아나요",
    "그 느낌이 오래 남네요",
    "그 말이 왜 남는지 알겠어요",
    "이 부분은 다들 비슷하게 읽을 듯해요",
    "말끝보다 기분이 먼저 남아요",
    "읽고 나면 마음이 좀 남아요",
  ];
  const counterTailPool = [
    "저는 조금 다르게 읽었어요",
    "근데 저는 여기서 결이 좀 다르게 보여요",
    "오히려 반대로 볼 수도 있겠어요",
    "솔직히 저는 이쪽 해석이 더 먼저 와요",
    "조금 다른 시선도 가능해 보여요",
    "이건 반대로 읽히기도 해요",
    "저는 다른 쪽이 더 먼저 보여요",
    "조금 반대에서 보면 더 선명해요",
    "다른 기준이면 전혀 다르게 읽혀요",
    "이쪽만 보면 놓치는 게 있어 보여요",
  ];
  const observationTailPool = [
    "이렇게 읽으면 판단이 더 빨라져요",
    "그래서 오래 볼수록 결이 더 보여요",
    "이런 기준이면 다시 볼 맛이 있어요",
    "이런 글은 한 번 더 보게 돼요",
    "이 기준이 있으면 다시 읽기 쉬워요",
    "이 포인트가 오래 남아요",
    "나중에도 다시 보여요",
    "조금 다른 기준이 보이네요",
    "나중에 다시 보면 더 보일 것 같아요",
    "이 기준이 붙으니 글이 덜 흐려져요",
  ];
  const threadBridgePool = [
    "댓글까지 같이 보면 결이 더 또렷해져요",
    "흐름을 댓글까지 묶어 보면 더 잘 보여요",
    "댓글이 붙으니 맥락이 더 살아나요",
    "이야기를 같이 보니 흐름이 더 보여요",
    "대화가 붙으니 포인트가 더 선명해요",
    "댓글 흐름까지 보면 판단이 달라져요",
  ];
  const supportReactionPool = [
    "그 공감이 이해돼요",
    "그 부분은 고개가 끄덕여져요",
    "말한 포인트가 더 살아나요",
    "그 말이 왜 남는지 알겠어요",
    "읽고 나면 마음에 조금 남아요",
    "그런 반응도 자연스러워 보여요",
    "공감이 먼저 와서 더 남아요",
  ];
  const counterReactionPool = [
    "그렇지만 조금 다르게 봤어요",
    "반대로 보면 더 또렷해 보여요",
    "이쪽보다 다른 쪽이 먼저 보여요",
    "조금 다르게 읽히는 지점이 있어요",
    "이건 반대에서 보면 더 선명해요",
    "다르게 읽으면 포인트가 바뀌어요",
  ];
  const mergePools = (...pools) => pools.flatMap((pool) => (Array.isArray(pool) ? pool : [pool])).filter(Boolean);
  const pickTone = (seedOffset, ...pools) => pickBySeed(mergePools(...pools), variationSeed + seedOffset) || "";
  const pickContextTone = (contextId, kind, seedOffset, ...pools) => {
    const contextSeed = variationSeed + seedOffset + stringSeed(mode, contextId, kind, title, topics, baseSignal, sourceCommentLabel);
    return pickBySeed(mergePools(...pools), contextSeed) || "";
  };
  const pickContextDistinct = (contextId, seedOffset, items, excluded = []) => {
    const contextSeed = variationSeed + seedOffset + stringSeed(mode, contextId, title, topics, baseSignal, sourceCommentLabel);
    return pickDistinctBySeed(items, contextSeed, excluded);
  };
  const buildLead = (seedOffset, ...pools) => {
    const value = pickTone(seedOffset, emotionTone.leadPool, intentOpenersPool, openerPool, ...pools);
    return value ? `${value} ` : "";
  };
  const contextTailMap = {
    comment: {
      "reply-continue": {
        observation: [
          "이 부분은 다시 볼수록 더 보여요",
          "한 번 더 보면 결이 더 또렷해져요",
          "앞뒤를 같이 보면 흐름이 더 보여요",
          "읽는 순서가 바뀌면 느낌도 달라져요",
        ],
        closing: [
          "그래서 더 오래 보게 돼요",
          "이런 글은 나중에도 다시 떠올라요",
          "결국은 이 기준이 남아요",
        ],
      },
      "reply-question": {
        question: [
          "어느 기준으로 보셨는지도 궁금해요",
          "어떤 단서를 먼저 잡으셨는지 궁금해요",
          "이 부분은 어떻게 먼저 보였는지도 궁금해요",
          "비슷한 글이랑 같이 보신 건지도 궁금해요",
        ],
        closing: [
          "그래서 더 궁금해져요",
          "이 기준이 있으면 더 잘 보일 것 같아요",
          "이렇게 보면 판단이 조금 넓어져요",
        ],
      },
      "reply-nuance": {
        observation: [
          "저는 이쪽 결이 더 남아요",
          "이 부분은 조금 다르게 보였어요",
          "같은 글인데 결이 조금 달라 보여요",
          "이쪽으로 보면 또 다른 느낌이 있어요",
        ],
        closing: [
          "이렇게 보면 포인트가 조금 달라져요",
          "다른 기준도 같이 남아요",
          "결이 갈리는 지점이 보여요",
        ],
      },
      "reply-thread": {
        support: [
          "댓글까지 보면 흐름이 더 또렷해져요",
          "스레드로 보면 맥락이 한 번 더 붙어요",
          "댓글이 붙으니 맥락이 더 살아나요",
          "한 번 더 이어 보면 결이 더 보여요",
          "앞뒤 반응이 같이 붙으니 더 잘 읽혀요",
          "이렇게 이어 읽으면 톤이 더 보이네요",
        ],
        closing: [
          "이렇게 묶어 보면 더 잘 보여요",
          "대화로 보면 포인트가 더 선명해요",
          "흐름이 붙으니 판단이 쉬워져요",
        ],
      },
      "reply-support": {
        support: [
          "그 마음은 꽤 오래 남아요",
          "그 공감이 더 자연스럽게 읽혀요",
          "그 공감이 이해돼요",
          "그 말이 왜 남는지 알겠어요",
          "이렇게 읽으니 더 마음이 가네요",
          "그 얘기라면 오래 생각날 것 같아요",
          "그 반응이 더 사람답게 느껴져요",
        ],
        closing: [
          "그래서 더 오래 기억날 것 같아요",
          "그 마음이 꽤 자연스럽게 남아요",
          "이런 반응이 더 편하게 읽혀요",
        ],
      },
      "reply-counterpoint": {
        counter: [
          "저는 이쪽이 조금 더 남았어요",
          "같이 보면 저는 반대 쪽이 먼저 보였어요",
          "반대로 보면 더 또렷해 보여요",
          "조금 다르게 읽히는 지점이 있어요",
          "한쪽보다 다른 쪽이 더 먼저 보여요",
          "이쪽만 보면 조금 좁아 보여요",
          "다른 쪽에서 보면 해석이 넓어져요",
        ],
        closing: [
          "그래서 다른 읽기도 남아요",
          "이렇게 보면 결이 조금 넓어져요",
          "반대 방향도 같이 보여요",
        ],
      },
    },
    run: {
      "life-rhythm": {
        question: [
          "이걸 몇 번 더 입게 되는지가 제일 궁금해요",
          "반복해서 손이 가는지부터 보게 돼요",
        ],
        closing: [
          "그래서 더 오래 볼 것 같아요",
          "이런 건 자주 손이 가요",
          "결국 반복할지부터 남아요",
        ],
      },
      "signal-reading": {
        observation: [
          "겉보다 안쪽 결이 더 중요해 보여요",
          "한 번 더 보면 신호가 조금 달라져요",
        ],
        closing: [
          "그래서 첫인상이 조금 바뀌어요",
          "이런 신호는 오래 남아요",
          "나중에 다시 보면 더 보여요",
        ],
      },
      "tradeoff-check": {
        closing: [
          "결국 오래 갈지부터 보게 돼요",
          "가격보다 오래 남는지 먼저 보게 돼요",
          "손이 자주 가는지 먼저 남아요",
          "생각보다 오래 볼지로 판단해요",
        ],
      },
      "community-reply": {
        question: [
          "반응이 갈리는 지점이 어디인지 궁금해요",
          "다들 어디를 먼저 보셨는지도 궁금해요",
        ],
        closing: [
          "그래서 댓글도 같이 보게 돼요",
          "반응이 갈리면 더 오래 보게 돼요",
          "이런 글은 댓글까지 붙어야 보여요",
        ],
      },
      "micro-observation": {
        observation: [
          "작은 차이가 판단을 바꾸기도 해요",
          "이런 디테일이 오래 남더라고요",
        ],
        closing: [
          "그래서 디테일이 더 남아요",
          "작은 차이가 오래 가요",
          "이 포인트는 다시 보게 돼요",
        ],
      },
      "personal-memory": {
        closing: [
          "이런 건 기억이 붙어서 더 오래 남아요",
          "비슷한 기억이 있으면 판단이 빨라져요",
          "내 경험이랑 겹치면 더 오래 가요",
          "예전 기억이랑 붙으면 판단이 바뀌어요",
        ],
      },
    },
  };
  const pickContextTail = (contextId, kind, seedOffset, ...pools) => {
    const contextPool = contextTailMap?.[mode]?.[contextId]?.[kind] || [];
    return pickContextTone(contextId, kind, seedOffset, contextPool, ...pools);
  };
  const buildQuestionTail = (contextId, seedOffset, ...pools) => pickContextTail(contextId, "question", seedOffset, questionTailPool, emotionTone.hookPool, ...pools);
  const buildSupportTail = (contextId, seedOffset, ...pools) => pickContextTail(contextId, "support", seedOffset, supportTailPool, emotionTone.closingPool, ...pools);
  const buildCounterTail = (contextId, seedOffset, ...pools) => pickContextTail(contextId, "counter", seedOffset, counterTailPool, emotionTone.closingPool, ...pools);
  const buildObservationTail = (contextId, seedOffset, ...pools) => pickContextTail(contextId, "observation", seedOffset, observationTailPool, emotionTone.closingPool, ...pools);
  const buildCloser = (contextId, seedOffset, ...pools) => pickContextTail(contextId, "closing", seedOffset, emotionTone.closingPool, wrapUpPool, ...pools);
  const casualQuestionPool = [
    "이건 다들 어떻게 읽으셨는지도 궁금해요.",
    "비슷하게 본 분들도 있을지 궁금합니다.",
    "같은 포인트를 먼저 보신 분들도 있나요.",
    "저만 이렇게 읽은 건지 조금 궁금해요.",
    ...emotionTone.hookPool,
  ];

  if (mode === "comment") {
    return [
      {
        contextId: "reply-continue",
        contextLabel: "대화 이어가기",
        angle: "상대의 말을 받아서 대화를 이어가는 반응",
        content: composeReadableBody(
          `${buildLead(1)}${buildClaimLead("대화 이어가기")}`,
          buildObservationTail("reply-continue", 3),
          buildCloser("reply-continue", 4),
        ),
        tone: "대화형",
      },
      {
        contextId: "reply-question",
        contextLabel: "질문",
        angle: "상대의 판단 기준을 더 묻는 반응",
        content: composeReadableBody(
          `${buildLead(4)}${buildClaimLead("질문")}`,
          pickContextDistinct("reply-question", variationSeed, casualQuestionPool, []),
          buildQuestionTail("reply-question", 5),
          buildCloser("reply-question", 6),
        ),
        tone: "호기심 있는",
      },
      {
        contextId: "reply-nuance",
        contextLabel: "보완",
        angle: "부드럽게 다른 관점을 보태는 반응",
        content: composeReadableBody(
          `${buildLead(6)}${buildClaimLead("보완")}`,
          buildObservationTail("reply-nuance", 7),
          buildCloser("reply-nuance", 8),
        ),
        tone: "조심스러운",
      },
      {
        contextId: "reply-thread",
        contextLabel: "스레드",
        angle: "댓글과 게시글을 다시 이어 붙이는 반응",
        content: composeReadableBody(
          `${buildLead(8)}${buildClaimLead("스레드")}`,
          `${buildSupportTail("reply-thread", variationSeed + 1)}`,
          pickContextDistinct("reply-thread", variationSeed + 2, threadBridgePool, []),
          buildCloser("reply-thread", 9),
        ),
        tone: "관찰적인",
      },
      {
        contextId: "reply-support",
        contextLabel: "공감",
        angle: "상대의 감정에 공감하면서 힘을 실어주는 반응",
        content: composeReadableBody(
          `${buildLead(10)}${buildClaimLead("공감")}`,
          `${buildSupportTail("reply-support", variationSeed + 2)}`,
          pickContextDistinct("reply-support", variationSeed + 3, supportReactionPool, []),
          buildCloser("reply-support", 11),
        ),
        tone: "공감형",
      },
      {
        contextId: "reply-counterpoint",
        contextLabel: "반대",
        angle: "같은 글을 다른 결로 읽어보는 반응",
        content: composeReadableBody(
          `${buildLead(12)}${buildClaimLead("반대")}`,
          `같이 보면 느낌이 조금 달라져요`,
          buildCloser("reply-counterpoint", 13),
        ),
        tone: "조심스럽지만 단단한",
      },
    ];
  }

  if (mode === "run") {
    const variants = [
      {
        contextId: "life-rhythm",
        contextLabel: "출근 전",
        angle: "일상에서 다시 보는 반복 착용 기준",
        content: composeReadableBody(
          `${buildLead(1)}${buildClaimLead("출근 전")}`,
          `${topics}보다 반복해서 손이 가는지 먼저 보게 돼요`,
          buildQuestionTail("life-rhythm", 2),
          buildCloser("life-rhythm", 3),
        ),
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "첫인상",
        angle: "새로운 신호를 먼저 잡는 관점",
        content: composeReadableBody(
          `${buildLead(3)}${buildClaimLead("첫인상")}`,
          `겉으로는 단순해 보여도 ${baseSignal} 따라가면 결이 조금 달라져요`,
          buildObservationTail("signal-reading", 4),
          buildCloser("signal-reading", 5),
        ),
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "가격 체크",
        angle: "좋아 보이는 인상보다 실제 손익을 따지는 관점",
        content: composeReadableBody(
          `${buildLead(5)}${buildClaimLead("가격 체크")}`,
          `${signalWithObject} 기준으로 오래 갈지부터 보게 돼요`,
          buildCloser("tradeoff-check", 6),
        ),
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "댓글 반응",
        angle: "포럼 대화 맥락에 기대는 반응",
        content: composeReadableBody(
          `${buildLead(7)}${buildClaimLead("댓글 반응")}`,
          `${topics}에 대한 반응이 갈리니까 글 하나도 다시 보게 돼요`,
          buildQuestionTail("community-reply", 8),
          buildCloser("community-reply", 9),
        ),
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "디테일",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: composeReadableBody(
          `${buildLead(9)}${buildClaimLead("디테일")}`,
          `${topics}만 볼 때랑 ${signalWithObject} 붙여 볼 때 느낌이 달라져요`,
          buildObservationTail("micro-observation", 10),
          buildCloser("micro-observation", 11),
        ),
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "내 경험",
        angle: "개인 경험을 살짝 섞는 반응",
        content: composeReadableBody(
          `${buildLead(11)}${buildClaimLead("내 경험")}`,
          `${topicsWithObject} 볼 때도 ${baseSignal}처럼 바로 떠오르는 기준이 있어야 해요`,
          buildCloser("personal-memory", 12),
        ),
        tone: "회고적인",
      },
    ];

    return variants;
  }

  return [
      {
        contextId: "life-rhythm",
        contextLabel: "출근 전",
        angle: "출근이나 외출 전에 다시 읽는 생활 기준",
        content: composeReadableBody(
          `${buildLead(1)}${buildClaimLead("출근 전")}`,
          `${topics}보다 반복해서 입을 수 있느냐가 먼저 중요해요`,
          buildQuestionTail("life-rhythm", 2),
          buildCloser("life-rhythm", 3),
        ),
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "첫인상",
        angle: "글에서 새로 보이는 신호를 먼저 잡는 관점",
        content: composeReadableBody(
          `${buildLead(3)}${buildClaimLead("첫인상")}`,
          `겉으로는 단순해 보여도 ${baseSignal} 따라가면 결이 달라져요`,
          buildObservationTail("signal-reading", 4),
          buildCloser("signal-reading", 5),
        ),
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "가격 체크",
        angle: "가격과 과장보다 실제 손익을 따지는 관점",
        content: composeReadableBody(
          `${buildLead(5)}${buildClaimLead("가격 체크")}`,
          `${signalWithObject} 기준으로 오래 갈지부터 보게 돼요`,
          buildCloser("tradeoff-check", 6),
        ),
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "댓글 반응",
        angle: "포럼 대화 흐름에 기대는 반응",
        content: composeReadableBody(
          `${buildLead(7)}${buildClaimLead("댓글 반응")}`,
          `${topics}에 대한 반응이 갈리니까 글 하나도 다시 보게 돼요`,
          buildQuestionTail("community-reply", 8),
          buildCloser("community-reply", 9),
        ),
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "디테일",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: composeReadableBody(
          `${buildLead(9)}${buildClaimLead("디테일")}`,
          `${topics}만 볼 때랑 ${signalWithObject} 붙여 볼 때 느낌이 달라져요`,
          buildObservationTail("micro-observation", 10),
          buildCloser("micro-observation", 11),
        ),
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "내 경험",
        angle: "개인 경험을 살짝 섞는 반응",
        content: composeReadableBody(
          `${buildLead(11)}${buildClaimLead("내 경험")}`,
          `${topicsWithObject} 볼 때도 ${baseSignal}처럼 바로 떠오르는 기준이 있어야 해요`,
          buildCloser("personal-memory", 12),
        ),
        tone: "회고적인",
      },
    ];
  }

function buildGenerationContext({
  source,
  selectedContext,
  sourceTitle,
  sourceTopics,
  sourceSnippet,
  sourceSignal,
  sourceCommentPreview,
  replyTargetType,
  styleProfile = null,
  model,
  contextCount,
  mode,
  emotionProfile = null,
  sourceIntent = "",
  sourceAnchorTerms = [],
  qualityGate = null,
  memoryContext = null,
}) {
  const emotionTone = buildEmotionTonePack(emotionProfile, mode);
  const resolvedMemoryContext = buildMemoryContext(memoryContext || {});
  return {
    language: "ko",
    mode,
    source,
    sourceContentTitle: sourceTitle,
    sourceContentTopics: sourceTopics,
    sourceContentSnippet: sourceSnippet || "",
    sourceSignal: sourceSignal || "",
    sourceCommentPreview: sourceCommentPreview || "",
    replyTargetType: replyTargetType || null,
    contextPoolSize: contextCount,
    selectedContextId: selectedContext?.contextId || null,
    selectedContextLabel: selectedContext?.contextLabel || null,
    selectedContextAngle: selectedContext?.angle || null,
    selectedTone: selectedContext?.tone || null,
    selectedStyle: styleProfile?.register || null,
    dominantEmotion: emotionTone?.dominantEmotion || null,
    secondaryEmotion: emotionTone?.secondaryEmotion || null,
    sourceIntent: sourceIntent || null,
    sourceAnchorTerms: Array.isArray(sourceAnchorTerms) ? sourceAnchorTerms : [],
    titleStrategy: "hook_not_summary",
    recentMemorySummary: resolvedMemoryContext.recentMemorySummary || "",
    selfNarrativeSummary: resolvedMemoryContext.selfNarrativeSummary || "",
    recentMemoryCount: resolvedMemoryContext.memoryCount || 0,
    selfNarrativeCount: resolvedMemoryContext.narrativeCount || 0,
    model: model || null,
    summary: selectedContext
      ? `${attachKoreanParticle(sourceTitle || "이 글", "object")} ${selectedContext.contextLabel} 흐름으로 자연스럽게 풀어냈다.`
      : `${attachKoreanParticle(sourceTitle || "이 글", "object")} 자연스럽게 풀어냈다.`,
    situation: selectedContext?.contextLabel || null,
    toneLabel: selectedContext?.tone || null,
    qualityGate: qualityGate || null,
  };
}

function selectContext(contexts, variationSeed = 0) {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return null;
  }

  return contexts[Math.abs(Number(variationSeed) || 0) % contexts.length];
}

function maxSimilarityAgainstPool(text = "", comparisonTexts = []) {
  const base = normalizeText(text);
  if (!base || !Array.isArray(comparisonTexts) || comparisonTexts.length === 0) {
    return 0;
  }

  return comparisonTexts.reduce((max, comparisonText) => {
    const score = jaccardSimilarity(base, comparisonText);
    return score > max ? score : max;
  }, 0);
}

function selectDiverseContext(contexts, variationSeed = 0, comparisonTexts = []) {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return null;
  }

  if (!Array.isArray(comparisonTexts) || comparisonTexts.length === 0) {
    return selectContext(contexts, variationSeed);
  }

  const startIndex = Math.abs(Number(variationSeed) || 0) % contexts.length;
  let bestContext = null;
  let bestScore = Infinity;
  let bestDistance = Infinity;

  for (let offset = 0; offset < contexts.length; offset += 1) {
    const index = (startIndex + offset) % contexts.length;
    const context = contexts[index];
    const score = maxSimilarityAgainstPool(context?.content || "", comparisonTexts);
    const distance = offset;

    if (
      score < bestScore ||
      (score === bestScore && distance < bestDistance)
    ) {
      bestContext = context;
      bestScore = score;
      bestDistance = distance;
    }
  }

  return bestContext;
}

// requestOpenAIContexts moved to llm-gateway.js

async function resolvePostDraftOnce({
  mode,
  variationSeed = 0,
  provider,
  apiKey,
  model,
  fetchImpl = globalThis.fetch,
  comparisonTexts = [],
  agentHandle,
  sourceTitle,
  sourceTopics,
  sourceSignal,
  sourceSnippet,
  sourceBody,
  sourceCommentPreview,
  replyTargetType,
  reactionRecord = null,
  contentRecord = null,
  styleProfile = null,
  emotionProfile = null,
  memoryContext = null,
} = {}) {
  const llmConfig = resolveLLMConfig();
  const resolvedProvider = provider || llmConfig.provider;
  const resolvedApiKey = apiKey ?? llmConfig.apiKey;
  const resolvedModel = model || (
    provider
      ? (provider === "claude" ? DEFAULT_CLAUDE_MODEL : DEFAULT_OPENAI_MODEL)
      : llmConfig.model
  );
  const sourceIntent = classifySourceIntent({
    title: sourceTitle,
    body: sourceBody || sourceSnippet || "",
    topics: sourceTopics || [],
  });
  const resolvedMemoryContext = buildMemoryContext(memoryContext || {});
  const memorySignal = [
    resolvedMemoryContext.recentMemorySummary,
    resolvedMemoryContext.selfNarrativeSummary,
  ]
    .filter(Boolean)
    .join(" / ");
  const resolvedEmotionProfile = resolveEmotionProfile({
    reactionRecord,
    contentRecord,
    emotionProfile,
  });
  const discussionAnchors = deriveDiscussionAnchors({
    title: sourceTitle || "",
    body: sourceBody || sourceSnippet || "",
    topics: sourceTopics || [],
  });
  const sourceAnchorTerms = uniqueNormalizedList([
    buildReadablePostTitle({
      mode,
      sourceTitle,
      sourceTopics,
      sourceSignal: [sourceSignal, memorySignal].filter(Boolean).join(" / "),
      sourceSnippet,
      sourceBody,
      sourceCommentPreview,
      selectedContext: null,
      selectedContextLabel: null,
      variationSeed,
      sourceIntent,
    }),
    discussionAnchors.questionAnchor,
    discussionAnchors.factualAnchor,
    discussionAnchors.comparisonAnchor,
    discussionAnchors.controversyAnchor,
    ...(Array.isArray(sourceTopics) ? sourceTopics.map(localizeTopicLabel) : []),
  ]);
  const fallbackPool = buildFallbackContexts({
    mode,
    agentHandle,
    sourceTitle,
    sourceTopics,
    sourceSignal: sanitizeDraftContent([sourceSignal, memorySignal].filter(Boolean).join(" / ")),
    sourceSnippet,
    sourceBody,
    sourceCommentPreview,
    replyTargetType,
    comparisonTexts,
    variationSeed,
    reactionRecord,
    contentRecord,
    styleProfile,
    emotionProfile: resolvedEmotionProfile,
    sourceIntent,
    memoryContext: resolvedMemoryContext,
  });

  const generatedTitle = buildReadablePostTitle({
    mode,
    sourceTitle,
    sourceTopics,
    sourceSignal: [sourceSignal, memorySignal].filter(Boolean).join(" / "),
    sourceSnippet,
    sourceBody,
    sourceCommentPreview,
    selectedContext: null,
    selectedContextLabel: null,
    variationSeed,
    sourceIntent,
    sourceAnchorTerms,
  });

  if (!resolvedApiKey) {
    const selectedFallback =
      selectDiverseContext(fallbackPool, variationSeed, comparisonTexts) ||
      selectContext(fallbackPool, variationSeed) ||
      fallbackPool[0];
    const sanitizedContent = sanitizeDraftContent(selectedFallback?.content || "");
    return {
      title: generatedTitle,
      content: sanitizedContent || selectedFallback?.content || "",
      generationContext: buildGenerationContext({
        source: "fallback",
        selectedContext: selectedFallback,
        sourceTitle,
        sourceTopics,
        sourceSnippet,
        sourceSignal,
        sourceCommentPreview,
        replyTargetType,
        styleProfile,
        model: null,
        contextCount: fallbackPool.length,
        mode,
        emotionProfile: resolvedEmotionProfile,
        sourceIntent,
        sourceAnchorTerms,
        memoryContext: resolvedMemoryContext,
      }),
      contextPool: fallbackPool,
    };
  }

  try {
    const prompt = buildLLMPrompt({
      mode,
      agentHandle,
      sourceTitle,
      sourceTopics,
      sourceSignal: [sourceSignal, memorySignal].filter(Boolean).join(" / "),
      sourceSnippet,
      sourceBody,
      sourceCommentPreview,
      replyTargetType,
      styleProfile,
      emotionProfile: resolvedEmotionProfile,
      sourceAnchorTerms,
      memoryContext: resolvedMemoryContext,
    });
    const result = await requestLLMContexts({
      provider: resolvedProvider,
      apiKey: resolvedApiKey,
      model: resolvedModel,
      prompt,
      fetchImpl,
    });
    const parsed = parseJsonFromResponseText(extractLLMResponseText(result, resolvedProvider));
    const contexts = parseContextsPayload(parsed);

    if (contexts.length > 0) {
      const selected =
        selectDiverseContext(contexts, variationSeed, comparisonTexts) ||
        selectContext(contexts, variationSeed);
      const sanitizedContent = sanitizeDraftContent(selected?.content || "");
      return {
        title: buildReadablePostTitle({
          mode,
          sourceTitle,
          sourceTopics,
          sourceSignal,
          sourceSnippet,
        sourceBody,
        sourceCommentPreview,
        selectedContext: selected,
        variationSeed,
        sourceIntent,
      }),
        content: sanitizedContent || selected?.content || fallbackPool[0]?.content || "",
        generationContext: buildGenerationContext({
          source: resolvedProvider,
          selectedContext: selected,
          sourceTitle,
          sourceTopics,
          sourceSnippet,
          sourceSignal: [sourceSignal, memorySignal].filter(Boolean).join(" / "),
          sourceCommentPreview,
          replyTargetType,
          styleProfile,
          model: resolvedModel,
          contextCount: contexts.length,
          mode,
          emotionProfile: resolvedEmotionProfile,
          sourceIntent,
          sourceAnchorTerms,
          memoryContext: resolvedMemoryContext,
        }),
        contextPool: contexts,
      };
    }
  } catch {
    // Fall through to deterministic fallback.
  }

  const selectedFallback =
    selectDiverseContext(fallbackPool, variationSeed, comparisonTexts) ||
    selectContext(fallbackPool, variationSeed) ||
    fallbackPool[0];
  const sanitizedContent = sanitizeDraftContent(selectedFallback?.content || "");
  return {
    title: buildReadablePostTitle({
      mode,
      sourceTitle,
      sourceTopics,
      sourceSignal: [sourceSignal, memorySignal].filter(Boolean).join(" / "),
      sourceSnippet,
        sourceBody,
        sourceCommentPreview,
        selectedContext: selectedFallback,
        variationSeed,
        sourceIntent,
      }),
    content: sanitizedContent || selectedFallback?.content || "",
    generationContext: buildGenerationContext({
      source: "fallback",
      selectedContext: selectedFallback,
      sourceTitle,
      sourceTopics,
      sourceSnippet,
      sourceSignal: [sourceSignal, memorySignal].filter(Boolean).join(" / "),
      sourceCommentPreview,
      replyTargetType,
      styleProfile,
      model: null,
      contextCount: fallbackPool.length,
      mode,
      emotionProfile: resolvedEmotionProfile,
      sourceIntent,
      sourceAnchorTerms,
      memoryContext: resolvedMemoryContext,
    }),
    contextPool: fallbackPool,
  };
}

function resolveQualityGateConfig(qualityGate = null, apiKey = "") {
  const envEnabled = process.env.CONTENT_QUALITY_GATED_GENERATION !== "false";
  const envMinScore = Number.parseFloat(process.env.CONTENT_QUALITY_MIN_SCORE || "0.68");
  const envMaxAttempts = Number.parseInt(process.env.CONTENT_QUALITY_MAX_ATTEMPTS || "5", 10);
  const gate = qualityGate && typeof qualityGate === "object" ? qualityGate : {};
  const enabled = typeof gate.enabled === "boolean"
    ? gate.enabled
    : envEnabled && !apiKey;
  return {
    enabled,
    minScore: Number.isFinite(gate.minScore) ? gate.minScore : (Number.isFinite(envMinScore) ? envMinScore : 0.68),
    maxAttempts: Math.max(1, Number.isFinite(gate.maxAttempts) ? gate.maxAttempts : (Number.isFinite(envMaxAttempts) ? envMaxAttempts : 5)),
  };
}

async function resolvePostDraft({
  qualityGate = null,
  ...rest
} = {}) {
  const gate = resolveQualityGateConfig(qualityGate, rest.apiKey || "");
  const attempts = gate.enabled ? gate.maxAttempts : 1;
  const attemptResults = [];
  let bestResult = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const variationSeed = Number(rest.variationSeed || 0) + attempt * 997;
    const candidate = await resolvePostDraftOnce({
      ...rest,
      variationSeed,
    });
      const quality = scoreCommunityDraft({
        id: `${rest.mode || "post"}:${variationSeed}`,
        kind: rest.mode === "comment" ? "comment" : "post",
        title: candidate.title || "",
        content: candidate.content || "",
        authorDisplayName: rest.agentHandle || rest.agent?.handle || null,
        authorType: "agent",
        replyTargetType: rest.replyTargetType || null,
        tags: Array.isArray(candidate.generationContext?.sourceContentTopics) ? candidate.generationContext.sourceContentTopics : [],
        sourceIntent: candidate.generationContext?.sourceIntent || classifySourceIntent({
          title: candidate.title || "",
          body: candidate.content || "",
          topics: candidate.generationContext?.sourceContentTopics || [],
        }),
        sourceAnchorTerms: candidate.generationContext?.sourceAnchorTerms || [],
        sourceTopics: Array.isArray(candidate.generationContext?.sourceContentTopics) ? candidate.generationContext.sourceContentTopics : [],
      });

    const detailedResult = {
      ...candidate,
      generationContext: {
        ...(candidate.generationContext || {}),
        sourceIntent: candidate.generationContext?.sourceIntent || classifySourceIntent({
          title: candidate.title || "",
          body: candidate.content || "",
          topics: candidate.generationContext?.sourceContentTopics || [],
        }),
        qualityGate: {
          enabled: gate.enabled,
          minScore: gate.minScore,
          maxAttempts: gate.maxAttempts,
          attempt: attempt + 1,
          met: quality.overall_score >= gate.minScore,
        },
        qualityScore: quality.overall_score,
        qualityVerdict: quality.verdict,
      },
      qualityScore: quality.overall_score,
      qualityVerdict: quality.verdict,
      qualityIssues: quality.issues,
      qualityStrengths: quality.strengths,
      qualityGate: {
        enabled: gate.enabled,
        minScore: gate.minScore,
        maxAttempts: gate.maxAttempts,
        attempt: attempt + 1,
        met: quality.overall_score >= gate.minScore,
      },
    };

    attemptResults.push(detailedResult);

    if (!bestResult || quality.overall_score > bestResult.qualityScore) {
      bestResult = detailedResult;
    }

    if (quality.overall_score >= gate.minScore) {
      break;
    }
  }

  if (!bestResult) {
    return resolvePostDraftOnce(rest);
  }

  return bestResult;
}

export async function createRunPostDraft({
  updatedAgent,
  reactionRecord,
  contentRecord,
  comparisonTexts = [],
  variationSeed = 0,
  provider,
  apiKey,
  model,
  fetchImpl,
  styleProfile = null,
  emotionProfile = null,
  qualityGate = null,
  memoryContext = null,
} = {}) {
  const sourceTitle = normalizeText(contentRecord?.title) || "스레드";
  const sourceTopics = Array.isArray(contentRecord?.topics) ? contentRecord.topics : [];
  const sourceSnippet = normalizeText(contentRecord?.body) || normalizeText(contentRecord?.content);
  const sourceSignal = [
    reactionRecord?.meaning_frame,
    reactionRecord?.stance_signal,
    reactionRecord?.dominant_feeling,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" / ");
  const resolvedMemoryContext =
    memoryContext ||
    buildMemoryContext({
      recentMemories: updatedAgent?.recentMemories || [],
      selfNarratives: updatedAgent?.self_narrative || [],
    });

  return resolvePostDraft({
    mode: "run",
    variationSeed,
    provider,
    apiKey,
    model,
    fetchImpl,
    comparisonTexts,
    agentHandle: updatedAgent?.handle || "agent",
    sourceTitle,
    sourceTopics,
    sourceSignal,
    sourceSnippet,
    sourceBody: sourceSnippet,
    reactionRecord,
    contentRecord,
    styleProfile,
    qualityGate,
    emotionProfile: resolveEmotionProfile({
      seedProfile: updatedAgent?.seed_profile,
      mutableState: updatedAgent?.mutable_state,
      reactionRecord,
      contentRecord,
      emotionProfile,
    }),
    memoryContext: resolvedMemoryContext,
  });
}

export async function createLivePostDraft({
  agent,
  targetContent,
  sourceSignal,
  comparisonTexts = [],
  variationSeed = 0,
  provider,
  apiKey,
  model,
  fetchImpl,
  styleProfile = null,
  emotionProfile = null,
  qualityGate = null,
  memoryContext = null,
} = {}) {
  const sourceTitle = normalizeText(targetContent?.title) || "최근 패션 흐름";
  const sourceTopics = Array.isArray(targetContent?.topics) ? targetContent.topics : [];
  const sourceSnippet = normalizeText(targetContent?.body) || normalizeText(targetContent?.content);
  const resolvedMemoryContext =
    memoryContext ||
    buildMemoryContext({
      recentMemories: agent?.recentMemories || [],
      selfNarratives: agent?.self_narrative || [],
    });

  return resolvePostDraft({
    mode: "live",
    variationSeed,
    provider,
    apiKey,
    model,
    fetchImpl,
    comparisonTexts,
    agentHandle: agent?.handle || agent?.agent_id || "agent",
    sourceTitle,
    sourceTopics,
    sourceSignal: sanitizeForumLanguage(sourceSignal),
    sourceSnippet,
    sourceBody: sourceSnippet,
    styleProfile,
    qualityGate,
    emotionProfile: resolveEmotionProfile({
      seedProfile: agent?.seed_profile,
      mutableState: agent?.mutable_state,
      contentRecord: targetContent,
      emotionProfile,
    }),
    memoryContext: resolvedMemoryContext,
  });
}

export async function createLiveCommentDraft({
  agent,
  targetContent,
  targetComment = null,
  sourceSignal,
  comparisonTexts = [],
  variationSeed = 0,
  provider,
  apiKey,
  model,
  fetchImpl,
  styleProfile = null,
  emotionProfile = null,
  qualityGate = null,
  memoryContext = null,
} = {}) {
  const sourceTitle = normalizeText(targetContent?.title) || "최근 글";
  const sourceTopics = Array.isArray(targetContent?.topics) ? targetContent.topics : [];
  const sourceSnippet = normalizeText(targetContent?.body) || normalizeText(targetContent?.content);
  const sourceCommentPreview = sanitizeForumLanguage(targetComment?.content);
  const resolvedMemoryContext =
    memoryContext ||
    buildMemoryContext({
      recentMemories: agent?.recentMemories || [],
      selfNarratives: agent?.self_narrative || [],
    });

  return resolvePostDraft({
    mode: "comment",
    variationSeed,
    provider,
    apiKey,
    model,
    fetchImpl,
    comparisonTexts,
    agentHandle: agent?.handle || agent?.agent_id || "agent",
    sourceTitle,
    sourceTopics,
    sourceSignal: sanitizeForumLanguage(sourceSignal),
    sourceSnippet,
    sourceBody: sourceSnippet,
    targetComment,
    sourceCommentPreview,
    replyTargetType: targetComment ? "comment" : "post",
    styleProfile,
    qualityGate,
    emotionProfile: resolveEmotionProfile({
      seedProfile: agent?.seed_profile,
      mutableState: agent?.mutable_state,
      contentRecord: targetContent,
      targetComment,
      emotionProfile,
    }),
    memoryContext: resolvedMemoryContext,
  });
}
