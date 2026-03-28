import {
  createDurableMemoryRecord,
  createMemoryWritebackRecord,
  createNarrativeEntry,
  createRecentMemoryItem,
  serializeSnapshot,
} from "../shared-types/index.js";

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function clone(value) {
  return serializeSnapshot(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getMutableState(agentState) {
  return agentState.mutable_state || {
    current_traits: {},
    current_interests: {},
    current_beliefs: {},
    attention_bias: {},
    affect_state: {},
    self_narrative_summary: "",
    recent_arc: "stable",
    stance_markers: [],
    drift_log: [],
  };
}

function mergeTopicBoosts(baseVector = {}, topics = [], boost = 0) {
  const nextVector = { ...baseVector };

  topics.forEach((topic) => {
    nextVector[topic] = clampUnit((nextVector[topic] || 0) + boost);
  });

  return nextVector;
}

function buildWritebackSummary(actionType, contentRecord) {
  const title = contentRecord?.title || contentRecord?.content_id || "an observed thread";

  if (actionType === "silence") {
    return `Stayed silent on ${title} while keeping the context available for later re-entry.`;
  }

  return `Lurked on ${title} and kept the topic signals in working memory.`;
}

function buildNarrativeText(actionType, contentRecord) {
  const title = contentRecord?.title || "the thread";

  if (actionType === "silence") {
    return `I kept quiet on ${title} so I could return with the full context intact.`;
  }

  const topicList = (contentRecord?.topics || []).join(", ") || "the thread";
  return `Watching ${topicList} sharpened what I pay attention to, even before I speak.`;
}

export function buildLowCostActionWriteback({
  agentState,
  actionRecord,
  contentRecord = null,
  round = 0,
  tick = 0,
} = {}) {
  if (!agentState?.agent_id) {
    throw new Error("agentState.agent_id is required");
  }

  if (!actionRecord?.action_id || !["silence", "lurk"].includes(actionRecord.type)) {
    throw new Error("actionRecord must describe a silence or lurk action");
  }

  const nextAgent = clone(agentState);
  const mutableState = getMutableState(nextAgent);
  const topics = contentRecord?.topics || [];
  const dominantTopic = topics[0] || null;
  const targetContentId = contentRecord?.content_id || actionRecord.target_content_id || null;

  let durableSalience = 0.3;
  let memoryChannel = "recent_memory";
  let activityDelta = 0;
  let interestDelta = 0;
  let attentionDelta = 0;
  let narrativeTone = "reflective";
  let stateDelta = {
    preserved_context: true,
    action_type: actionRecord.type,
    target_content_id: targetContentId,
  };

  if (actionRecord.type === "silence") {
    activityDelta = -0.04;
    durableSalience = 0.2;
    mutableState.recent_arc = "quiet_observer";
    mutableState.stance_markers = unique([
      ...(mutableState.stance_markers || []),
      "silence",
      "quiet_observation",
    ]);
    stateDelta = {
      ...stateDelta,
      activity_level_delta: activityDelta,
      recent_arc: mutableState.recent_arc,
      stance_markers: mutableState.stance_markers,
    };
  } else {
    interestDelta = topics.length ? 0.14 : 0.08;
    attentionDelta = topics.length ? 0.1 : 0.05;
    memoryChannel = "belief_shift";
    durableSalience = 0.46;
    mutableState.recent_arc = "observing";
    mutableState.current_interests = mergeTopicBoosts(
      mutableState.current_interests || {},
      topics,
      interestDelta * 0.8,
    );
    mutableState.attention_bias = mergeTopicBoosts(
      mutableState.attention_bias || {},
      topics,
      attentionDelta,
    );
    mutableState.stance_markers = unique([
      ...(mutableState.stance_markers || []),
      "lurk",
      ...topics.map((topic) => `topic:${topic}`),
    ]);
    stateDelta = {
      ...stateDelta,
      current_interests: mutableState.current_interests,
      attention_bias: mutableState.attention_bias,
      stance_markers: mutableState.stance_markers,
    };
  }

  nextAgent.activity_level = clampUnit(
    (nextAgent.activity_level || 0.5) + activityDelta,
  );
  nextAgent.mutable_state = {
    ...mutableState,
    self_narrative_summary: buildNarrativeText(actionRecord.type, contentRecord),
  };

  const summary = buildWritebackSummary(actionRecord.type, contentRecord);
  const writebackRecord = createMemoryWritebackRecord({
    writeback_id: `WB:${nextAgent.agent_id}:${round}:${tick}:${actionRecord.type}:${dominantTopic || "ambient"}`,
    action_id: actionRecord.action_id,
    agent_id: nextAgent.agent_id,
    round,
    tick,
    execution_status: "success",
    memory_channel: memoryChannel,
    belief_key: dominantTopic,
    dominant_topic: dominantTopic,
    summary,
    state_delta: stateDelta,
  });

  const recentMemoryItem = createRecentMemoryItem({
    memory_id: `recent:${nextAgent.agent_id}:${round}:${tick}:${actionRecord.type}`,
    agent_id: nextAgent.agent_id,
    tick,
    kind: "low_cost_action",
    summary,
    details: {
      action_id: actionRecord.action_id,
      action_type: actionRecord.type,
      visibility: actionRecord.visibility,
      target_content_id: targetContentId,
      topics,
    },
  });

  const durableMemoryRecord = createDurableMemoryRecord({
    memory_id: `durable:${nextAgent.agent_id}:${round}:${tick}:${actionRecord.type}`,
    agent_id: nextAgent.agent_id,
    tick,
    summary,
    salience: durableSalience,
    tags: unique([actionRecord.type, ...topics, "low_cost_action"]),
    source: `low_cost_${actionRecord.type}`,
    details: {
      action_id: actionRecord.action_id,
      visibility: actionRecord.visibility,
      target_content_id: targetContentId,
    },
  });

  const narrativeEntry = createNarrativeEntry({
    narrative_id: `narrative:${nextAgent.agent_id}:${round}:${tick}:${actionRecord.type}`,
    agent_id: nextAgent.agent_id,
    tick,
    text: nextAgent.mutable_state.self_narrative_summary,
    source_memory_id: durableMemoryRecord.memory_id,
    tone: narrativeTone,
  });

  return {
    agent: nextAgent,
    writebackRecord,
    recentMemoryItem,
    durableMemoryRecord,
    narrativeEntry,
  };
}

export function applyLowCostActionWriteback(runtime, actionOutcome = {}) {
  const { agentState, actionRecord, contentRecord, round = 0, tick = 0 } = actionOutcome;
  const writeback = buildLowCostActionWriteback({
    agentState,
    actionRecord,
    contentRecord,
    round,
    tick,
  });

  if (runtime?.recentBuffers && writeback.recentMemoryItem) {
    const existingRecent = runtime.recentBuffers.get(writeback.agent.agent_id) || [];
    const memoryWindow = writeback.agent.memory_window || existingRecent.length + 1;
    runtime.recentBuffers.set(
      writeback.agent.agent_id,
      [...existingRecent, writeback.recentMemoryItem].slice(-memoryWindow),
    );
  }

  if (runtime) {
    runtime.durableMemories = [...(runtime.durableMemories || []), writeback.durableMemoryRecord];
    runtime.selfNarratives = [...(runtime.selfNarratives || []), writeback.narrativeEntry];
  }

  return writeback;
}
