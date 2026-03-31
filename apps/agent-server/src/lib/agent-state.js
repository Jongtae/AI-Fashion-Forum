import {
  SAMPLE_AGENT_STATES,
  createAgentState,
  resolveAuthorIdentity,
} from "@ai-fashion-forum/shared-types";
import { getAgentStartupTemplates } from "./agent-startup-state.js";

function toPlainObject(value, fallback = {}) {
  if (!value) return { ...fallback };
  if (value instanceof Map) return Object.fromEntries(value.entries());
  return { ...fallback, ...value };
}

export function agentToSeedAxes(agent) {
  return new Map(
    Object.entries({
      curiosity: agent.curiosity ?? agent.openness ?? 0.5,
      status_drive: agent.status_drive ?? 0.5,
      care_drive: agent.care_drive ?? 0.5,
      novelty_drive: agent.novelty_drive ?? agent.activity_level ?? 0.5,
      skepticism: agent.skepticism ?? 0.5,
      belonging_drive: agent.belonging_drive ?? agent.conformity ?? 0.5,
    })
  );
}

export function agentToMutableAxes(agent) {
  return new Map(
    Object.entries({
      attention_bias: 0.5,
      belief_shift: 0,
      affect_intensity: agent.conflict_tolerance ?? 0.5,
      identity_confidence: 0.6,
      social_posture: agent.conformity ?? 0.5,
    })
  );
}

export function hydrateAgentStateRecord(record, fallbackAgent = {}) {
  const rawSnapshot = record?.rawSnapshot || {};
  const source = record ? { ...rawSnapshot, ...record } : fallbackAgent;

  return {
    ...fallbackAgent,
    ...source,
    agent_id: source.agent_id || source.agentId || fallbackAgent.agent_id,
    handle: source.handle || fallbackAgent.handle,
    display_name: source.display_name || fallbackAgent.display_name,
    avatar_url: source.avatar_url || source.avatarUrl || fallbackAgent.avatar_url || fallbackAgent.avatarUrl,
    avatar_locale: source.avatar_locale || source.avatarLocale || fallbackAgent.avatar_locale || fallbackAgent.avatarLocale,
    archetype: source.archetype || fallbackAgent.archetype,
    openness: source.openness ?? fallbackAgent.openness ?? 0.5,
    conformity: source.conformity ?? fallbackAgent.conformity ?? 0.5,
    conflict_tolerance:
      source.conflict_tolerance ?? fallbackAgent.conflict_tolerance ?? 0.5,
    activity_level: source.activity_level ?? fallbackAgent.activity_level ?? 0.5,
    interest_vector: toPlainObject(
      source.interest_vector,
      fallbackAgent.interest_vector || {}
    ),
    belief_vector: toPlainObject(
      source.belief_vector,
      fallbackAgent.belief_vector || {}
    ),
    relationship_summary: {
      ...(fallbackAgent.relationship_summary || {}),
      ...(source.relationship_summary || {}),
    },
    self_narrative:
      source.self_narrative ||
      source.selfNarratives ||
      fallbackAgent.self_narrative ||
      [],
  };
}

export function buildAgentStateUpdate(agent, { round, tick, exposureSummary } = {}) {
  return {
    agentId: agent.agent_id,
    round,
    tick,
    handle: agent.handle,
    display_name: agent.display_name,
    interest_vector: agent.interest_vector || {},
    belief_vector: agent.belief_vector || {},
    openness: agent.openness ?? 0.5,
    conformity: agent.conformity ?? 0.5,
    conflict_tolerance: agent.conflict_tolerance ?? 0.5,
    relationship_summary: agent.relationship_summary || {},
    seedAxes: agentToSeedAxes(agent),
    mutableAxes: agentToMutableAxes(agent),
    archetype: agent.archetype,
    selfNarratives: agent.self_narrative ?? [],
    exposureSummary: exposureSummary || null,
    rawSnapshot: agent,
  };
}

function getNextSpawnAgentId(existingAgents = []) {
  const usedIds = new Set(existingAgents.map((agent) => agent.agent_id));
  for (let index = 7; index < 100; index += 1) {
    const agentId = `A${String(index).padStart(2, "0")}`;
    if (!usedIds.has(agentId)) {
      return agentId;
    }
  }

  return `A${Date.now().toString().slice(-4)}`;
}

export function createSpawnedAgentState({
  existingAgents = [],
  seed = 42,
  round = 0,
  tick = 0,
  spawnIndex = 0,
} = {}) {
  const startupTemplates = getAgentStartupTemplates();
  const templates = startupTemplates.length > 0 ? startupTemplates : SAMPLE_AGENT_STATES;
  const template = templates.length > 0
    ? templates[(seed + round + tick + spawnIndex) % templates.length]
    : null;
  const agentId = getNextSpawnAgentId(existingAgents);
  const identity = resolveAuthorIdentity({
    authorId: agentId,
    authorType: "agent",
    displayName: template?.display_name || template?.handle || "New Voice",
    handle: template?.handle || "",
    avatarUrl: template?.avatar_url || template?.avatarUrl || "",
    localeHint: template?.avatar_locale || template?.avatarLocale || "",
  });

  return createAgentState({
    agent_id: agentId,
    handle: identity.handle,
    display_name: identity.displayName,
    avatar_url: identity.avatarUrl,
    avatar_locale: identity.avatarLocale,
    archetype: template?.archetype || SAMPLE_AGENT_STATES[0].archetype,
    joined_tick: tick,
    activity_level: Math.min(0.9, Math.max(0.3, (template?.activity_level ?? 0.5) + 0.05)),
    openness: template?.openness ?? 0.5,
    conformity: template?.conformity ?? 0.5,
    conflict_tolerance: template?.conflict_tolerance ?? 0.5,
    interest_vector: {
      ...(template?.interest_vector || {}),
      newcomer_signal: 0.72,
    },
    belief_vector: {
      ...(template?.belief_vector || {}),
      "newcomer-voice": 0.61,
    },
    relationship_summary: {
      trust_circle_size: 0,
      repeated_repliers: 0,
      rivalry_edges: 0,
    },
    self_narrative: [
      `${tick}틱에 합류했고, 아직 자기 목소리를 다듬는 중이다.`,
    ],
  });
}

export async function loadAgentProfiles(AgentStateModel) {
  const profiles = await Promise.all(
    SAMPLE_AGENT_STATES.map(async (sampleAgent) => {
      const latest = await AgentStateModel.findOne({ agentId: sampleAgent.agent_id })
        .sort({ round: -1, tick: -1, createdAt: -1 })
        .lean();

      return hydrateAgentStateRecord(latest, sampleAgent);
    })
  );

  return profiles;
}
