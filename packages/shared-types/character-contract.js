const CHARACTER_OVERRIDE_FIELDS = Object.freeze([
  "handle",
  "display_name",
  "archetype",
  "interest_vector",
  "belief_vector",
  "self_narrative",
  "seed_profile",
  "mutable_state",
]);

function assertObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertString(name, value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertArray(name, value) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function sanitizeToken(value, fallback = "custom") {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return token || fallback;
}

function normalizeSeedProfile(seedProfile = {}, archetype = "custom") {
  if (seedProfile === null) {
    return null;
  }

  assertObject("seed_profile", seedProfile);

  const {
    seed_id = null,
    archetype_hint = archetype,
    baseline_traits = {},
    interest_seeds = {},
    value_seeds = {},
    emotional_bias = {},
    voice_notes = [],
  } = seedProfile;

  if (seed_id !== null) {
    assertString("seed_profile.seed_id", seed_id);
  }
  assertString("seed_profile.archetype_hint", archetype_hint);
  assertObject("seed_profile.baseline_traits", baseline_traits);
  assertObject("seed_profile.interest_seeds", interest_seeds);
  assertObject("seed_profile.value_seeds", value_seeds);
  assertObject("seed_profile.emotional_bias", emotional_bias);
  assertArray("seed_profile.voice_notes", voice_notes);

  return {
    seed_id,
    archetype_hint,
    baseline_traits,
    interest_seeds,
    value_seeds,
    emotional_bias,
    voice_notes,
  };
}

function normalizeCharacterSummary(agent = {}) {
  return {
    handle: agent.handle || null,
    display_name: agent.display_name || null,
    archetype: agent.archetype || null,
    interest_keys: Object.keys(agent.interest_vector || {}).sort(),
    belief_keys: Object.keys(agent.belief_vector || {}).sort(),
    narrative_count: Array.isArray(agent.self_narrative) ? agent.self_narrative.length : 0,
    seed_id: agent.seed_profile?.seed_id || null,
    voice_notes: agent.seed_profile?.voice_notes || [],
  };
}

export function createCharacterContractFromAgent(agent = {}, options = {}) {
  const {
    source = "state_seed",
    fields_applied = [],
  } = options;

  assertObject("agent", agent);
  assertString("agent.agent_id", agent.agent_id);

  const summary = normalizeCharacterSummary(agent);
  const contractToken = sanitizeToken(
    summary.seed_id || summary.handle || summary.display_name || summary.archetype || "runtime"
  );

  return {
    character_contract_id: `CHAR:${agent.agent_id}:${contractToken}`,
    source,
    fields_applied,
    summary,
  };
}

export function createCharacterOverride(input = {}) {
  assertObject("character_override", input);

  const {
    agent_id,
    handle,
    display_name,
    archetype,
    interest_vector,
    belief_vector,
    self_narrative,
    seed_profile,
    mutable_state,
  } = input;

  assertString("character_override.agent_id", agent_id);

  if (handle !== undefined) assertString("character_override.handle", handle);
  if (display_name !== undefined) assertString("character_override.display_name", display_name);
  if (archetype !== undefined) assertString("character_override.archetype", archetype);
  if (interest_vector !== undefined) assertObject("character_override.interest_vector", interest_vector);
  if (belief_vector !== undefined) assertObject("character_override.belief_vector", belief_vector);
  if (self_narrative !== undefined) assertArray("character_override.self_narrative", self_narrative);
  if (mutable_state !== undefined) assertObject("character_override.mutable_state", mutable_state);

  const normalized = {
    agent_id,
    ...(handle !== undefined ? { handle } : {}),
    ...(display_name !== undefined ? { display_name } : {}),
    ...(archetype !== undefined ? { archetype } : {}),
    ...(interest_vector !== undefined ? { interest_vector } : {}),
    ...(belief_vector !== undefined ? { belief_vector } : {}),
    ...(self_narrative !== undefined ? { self_narrative } : {}),
    ...(seed_profile !== undefined ? { seed_profile: normalizeSeedProfile(seed_profile, archetype || "custom") } : {}),
    ...(mutable_state !== undefined ? { mutable_state } : {}),
  };

  return {
    ...normalized,
    fields_applied: CHARACTER_OVERRIDE_FIELDS.filter((field) => field in normalized),
  };
}

export function ensureStateCharacterContracts(state = {}) {
  assertObject("state", state);
  assertArray("state.agents", state.agents || []);

  return {
    ...state,
    agents: (state.agents || []).map((agent) => ({
      ...agent,
      character_contract:
        agent.character_contract || createCharacterContractFromAgent(agent, { source: "state_seed" }),
    })),
  };
}

export function applyCharacterOverrideToAgent(agent = {}, override = {}) {
  const normalizedOverride = createCharacterOverride(override);

  if (agent.agent_id !== normalizedOverride.agent_id) {
    throw new Error("character_override.agent_id must match target agent");
  }

  const mergedAgent = {
    ...agent,
    ...(normalizedOverride.handle !== undefined ? { handle: normalizedOverride.handle } : {}),
    ...(normalizedOverride.display_name !== undefined
      ? { display_name: normalizedOverride.display_name }
      : {}),
    ...(normalizedOverride.archetype !== undefined ? { archetype: normalizedOverride.archetype } : {}),
    interest_vector: normalizedOverride.interest_vector
      ? { ...(agent.interest_vector || {}), ...normalizedOverride.interest_vector }
      : (agent.interest_vector || {}),
    belief_vector: normalizedOverride.belief_vector
      ? { ...(agent.belief_vector || {}), ...normalizedOverride.belief_vector }
      : (agent.belief_vector || {}),
    self_narrative: normalizedOverride.self_narrative
      ? [...normalizedOverride.self_narrative]
      : (agent.self_narrative || []),
    seed_profile: normalizedOverride.seed_profile
      ? {
          ...(agent.seed_profile || {}),
          ...normalizedOverride.seed_profile,
        }
      : (agent.seed_profile || null),
    mutable_state: normalizedOverride.mutable_state
      ? {
          ...(agent.mutable_state || {}),
          ...normalizedOverride.mutable_state,
        }
      : (agent.mutable_state || null),
  };

  return {
    ...mergedAgent,
    character_contract: createCharacterContractFromAgent(mergedAgent, {
      source: "invoke_override",
      fields_applied: normalizedOverride.fields_applied,
    }),
  };
}

export function applyCharacterOverridesToState(state = {}, overrides = []) {
  const normalizedState = ensureStateCharacterContracts(state);
  assertArray("character_overrides", overrides);

  if (overrides.length === 0) {
    return {
      state: normalizedState,
      appliedOverrides: [],
    };
  }

  const overridesByAgent = new Map(
    overrides.map((override) => {
      const normalizedOverride = createCharacterOverride(override);
      return [normalizedOverride.agent_id, normalizedOverride];
    })
  );

  const appliedOverrides = [];

  return {
    state: {
      ...normalizedState,
      agents: normalizedState.agents.map((agent) => {
        const override = overridesByAgent.get(agent.agent_id);
        if (!override) {
          return agent;
        }

        const updatedAgent = applyCharacterOverrideToAgent(agent, override);
        appliedOverrides.push({
          agent_id: agent.agent_id,
          character_contract_id: updatedAgent.character_contract.character_contract_id,
          fields_applied: updatedAgent.character_contract.fields_applied,
          summary: updatedAgent.character_contract.summary,
        });
        return updatedAgent;
      }),
    },
    appliedOverrides,
  };
}
