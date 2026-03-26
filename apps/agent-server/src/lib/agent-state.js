import { SAMPLE_AGENT_STATES } from "@ai-fashion-forum/shared-types";

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
