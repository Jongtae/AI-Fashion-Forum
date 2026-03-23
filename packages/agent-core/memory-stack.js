import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  SAMPLE_AGENT_STATES,
  SAMPLE_STATE_SNAPSHOT,
  SPRINT1_AGENT_STATES,
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
  return `Tick ${entry.tick}: ${entry.action} by ${entry.actor_id}. ${entry.reason}`;
}

function buildNarrativeText(agentState, entry) {
  const intros = {
    quiet_observer: "I keep noticing quiet patterns in what draws me back.",
    trend_seeker: "I can feel myself leaning toward whatever still feels new.",
    community_regular: "My sense of self keeps forming through familiar forum routines.",
    brand_loyalist: "Repeated signals are hardening into a stable taste identity for me.",
    contrarian_commenter: "Friction keeps clarifying what I stand against and why.",
    empathetic_responder: "I keep defining myself through the kind of tone I bring back to others.",
  };

  return `${intros[agentState.archetype]} Tick ${entry.tick} reminded me that ${entry.reason.toLowerCase()}`;
}

function createEmptyRecentBuffers(agents) {
  return new Map(agents.map((agent) => [agent.agent_id, []]));
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

  agentState.self_narrative = [
    ...agentState.self_narrative,
    narrativeEntry.text,
  ].slice(-agentState.memory_window);

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
  return `Reaction ${reactionRecord.reaction_id}: ${reactionRecord.dominant_feeling} via ${reactionRecord.meaning_frame} toward ${reactionRecord.content_id}.`;
}

function buildSprint1NarrativeText(agentState, reactionRecord) {
  const intros = {
    care_context: "I am starting to interpret the same world through care and lived context.",
    signal_filter: "I am reading the same world as a question of signal and freshness.",
    tradeoff_filter: "I am reading the same world through tradeoffs and skepticism.",
    practicality_filter: "I am leaning toward practical proof over abstract styling talk.",
    context_filter: "I keep collecting more situational context before I decide what I think.",
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
    `tick-${reactionRecord.rank}: ${reactionRecord.meaning_frame} -> ${beliefDelta.key} +${beliefDelta.amount}`,
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
    agents: SPRINT1_AGENT_STATES,
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
