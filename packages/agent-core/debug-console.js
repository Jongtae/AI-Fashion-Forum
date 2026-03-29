import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
  SAMPLE_STATE_SNAPSHOT,
} from "@ai-fashion-forum/shared-types";

import { chooseForumAction } from "./action-space.js";
import { generateForumArtifact } from "./forum-generation.js";
import { buildNeo4jSyncPayload } from "./graph-storage.js";
import {
  createMemoryRuntime,
  queryMemoryTimeline,
  rememberReplayEntry,
} from "./memory-stack.js";
import { applyModerationPolicies, MODERATION_POLICY_FLAGS } from "./meta-policy.js";
import { rankFeed, RANKING_EXPERIMENT_FLAGS } from "./ranking-core.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function scoreMemoryRelevance(memory, targetContent) {
  const topicHits = targetContent.topics.reduce((count, topic) => {
    return count + (memory.summary.toLowerCase().includes(topic.replaceAll("_", " ")) ? 1 : 0);
  }, 0);

  return clamp((memory.salience || 0.4) * 0.7 + Math.min(topicHits, 2) * 0.15);
}

function createReplayEntry({
  tick,
  actorId,
  action,
  targetId,
  reason,
  ruleId,
}) {
  return {
    tick,
    actor_id: actorId,
    action,
    target_id: targetId,
    reason,
    world_effects: ruleId ? [{ rule_id: ruleId }] : [],
  };
}

function seedDebugMemoryRuntime(agentId) {
  const runtime = createMemoryRuntime({
    state: clone(SAMPLE_STATE_SNAPSHOT),
  });

  const entries = [
    createReplayEntry({
      tick: 8,
      actorId: agentId,
      action: "lurk",
      targetId: "T03",
      reason: "오피스 레이어링 스레드를 지켜보기만 했다.",
      ruleId: "office_layering",
    }),
    createReplayEntry({
      tick: 9,
      actorId: agentId,
      action: "comment",
      targetId: "T14",
      reason: "출퇴근 스타일을 반복해서 보다가 실용적인 핏 피드백을 남겼다.",
      ruleId: "fit_feedback",
    }),
    createReplayEntry({
      tick: 10,
      actorId: agentId,
      action: "react",
      targetId: "T07",
      reason: "자신감을 다시 세우는 코디 글에 짧은 응원을 남겼다.",
      ruleId: "empathetic_support",
    }),
    createReplayEntry({
      tick: 11,
      actorId: agentId,
      action: "post",
      targetId: "T20",
      reason: "뜨거운 트렌치 논의가 계속 올라와 새 스레드를 열었다.",
      ruleId: "trend_followup",
    }),
  ];

  entries.forEach((entry) => rememberReplayEntry(runtime, entry));
  return runtime;
}

function collectRetrievedMemories(runtime, agentId, targetContent) {
  const timeline = queryMemoryTimeline(runtime, agentId);
  return timeline.durable
    .map((memory) => ({
      memory_id: memory.memory_id,
      tick: memory.tick,
      summary: memory.summary,
      salience: memory.salience,
      relevance: scoreMemoryRelevance(memory, targetContent),
      reason: `비슷한 주제로 ${targetContent.content_id}와 연결됨: ${targetContent.topics.join(", ")}.`,
    }))
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 3);
}

function buildGraphReasons(agentId, targetContent) {
  const graph = buildNeo4jSyncPayload();
  const contentRelations = graph.relations.filter(
    (relation) => relation.from === targetContent.content_id || relation.to === targetContent.content_id,
  );
  const agentNode = graph.nodes.find((node) => node.node_id === agentId);

  return {
    focusAgent: agentNode,
    contentNeighborhood: contentRelations.map((relation) => ({
      relation_id: relation.relation_id,
      type: relation.type,
      from: relation.from,
      to: relation.to,
      note:
        relation.to === targetContent.content_id
          ? "에이전트 작성 또는 상위 관계가 선택된 콘텐츠로 이어진다."
          : "선택된 콘텐츠는 검색과 랭킹 문맥에 쓰이는 토픽 클러스터와 연결되어 있다.",
    })),
  };
}

function buildDecisionSummary({
  agent,
  targetContent,
  rankedItem,
  moderatedItem,
  actionRecord,
  retrievedMemories,
}) {
  const wrote = actionRecord.type === "comment";
  return {
    outcome: wrote ? "wrote_visible_reply" : "ignored_or_deferred",
    explanation: wrote
      ? `${agent.handle}가 랭킹, 기억의 중요도, 정책 조건을 모두 만족해 ${targetContent.title}에 눈에 보이는 답글을 남겼다.`
      : `${agent.handle}는 친화도와 우선순위가 댓글 기준을 넘지 못해 ${targetContent.title}에 눈에 보이는 글쓰기로 이어지지 않았다.`,
    why_now: [
      rankedItem?.reason,
      `비슷한 주제의 오래된 기억 ${retrievedMemories.length}개를 불러왔다.`,
      moderatedItem
        ? `정책 ${moderatedItem.moderation.policyFlag} 때문에 항목 상태가 ${moderatedItem.moderation.status}로 남았다.`
        : "선택된 콘텐츠에는 별도 정책 재정의가 필요하지 않았다.",
    ],
  };
}

function buildInspectableReasonBlock({
  rankedItem,
  moderatedItem,
  actionRecord,
  artifact,
  retrievedMemories,
  graphReasons,
}) {
  return {
    selectedAction: {
      action_id: actionRecord.action_id,
      type: actionRecord.type,
      visibility: actionRecord.visibility,
      ui: actionRecord.ui,
      payload: actionRecord.payload,
    },
    retrievedMemories,
    selectedContentReason: rankedItem
      ? {
          content_id: rankedItem.content_id,
          score: rankedItem.score,
          breakdown: rankedItem.score_breakdown,
          reason: rankedItem.reason,
        }
      : null,
    policyReason: moderatedItem
      ? {
          adjustedScore: moderatedItem.adjustedScore,
          moderation: moderatedItem.moderation,
        }
      : null,
    graphReason: graphReasons,
    generatedArtifact: artifact,
  };
}

export function createDebugConsoleSample({
  agentId = "A02",
  selectedContentId = "T01",
  ignoredContentId = "T10",
} = {}) {
  const agent = SAMPLE_AGENT_STATES.find((entry) => entry.agent_id === agentId) || SAMPLE_AGENT_STATES[0];
  const targetAgent = SAMPLE_AGENT_STATES.find((entry) => entry.agent_id !== agent.agent_id) || agent;
  const selectedContent =
    SAMPLE_CONTENT_RECORDS.find((entry) => entry.content_id === selectedContentId) ||
    SAMPLE_CONTENT_RECORDS[0];
  const ignoredContent =
    SAMPLE_CONTENT_RECORDS.find((entry) => entry.content_id === ignoredContentId) ||
    SAMPLE_CONTENT_RECORDS[9];

  const runtime = seedDebugMemoryRuntime(agent.agent_id);
  const selectedRetrievedMemories = collectRetrievedMemories(runtime, agent.agent_id, selectedContent);
  const ignoredRetrievedMemories = collectRetrievedMemories(runtime, agent.agent_id, ignoredContent);

  const ranked = rankFeed({
    agentId: agent.agent_id,
    experimentFlag: RANKING_EXPERIMENT_FLAGS.baseline,
  });
  const rankedItem = ranked.find((item) => item.content_id === selectedContent.content_id);
  const ignoredRankedItem = ranked.find((item) => item.content_id === ignoredContent.content_id);

  const moderated = applyModerationPolicies({
    agentId: agent.agent_id,
    policyFlag: MODERATION_POLICY_FLAGS.dampenAggression,
  });
  const moderatedItem = moderated.feed.find((item) => item.content_id === selectedContent.content_id) || null;
  const ignoredModeratedItem =
    moderated.feed.find((item) => item.content_id === ignoredContent.content_id) || null;

  const selectedAction = chooseForumAction({
    agentState: agent,
    contentRecord: selectedContent,
    tick: 24,
  });
  const ignoredAction = chooseForumAction({
    agentState: agent,
    contentRecord: ignoredContent,
    tick: 25,
  });

  const selectedArtifact =
    selectedAction.type === "comment" || selectedAction.type === "post" || selectedAction.type === "quote"
      ? generateForumArtifact({
          actionRecord: selectedAction,
          author: agent,
          targetContent: selectedContent,
          targetAgent,
        })
      : null;

  const selectedGraphReasons = buildGraphReasons(agent.agent_id, selectedContent);
  const ignoredGraphReasons = buildGraphReasons(agent.agent_id, ignoredContent);

  return {
    agent: {
      agent_id: agent.agent_id,
      handle: agent.handle,
      archetype: agent.archetype,
    },
    decisionCases: {
      wroteOrEngaged: {
        target_content_id: selectedContent.content_id,
        summary: buildDecisionSummary({
          agent,
          targetContent: selectedContent,
          rankedItem,
          moderatedItem,
          actionRecord: selectedAction,
          retrievedMemories: selectedRetrievedMemories,
        }),
        inspectable: buildInspectableReasonBlock({
          rankedItem,
          moderatedItem,
          actionRecord: selectedAction,
          artifact: selectedArtifact,
          retrievedMemories: selectedRetrievedMemories,
          graphReasons: selectedGraphReasons,
        }),
      },
      ignoredOrDeferred: {
        target_content_id: ignoredContent.content_id,
        summary: buildDecisionSummary({
          agent,
          targetContent: ignoredContent,
          rankedItem: ignoredRankedItem,
          moderatedItem: ignoredModeratedItem,
          actionRecord: ignoredAction,
          retrievedMemories: ignoredRetrievedMemories,
        }),
        inspectable: buildInspectableReasonBlock({
          rankedItem: ignoredRankedItem,
          moderatedItem: ignoredModeratedItem,
          actionRecord: ignoredAction,
          artifact: null,
          retrievedMemories: ignoredRetrievedMemories,
          graphReasons: ignoredGraphReasons,
        }),
      },
    },
    identityDriftDebug: {
      selfNarrative: queryMemoryTimeline(runtime, agent.agent_id).selfNarrative.slice(-3),
      note: "반복된 기억 조회와 행동 결과를 통해 에이전트가 좁은 주제 정체성으로 굳어지는지 확인한다.",
    },
  };
}
