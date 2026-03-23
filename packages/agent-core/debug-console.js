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
      reason: "Observed office layering thread without responding.",
      ruleId: "office_layering",
    }),
    createReplayEntry({
      tick: 9,
      actorId: agentId,
      action: "comment",
      targetId: "T14",
      reason: "Shared practical fit feedback after repeated commuter-style exposure.",
      ruleId: "fit_feedback",
    }),
    createReplayEntry({
      tick: 10,
      actorId: agentId,
      action: "react",
      targetId: "T07",
      reason: "Left quick support on a confidence-rebuilding outfit post.",
      ruleId: "empathetic_support",
    }),
    createReplayEntry({
      tick: 11,
      actorId: agentId,
      action: "post",
      targetId: "T20",
      reason: "Started a new thread after hot-topic trench discussions kept resurfacing.",
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
      reason: `Matched against ${targetContent.content_id} topics: ${targetContent.topics.join(", ")}.`,
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
          ? "Agent-authored or upstream relation points into the selected content."
          : "Selected content is connected to a topic cluster used for retrieval and ranking context.",
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
      ? `${agent.handle} crossed the visible-action threshold because ranking, memory salience, and policy checks all remained favorable for ${targetContent.title}.`
      : `${agent.handle} did not escalate into visible writing because affinity and ranked urgency stayed below the comment threshold for ${targetContent.title}.`,
    why_now: [
      rankedItem?.reason,
      `Retrieved ${retrievedMemories.length} durable memories tied to similar topics.`,
      moderatedItem
        ? `Policy ${moderatedItem.moderation.policyFlag} left the item ${moderatedItem.moderation.status}.`
        : "No policy override was required for the selected content.",
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
      note: "Use repeated memory retrieval plus action outcomes to inspect whether the agent is hardening toward a narrow topic identity.",
    },
  };
}
