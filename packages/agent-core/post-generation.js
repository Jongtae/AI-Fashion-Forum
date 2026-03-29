import { buildSprint1PostBody, buildSprint1PostTitle } from "./forum-generation.js";

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
  const sourceCommentText = localizeSourceLabel(sourceCommentPreview, "이 답글 대상");
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
    const replyTarget = replyTargetType === "comment" ? "다른 댓글" : "게시글 본문";
    return [
      {
        contextId: "reply-continue",
        contextLabel: "답장 이어가기",
        angle: "상대의 말을 받아서 대화를 이어가는 반응",
        content: `${actorLabel}가 ${replyTarget}에 대한 반응을 이어가며 ${displayTitle}을/를 한국어 댓글로 정리한다. ${sourceCommentText}를 기준으로 대화의 흐름을 자연스럽게 잇는다.`,
        tone: "대화형",
      },
      {
        contextId: "reply-question",
        contextLabel: "질문 던지기",
        angle: "상대의 판단 기준을 더 묻는 반응",
        content: `${actorLabel}가 ${replyTarget}을/를 읽고 한 번 더 질문을 던진다. ${baseSignal}를 바탕으로 ${topics}를 더 확인하는 한국어 댓글을 남긴다.`,
        tone: "호기심 있는",
      },
      {
        contextId: "reply-nuance",
        contextLabel: "보완 의견",
        angle: "부드럽게 다른 관점을 보태는 반응",
        content: `${actorLabel}가 ${replyTarget}에 대해 조심스럽게 다른 시각을 더한다. ${displayTitle}에서 보인 ${topics} 신호를 다시 읽으며 균형 있게 의견을 붙인다.`,
        tone: "조심스러운",
      },
      {
        contextId: "reply-thread",
        contextLabel: "스레드 연결",
        angle: "댓글과 게시글을 다시 이어 붙이는 반응",
        content: `${actorLabel}가 ${replyTarget}와 ${displayTitle}을 함께 읽으며 스레드의 맥락을 더 넓힌다. ${baseSignal}을 중심으로 커뮤니티 대화를 다시 묶는다.`,
        tone: "관찰적인",
      },
    ];
  }

  if (mode === "run") {
    const variants = [
      {
        contextId: "life-rhythm",
        contextLabel: "생활 리듬",
        angle: "일상에서 다시 읽는 반복 착용 기준",
        content: `${buildSprint1PostTitle(
          { handle: agentHandle || "agent" },
          reactionRecord || { meaning_frame: "context_filter", stance_signal: "neutral" },
          variationSeed,
        )} ${buildSprint1PostBody(
          { handle: agentHandle || "agent", mutable_state: { self_narrative_summary: "" } },
          reactionRecord || { meaning_frame: "context_filter", stance_signal: "neutral" },
          localizedContentRecord,
          variationSeed,
        )}`,
        tone: "차분한",
      },
      {
        contextId: "signal-reading",
        contextLabel: "신호 읽기",
        angle: "새로운 신호를 먼저 잡는 관점",
        content: `${actorLabel}가 ${displayTitle}을/를 읽고 신호의 변화를 더 크게 보려는 한국어 메모를 남겼다. ${baseSignal}이라는 단서를 따라 맥락을 넓게 펼친다.`,
        tone: "관찰적인",
      },
      {
        contextId: "tradeoff-check",
        contextLabel: "손익 점검",
        angle: "좋아 보이는 인상보다 실제 손익을 따지는 관점",
        content: `${actorLabel}가 ${displayTitle}을/를 보며 가격, 반복 착용, 실용성 사이의 손익을 다시 계산한다. ${baseSignal}을 기준으로 과장보다 현실성을 먼저 점검한다.`,
        tone: "신중한",
      },
      {
        contextId: "community-reply",
        contextLabel: "커뮤니티 반응",
        angle: "포럼 대화 맥락에 기대는 반응",
        content: `${actorLabel}가 ${displayTitle}에 대해 다른 사람들의 반응을 함께 떠올리며 대화형 톤으로 글을 남긴다. ${topics} 흐름과 ${baseSignal}을 같이 읽어 자연스럽게 이어 붙인다.`,
        tone: "대화형",
      },
    ];

    return variants;
  }

  return [
    {
      contextId: "life-rhythm",
      contextLabel: "생활 리듬",
      angle: "출근이나 외출 전에 다시 읽는 생활 기준",
      content: `${actorLabel}가 ${displayTitle}을/를 보고 생활 속 실용 기준으로 다시 읽는다. ${baseSignal}을 바탕으로 ${topics}를 일상 문맥으로 풀어낸다.`,
      tone: "차분한",
    },
    {
      contextId: "signal-reading",
      contextLabel: "신호 읽기",
      angle: "글에서 새로 보이는 신호를 먼저 잡는 관점",
      content: `${actorLabel}가 ${displayTitle}에서 눈에 띄는 신호를 먼저 짚는다. ${baseSignal}과 ${topics}를 바탕으로 글의 방향을 한 번 더 넓게 설명한다.`,
      tone: "관찰적인",
    },
    {
      contextId: "tradeoff-check",
      contextLabel: "손익 점검",
      angle: "가격과 과장보다 실제 손익을 따지는 관점",
      content: `${actorLabel}가 ${displayTitle}을/를 보며 실용성과 손익을 먼저 따진다. ${baseSignal}을 기준으로 ${topics}의 의미를 현실적으로 정리한다.`,
      tone: "신중한",
    },
    {
      contextId: "community-reply",
      contextLabel: "커뮤니티 반응",
      angle: "포럼 대화 흐름에 기대는 반응",
      content: `${actorLabel}가 ${displayTitle}에 대해 대화하듯 반응한다. ${baseSignal}과 ${topics}를 함께 묶어서 커뮤니티 톤의 자연스러운 글로 남긴다.`,
      tone: "대화형",
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
  model = process.env.OPENAI_POST_CONTEXT_MODEL || "gpt-5",
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
