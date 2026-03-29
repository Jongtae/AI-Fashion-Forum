import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
  createStateSnapshot,
} from "@ai-fashion-forum/shared-types";

import { createSprint1SharedStimulusSample } from "./content-indexing.js";
import { createMemoryRuntime, rememberSprint1Reaction } from "./memory-stack.js";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function deriveRelationshipState(author, targetAgent) {
  const baseTrust = Math.min(0.9, 0.2 + (author.relationship_summary.trust_circle_size || 0) * 0.08);
  const hostility = clamp((author.relationship_summary.rivalry_edges || 0) * 0.12);
  const alignment = clamp(
    Object.keys(author.belief_vector).some((key) => key in targetAgent.belief_vector) ? 0.62 : 0.38,
  );

  return {
    trust: clamp(baseTrust),
    hostility,
    alignment,
    fatigue: clamp((author.relationship_summary.repeated_repliers || 0) * 0.07),
  };
}

function getTone(relationshipState) {
  if (relationshipState.hostility >= 0.55) {
    return "sharp";
  }

  if (relationshipState.trust >= 0.65) {
    return "warm";
  }

  if (relationshipState.alignment >= 0.6) {
    return "steady";
  }

  return "guarded";
}

function pickVariant(variants = [], seed = 0) {
  if (!variants.length) {
    return "";
  }

  const index = Math.abs(Number(seed) || 0) % variants.length;
  return variants[index];
}

function getToneLabel(tone) {
  return {
    sharp: "날카로운",
    warm: "따뜻한",
    steady: "차분한",
    guarded: "조심스러운",
  }[tone] || "차분한";
}

function getArtifactTypeLabel(type) {
  return {
    comment: "댓글",
    quote: "인용",
    post: "새 글",
  }[type] || "글";
}

function summarizeContentRecord(contentRecord = {}) {
  const title = contentRecord.title || "스레드";
  const topics = Array.isArray(contentRecord.topics) && contentRecord.topics.length
    ? contentRecord.topics.join(", ")
    : "일반 포럼 신호";
  const body = typeof contentRecord.body === "string" ? contentRecord.body.trim() : "";
  const content = typeof contentRecord.content === "string" ? contentRecord.content.trim() : "";
  const text = body || content;
  const bodySnippet = body ? body.split(/(?<=[.!?])\s+/)[0].slice(0, 160) : "";

  return {
    title,
    topics,
    text,
    bodySnippet,
  };
}

function summarizeCommentRecord(commentRecord = {}) {
  const authorId = commentRecord?.authorId || "someone";
  const text = typeof commentRecord?.content === "string" ? commentRecord.content.trim() : "";
  const snippet = text ? text.split(/(?<=[.!?])\s+/)[0].slice(0, 160) : "그 포인트";

  return {
    authorId,
    text,
    snippet,
  };
}

export function getForumArtifactText(artifact, fallback = "") {
  if (artifact && typeof artifact === "object") {
    const candidates = [artifact.body, artifact.content, artifact.text];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }
  }

  return typeof fallback === "string" ? fallback : "";
}

export function generateForumArtifact({
  actionRecord,
  author,
  targetContent,
  targetAgent,
  targetComment = null,
} = {}) {
  const relationshipState = deriveRelationshipState(author, targetAgent);
  const tone = getTone(relationshipState);
  const identityAnchor = Object.keys(author.belief_vector)[0] || "style-choice";
  const targetSummary = summarizeContentRecord(targetContent);
  const commentSummary = summarizeCommentRecord(targetComment);

  const replyVariants = targetComment
    ? [
        `${author.handle}가 @${commentSummary.authorId}의 말을 받아 ${getToneLabel(tone)} 톤으로 답글을 남기며 ${identityAnchor}를 다시 중심에 둔다.`,
        `@${commentSummary.authorId}의 요점을 이어받아 ${author.handle}가 ${getToneLabel(tone)} 톤으로 응답하고, 대화를 ${identityAnchor} 쪽으로 다시 묶는다.`,
        `${author.handle}가 @${commentSummary.authorId}의 댓글을 따라 ${getToneLabel(tone)} 톤으로 덧답을 남기고, "${commentSummary.snippet}"를 다시 꺼낸다.`,
      ]
    : [
        `게시글을 따라 ${author.handle}가 ${getToneLabel(tone)} 톤으로 답글을 남기며 ${identityAnchor}를 중심에 둔다.`,
        `이 글의 ${targetSummary.topics} 흐름을 따라 ${author.handle}가 ${getToneLabel(tone)} 톤으로 응답하고 ${identityAnchor}에 무게를 둔다.`,
        `${author.handle}가 스레드에 ${getToneLabel(tone)} 톤으로 끼어들며 "${targetSummary.bodySnippet || targetSummary.title}"를 다시 읽어낸다.`,
      ];

  const postTemplates = {
    quote: `${author.handle}가 스레드를 인용해 ${getToneLabel(tone)}하게 다시 쓰며 ${identityAnchor}로 재해석한다.`,
    post: `${author.handle}가 ${targetSummary.topics}를 보고 ${getToneLabel(tone)} 톤의 새 글을 연다.`,
  };

  const artifactType = ["comment", "quote", "post"].includes(actionRecord.type)
    ? actionRecord.type
    : "comment";
  const artifactTypeLabel = getArtifactTypeLabel(artifactType);

  return {
    artifact_id: `GEN:${author.agent_id}:${actionRecord.tick}:${artifactType}`,
    source_action_id: actionRecord.action_id,
    type: artifactType,
    tone,
    title: `${targetSummary.title} / ${artifactTypeLabel}`,
    body:
        artifactType === "comment"
        ? pickVariant(replyVariants, actionRecord.tick + author.agent_id.length)
        : postTemplates[artifactType],
    relationship_context: relationshipState,
    ui: {
      label: `${artifactTypeLabel} · ${getToneLabel(tone)} 톤`,
      secondaryText: targetSummary.title,
    },
  };
}

export function applyRelationshipUpdate({
  relationshipState,
  artifact,
} = {}) {
  const trustDelta = artifact.tone === "warm" ? 0.08 : artifact.tone === "sharp" ? -0.06 : 0.02;
  const hostilityDelta = artifact.tone === "sharp" ? 0.09 : -0.02;
  const alignmentDelta = artifact.tone === "steady" || artifact.tone === "warm" ? 0.05 : -0.01;
  const fatigueDelta = artifact.type === "quote" ? 0.07 : 0.03;

  return {
    before: relationshipState,
    after: {
      trust: clamp(relationshipState.trust + trustDelta),
      hostility: clamp(relationshipState.hostility + hostilityDelta),
      alignment: clamp(relationshipState.alignment + alignmentDelta),
      fatigue: clamp(relationshipState.fatigue + fatigueDelta),
    },
    deltas: {
      trust: trustDelta,
      hostility: hostilityDelta,
      alignment: alignmentDelta,
      fatigue: fatigueDelta,
    },
  };
}

export function createForumGenerationSample() {
  const author = SAMPLE_AGENT_STATES[1];
  const targetAgent = SAMPLE_AGENT_STATES[3];
  const targetContent = SAMPLE_CONTENT_RECORDS[13];
  const actionRecord = {
    action_id: "ACT:A02:30:comment",
    tick: 30,
    agent_id: author.agent_id,
    type: "comment",
    target_content_id: targetContent.content_id,
  };

  const artifact = generateForumArtifact({
    actionRecord,
    author,
    targetContent,
    targetAgent,
  });

  return {
    artifact,
    relationshipUpdate: applyRelationshipUpdate({
      relationshipState: artifact.relationship_context,
      artifact,
    }),
    neo4jSyncReady: true,
  };
}

export function buildSprint1PostTitle(updatedAgent, reactionRecord, variationSeed = 0) {
  const titles = {
    care_context: [
      "같은 글이어도 결국 남는 건 돌봄 문맥이라는 생각",
      "사소한 장면에서 사람 문맥이 먼저 보인 기록",
    ],
    signal_filter: [
      "다들 같은 글을 봐도 결국 신호를 읽는 방식이 갈린다고 느낌",
      "새 신호를 먼저 잡는 사람이 결국 기억에 남는 이유",
    ],
    tradeoff_filter: [
      "예쁘다는 말보다 먼저 가격 논리를 따져야 한다고 느낀 이유",
      "좋아 보이는 것보다 손익을 먼저 보는 쪽으로 기운 이유",
    ],
    practicality_filter: [
      "같은 장면인데도 결국 실생활 기준으로 다시 읽히는 포인트",
      "결국 오래 입을 수 있는지부터 보게 된 이유",
    ],
    context_filter: [
      "아직 결론보다 맥락이 더 중요하다고 느낀 기록",
      "조금 더 읽어봐야 결론이 나는 메모",
    ],
  };

  const options = titles[reactionRecord.meaning_frame] || titles.context_filter;
  return `${pickVariant(options, variationSeed)} / ${updatedAgent.handle}`;
}

export function buildSprint1PostBody(updatedAgent, reactionRecord, contentRecord, variationSeed = 0) {
  const narrative =
    updatedAgent.mutable_state?.self_narrative_summary ||
    updatedAgent.self_narrative?.slice(-1)[0] ||
    "";
  const contentSummary = summarizeContentRecord(contentRecord);

  const bodyOpeners = {
    care_context: [
      "같은 콘텐츠를 봐도 나는 결국 사람과 생활 문맥부터 읽게 된다.",
      "이번 글은 옷보다도 그 옷을 입는 생활 리듬이 먼저 보였다.",
    ],
    signal_filter: [
      "같은 콘텐츠를 봐도 내 눈엔 결국 누가 먼저 새 신호를 잡는지가 먼저 보인다.",
      "다들 보는 글인데도 나는 신호의 새로움부터 보게 된다.",
    ],
    tradeoff_filter: [
      "같은 콘텐츠를 봐도 나는 결국 가격과 과장된 신호부터 의심하게 된다.",
      "좋아 보이는 말보다 실제 손익부터 읽게 되는 글이었다.",
    ],
    practicality_filter: [
      "같은 콘텐츠를 봐도 실제로 반복해서 입을 수 있는지부터 계산하게 된다.",
      "옷의 분위기보다 먼저 반복 착용 가능성이 보였다.",
    ],
    context_filter: [
      "같은 콘텐츠를 봐도 아직은 맥락을 더 모으고 싶어진다.",
      "지금은 결론보다 주변 문맥을 더 읽고 싶은 글이었다.",
    ],
  };

  const closers = [
    `이번에 본 글은 "${contentSummary.title}"였고, 핵심 토픽은 ${contentSummary.topics}였다.`,
    contentSummary.bodySnippet
      ? `본문에서 특히 잡힌 부분은 "${contentSummary.bodySnippet}"였다.`
      : `이 글은 ${contentSummary.topics} 쪽 해석을 더 밀어줬다.`,
    `나는 이걸 ${reactionRecord.meaning_frame}로 받아들였고, 톤은 ${reactionRecord.stance_signal} 쪽으로 기울어 있다.`,
  ];

  const opener = pickVariant(bodyOpeners[reactionRecord.meaning_frame] || bodyOpeners.context_filter, variationSeed);
  const closer = pickVariant(closers, variationSeed + 2);

  return `${opener} ${narrative} ${closer}`;
}

export async function createSprint1ForumPostSample() {
  const sharedSample = await createSprint1SharedStimulusSample({
    agentIds: SAMPLE_AGENT_STATES.map((agent) => agent.agent_id),
  });
  const starterState = createStateSnapshot({
    agents: SAMPLE_AGENT_STATES,
    contents: [],
    nodes: [],
    relations: [],
  });
  const runtime = createMemoryRuntime({
    state: starterState,
  });

  const posts = sharedSample.reactions.map((reactionRecord, index) => {
    const writeResult = rememberSprint1Reaction(runtime, reactionRecord);
    const updatedAgent = writeResult?.updatedAgent || runtime.state.agents[index];

    return {
      post_id: `sprint1-post:${updatedAgent.agent_id}:${index + 1}`,
      agent_id: updatedAgent.agent_id,
      handle: updatedAgent.handle,
      source_content_id: sharedSample.content.content_id,
      source_reaction_id: reactionRecord.reaction_id,
      meaning_frame: reactionRecord.meaning_frame,
      stance_signal: reactionRecord.stance_signal,
      title: buildSprint1PostTitle(updatedAgent, reactionRecord),
      body: buildSprint1PostBody(updatedAgent, reactionRecord, sharedSample.content),
      trace: {
        dominant_feeling: reactionRecord.dominant_feeling,
        self_narrative_summary: updatedAgent.mutable_state?.self_narrative_summary || "",
        recent_arc: updatedAgent.mutable_state?.recent_arc || "stable",
      },
    };
  });

  return {
    shared_content: sharedSample.content,
    posts,
  };
}
