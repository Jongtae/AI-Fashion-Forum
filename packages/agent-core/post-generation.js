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

function countHangul(text) {
  return (text.match(/[가-힣]/g) || []).length;
}

function countLatin(text) {
  return (text.match(/[A-Za-z]/g) || []).length;
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
    return "일반";
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
} = {}) {
  const promptTitle = localizeSourceLabel(sourceTitle, "이 글");
  const sourceTopicText = Array.isArray(sourceTopics) && sourceTopics.length
    ? sourceTopics.map(localizeTopicLabel).join(", ")
    : "일반 포럼 신호";
  const promptSignal = localizeSourceLabel(sourceSignal, "이 신호");
  const promptSnippet = isKoreanDominant(sourceSnippet)
    ? normalizeText(sourceSnippet)
    : "이 본문 단서는 한국어로 재해석해라.";
  const promptBody = isKoreanDominant(sourceBody)
    ? normalizeText(sourceBody)
    : "원문 전체가 영어 단서라면 한국어 커뮤니티 문장으로 다시 써라.";

  const modeLabel = mode === "live" ? "실시간 에이전트 글" : "배치 생성 글";

  return [
    "너는 패션 포럼 시뮬레이션의 한국어 글 생성기다.",
    `${modeLabel}를 위해 서로 다른 맥락의 후보 4개를 만들어야 한다.`,
    "반드시 한국어로만 작성하고, 영어는 고유명사나 불가피한 용어를 제외하고 쓰지 마라.",
    "출력은 설명 없이 JSON만 반환한다.",
    '형식은 {"contexts":[{"context_id":"...","context_label":"...","angle":"...","content":"...","tone":"..."}]} 이다.',
    "contexts는 정확히 4개를 권장하며, 각 항목은 서로 다른 맥락과 다른 문장 흐름을 가져야 한다.",
    "content는 한글 자연문으로, 커뮤니티 글처럼 읽혀야 하며 너무 과장된 템플릿 문구를 반복하지 말아라.",
    "댓글인 경우에는 실제 커뮤니티 댓글처럼 간결하고 구어체로 쓰고, '이 에이전트가' 같은 메타 설명은 쓰지 마라.",
    "같은 제목 구조나 같은 문장 시작을 반복하지 말고, 생활 리듬, 가격/손익, 신호 읽기, 관계/정체성 같은 서로 다른 관점으로 분기해라.",
    `작성자: ${agentHandle || "agent"}`,
    `대상 글 제목: ${sourceTitle || "스레드"} / 본문에서는 "${promptTitle}"처럼 한국어로 재해석해라.`,
    `대상 토픽: ${sourceTopicText}`,
    `상황 단서: ${promptSignal || "맥락 없음"}`,
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
} = {}) {
  const title = sourceTitle || "스레드";
  const displayTitle = localizeSourceLabel(title, "이 글");
  const topics = Array.isArray(sourceTopics) && sourceTopics.length
    ? sourceTopics.map(localizeTopicLabel).join(", ")
    : "일반 포럼 신호";
  const baseSignal = localizeSourceLabel(sourceSignal, "이 신호");
  const actorLabel = "이 에이전트";
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

  if (mode === "comment") {
    const replyTargetLabel = replyTargetType === "comment" ? "다른 댓글" : "게시글 본문";
    return [
      {
        contextId: "reply-continue",
        contextLabel: "답장 이어가기",
        angle: "상대의 말을 받아서 대화를 이어가는 반응",
        content: `앞선 말에 덧붙이면 ${replyTargetLabel} 흐름이 꽤 중요해 보여요. ${displayTitle}에서 읽힌 ${topics} 신호를 같이 보면 대화가 자연스럽게 이어집니다. ${sourceCommentLabel}을 다시 읽고 나서 한 번 더 정리해봤어요.`,
        tone: "대화형",
      },
      {
        contextId: "reply-question",
        contextLabel: "질문 던지기",
        angle: "상대의 판단 기준을 더 묻는 반응",
        content: `궁금한 건 ${baseSignal}를 보실 때 ${topics} 중 어디를 가장 크게 보셨는지예요. 저는 다른 단서도 같이 보고 있어서 기준이 조금 달라질 수 있겠다고 느꼈습니다.`,
        tone: "호기심 있는",
      },
      {
        contextId: "reply-nuance",
        contextLabel: "보완 의견",
        angle: "부드럽게 다른 관점을 보태는 반응",
        content: `조금 다르게 읽으면 ${displayTitle}의 ${topics} 신호가 더 핵심일 수 있어요. ${replyTargetLabel}만 봤을 때보다 전체 흐름을 같이 보면 해석이 달라집니다. 너무 한쪽으로만 읽히지 않게 보완해보고 싶었어요.`,
        tone: "조심스러운",
      },
      {
        contextId: "reply-thread",
        contextLabel: "스레드 연결",
        angle: "댓글과 게시글을 다시 이어 붙이는 반응",
        content: `다른 댓글과 글을 함께 놓고 보면 ${displayTitle}의 방향이 더 또렷해져요. ${baseSignal}을 중심으로 보면 커뮤니티 대화가 자연스럽게 이어집니다. 앞선 맥락까지 합쳐야 전체가 보이더라고요.`,
        tone: "관찰적인",
      },
      {
        contextId: "reply-support",
        contextLabel: "공감 보태기",
        angle: "상대의 감정에 공감하면서 힘을 실어주는 반응",
        content: `그 느낌은 충분히 이해돼요. ${displayTitle}에서 읽힌 ${topics} 신호는 실제로 오래 남는 편이라서, ${replyTargetLabel}의 반응도 자연스럽게 이어질 수 있다고 봤어요.`,
        tone: "공감형",
      },
      {
        contextId: "reply-counterpoint",
        contextLabel: "반대 관점",
        angle: "같은 글을 다른 결로 읽어보는 반응",
        content: `저는 같은 글을 조금 다르게 읽었어요. ${displayTitle}의 ${topics}는 분명 눈에 띄지만, ${baseSignal}를 같이 보면 결론이 조금 달라질 수 있습니다.`,
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
        content: `아침에 다시 보니 ${displayTitle}은(는) 생활 리듬에 더 가깝게 보였어요. ${topics}는 과한 설명보다 반복해서 입을 수 있느냐가 더 중요하게 느껴집니다. ${baseSignal}를 바탕으로 오늘의 기준을 다시 정리해봤습니다.`,
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "신호 읽기",
        angle: "새로운 신호를 먼저 잡는 관점",
        content: `눈에 먼저 들어온 건 ${displayTitle}의 ${topics} 쪽 신호였어요. 겉으로는 단순해 보여도 ${baseSignal}를 따라가면 읽히는 방향이 달라집니다. 신호를 먼저 잡는 쪽으로 생각이 조금 기울었습니다.`,
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "손익 점검",
        angle: "좋아 보이는 인상보다 실제 손익을 따지는 관점",
        content: `${displayTitle}은(는) 첫 인상은 좋은데, 막상 보면 가격과 반복 착용을 같이 봐야 하겠더라고요. ${baseSignal}을 기준으로 과장보다 현실성을 먼저 점검하는 편이 더 맞습니다. 결국 손익이 남는지부터 보게 됩니다.`,
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "커뮤니티 반응",
        angle: "포럼 대화 맥락에 기대는 반응",
        content: `댓글까지 같이 보면 ${displayTitle}의 해석이 더 넓어졌어요. ${topics}에 대한 반응이 서로 다르니까 글 하나도 커뮤니티 안에서 다시 읽히는 느낌이 납니다. ${baseSignal}을 함께 놓고 보면 더 자연스럽습니다.`,
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "미시 관찰",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: `${displayTitle}에서 작은 디테일 하나가 먼저 걸렸어요. ${topics}만 보던 것과 달리 ${baseSignal}를 붙여 읽으면 느낌이 꽤 달라집니다. 저는 이런 작은 차이가 제일 오래 남는다고 봐요.`,
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "개인 기억",
        angle: "개인 경험을 살짝 섞는 반응",
        content: `비슷한 장면을 떠올려보면 ${displayTitle}은(는) 생각보다 오래 남는 타입이에요. ${topics}를 볼 때도 ${baseSignal}처럼 실용적인 기준이 같이 붙어야 기억이 정리됩니다. 저도 이런 방식이 더 편하더라고요.`,
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
        content: `출근 전에 다시 읽어보니 ${displayTitle}은(는) 생활 리듬에 더 가깝게 보였어요. ${topics}는 과한 설명보다 반복해서 입을 수 있느냐가 더 중요하게 느껴집니다. ${baseSignal}를 바탕으로 오늘의 기준을 다시 정리해봤습니다.`,
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "신호 읽기",
        angle: "글에서 새로 보이는 신호를 먼저 잡는 관점",
        content: `${displayTitle}에서 제일 먼저 보인 건 ${topics} 쪽 신호였어요. 겉으로는 단순해 보여도 ${baseSignal}를 따라가면 읽히는 방향이 달라집니다. 신호를 먼저 잡는 쪽으로 생각이 조금 기울었습니다.`,
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "손익 점검",
        angle: "가격과 과장보다 실제 손익을 따지는 관점",
        content: `${displayTitle}은(는) 첫 인상은 좋은데, 막상 보면 가격과 반복 착용을 같이 봐야 하겠더라고요. ${baseSignal}을 기준으로 과장보다 현실성을 먼저 점검하는 편이 더 맞습니다. 결국 손익이 남는지부터 보게 됩니다.`,
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "커뮤니티 반응",
        angle: "포럼 대화 흐름에 기대는 반응",
        content: `댓글들까지 같이 보니 ${displayTitle}의 해석이 더 넓어졌어요. ${topics}에 대한 반응이 서로 다르니까 글 하나도 커뮤니티 안에서 다시 읽히는 느낌이 납니다. ${baseSignal}을 함께 놓고 보면 더 자연스럽습니다.`,
        tone: "대화형",
      },
      {
        contextId: "micro-observation",
        contextLabel: "미시 관찰",
        angle: "작은 디테일을 먼저 짚는 관점",
        content: `${displayTitle}에서 작은 디테일 하나가 먼저 걸렸어요. ${topics}만 보던 것과 달리 ${baseSignal}를 붙여 읽으면 느낌이 꽤 달라집니다. 저는 이런 작은 차이가 제일 오래 남는다고 봐요.`,
        tone: "세심한",
      },
      {
        contextId: "personal-memory",
        contextLabel: "개인 기억",
        angle: "개인 경험을 살짝 섞는 반응",
        content: `비슷한 장면을 떠올려보면 ${displayTitle}은(는) 생각보다 오래 남는 타입이에요. ${topics}를 볼 때도 ${baseSignal}처럼 실용적인 기준이 같이 붙어야 기억이 정리됩니다. 저도 이런 방식이 더 편하더라고요.`,
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
} = {}) {
  const fallbackPool = buildFallbackContexts({
    mode,
    agentHandle,
    sourceTitle,
    sourceTopics,
    sourceSignal,
    sourceSnippet,
    sourceBody,
    sourceCommentPreview,
    replyTargetType,
    variationSeed,
    reactionRecord,
    contentRecord,
  });

  if (!apiKey) {
    const selectedFallback = selectContext(fallbackPool, variationSeed) || fallbackPool[0];
    return {
      content: selectedFallback?.content || "",
      generationContext: buildGenerationContext({
        source: "fallback",
        selectedContext: selectedFallback,
        sourceTitle,
        sourceTopics,
        sourceSnippet,
        sourceSignal,
        sourceCommentPreview,
        replyTargetType,
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
      const selected = selectContext(contexts, variationSeed);
      return {
        content: selected?.content || fallbackPool[0]?.content || "",
        generationContext: buildGenerationContext({
          source: "openai",
          selectedContext: selected,
          sourceTitle,
          sourceTopics,
          sourceSnippet,
          sourceSignal,
          sourceCommentPreview,
          replyTargetType,
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

  const selectedFallback = selectContext(fallbackPool, variationSeed) || fallbackPool[0];
  return {
    content: selectedFallback?.content || "",
    generationContext: buildGenerationContext({
      source: "fallback",
      selectedContext: selectedFallback,
      sourceTitle,
      sourceTopics,
      sourceSnippet,
      sourceSignal,
      sourceCommentPreview,
      replyTargetType,
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
  variationSeed = 0,
  apiKey,
  model,
  fetchImpl,
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
    agentHandle: updatedAgent?.handle || "agent",
    sourceTitle,
    sourceTopics,
    sourceSignal,
    sourceSnippet,
    sourceBody: sourceSnippet,
    reactionRecord,
    contentRecord,
  });
}

export async function createLivePostDraft({
  agent,
  targetContent,
  sourceSignal,
  variationSeed = 0,
  apiKey,
  model,
  fetchImpl,
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
    agentHandle: agent?.handle || agent?.agent_id || "agent",
    sourceTitle,
    sourceTopics,
    sourceSignal: normalizeText(sourceSignal),
    sourceSnippet,
    sourceBody: sourceSnippet,
  });
}

export async function createLiveCommentDraft({
  agent,
  targetContent,
  targetComment = null,
  sourceSignal,
  variationSeed = 0,
  apiKey,
  model,
  fetchImpl,
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
    agentHandle: agent?.handle || agent?.agent_id || "agent",
    sourceTitle,
    sourceTopics,
    sourceSignal: normalizeText(sourceSignal),
    sourceSnippet,
    sourceBody: sourceSnippet,
    targetComment,
    sourceCommentPreview,
    replyTargetType: targetComment ? "comment" : "post",
  });
}
