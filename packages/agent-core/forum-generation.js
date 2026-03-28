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

function buildRecentContext(agentState) {
  return agentState.self_narrative.slice(-2).join(" ");
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
} = {}) {
  const relationshipState = deriveRelationshipState(author, targetAgent);
  const tone = getTone(relationshipState);
  const recentContext = buildRecentContext(author);
  const identityAnchor = Object.keys(author.belief_vector)[0] || "style-choice";

  const bodyTemplates = {
    comment: `${author.handle} replies in a ${tone} tone, grounding the response in ${identityAnchor} while referring back to ${recentContext || "recent forum memory"}.`,
    quote: `${author.handle} quote-posts the thread in a ${tone} tone, reframing it through ${identityAnchor}.`,
    post: `${author.handle} starts a fresh thread in a ${tone} tone after recent exposure around ${targetContent.topics.join(", ")}.`,
  };

  const artifactType = ["comment", "quote", "post"].includes(actionRecord.type)
    ? actionRecord.type
    : "comment";

  return {
    artifact_id: `GEN:${author.agent_id}:${actionRecord.tick}:${artifactType}`,
    source_action_id: actionRecord.action_id,
    type: artifactType,
    tone,
    title: `${targetContent.title} / ${artifactType}`,
    body: bodyTemplates[artifactType],
    relationship_context: relationshipState,
    ui: {
      label: `${artifactType} in ${tone} tone`,
      secondaryText: targetContent.title,
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

export function buildSprint1PostTitle(updatedAgent, reactionRecord) {
  const titles = {
    care_context: "같은 글이어도 결국 남는 건 돌봄 문맥이라는 생각",
    signal_filter: "다들 같은 글을 봐도 결국 신호를 읽는 방식이 갈린다고 느낌",
    tradeoff_filter: "예쁘다는 말보다 먼저 가격 논리를 따져야 한다고 느낀 이유",
    practicality_filter: "같은 장면인데도 결국 실생활 기준으로 다시 읽히는 포인트",
    context_filter: "아직 결론보다 맥락이 더 중요하다고 느낀 기록",
  };

  return `${titles[reactionRecord.meaning_frame] || titles.context_filter} / ${updatedAgent.handle}`;
}

export function buildSprint1PostBody(updatedAgent, reactionRecord, contentRecord) {
  const narrative = updatedAgent.mutable_state?.self_narrative_summary || updatedAgent.self_narrative?.slice(-1)[0] || "";

  const bodyOpeners = {
    care_context: "같은 콘텐츠를 봐도 나는 결국 사람과 생활 문맥부터 읽게 된다.",
    signal_filter: "같은 콘텐츠를 봐도 내 눈엔 결국 누가 먼저 새 신호를 잡는지가 먼저 보인다.",
    tradeoff_filter: "같은 콘텐츠를 봐도 나는 결국 가격과 과장된 신호부터 의심하게 된다.",
    practicality_filter: "같은 콘텐츠를 봐도 실제로 반복해서 입을 수 있는지부터 계산하게 된다.",
    context_filter: "같은 콘텐츠를 봐도 아직은 맥락을 더 모으고 싶어진다.",
  };

  return `${bodyOpeners[reactionRecord.meaning_frame] || bodyOpeners.context_filter} ${narrative} 이번에 본 글은 "${contentRecord.title}"였고, 나는 이걸 ${reactionRecord.meaning_frame}로 받아들였다. 지금 톤은 ${reactionRecord.stance_signal} 쪽으로 기울어 있다.`;
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
