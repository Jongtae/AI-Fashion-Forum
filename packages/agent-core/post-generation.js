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

function escapeRegExp(value = "") {
  return normalizeText(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripRepeatedLeadWord(lead = "", value = "") {
  const leadWord = normalizeText(lead).split(/\s+/)[0];
  const text = normalizeText(value);
  if (!leadWord || !text) {
    return text;
  }

  const pattern = new RegExp(`^${escapeRegExp(leadWord)}\\s+`);
  return text.replace(pattern, "");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
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
      ? ["궁금해서", "이건 좀 더 보고 싶어서", "왜 그런지 생각해보면"]
      : ["궁금해서", "왜 이렇게 보였는지 생각해보면", "이건 계속 보게 되더라고요"],
    empathy: isComment
      ? ["마음이 쓰여서", "그 마음이 먼저 와서", "괜히 공감돼서"]
      : ["마음이 쓰여서", "그 마음이 먼저 와서", "괜히 공감돼서"],
    amusement: isComment
      ? ["살짝 웃겨서", "생각보다 재밌어서", "괜히 웃음이 나서"]
      : ["살짝 웃기게도", "생각보다 재밌게", "괜히 웃음이 나서"],
    sadness: isComment
      ? ["조금 아쉬워서", "괜히 허전해서", "마음이 조금 가라앉아서"]
      : ["조금 아쉽게", "괜히 허전하게", "생각보다 씁쓸하게"],
    anger: isComment
      ? ["솔직히 좀 답답해서", "조금 화가 나서", "이건 꽤 불편해서"]
      : ["솔직히 좀 답답하게", "조금 화가 나서", "의외로 불만스럽게"],
    relief: isComment
      ? ["생각보다 다행이라서", "괜히 안심돼서", "그래도 편하게 느껴져서"]
      : ["생각보다 다행스럽게", "괜히 안심돼서", "이건 좀 편하게 읽혔어요"],
    anticipation: isComment
      ? ["다음이 궁금해서", "계속 이어질 것 같아서", "이 뒤가 더 궁금해져서"]
      : ["다음이 궁금해서", "앞으로가 기대돼서", "계속 지켜보게 돼요"],
    surprise: isComment
      ? ["의외라서", "생각보다 새로워서", "뜻밖이라서"]
      : ["의외로", "생각보다", "뜻밖에"],
  };
  const emotionHooks = {
    curiosity: ["이건 다들 어떻게 읽으셨는지도 궁금해요.", "비슷하게 본 분들도 있을지 궁금합니다."],
    empathy: ["그 마음이 남는 지점이 있네요.", "마음 쓰이는 부분이 조금 길게 남아요."],
    amusement: ["이건 살짝 웃겨서 남네요.", "웃음이 나는 지점이 꽤 오래 가요."],
    sadness: ["괜히 아쉬운 마음이 조금 남아요.", "조금 허전하게 읽히는 부분이 있어요."],
    anger: ["이 부분은 꽤 답답하게 남네요.", "조금 불편하게 읽히는 지점이 있어요."],
    relief: ["생각보다 다행스럽게 읽히네요.", "괜히 안심되는 지점이 있어요."],
    anticipation: ["다음 반응이 더 궁금해지네요.", "이 뒤가 어떻게 이어질지 좀 더 보고 싶어요."],
    surprise: ["생각보다 의외의 지점이 있네요.", "뜻밖의 포인트가 먼저 보였어요."],
  };
  const emotionClosings = {
    curiosity: ["이건 다들 어떻게 읽으셨는지도 궁금해요.", "같은 포인트를 먼저 보신 분들도 있나요."],
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

function extractResponseText(result) {
  if (!result || typeof result !== "object") {
    return "";
  }

  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    if (typeof item?.content === "string" && item.content.trim()) {
      return item.content.trim();
    }

    if (Array.isArray(item?.content)) {
      for (const contentItem of item.content) {
        if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
          return contentItem.text.trim();
        }
        if (typeof contentItem?.output_text === "string" && contentItem.output_text.trim()) {
          return contentItem.output_text.trim();
        }
      }
    }
  }

  return "";
}

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
    ],
  },
  {
    contextLabel: "첫인상",
    titles: [
      "처음 보인 포인트",
      "먼저 걸린 단서",
      "눈에 먼저 들어온 이유",
      "첫인상을 바꾼 지점",
    ],
  },
  {
    contextLabel: "가격 체크",
    titles: [
      "가격보다 먼저 본 것",
      "몇 번 입을지 먼저 본 이유",
      "손이 갈지 먼저 본 메모",
      "좋아 보여도 다시 본 이유",
    ],
  },
  {
    contextLabel: "댓글 반응",
    titles: [
      "댓글이 바꾼 시선",
      "반응 보고 다시 본 글",
      "대화가 먼저 붙은 글",
      "댓글이 넓힌 말",
    ],
  },
  {
    contextLabel: "디테일",
    titles: [
      "작은 차이가 먼저 보인 이유",
      "디테일 하나가 남은 글",
      "먼저 걸린 디테일",
      "작은 부분이 바꾼 판단",
    ],
  },
  {
    contextLabel: "내 경험",
    titles: [
      "비슷한 옷이 먼저 떠오른 이유",
      "전에 본 느낌과 닮은 지점",
      "기억이 먼저 걸린 포인트",
      "내 경험이 먼저 반응한 글",
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
    ],
  },
  {
    contextLabel: "질문",
    titles: [
      "한 번 더 묻게 된 지점",
      "기준이 궁금해진 부분",
      "다시 물어보고 싶은 이유",
      "질문이 남은 포인트",
    ],
  },
  {
    contextLabel: "보완",
    titles: [
      "다른 시선이 붙은 이유",
      "조금 더 보태고 싶은 말",
      "부드럽게 다른 쪽을 본 답",
      "보완해서 읽은 댓글",
    ],
  },
  {
    contextLabel: "스레드",
    titles: [
      "댓글까지 봐야 보이는 결",
      "글과 댓글을 다시 잇는 쪽",
      "대화 흐름을 묶은 메모",
      "스레드 전체를 다시 읽은 말",
    ],
  },
  {
    contextLabel: "공감",
    titles: [
      "먼저 공감이 간 부분",
      "고개가 먼저 끄덕여진 말",
      "비슷하게 느낀 지점",
      "공감부터 남긴 댓글",
    ],
  },
  {
    contextLabel: "반대",
    titles: [
      "같은 글을 다르게 읽은 이유",
      "조금 다른 쪽에서 본 답",
      "반대로 보인 한 지점",
      "다른 결로 읽은 댓글",
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
} = {}) {
  const normalizedTopics = uniqueNormalizedList((Array.isArray(sourceTopics) ? sourceTopics : []).map(localizeTopicLabel));
  const primaryTopic = normalizedTopics[0] || localizeTopicLabel(selectedContext?.contextLabel || selectedContextLabel || "");
  const secondaryTopic = normalizedTopics[1] || primaryTopic;
  const contextLabel = normalizeText(selectedContext?.contextLabel || selectedContextLabel);
  const signal = sanitizeForumLanguage(sourceSignal);
  const referenceText = [
    sanitizeForumLanguage(sourceTitle),
    sanitizeForumLanguage(sourceSnippet),
    sanitizeForumLanguage(sourceBody),
    sanitizeForumLanguage(selectedContext?.content),
    sanitizeForumLanguage(signal),
  ]
    .filter(Boolean)
    .join(" ");

  const pool = [];

  if (mode === "comment") {
    const hookSet = COMMENT_TITLE_HOOKS.find((entry) => entry.contextLabel === contextLabel) || null;
    pool.push(...(hookSet?.titles || []));
    pool.push(
      `${attachKoreanParticle(primaryTopic, "object")} 보고 남긴 짧은 말`,
      `${attachKoreanParticle(secondaryTopic, "object")} 같이 본 뒤의 생각`,
      `대화를 이어 붙인 한 줄`,
      `댓글 흐름에서 남은 포인트`,
      `한 번 더 물어본 이유`,
    );
  } else {
    const hookSet = RUN_TITLE_HOOKS.find((entry) => entry.contextLabel === contextLabel) || null;
    pool.push(...(hookSet?.titles || []));
    pool.push(
      `${attachKoreanParticle(primaryTopic, "object")} 먼저 보게 된 이유`,
      `${secondaryTopic}까지 같이 본 기준`,
      `오늘 다시 읽은 포인트`,
      `이 글이 오래 남는 이유`,
      `한 번 더 보게 된 사진`,
    );
  }

  const candidates = uniqueNormalizedList(pool)
    .map((candidate) => shortenHookTitle(candidate, 28))
    .filter(Boolean)
    .filter((candidate) => {
      if (!referenceText) {
        return true;
      }
      return jaccardSimilarity(candidate, referenceText) < 0.7;
    });

  if (!candidates.length) {
    return shortenHookTitle(
      mode === "comment"
        ? "댓글이 남긴 작은 포인트"
        : "오늘 다시 읽은 기준",
      28,
    );
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
  const index = Math.abs(selectionSeed) % candidates.length;
  return candidates[index];
}

function buildOpenAIPrompt({
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
} = {}) {
  const promptTitle = localizeSourceLabel(sourceTitle, "이 글");
  const sourceTopicText = Array.isArray(sourceTopics) && sourceTopics.length
    ? uniqueNormalizedList(sourceTopics.map(localizeTopicLabel)).join(", ")
    : "일반 포럼 신호";
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

  const modeLabel = mode === "live" ? "실시간 에이전트 글" : "배치 생성 글";

  return [
    "너는 패션 포럼 시뮬레이션의 한국어 글 생성기다.",
    `${modeLabel}를 위해 서로 다른 맥락의 후보 4개를 만들어야 한다.`,
    "반드시 한국어로만 작성하고, 영어는 고유명사나 불가피한 용어를 제외하고 쓰지 마라.",
    "출력은 설명 없이 JSON만 반환한다.",
    '형식은 {"contexts":[{"context_id":"...","context_label":"...","angle":"...","content":"...","tone":"..."}]} 이다.',
    "contexts는 정확히 4개를 권장하며, 각 항목은 서로 다른 맥락과 다른 문장 흐름을 가져야 한다.",
    "content는 최소 2문장 이상인 한글 자연문으로, 커뮤니티 글처럼 읽혀야 하며 너무 과장된 템플릿 문구를 반복하지 말아라.",
    "첫 문장은 상황을 잡고, 두 번째 문장은 근거나 비교를 붙이고, 마지막 문장은 판단이나 여운으로 완결해라.",
    "문장 끝은 끊긴 메모처럼 남기지 말고, 본문 자체가 읽히도록 완결된 문장으로 마무리해라.",
    "본문 첫 단어를 '맞아요', '그렇죠', '그래요' 같은 동의 표현으로 시작하지 말고, 바로 상황이나 관찰로 들어가라.",
    "희로애락 같은 감정은 이름으로 설명하기보다, 문장 리듬과 선택 단어로 드러내라.",
    "제목은 본문 요약처럼 쓰지 말고, 짧은 훅과 관점 차이가 드러나게 따로 잡아라.",
    "댓글인 경우에는 실제 커뮤니티 댓글처럼 간결하고 구어체로 쓰고, 주어를 굳이 설명하지 마라.",
    "번역투보다 실제 커뮤니티 댓글의 짧은 리듬과 맞장구, 질문, 부드러운 반박을 우선해라.",
    "같은 제목 구조나 같은 문장 시작을 반복하지 말고, 출근 전, 가격 체크, 첫인상, 댓글 반응, 내 경험 같은 서로 다른 관점으로 분기해라.",
    "생활감, 장면, 됩니다, 읽히는 느낌, 실용적인 기준 같은 에세이형 표현은 쓰지 말고 더 직접적인 말로 바꿔라.",
    `작성자 표시명: ${agentHandle || "익명"}`,
    `대상 글 제목: ${sourceTitle || "스레드"} / 본문에서는 "${promptTitle}"처럼 한국어로 재해석해라.`,
    `대상 토픽: ${sourceTopicText}`,
    `상황 단서: ${promptSignal || "맥락 없음"}`,
    styleProfile?.register ? `말투 레지스터: ${styleProfile.register}` : null,
    styleProfile?.cadence ? `말투 리듬: ${styleProfile.cadence}` : null,
    styleOpeners.length ? `참고 시작어: ${styleOpeners.join(", ")}` : null,
    styleEndings.length ? `참고 끝맺음: ${styleEndings.join(", ")}` : null,
    styleSamples.length ? `참고 댓글 샘플: ${styleSamples.slice(0, 3).join(" / ")}` : null,
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
} = {}) {
  const title = sanitizeForumLanguage(sourceTitle) || "스레드";
  const displayTitle = localizeSourceLabel(title, "이 글");
  const topics = Array.isArray(sourceTopics) && sourceTopics.length
    ? joinKoreanTopicList(sourceTopics.map(localizeTopicLabel))
    : "일반 포럼 신호";
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
  const localizedContentRecord = {
    ...(contentRecord || {}),
    title: displayTitle,
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
  const postFallbackOpeners = ["", "근데", "저는", "오히려", "솔직히", "개인적으로", "이번엔", "조용히 보면"];
  const commentFallbackOpeners = ["근데", "저는", "오히려", "맞아요", "솔직히", "개인적으로", "음"];
  const isAgreementOpener = (value = "") => /^(맞아요|그렇죠|그래요|네|응)([\s,!.?].*)?$/u.test(normalizeText(value));
  const openerPool =
    mode === "comment"
      ? (styleOpeners.length ? styleOpeners : commentFallbackOpeners)
      : (styleOpeners.filter((opener) => !isAgreementOpener(opener)).length
        ? styleOpeners.filter((opener) => !isAgreementOpener(opener))
        : postFallbackOpeners);
  const lead = pickBySeed([...emotionTone.leadPool, ...openerPool], variationSeed) || "";
  const wrapUpPool = styleEndings.length
    ? styleEndings.filter((ending) => /[.!?…。]$/u.test(ending))
    : [
        "그래서 이런 글은 나중에도 다시 보게 돼요.",
        "이런 기준이 있으면 비슷한 글도 조금 다르게 보여요.",
        "결국은 자주 손이 가는 쪽이 더 남아요.",
        "이렇게 읽으면 판단이 빨라져요.",
      ];
  const wrapUp = pickBySeed([...emotionTone.closingPool, ...wrapUpPool], variationSeed + 1) || "";
  const leadText = lead ? `${lead} ` : "";
  const casualBridgePool = [
    "딱 그 부분이 먼저 보여요",
    "저는 이 포인트가 더 크게 보여요",
    "이건 생각보다 바로 와요",
    "오히려 이쪽이 더 눈에 들어와요",
    "근데 이 흐름은 꽤 자연스러워요",
    "솔직히 이 포인트가 제일 남아요",
  ];
  const casualQuestionPool = [
    "어느 부분을 가장 크게 보셨는지 궁금해요",
    "저는 다른 쪽도 같이 보게 돼요",
    "이 포인트를 먼저 잡으신 이유가 있을까요",
    "비슷하게 읽으셨는지 좀 궁금해요",
    "어디를 기준으로 보셨는지 알고 싶어요",
  ];
  const casualSupportPool = [
    "그 느낌은 충분히 이해돼요",
    "그렇게 느끼는 것도 자연스러워 보여요",
    "저도 비슷하게 봤어요",
    "그 말은 꽤 공감돼요",
    "그 부분은 저도 고개가 끄덕여져요",
  ];
  const casualCounterPool = [
    "저는 조금 다르게 읽었어요",
    "근데 저는 여기서 결이 좀 다르게 보여요",
    "오히려 반대로 볼 수도 있겠어요",
    "솔직히 저는 이쪽 해석이 더 먼저 와요",
    "조금 다른 시선도 가능해 보여요",
  ];
  const socialHookPool = [
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
          `${leadText}${stripRepeatedLeadWord(lead, pickDistinctBySeed(["근데", "오히려", "저는"], variationSeed, [lead]))} ${displayTitle} 쪽은 ${pickBySeed(["이 부분이", "이 포인트가", "이 흐름이"], variationSeed + 1)} 먼저 보여요`,
          "같이 보면 조금 더 또렷해져요",
          wrapUp,
        ),
        tone: "대화형",
      },
      {
        contextId: "reply-question",
        contextLabel: "질문",
        angle: "상대의 판단 기준을 더 묻는 반응",
        content: composeReadableBody(
          `${leadText}${stripRepeatedLeadWord(lead, pickDistinctBySeed(["저는", "근데", "오히려"], variationSeed, [lead]))} ${topics}보다 다른 단서가 먼저 보여요`,
          pickDistinctBySeed(casualQuestionPool, variationSeed, [lead]),
          wrapUp,
        ),
        tone: "호기심 있는",
      },
      {
        contextId: "reply-nuance",
        contextLabel: "보완",
        angle: "부드럽게 다른 관점을 보태는 반응",
        content: composeReadableBody(
          `${leadText}${stripRepeatedLeadWord(lead, pickDistinctBySeed(casualCounterPool, variationSeed, [lead]))}`,
          `${displayTitle} 쪽이 ${topics}보다 더 크게 보이네요`,
          wrapUp,
        ),
        tone: "조심스러운",
      },
      {
        contextId: "reply-thread",
        contextLabel: "스레드",
        angle: "댓글과 게시글을 다시 이어 붙이는 반응",
        content: composeReadableBody(
          `${leadText}${pickBySeed(casualSupportPool, variationSeed)}`,
          "댓글까지 같이 보면 흐름이 더 잘 보여요",
          wrapUp,
        ),
        tone: "관찰적인",
      },
      {
        contextId: "reply-support",
        contextLabel: "공감",
        angle: "상대의 감정에 공감하면서 힘을 실어주는 반응",
        content: composeReadableBody(
          `${leadText}${pickBySeed(casualSupportPool, variationSeed)}`,
          pickDistinctBySeed(["그 말이 맞는 것 같아요", "그 공감이 이해돼요", "그 부분은 저도 고개가 끄덕여지더라고요"], variationSeed + 1, [lead]),
          wrapUp,
        ),
        tone: "공감형",
      },
      {
        contextId: "reply-counterpoint",
        contextLabel: "반대",
        angle: "같은 글을 다른 결로 읽어보는 반응",
        content: composeReadableBody(
          `${leadText}${stripRepeatedLeadWord(lead, pickDistinctBySeed(casualCounterPool, variationSeed + 1, [lead]))}`,
          `${displayTitle} 쪽이랑 같이 보면 느낌이 조금 달라져요`,
          wrapUp,
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
        angle: "일상에서 다시 읽는 반복 착용 기준",
        content: composeReadableBody(
          `${leadText}아침에 다시 보니 이 글은 출근할 때 더 잘 보여요`,
          `${topics}보다 반복해서 입을 수 있느냐를 먼저 보게 돼요`,
          pickBySeed(socialHookPool, variationSeed + 2),
        ),
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "첫인상",
        angle: "새로운 신호를 먼저 잡는 관점",
        content: composeReadableBody(
          `${leadText}${displayTitle}에서 먼저 보인 건 ${topics} 쪽이에요`,
          `겉으로는 단순해 보여도 ${baseSignal}를 따라가면 느낌이 조금 달라져요`,
          pickBySeed(socialHookPool, variationSeed + 3),
        ),
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "가격 체크",
        angle: "좋아 보이는 인상보다 실제 손익을 따지는 관점",
        content: composeReadableBody(
          `${leadText}첫 인상은 괜찮은데, 막상 보면 가격을 같이 보게 돼요`,
          `${signalWithObject} 기준으로 과장보다 현실을 먼저 보게 돼요`,
          wrapUp,
        ),
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "댓글 반응",
        angle: "포럼 대화 맥락에 기대는 반응",
        content: composeReadableBody(
          `${leadText}댓글까지 같이 보니 ${displayTitle}가 조금 다르게 보여요`,
          `${topics}에 대한 반응이 서로 다르니까 글 하나도 다시 보게 돼요`,
          pickBySeed(socialHookPool, variationSeed + 4),
        ),
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "디테일",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: composeReadableBody(
          `${leadText}${displayTitle}에서 작은 디테일 하나가 먼저 보여요`,
          `${topics}만 볼 때랑 ${signalWithObject} 붙여 볼 때 느낌이 달라요`,
          wrapUp,
        ),
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "내 경험",
        angle: "개인 경험을 살짝 섞는 반응",
        content: composeReadableBody(
          `${leadText}비슷한 사진이나 옷을 떠올리면 이 글이 더 잘 남아요`,
          `${topicsWithObject} 볼 때도 ${baseSignal}처럼 바로 떠오르는 기준이 있어야 해요`,
          wrapUp,
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
          `${leadText}출근 전에 다시 읽어보니 이 글은 더 현실적으로 보여요`,
          `${topics}보다 반복해서 입을 수 있느냐가 먼저 중요해요`,
          pickBySeed(socialHookPool, variationSeed + 2),
        ),
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "첫인상",
        angle: "글에서 새로 보이는 신호를 먼저 잡는 관점",
        content: composeReadableBody(
          `${leadText}${displayTitle}에서 먼저 보인 건 ${topics} 쪽이에요`,
          `겉으로는 단순해 보여도 ${baseSignal}를 따라가면 느낌이 달라져요`,
          pickBySeed(socialHookPool, variationSeed + 3),
        ),
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "가격 체크",
        angle: "가격과 과장보다 실제 손익을 따지는 관점",
        content: composeReadableBody(
          `${leadText}첫 인상은 괜찮은데, 막상 보면 가격을 같이 보게 돼요`,
          `${signalWithObject} 기준으로 과장보다 현실을 먼저 보게 돼요`,
          wrapUp,
        ),
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "댓글 반응",
        angle: "포럼 대화 흐름에 기대는 반응",
        content: composeReadableBody(
          `${leadText}댓글들까지 같이 보니 ${displayTitle}가 조금 다르게 보여요`,
          `${topics}에 대한 반응이 서로 다르니까 글 하나도 다시 보게 돼요`,
          pickBySeed(socialHookPool, variationSeed + 4),
        ),
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "디테일",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: composeReadableBody(
          `${leadText}${displayTitle}에서 작은 디테일 하나가 먼저 보여요`,
          `${topics}만 볼 때랑 ${signalWithObject} 붙여 볼 때 느낌이 달라요`,
          wrapUp,
        ),
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "내 경험",
        angle: "개인 경험을 살짝 섞는 반응",
        content: composeReadableBody(
          `${leadText}비슷한 사진이나 옷을 떠올리면 이 글이 더 잘 남아요`,
          `${topicsWithObject} 볼 때도 ${baseSignal}처럼 바로 떠오르는 기준이 있어야 해요`,
          wrapUp,
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
}) {
  const emotionTone = buildEmotionTonePack(emotionProfile, mode);
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
    titleStrategy: "hook_not_summary",
    model: model || null,
    summary: selectedContext
      ? `${sourceTitle}를 ${selectedContext.contextLabel} 흐름으로 자연스럽게 풀어냈다.`
      : `${sourceTitle}를 자연스럽게 풀어냈다.`,
    situation: selectedContext?.contextLabel || null,
    toneLabel: selectedContext?.tone || null,
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

async function requestOpenAIContexts({
  apiKey,
  model,
  prompt,
  fetchImpl = globalThis.fetch,
}) {
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    const message = result?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  return result;
}

async function resolvePostDraft({
  mode,
  variationSeed = 0,
  apiKey = process.env.OPENAI_API_KEY || "",
  model = process.env.OPENAI_POST_CONTEXT_MODEL || "gpt-4o",
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
} = {}) {
  const resolvedEmotionProfile = resolveEmotionProfile({
    reactionRecord,
    contentRecord,
    emotionProfile,
  });
  const fallbackPool = buildFallbackContexts({
    mode,
    agentHandle,
    sourceTitle,
    sourceTopics,
    sourceSignal: sanitizeDraftContent(sourceSignal),
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
  });

  const generatedTitle = buildReadablePostTitle({
    mode,
    sourceTitle,
    sourceTopics,
    sourceSignal,
    sourceSnippet,
    sourceBody,
    sourceCommentPreview,
    selectedContext: null,
    selectedContextLabel: null,
    variationSeed,
  });

  if (!apiKey) {
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
      }),
      contextPool: fallbackPool,
    };
  }

  try {
    const prompt = buildOpenAIPrompt({
      mode,
      agentHandle,
      sourceTitle,
      sourceTopics,
      sourceSignal,
      sourceSnippet,
      sourceBody,
      sourceCommentPreview,
      replyTargetType,
      styleProfile,
      emotionProfile: resolvedEmotionProfile,
    });
    const result = await requestOpenAIContexts({
      apiKey,
      model,
      prompt,
      fetchImpl,
    });
    const parsed = parseJsonFromResponseText(extractResponseText(result));
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
        }),
        content: sanitizedContent || selected?.content || fallbackPool[0]?.content || "",
        generationContext: buildGenerationContext({
          source: "openai",
          selectedContext: selected,
          sourceTitle,
          sourceTopics,
          sourceSnippet,
          sourceSignal,
          sourceCommentPreview,
          replyTargetType,
          styleProfile,
          model,
          contextCount: contexts.length,
          mode,
          emotionProfile: resolvedEmotionProfile,
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
      sourceSignal,
      sourceSnippet,
      sourceBody,
      sourceCommentPreview,
      selectedContext: selectedFallback,
      variationSeed,
    }),
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
    }),
    contextPool: fallbackPool,
  };
}

export async function createRunPostDraft({
  updatedAgent,
  reactionRecord,
  contentRecord,
  comparisonTexts = [],
  variationSeed = 0,
  apiKey,
  model,
  fetchImpl,
  styleProfile = null,
  emotionProfile = null,
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

  return resolvePostDraft({
    mode: "run",
    variationSeed,
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
    emotionProfile: resolveEmotionProfile({
      seedProfile: updatedAgent?.seed_profile,
      mutableState: updatedAgent?.mutable_state,
      reactionRecord,
      contentRecord,
      emotionProfile,
    }),
  });
}

export async function createLivePostDraft({
  agent,
  targetContent,
  sourceSignal,
  comparisonTexts = [],
  variationSeed = 0,
  apiKey,
  model,
  fetchImpl,
  styleProfile = null,
  emotionProfile = null,
} = {}) {
  const sourceTitle = normalizeText(targetContent?.title) || "최근 패션 흐름";
  const sourceTopics = Array.isArray(targetContent?.topics) ? targetContent.topics : [];
  const sourceSnippet = normalizeText(targetContent?.body) || normalizeText(targetContent?.content);

  return resolvePostDraft({
    mode: "live",
    variationSeed,
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
    emotionProfile: resolveEmotionProfile({
      seedProfile: agent?.seed_profile,
      mutableState: agent?.mutable_state,
      contentRecord: targetContent,
      emotionProfile,
    }),
  });
}

export async function createLiveCommentDraft({
  agent,
  targetContent,
  targetComment = null,
  sourceSignal,
  comparisonTexts = [],
  variationSeed = 0,
  apiKey,
  model,
  fetchImpl,
  styleProfile = null,
  emotionProfile = null,
} = {}) {
  const sourceTitle = normalizeText(targetContent?.title) || "최근 글";
  const sourceTopics = Array.isArray(targetContent?.topics) ? targetContent.topics : [];
  const sourceSnippet = normalizeText(targetContent?.body) || normalizeText(targetContent?.content);
  const sourceCommentPreview = sanitizeForumLanguage(targetComment?.content);

  return resolvePostDraft({
    mode: "comment",
    variationSeed,
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
    emotionProfile: resolveEmotionProfile({
      seedProfile: agent?.seed_profile,
      mutableState: agent?.mutable_state,
      contentRecord: targetContent,
      targetComment,
      emotionProfile,
    }),
  });
}
