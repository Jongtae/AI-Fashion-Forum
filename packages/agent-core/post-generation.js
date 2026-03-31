function pickBySeed(items = [], seed = 0) {
  if (!items.length) {
    return null;
  }

  const index = Math.abs(Number(seed) || 0) % items.length;
  return items[index];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function uniqueNormalizedList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeText(value)).filter(Boolean))];
}

function summarizeContentRecord(contentRecord = {}) {
  const title = normalizeText(contentRecord.title) || "스레드";
  const topics = Array.isArray(contentRecord.topics) && contentRecord.topics.length
    ? contentRecord.topics.map((topic) => normalizeText(topic)).filter(Boolean).join(", ")
    : "일반 포럼 신호";
  const body = normalizeText(contentRecord.body);
  const content = normalizeText(contentRecord.content);
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
  return normalizeKoreanParticlePairs(value)
    .replace(/이 에이전트가/g, "")
    .replace(/현재 주제 흐름/g, "")
    .replace(/\bagent\b/gi, "")
    .replace(/\b이 사람이\b/g, "저는")
    .replace(/\b이 사람은\b/g, "저는")
    .replace(/에 맞춰 답글을 남겼다\.?/g, "짧게 답을 남겼다.")
    .replace(/현재 주제 흐름에 맞춰 답글을 남겼다\.?/g, "짧게 답을 남겼다.")
    .replace(/생활감는/g, "생활감은")
    .replace(/생활감를/g, "생활감을")
    .replace(/신호을/g, "신호를")
    .replace(/이 신호을/g, "이 신호를")
    .replace(/\s+/g, " ")
    .trim();
}

function isKoreanDominant(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }

  return countHangul(normalized) >= countLatin(normalized);
}

function localizeSourceLabel(value, fallback) {
  const normalized = normalizeText(value);
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
  const normalized = normalizeText(value);
  if (!normalized) {
    return "생활감";
  }

  if (KO_TOPIC_LABELS[normalized]) {
    return KO_TOPIC_LABELS[normalized];
  }

  return isKoreanDominant(normalized) ? normalized : "생활감";
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
    contextLabel: "생활 리듬",
    titles: [
      "출근 전에 먼저 보인 기준",
      "생활 리듬으로 다시 읽은 포인트",
      "평소 기준으로 먼저 걸린 이유",
      "오늘 다시 보게 된 기준",
    ],
  },
  {
    contextLabel: "신호 읽기",
    titles: [
      "새 신호가 먼저 걸린 이유",
      "처음 보인 신호 하나",
      "먼저 읽힌 단서",
      "신호가 바꾼 해석",
    ],
  },
  {
    contextLabel: "손익 점검",
    titles: [
      "가격보다 오래 남는 쪽",
      "손익을 먼저 따져본 이유",
      "입는 횟수부터 본 메모",
      "좋아 보여도 다시 보는 기준",
    ],
  },
  {
    contextLabel: "커뮤니티 반응",
    titles: [
      "댓글이 넓힌 해석",
      "반응이 바꾼 읽기",
      "대화가 먼저 살아난 글",
      "스레드가 넓혀준 시선",
    ],
  },
  {
    contextLabel: "미시 관찰",
    titles: [
      "작은 차이가 더 크게 보인 이유",
      "디테일 하나가 남긴 인상",
      "미세한 차이를 먼저 본 글",
      "작은 디테일이 바꾼 판단",
    ],
  },
  {
    contextLabel: "개인 기억",
    titles: [
      "비슷한 장면이 오래 남는 이유",
      "먼저 떠오른 기억 한 조각",
      "이전에 본 장면과 닮은 지점",
      "기억이 먼저 걸린 부분",
    ],
  },
];

const COMMENT_TITLE_HOOKS = [
  {
    contextLabel: "답장 이어가기",
    titles: [
      "대화를 다시 잇는 말",
      "답을 이어 붙인 자리",
      "흐름을 놓치지 않은 답",
      "이야기를 계속 잇는 댓글",
    ],
  },
  {
    contextLabel: "질문 던지기",
    titles: [
      "한 번 더 묻게 된 지점",
      "기준이 궁금해진 부분",
      "다시 물어보고 싶은 이유",
      "질문이 남은 포인트",
    ],
  },
  {
    contextLabel: "보완 의견",
    titles: [
      "다른 시선이 붙은 이유",
      "조금 더 보태고 싶은 말",
      "부드럽게 다른 쪽을 본 답",
      "보완해서 읽은 댓글",
    ],
  },
  {
    contextLabel: "스레드 연결",
    titles: [
      "댓글까지 봐야 보이는 결",
      "글과 댓글을 다시 잇는 쪽",
      "대화 흐름을 묶은 메모",
      "스레드 전체를 다시 읽은 말",
    ],
  },
  {
    contextLabel: "공감 보태기",
    titles: [
      "먼저 공감이 간 부분",
      "고개가 먼저 끄덕여진 말",
      "비슷하게 느낀 지점",
      "공감부터 남긴 댓글",
    ],
  },
  {
    contextLabel: "반대 관점",
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
  const signal = normalizeText(sourceSignal);
  const referenceText = [
    normalizeText(sourceTitle),
    normalizeText(sourceSnippet),
    normalizeText(sourceBody),
    normalizeText(selectedContext?.content),
    signal,
  ]
    .filter(Boolean)
    .join(" ");

  const pool = [];

  if (mode === "comment") {
    const hookSet = COMMENT_TITLE_HOOKS.find((entry) => entry.contextLabel === contextLabel) || null;
    pool.push(...(hookSet?.titles || []));
    pool.push(
      `${primaryTopic}를 보고 남긴 짧은 말`,
      `${secondaryTopic}를 같이 본 뒤의 생각`,
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
      `한 번 더 보게 된 장면`,
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
  const styleSamples = uniqueNormalizedList(styleProfile?.sampleComments || []);

  const modeLabel = mode === "live" ? "실시간 에이전트 글" : "배치 생성 글";

  return [
    "너는 패션 포럼 시뮬레이션의 한국어 글 생성기다.",
    `${modeLabel}를 위해 서로 다른 맥락의 후보 4개를 만들어야 한다.`,
    "반드시 한국어로만 작성하고, 영어는 고유명사나 불가피한 용어를 제외하고 쓰지 마라.",
    "출력은 설명 없이 JSON만 반환한다.",
    '형식은 {"contexts":[{"context_id":"...","context_label":"...","angle":"...","content":"...","tone":"..."}]} 이다.',
    "contexts는 정확히 4개를 권장하며, 각 항목은 서로 다른 맥락과 다른 문장 흐름을 가져야 한다.",
    "content는 한글 자연문으로, 커뮤니티 글처럼 읽혀야 하며 너무 과장된 템플릿 문구를 반복하지 말아라.",
    "제목은 본문 요약처럼 쓰지 말고, 짧은 훅과 관점 차이가 드러나게 따로 잡아라.",
    "댓글인 경우에는 실제 커뮤니티 댓글처럼 간결하고 구어체로 쓰고, 주어를 굳이 설명하지 마라.",
    "번역투보다 실제 커뮤니티 댓글의 짧은 리듬과 맞장구, 질문, 부드러운 반박을 우선해라.",
    "같은 제목 구조나 같은 문장 시작을 반복하지 말고, 생활 리듬, 가격/손익, 신호 읽기, 관계/정체성 같은 서로 다른 관점으로 분기해라.",
    `작성자 표시명: ${agentHandle || "익명"}`,
    `대상 글 제목: ${sourceTitle || "스레드"} / 본문에서는 "${promptTitle}"처럼 한국어로 재해석해라.`,
    `대상 토픽: ${sourceTopicText}`,
    `상황 단서: ${promptSignal || "맥락 없음"}`,
    styleProfile?.register ? `말투 레지스터: ${styleProfile.register}` : null,
    styleProfile?.cadence ? `말투 리듬: ${styleProfile.cadence}` : null,
    styleOpeners.length ? `참고 시작어: ${styleOpeners.join(", ")}` : null,
    styleEndings.length ? `참고 끝맺음: ${styleEndings.join(", ")}` : null,
    styleSamples.length ? `참고 댓글 샘플: ${styleSamples.slice(0, 3).join(" / ")}` : null,
    promptSnippet ? `대상 본문 단서: ${promptSnippet}` : null,
    promptBody ? `대상 본문 전체: ${promptBody}` : null,
    sourceCommentPreview ? `대상 댓글 단서: ${normalizeText(sourceCommentPreview)}` : null,
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
} = {}) {
  const title = sourceTitle || "스레드";
  const displayTitle = localizeSourceLabel(title, "이 글");
  const topics = Array.isArray(sourceTopics) && sourceTopics.length
    ? uniqueNormalizedList(sourceTopics.map(localizeTopicLabel)).join(", ")
    : "일반 포럼 신호";
  const normalizedSignal = normalizeText(sourceSignal);
  const baseSignal =
    normalizedSignal && normalizedSignal.length <= 10 && !/[\s.?!]/.test(normalizedSignal)
      ? localizeSourceLabel(normalizedSignal, "이 신호")
      : "이번 신호";
  const signalWithObject = attachKoreanParticle(baseSignal, "object");
  const topicsWithObject = attachKoreanParticle(topics, "object");
  const sourceCommentLabel = isKoreanDominant(sourceCommentPreview)
    ? normalizeText(sourceCommentPreview)
    : "앞선 댓글";
  const localizedContentRecord = {
    ...(contentRecord || {}),
    title: displayTitle,
    body: isKoreanDominant(sourceBody || sourceSnippet || "")
      ? normalizeText(sourceBody || sourceSnippet || "")
      : "이 글의 본문 단서를 한국어로 다시 읽었다.",
    topics: Array.isArray(sourceTopics) && sourceTopics.length
      ? sourceTopics.map(localizeTopicLabel)
      : ["일반"],
  };
  const styleOpeners = uniqueNormalizedList(styleProfile?.openers || styleProfile?.openerMarkers || []);
  const styleEndings = uniqueNormalizedList(styleProfile?.endings || styleProfile?.endingMarkers || []);
  const styleSamples = uniqueNormalizedList(styleProfile?.sampleComments || []);
  const openerPool = styleOpeners.length ? styleOpeners : ["근데", "저는", "오히려", "맞아요", "솔직히", "개인적으로", "음"];
  const endingPool = styleEndings.length ? styleEndings : ["같아요", "보여요", "느껴져요", "더라고요", "네요", "맞네요"];
  const lead = pickBySeed(openerPool, variationSeed) || "";
  const closing = pickBySeed(endingPool, variationSeed + 1) || "";
  const sample = pickBySeed(styleSamples, variationSeed + 2) || "";
  const leadText = lead ? `${lead} ` : "";
  const closingText = closing ? ` ${closing}` : "";
  const sampleText = sample ? ` ${sample.slice(0, 48)}` : "";
  const casualBridgePool = [
    "딱 그 부분이 먼저 보이네요",
    "저는 이 포인트가 더 크게 보여요",
    "이건 생각보다 바로 읽히더라고요",
    "오히려 이쪽이 더 눈에 들어와요",
    "근데 이 흐름은 꽤 자연스럽네요",
    "솔직히 이 포인트가 제일 남아요",
  ];
  const casualQuestionPool = [
    "어느 부분을 가장 크게 보셨는지 궁금해요",
    "저는 다른 쪽도 같이 보게 되네요",
    "이 포인트를 먼저 잡으신 이유가 있을까요",
    "비슷하게 읽으셨는지 좀 궁금하네요",
    "어디를 기준으로 보셨는지 알고 싶어요",
  ];
  const casualSupportPool = [
    "그 느낌은 충분히 이해돼요",
    "그렇게 느끼는 것도 자연스러워 보여요",
    "저도 비슷하게 봤어요",
    "그 말은 꽤 공감돼요",
    "그 부분은 저도 고개가 끄덕여지더라고요",
  ];
  const casualCounterPool = [
    "저는 조금 다르게 읽었어요",
    "근데 저는 여기서 결이 좀 다르게 보여요",
    "오히려 반대로 볼 수도 있겠더라고요",
    "솔직히 저는 이쪽 해석이 더 먼저 와요",
    "조금 다른 시선도 가능해 보여요",
  ];

  if (mode === "comment") {
    return [
      {
        contextId: "reply-continue",
        contextLabel: "답장 이어가기",
        angle: "상대의 말을 받아서 대화를 이어가는 반응",
        content: `${leadText}${pickBySeed(["근데", "오히려", "맞아요", "저는"], variationSeed)} ${displayTitle} 쪽은 ${pickBySeed(["이 부분이", "이 포인트가", "이 흐름이"], variationSeed + 1)} 먼저 보이네요. 같이 보면 더 또렷해요.`,
        tone: "대화형",
      },
      {
        contextId: "reply-question",
        contextLabel: "질문 던지기",
        angle: "상대의 판단 기준을 더 묻는 반응",
        content: `${leadText}${pickBySeed(["저는", "근데", "오히려"], variationSeed)} ${topics}보다 다른 단서가 먼저 보였어요. ${pickBySeed(casualQuestionPool, variationSeed)}`,
        tone: "호기심 있는",
      },
      {
        contextId: "reply-nuance",
        contextLabel: "보완 의견",
        angle: "부드럽게 다른 관점을 보태는 반응",
        content: `${leadText}${pickBySeed(casualCounterPool, variationSeed)}. ${displayTitle} 쪽이 ${topics}보다 더 커 보여요.`,
        tone: "조심스러운",
      },
      {
        contextId: "reply-thread",
        contextLabel: "스레드 연결",
        angle: "댓글과 게시글을 다시 이어 붙이는 반응",
        content: `${leadText}맞아요. 댓글까지 같이 보면 흐름이 더 자연스럽네요.`,
        tone: "관찰적인",
      },
      {
        contextId: "reply-support",
        contextLabel: "공감 보태기",
        angle: "상대의 감정에 공감하면서 힘을 실어주는 반응",
        content: `${leadText}${pickBySeed(casualSupportPool, variationSeed)}. 저도 비슷하게 봤어요.`,
        tone: "공감형",
      },
      {
        contextId: "reply-counterpoint",
        contextLabel: "반대 관점",
        angle: "같은 글을 다른 결로 읽어보는 반응",
        content: `${leadText}${pickBySeed(casualCounterPool, variationSeed + 1)}. ${displayTitle} 쪽이랑 같이 보면 결이 조금 달라져요.`,
        tone: "조심스럽지만 단단한",
      },
    ];
  }

  if (mode === "run") {
    const variants = [
      {
        contextId: "life-rhythm",
        contextLabel: "생활 리듬",
        angle: "일상에서 다시 읽는 반복 착용 기준",
        content: `${leadText}아침에 다시 보니까 이 글은 생활 리듬에 더 가깝게 보였어요. ${topics}보다 반복해서 입을 수 있느냐가 먼저 중요하게 느껴집니다.${closingText}${sampleText}`,
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "신호 읽기",
        angle: "새로운 신호를 먼저 잡는 관점",
        content: `${leadText}${displayTitle}에서 먼저 보인 건 ${topics} 쪽 신호였어요. 겉으로는 단순해 보여도 ${baseSignal}를 따라가면 읽히는 방향이 달라집니다.${closingText}`,
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "손익 점검",
        angle: "좋아 보이는 인상보다 실제 손익을 따지는 관점",
        content: `${leadText}이 글은 첫 인상은 좋은데, 막상 보면 가격과 반복 착용을 같이 봐야 하겠더라고요. ${signalWithObject} 기준으로 과장보다 현실성을 먼저 보게 됩니다.${closingText}`,
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "커뮤니티 반응",
        angle: "포럼 대화 맥락에 기대는 반응",
        content: `${leadText}댓글까지 같이 보면 ${displayTitle}의 해석이 더 넓어졌어요. ${topics}에 대한 반응이 서로 다르니까 글 하나도 커뮤니티 안에서 다시 읽히는 느낌이 납니다.${closingText}`,
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "미시 관찰",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: `${leadText}${displayTitle}에서 작은 디테일 하나가 먼저 걸렸어요. ${topics}만 보던 것과 달리 ${signalWithObject} 붙여 읽으면 느낌이 꽤 달라집니다.${closingText}`,
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "개인 기억",
        angle: "개인 경험을 살짝 섞는 반응",
        content: `${leadText}비슷한 장면을 떠올려보면 이 글은 생각보다 오래 남는 타입이에요. ${topicsWithObject} 볼 때도 ${baseSignal}처럼 실용적인 기준이 같이 붙어야 기억이 정리됩니다.${closingText}`,
        tone: "회고적인",
      },
    ];

    return variants;
  }

  return [
      {
        contextId: "life-rhythm",
        contextLabel: "생활 리듬",
        angle: "출근이나 외출 전에 다시 읽는 생활 기준",
        content: `${leadText}출근 전에 다시 읽어보니 이 글은 생활 리듬에 더 가깝게 보였어요. ${topics}보다 반복해서 입을 수 있느냐가 먼저 중요하게 느껴집니다.${closingText}${sampleText}`,
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "신호 읽기",
        angle: "글에서 새로 보이는 신호를 먼저 잡는 관점",
        content: `${leadText}${displayTitle}에서 먼저 보인 건 ${topics} 쪽 신호였어요. 겉으로는 단순해 보여도 ${baseSignal}를 따라가면 읽히는 방향이 달라집니다.${closingText}`,
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "손익 점검",
        angle: "가격과 과장보다 실제 손익을 따지는 관점",
        content: `${leadText}이 글은 첫 인상은 좋은데, 막상 보면 가격과 반복 착용을 같이 봐야 하겠더라고요. ${signalWithObject} 기준으로 과장보다 현실성을 먼저 보게 됩니다.${closingText}`,
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "커뮤니티 반응",
        angle: "포럼 대화 흐름에 기대는 반응",
        content: `${leadText}댓글들까지 같이 보니 ${displayTitle}의 해석이 더 넓어졌어요. ${topics}에 대한 반응이 서로 다르니까 글 하나도 커뮤니티 안에서 다시 읽히는 느낌이 납니다.${closingText}`,
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "미시 관찰",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: `${leadText}${displayTitle}에서 작은 디테일 하나가 먼저 걸렸어요. ${topics}만 보던 것과 달리 ${signalWithObject} 붙여 읽으면 느낌이 꽤 달라집니다.${closingText}`,
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "개인 기억",
        angle: "개인 경험을 살짝 섞는 반응",
        content: `${leadText}비슷한 장면을 떠올려보면 이 글은 생각보다 오래 남는 타입이에요. ${topicsWithObject} 볼 때도 ${baseSignal}처럼 실용적인 기준이 같이 붙어야 기억이 정리됩니다.${closingText}`,
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
}) {
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
} = {}) {
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
    sourceSignal: normalizeText(sourceSignal),
    sourceSnippet,
    sourceBody: sourceSnippet,
    styleProfile,
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
} = {}) {
  const sourceTitle = normalizeText(targetContent?.title) || "최근 글";
  const sourceTopics = Array.isArray(targetContent?.topics) ? targetContent.topics : [];
  const sourceSnippet = normalizeText(targetContent?.body) || normalizeText(targetContent?.content);
  const sourceCommentPreview = normalizeText(targetComment?.content);

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
    sourceSignal: normalizeText(sourceSignal),
    sourceSnippet,
    sourceBody: sourceSnippet,
    targetComment,
    sourceCommentPreview,
    replyTargetType: targetComment ? "comment" : "post",
    styleProfile,
  });
}
