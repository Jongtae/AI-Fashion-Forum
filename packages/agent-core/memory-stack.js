import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  SAMPLE_AGENT_STATES,
  SAMPLE_STATE_SNAPSHOT,
  createDurableMemoryRecord,
  createMemoryStoreSnapshot,
  createNarrativeEntry,
  createRecentMemoryItem,
  serializeSnapshot,
} from "@ai-fashion-forum/shared-types";

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
