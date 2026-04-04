import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  SAMPLE_AGENT_STATES,
  SAMPLE_STATE_SNAPSHOT,
  createStateSnapshot,
  createDurableMemoryRecord,
  createMemoryStoreSnapshot,
  createNarrativeEntry,
  createRecentMemoryItem,
  serializeSnapshot,
} from "@ai-fashion-forum/shared-types";

import { createSprint1ExposureSample } from "./content-indexing.js";
import { createBaselineWorldRules, runTicks } from "./tick-engine.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeStorePath(storeFilePath) {
  return storeFilePath instanceof URL ? fileURLToPath(storeFilePath) : storeFilePath;
}

function ensureStoreFile(storeFilePath) {
  const resolvedStorePath = normalizeStorePath(storeFilePath);
  const directoryPath = path.dirname(resolvedStorePath);
  fs.mkdirSync(directoryPath, { recursive: true });

  if (!fs.existsSync(resolvedStorePath)) {
    fs.writeFileSync(
      resolvedStorePath,
      JSON.stringify(createMemoryStoreSnapshot(), null, 2),
      "utf8",
    );
  }
}

function loadStore(storeFilePath) {
  const resolvedStorePath = normalizeStorePath(storeFilePath);
  ensureStoreFile(resolvedStorePath);
  const rawText = fs.readFileSync(resolvedStorePath, "utf8");
  return JSON.parse(rawText);
}

function persistStore(storeFilePath, store) {
  const resolvedStorePath = normalizeStorePath(storeFilePath);
  ensureStoreFile(resolvedStorePath);
  fs.writeFileSync(resolvedStorePath, JSON.stringify(store, null, 2), "utf8");
}

function createMemorySummary(entry) {
  const actionLabels = {
    silence: "침묵",
    lurk: "관찰",
    react: "반응",
    comment: "댓글",
    post: "글쓰기",
  };

  return `${entry.tick}틱: ${entry.actor_id}가 ${actionLabels[entry.action] || entry.action}을/를 했다. ${entry.reason}`;
}

function buildNarrativeText(agentState, entry) {
  const intros = {
    quiet_observer: "나는 다시 보게 되는 조용한 패턴들을 계속 알아차리고 있다.",
    trend_seeker: "아직 새롭게 느껴지는 흐름 쪽으로 마음이 기울고 있다.",
    community_regular: "익숙한 포럼 루틴을 통해 내 정체감이 조금씩 만들어지고 있다.",
    brand_loyalist: "반복되는 신호들이 안정된 취향 정체성으로 굳어지고 있다.",
    contrarian_commenter: "마찰 덕분에 내가 무엇에 반대하는지, 왜 그런지가 더 또렷해진다.",
    empathetic_responder: "나는 다른 사람에게 돌려주는 톤을 통해 나 자신을 계속 정의하고 있다.",
  };

  return `${intros[agentState.archetype]} ${entry.tick}틱에는 ${entry.reason}`;
}

function createEmptyRecentBuffers(agents) {
  return new Map(
    agents.map((agent) => {
      const memoryWindow = Math.max(1, Number(agent?.memory_window) || 12);
      const seededRecent = seedRecentBuffersForAgent(agent, memoryWindow);
      return [agent.agent_id, seededRecent.slice(-memoryWindow)];
    }),
  );
}

function normalizeMemoryText(value = "") {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function createRecentMemoryFromEntry(agentId, entry, tick = 0, index = 0, kind = "seed_recent_memory") {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const summary = normalizeMemoryText(entry);
    if (!summary) {
      return null;
    }

    return createRecentMemoryItem({
      memory_id: `recent:${agentId}:${kind}:${tick}:${index}`,
      agent_id: agentId,
      tick,
      kind,
      summary,
      details: {
        source: "agent_state",
      },
    });
  }

  if (typeof entry === "object") {
    const summary = normalizeMemoryText(
      entry.summary ||
        entry.text ||
        entry.narrative ||
        entry.reason ||
        entry.content ||
        entry.note ||
        "",
    );
    if (!summary) {
      return null;
    }

    return createRecentMemoryItem({
      memory_id: entry.memory_id || `recent:${agentId}:${kind}:${tick}:${index}`,
      agent_id: entry.agent_id || agentId,
      tick: typeof entry.tick === "number" ? entry.tick : tick,
      kind: entry.kind || kind,
      summary,
      details: entry.details || {
        source: "agent_state",
      },
    });
  }

  return null;
}

function seedRecentBuffersForAgent(agent = {}, memoryWindow = 12) {
  const agentId = agent?.agent_id;
  if (!agentId) {
    return [];
  }

  const seededEntries = Array.isArray(agent.recentMemories) && agent.recentMemories.length
    ? agent.recentMemories
    : Array.isArray(agent.self_narrative)
      ? agent.self_narrative
      : [];

  return seededEntries
    .map((entry, index) => createRecentMemoryFromEntry(agentId, entry, agent.joined_tick || 0, index))
    .filter(Boolean)
    .slice(-memoryWindow);
}

function appendAgentMemoryTrail(agentState, { recentItem = null, narrativeEntry = null, memoryWindow = null } = {}) {
  if (!agentState || !agentState.agent_id) {
    return;
  }

  const windowSize = Math.max(1, Number(memoryWindow) || Number(agentState.memory_window) || 12);

  if (recentItem) {
    agentState.recentMemories = [...(Array.isArray(agentState.recentMemories) ? agentState.recentMemories : []), recentItem].slice(-windowSize);
  }

  if (narrativeEntry) {
    const narrativeText = typeof narrativeEntry === "string"
      ? narrativeEntry
      : narrativeEntry.text || narrativeEntry.summary || "";
    if (narrativeText) {
      agentState.self_narrative = [
        ...(Array.isArray(agentState.self_narrative) ? agentState.self_narrative : []),
        narrativeText,
      ].slice(-windowSize);
    }
  }
}

export function createMemoryRuntime({
  state = SAMPLE_STATE_SNAPSHOT,
  storeFilePath,
} = {}) {
  const clonedState = serializeSnapshot(state);
  const store = storeFilePath ? loadStore(storeFilePath) : createMemoryStoreSnapshot();

  return {
    state: clonedState,
    storeFilePath,
    recentBuffers: createEmptyRecentBuffers(clonedState.agents),
    durableMemories: store.durableMemories || [],
    selfNarratives: store.selfNarratives || [],
  };
}

export function rememberReplayEntry(runtime, replayEntry) {
  const agentState = runtime.state.agents.find(
    (candidate) => candidate.agent_id === replayEntry.actor_id,
  );

  if (!agentState) {
    return null;
  }

  const summary = createMemorySummary(replayEntry);
  const recentItem = createRecentMemoryItem({
    memory_id: `recent:${agentState.agent_id}:${replayEntry.tick}`,
    agent_id: agentState.agent_id,
    tick: replayEntry.tick,
    summary,
    details: {
      action: replayEntry.action,
      world_effects: replayEntry.world_effects,
    },
  });

  const durableMemory = createDurableMemoryRecord({
    memory_id: `durable:${agentState.agent_id}:${replayEntry.tick}`,
    agent_id: agentState.agent_id,
    tick: replayEntry.tick,
    summary,
    salience: Number(
      Math.min(
        1,
        0.45 +
          (replayEntry.action === "post" ? 0.25 : 0) +
          (replayEntry.world_effects?.length ? 0.1 : 0) +
          agentState.activity_level * 0.2,
      ).toFixed(3),
    ),
    tags: [replayEntry.action, ...(replayEntry.world_effects || []).map((effect) => effect.rule_id)],
    details: {
      reason: replayEntry.reason,
    },
  });

  const narrativeEntry = createNarrativeEntry({
    narrative_id: `narrative:${agentState.agent_id}:${replayEntry.tick}`,
    agent_id: agentState.agent_id,
    tick: replayEntry.tick,
    text: buildNarrativeText(agentState, replayEntry),
    source_memory_id: durableMemory.memory_id,
  });

  const existingRecent = runtime.recentBuffers.get(agentState.agent_id) || [];
  const nextRecent = [...existingRecent, recentItem].slice(-agentState.memory_window);

  runtime.recentBuffers.set(agentState.agent_id, nextRecent);
  runtime.durableMemories = [...runtime.durableMemories, durableMemory];
  runtime.selfNarratives = [...runtime.selfNarratives, narrativeEntry];
  appendAgentMemoryTrail(agentState, {
    recentItem,
    narrativeEntry,
    memoryWindow: agentState.memory_window,
  });

  if (runtime.storeFilePath) {
    persistStore(runtime.storeFilePath, {
      durableMemories: runtime.durableMemories,
      selfNarratives: runtime.selfNarratives,
    });
  }

  return {
    recentItem,
    durableMemory,
    narrativeEntry,
  };
}

export function rememberContentExposure(runtime, exposureRecord = {}) {
  const {
    agentId = exposureRecord.agent_id || exposureRecord.agentId || "",
    contentRecord = {},
    reactionRecord = null,
    tick = 0,
    round = 0,
    reason = "",
    memoryWindow = null,
    source = "content_exposure",
  } = exposureRecord;

  const agentState = runtime?.state?.agents?.find((candidate) => candidate.agent_id === agentId);
  if (!agentState) {
    return null;
  }

  const title = normalizeMemoryText(contentRecord.title || contentRecord.content_id || "읽은 글") || "읽은 글";
  const topics = Array.isArray(contentRecord.topics) && contentRecord.topics.length
    ? contentRecord.topics.slice(0, 3).join(", ")
    : "일반";
  const reactionLabel = normalizeMemoryText(
    reactionRecord?.memory_write_hint?.narrative_hint ||
      reactionRecord?.meaning_frame ||
      reactionRecord?.stance_signal ||
      "",
  );
  const reasonText = normalizeMemoryText(reason) || reactionLabel || "읽은 글이 다음 판단으로 이어졌다.";
  const reasonClause = reasonText
    .replace(/\.$/, "")
    .replace(/^나는\s+/u, "")
    .replace(/^읽은 글이\s+/u, "")
    .trim();
  const topicLead = Array.isArray(contentRecord.topics) && contentRecord.topics.length
    ? contentRecord.topics.slice(0, 2).join(", ")
    : "";

  const summary = reasonClause
    ? `읽은 글 “${title}” 뒤로 ${reasonClause}`
    : `읽은 글 “${title}”에서 ${topics}을/를 먼저 보게 됐다.`;
  const narrativeText = reactionLabel
    ? `나는 “${title}”을 읽은 뒤 ${reactionLabel} 쪽으로 조금 더 기울었다. ${reasonText}`
    : `나는 “${title}”을 읽은 뒤 ${reasonText}`;

  const recentItem = createRecentMemoryItem({
    memory_id: `recent:${agentState.agent_id}:${round}:${tick}:exposure`,
    agent_id: agentState.agent_id,
    tick,
    kind: "content_exposure",
    summary,
    details: {
      round,
      source,
      content_id: contentRecord.content_id || contentRecord._id || null,
      title,
      topics: Array.isArray(contentRecord.topics) ? contentRecord.topics : [],
      reason: reasonText,
      reason_clause: reasonClause,
      topic_lead: topicLead,
      reaction_frame: reactionRecord?.meaning_frame || null,
      reaction_signal: reactionRecord?.stance_signal || null,
      dominant_feeling: reactionRecord?.dominant_feeling || null,
    },
  });

  const durableMemory = createDurableMemoryRecord({
    memory_id: `durable:${agentState.agent_id}:${round}:${tick}:exposure`,
    agent_id: agentState.agent_id,
    tick,
    summary,
    salience: Number(
      Math.min(
        1,
        0.42 +
          (Array.isArray(contentRecord.topics) && contentRecord.topics.length ? 0.12 : 0) +
          (reactionRecord?.resonance_score ? Math.min(0.18, reactionRecord.resonance_score * 0.2) : 0),
      ).toFixed(3),
    ),
    tags: [
      "content_exposure",
      ...(Array.isArray(contentRecord.topics) ? contentRecord.topics : []),
      reactionRecord?.meaning_frame,
      reactionRecord?.stance_signal,
    ].filter(Boolean),
    source,
    details: {
      content_id: contentRecord.content_id || contentRecord._id || null,
      title,
      reason: reasonText,
    },
  });

  const narrativeEntry = createNarrativeEntry({
    narrative_id: `narrative:${agentState.agent_id}:${round}:${tick}:exposure`,
    agent_id: agentState.agent_id,
    tick,
    text: narrativeText,
    source_memory_id: durableMemory.memory_id,
    tone: reactionRecord?.dominant_feeling || "reflective",
  });

  if (runtime?.recentBuffers) {
    const existingRecent = runtime.recentBuffers.get(agentState.agent_id) || [];
    const windowSize = Math.max(1, Number(memoryWindow) || Number(agentState.memory_window) || 12);
    runtime.recentBuffers.set(
      agentState.agent_id,
      [...existingRecent, recentItem].slice(-windowSize),
    );
  }

  if (runtime) {
    runtime.durableMemories = [...(runtime.durableMemories || []), durableMemory];
    runtime.selfNarratives = [...(runtime.selfNarratives || []), narrativeEntry];
  }

  appendAgentMemoryTrail(agentState, {
    recentItem,
    narrativeEntry,
    memoryWindow,
  });

  if (!agentState.mutable_state) {
    agentState.mutable_state = {
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

  const previousSummary = typeof agentState.mutable_state.self_narrative_summary === "string"
    ? agentState.mutable_state.self_narrative_summary.trim()
    : "";
  agentState.mutable_state.self_narrative_summary = previousSummary
    ? `${previousSummary} ${narrativeText}`.slice(-320)
    : narrativeText;
  agentState.mutable_state.drift_log = [
    ...(Array.isArray(agentState.mutable_state.drift_log) ? agentState.mutable_state.drift_log : []),
    `${tick}틱: ${title}를 읽고 ${reactionLabel || "관찰"} 쪽으로 조금 이동했다.`,
  ].slice(-8);

  if (runtime?.storeFilePath) {
    persistStore(runtime.storeFilePath, {
      durableMemories: runtime.durableMemories,
      selfNarratives: runtime.selfNarratives,
    });
  }

  return {
    recentItem,
    durableMemory,
    narrativeEntry,
  };
}

export function recallRecentMemory(runtime, agentId, limit = 5) {
  return (runtime.recentBuffers.get(agentId) || []).slice(-limit);
}

export function queryMemoryTimeline(runtime, agentId) {
  return {
    recent: recallRecentMemory(runtime, agentId),
    durable: runtime.durableMemories.filter((memory) => memory.agent_id === agentId),
    selfNarrative: runtime.selfNarratives.filter((entry) => entry.agent_id === agentId),
  };
}

export function buildTickEndSummaries(entries) {
  return entries.map((entry) => ({
    tick: entry.tick,
    actor_id: entry.actor_id,
    summary: createMemorySummary(entry),
  }));
}

export function loadDurableMemorySnapshot(storeFilePath) {
  return loadStore(storeFilePath);
}

export function createMemorySample({
  seed = 42,
  tickCount = 6,
  storeFilePath,
  agentId = "A01",
} = {}) {
  const run = runTicks({
    seed,
    tickCount,
    initialState: clone(SAMPLE_STATE_SNAPSHOT),
    worldRules: createBaselineWorldRules(),
  });

  const runtime = createMemoryRuntime({
    state: run.finalState,
    storeFilePath,
  });

  run.entries.forEach((entry) => {
    rememberReplayEntry(runtime, entry);
  });

  const resolvedAgentId =
    queryMemoryTimeline(runtime, agentId).durable.length > 0
      ? agentId
      : run.entries[run.entries.length - 1]?.actor_id || agentId;

  return {
    seed,
    tickCount,
    summaries: buildTickEndSummaries(run.entries),
    agent_id: resolvedAgentId,
    memory: queryMemoryTimeline(runtime, resolvedAgentId),
    persistedCounts: {
      durable: runtime.durableMemories.length,
      selfNarrative: runtime.selfNarratives.length,
    },
  };
}

export function createMemoryBootstrapState() {
  return {
    agents: SAMPLE_AGENT_STATES.map((agent) => ({
      agent_id: agent.agent_id,
      memory_window: agent.memory_window,
      self_narrative_count: agent.self_narrative.length,
    })),
  };
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function buildSprint1MemorySummary(reactionRecord) {
  const feelingLabels = {
    curiosity: "호기심",
    delight: "호감",
    concern: "걱정",
    irritation: "불편함",
    resolve: "의지",
  };

  const frameLabels = {
    care_context: "돌봄 문맥",
    signal_filter: "신호 구분",
    tradeoff_filter: "트레이드오프 판단",
    practicality_filter: "실용성 기준",
    context_filter: "문맥 축적",
  };

  return `${reactionRecord.rank}틱 반응 ${reactionRecord.reaction_id}: ${frameLabels[reactionRecord.meaning_frame] || reactionRecord.meaning_frame} 관점에서 ${reactionRecord.content_id}를 ${feelingLabels[reactionRecord.dominant_feeling] || reactionRecord.dominant_feeling}로 읽었다.`;
}

function buildSprint1NarrativeText(agentState, reactionRecord) {
  const intros = {
    care_context: "나는 같은 세계를 돌봄과 살아 있는 문맥으로 해석하기 시작했다.",
    signal_filter: "나는 같은 세계를 신호와 새로움의 문제로 읽고 있다.",
    tradeoff_filter: "나는 같은 세계를 트레이드오프와 회의감의 관점으로 읽고 있다.",
    practicality_filter: "나는 추상적인 스타일 이야기보다 실용적인 증거 쪽으로 기울고 있다.",
    context_filter: "나는 무엇을 생각할지 정하기 전에 상황 문맥을 더 모으고 있다.",
  };

  return `${intros[reactionRecord.meaning_frame] || intros.context_filter} ${reactionRecord.memory_write_hint.narrative_hint}`;
}

function applySprint1Drift(agentState, reactionRecord) {
  const nextAgent = clone(agentState);
  const mutableState = nextAgent.mutable_state || {
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

  const beliefDeltas = {
    care_context: { key: "care-over-performance", amount: 0.03, arc: "softening_toward_care_topics" },
    signal_filter: { key: "novelty-has-value", amount: 0.03, arc: "reinforcing_novelty_identity" },
    tradeoff_filter: { key: "hype-obscures-tradeoffs", amount: 0.03, arc: "hardening_tradeoff_posture" },
    practicality_filter: { key: "daily-utility", amount: 0.025, arc: "stabilizing_practical_filter" },
    context_filter: { key: "texture-matters", amount: 0.015, arc: "collecting_context" },
  };

  const traitDeltas = {
    care_context: { key: "care_drive", amount: 0.02 },
    signal_filter: { key: "novelty_drive", amount: 0.02 },
    tradeoff_filter: { key: "skepticism", amount: 0.02 },
    practicality_filter: { key: "belonging_drive", amount: 0.01 },
    context_filter: { key: "curiosity", amount: 0.01 },
  };

  const beliefDelta = beliefDeltas[reactionRecord.meaning_frame] || beliefDeltas.context_filter;
  const traitDelta = traitDeltas[reactionRecord.meaning_frame] || traitDeltas.context_filter;

  mutableState.current_beliefs[beliefDelta.key] = clampUnit(
    (mutableState.current_beliefs[beliefDelta.key] || 0.5) + beliefDelta.amount,
  );
  mutableState.current_traits[traitDelta.key] = clampUnit(
    (mutableState.current_traits[traitDelta.key] || 0.5) + traitDelta.amount,
  );
  mutableState.affect_state[reactionRecord.dominant_feeling] = clampUnit(
    (mutableState.affect_state[reactionRecord.dominant_feeling] || 0.2) + 0.04,
  );
  mutableState.attention_bias[reactionRecord.stance_signal] = clampUnit(
    (mutableState.attention_bias[reactionRecord.stance_signal] || 0.1) + 0.05,
  );
  mutableState.self_narrative_summary = buildSprint1NarrativeText(nextAgent, reactionRecord);
  mutableState.recent_arc = beliefDelta.arc;
  mutableState.stance_markers = Array.from(
    new Set([...(mutableState.stance_markers || []), reactionRecord.stance_signal]),
  ).slice(-6);
  mutableState.drift_log = [
    ...(mutableState.drift_log || []),
    `${reactionRecord.rank}틱: ${reactionRecord.meaning_frame}가 ${beliefDelta.key} 쪽으로 ${beliefDelta.amount}만큼 이동했다.`,
  ].slice(-8);

  nextAgent.mutable_state = mutableState;
  nextAgent.self_narrative = [
    ...(nextAgent.self_narrative || []),
    mutableState.self_narrative_summary,
  ].slice(-nextAgent.memory_window);

  return nextAgent;
}

export function rememberSprint1Reaction(runtime, reactionRecord) {
  const agentState = runtime.state.agents.find(
    (candidate) => candidate.agent_id === reactionRecord.agent_id,
  );

  if (!agentState) {
    return null;
  }

  const summary = buildSprint1MemorySummary(reactionRecord);
  const recentItem = createRecentMemoryItem({
    memory_id: `recent:${agentState.agent_id}:reaction:${reactionRecord.rank}`,
    agent_id: agentState.agent_id,
    tick: reactionRecord.rank,
    kind: "reaction_memory",
    summary,
    details: {
      content_id: reactionRecord.content_id,
      dominant_feeling: reactionRecord.dominant_feeling,
      meaning_frame: reactionRecord.meaning_frame,
      stance_signal: reactionRecord.stance_signal,
      resonance_score: reactionRecord.resonance_score,
    },
  });

  const durableMemory = createDurableMemoryRecord({
    memory_id: `durable:${agentState.agent_id}:reaction:${reactionRecord.rank}`,
    agent_id: agentState.agent_id,
    tick: reactionRecord.rank,
    summary,
    salience:
      reactionRecord.memory_write_hint.salience === "high"
        ? 0.85
        : reactionRecord.memory_write_hint.salience === "medium"
          ? 0.62
          : 0.38,
    tags: [
      "reaction_memory",
      reactionRecord.meaning_frame,
      reactionRecord.stance_signal,
    ],
    source: "sprint1_reaction",
    details: {
      content_id: reactionRecord.content_id,
      narrative_hint: reactionRecord.memory_write_hint.narrative_hint,
    },
  });

  const updatedAgent = applySprint1Drift(agentState, reactionRecord);
  const narrativeEntry = createNarrativeEntry({
    narrative_id: `narrative:${agentState.agent_id}:reaction:${reactionRecord.rank}`,
    agent_id: agentState.agent_id,
    tick: reactionRecord.rank,
    text: buildSprint1NarrativeText(updatedAgent, reactionRecord),
    source_memory_id: durableMemory.memory_id,
  });

  const existingRecent = runtime.recentBuffers.get(agentState.agent_id) || [];
  runtime.recentBuffers.set(
    agentState.agent_id,
    [...existingRecent, recentItem].slice(-agentState.memory_window),
  );
  runtime.durableMemories = [...runtime.durableMemories, durableMemory];
  runtime.selfNarratives = [...runtime.selfNarratives, narrativeEntry];
  appendAgentMemoryTrail(updatedAgent, {
    recentItem,
    narrativeEntry,
    memoryWindow: updatedAgent.memory_window,
  });

  const agentIndex = runtime.state.agents.findIndex((candidate) => candidate.agent_id === agentState.agent_id);
  runtime.state.agents[agentIndex] = updatedAgent;

  if (runtime.storeFilePath) {
    persistStore(runtime.storeFilePath, {
      durableMemories: runtime.durableMemories,
      selfNarratives: runtime.selfNarratives,
    });
  }

  return {
    recentItem,
    durableMemory,
    narrativeEntry,
    updatedAgent,
  };
}

export async function createSprint1MemoryWritebackSample({
  agentId = "S01",
  storeFilePath,
} = {}) {
  const starterState = createStateSnapshot({
    agents: SAMPLE_AGENT_STATES,
    contents: [],
    nodes: [],
    relations: [],
  });
  const runtime = createMemoryRuntime({
    state: starterState,
    storeFilePath,
  });
  const exposureSample = await createSprint1ExposureSample({
    agentId,
  });

  const writes = exposureSample.reaction_records
    .filter((reaction) => reaction.memory_write_hint.should_write)
    .map((reaction) => rememberSprint1Reaction(runtime, reaction));

  return {
    agent_id: agentId,
    input_reactions: exposureSample.reaction_records,
    writes,
    memory: queryMemoryTimeline(runtime, agentId),
    updated_agent: runtime.state.agents.find((agent) => agent.agent_id === agentId),
  };
}
