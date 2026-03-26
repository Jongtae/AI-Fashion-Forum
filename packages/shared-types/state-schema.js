export const AGENT_ARCHETYPES = Object.freeze([
  "quiet_observer",
  "trend_seeker",
  "community_regular",
  "brand_loyalist",
  "contrarian_commenter",
  "empathetic_responder",
]);

export const AGENT_SEED_AXES = Object.freeze([
  "curiosity",
  "status_drive",
  "care_drive",
  "novelty_drive",
  "skepticism",
  "belonging_drive",
]);

export const AGENT_MUTABLE_AXES = Object.freeze([
  "attention_bias",
  "belief_shift",
  "affect_intensity",
  "identity_confidence",
  "social_posture",
]);

export const CONTENT_SOURCE_TYPES = Object.freeze([
  "forum_post",
  "external_article",
  "social_post",
  "image_description",
]);

export const CONTENT_FORMATS = Object.freeze([
  "outfit_check",
  "buy_decision",
  "size_help",
  "daily_snapshot",
  "pet_episode",
  "empathy_post",
  "trend_report",
  "style_signal",
  "scene_note",
]);

export const GRAPH_NODE_LABELS = Object.freeze({
  agent: "Agent",
  content: "Content",
  topic: "Topic",
  cluster: "TasteCluster",
});

export const GRAPH_RELATION_TYPES = Object.freeze({
  follows: "FOLLOWS",
  trusts: "TRUSTS",
  distrusts: "DISTRUSTS",
  interestedIn: "INTERESTED_IN",
  authored: "AUTHORED",
  reactedTo: "REACTED_TO",
  exposedTo: "EXPOSED_TO",
  alignedWith: "ALIGNED_WITH",
});

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
}

function assertString(name, value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertNumber(name, value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a valid number`);
  }
}

function assertArray(name, value) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function assertObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

export function createAgentSeedProfile(input) {
  const {
    seed_id,
    archetype_hint,
    baseline_traits = {},
    interest_seeds = {},
    value_seeds = {},
    emotional_bias = {},
    voice_notes = [],
  } = input;

  assertString("seed_id", seed_id);
  assertString("archetype_hint", archetype_hint);
  assertObject("baseline_traits", baseline_traits);
  assertObject("interest_seeds", interest_seeds);
  assertObject("value_seeds", value_seeds);
  assertObject("emotional_bias", emotional_bias);
  assertArray("voice_notes", voice_notes);

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

export function createAgentMutableState(input) {
  const {
    current_traits = {},
    current_interests = {},
    current_beliefs = {},
    attention_bias = {},
    affect_state = {},
    self_narrative_summary = "",
    recent_arc = "stable",
    stance_markers = [],
    drift_log = [],
  } = input;

  assertObject("current_traits", current_traits);
  assertObject("current_interests", current_interests);
  assertObject("current_beliefs", current_beliefs);
  assertObject("attention_bias", attention_bias);
  assertObject("affect_state", affect_state);

  if (self_narrative_summary && typeof self_narrative_summary !== "string") {
    throw new Error("self_narrative_summary must be a string");
  }

  if (recent_arc && typeof recent_arc !== "string") {
    throw new Error("recent_arc must be a string");
  }

  assertArray("stance_markers", stance_markers);
  assertArray("drift_log", drift_log);

  return {
    current_traits,
    current_interests,
    current_beliefs,
    attention_bias,
    affect_state,
    self_narrative_summary,
    recent_arc,
    stance_markers,
    drift_log,
  };
}

export function createAgentState(input) {
  const {
    agent_id,
    handle,
    display_name,
    archetype,
    joined_tick = 0,
    activity_level = 0.5,
    openness = 0.5,
    conformity = 0.5,
    conflict_tolerance = 0.5,
    memory_window = 12,
    interest_vector = {},
    belief_vector = {},
    relationship_summary = {},
    self_narrative = [],
    seed_profile = null,
    mutable_state = null,
  } = input;

  assertString("agent_id", agent_id);
  assertString("handle", handle);
  assertString("display_name", display_name);
  assertEnum("archetype", archetype, AGENT_ARCHETYPES);
  assertNumber("joined_tick", joined_tick);
  assertNumber("activity_level", activity_level);
  assertNumber("openness", openness);
  assertNumber("conformity", conformity);
  assertNumber("conflict_tolerance", conflict_tolerance);
  assertNumber("memory_window", memory_window);

  return {
    agent_id,
    handle,
    display_name,
    archetype,
    joined_tick,
    activity_level,
    openness,
    conformity,
    conflict_tolerance,
    memory_window,
    interest_vector,
    belief_vector,
    relationship_summary,
    self_narrative,
    seed_profile,
    mutable_state,
  };
}

export function createContentRecord(input) {
  const {
    content_id,
    author_id,
    source_type,
    format,
    created_tick,
    title,
    body,
    topics = [],
    emotions = [],
    source_metadata = {},
  } = input;

  assertString("content_id", content_id);
  assertString("author_id", author_id);
  assertEnum("source_type", source_type, CONTENT_SOURCE_TYPES);
  assertEnum("format", format, CONTENT_FORMATS);
  assertNumber("created_tick", created_tick);
  assertString("title", title);
  assertString("body", body);
  assertArray("topics", topics);
  assertArray("emotions", emotions);

  return {
    content_id,
    author_id,
    source_type,
    format,
    created_tick,
    title,
    body,
    topics,
    emotions,
    source_metadata,
  };
}

export function createGraphNode(input) {
  const { node_id, label, properties = {} } = input;
  assertString("node_id", node_id);
  assertString("label", label);

  return {
    node_id,
    label,
    properties,
  };
}

export function createGraphRelation(input) {
  const { relation_id, from, to, type, weight = 0.5, properties = {} } = input;
  assertString("relation_id", relation_id);
  assertString("from", from);
  assertString("to", to);
  assertString("type", type);
  assertNumber("weight", weight);

  return {
    relation_id,
    from,
    to,
    type,
    weight,
    properties,
  };
}

export function createStateSnapshot({ agents = [], contents = [], nodes = [], relations = [] } = {}) {
  assertArray("agents", agents);
  assertArray("contents", contents);
  assertArray("nodes", nodes);
  assertArray("relations", relations);

  return {
    agents,
    contents,
    graph: {
      nodes,
      relations,
    },
  };
}

export function createAgentRoundSnapshot(input) {
  const {
    snapshot_id,
    tick,
    agent_id,
    exposure_summary = {},
    reaction_summary = {},
    identity_delta = {},
    memory_write_summary = {},
    generated_post_ids = [],
    self_narrative_summary = "",
  } = input;

  assertString("snapshot_id", snapshot_id);
  assertNumber("tick", tick);
  assertString("agent_id", agent_id);
  assertObject("exposure_summary", exposure_summary);
  assertObject("reaction_summary", reaction_summary);
  assertObject("identity_delta", identity_delta);
  assertObject("memory_write_summary", memory_write_summary);
  assertArray("generated_post_ids", generated_post_ids);

  if (self_narrative_summary && typeof self_narrative_summary !== "string") {
    throw new Error("self_narrative_summary must be a string");
  }

  return {
    snapshot_id,
    tick,
    agent_id,
    exposure_summary,
    reaction_summary,
    identity_delta,
    memory_write_summary,
    generated_post_ids,
    self_narrative_summary,
  };
}

export function createSimulationRoundSnapshot({
  round_id,
  tick,
  agent_snapshots = [],
  shared_content_ids = [],
  notes = [],
} = {}) {
  assertString("round_id", round_id);
  assertNumber("tick", tick);
  assertArray("agent_snapshots", agent_snapshots);
  assertArray("shared_content_ids", shared_content_ids);
  assertArray("notes", notes);

  return {
    round_id,
    tick,
    agent_snapshots,
    shared_content_ids,
    notes,
  };
}

export function createMemoryWritebackRecord(input) {
  const {
    writeback_id,
    action_id = null,
    agent_id,
    round = 0,
    tick,
    execution_status = "success",
    memory_channel = "belief_shift",
    belief_key = null,
    dominant_topic = null,
    summary = "",
    state_delta = {},
  } = input;

  assertString("writeback_id", writeback_id);
  if (action_id !== null) {
    assertString("action_id", action_id);
  }
  assertString("agent_id", agent_id);
  assertNumber("round", round);
  assertNumber("tick", tick);
  assertString("execution_status", execution_status);
  assertString("memory_channel", memory_channel);
  assertObject("state_delta", state_delta);

  if (belief_key !== null) {
    assertString("belief_key", belief_key);
  }
  if (dominant_topic !== null) {
    assertString("dominant_topic", dominant_topic);
  }
  if (summary && typeof summary !== "string") {
    throw new Error("summary must be a string");
  }

  return {
    writeback_id,
    action_id,
    agent_id,
    round,
    tick,
    execution_status,
    memory_channel,
    belief_key,
    dominant_topic,
    summary,
    state_delta,
  };
}

export function createPersistedAgentSnapshot(input) {
  const {
    snapshot_id,
    agent_id,
    round,
    tick,
    source_action_id = null,
    execution_status = "success",
    writeback_ids = [],
    exposure_summary = {},
    reaction_summary = {},
    memory_writebacks = [],
    raw_snapshot = {},
  } = input;

  assertString("snapshot_id", snapshot_id);
  assertString("agent_id", agent_id);
  assertNumber("round", round);
  assertNumber("tick", tick);
  if (source_action_id !== null) {
    assertString("source_action_id", source_action_id);
  }
  assertString("execution_status", execution_status);
  assertArray("writeback_ids", writeback_ids);
  assertObject("exposure_summary", exposure_summary);
  assertObject("reaction_summary", reaction_summary);
  assertArray("memory_writebacks", memory_writebacks);
  assertObject("raw_snapshot", raw_snapshot);

  return {
    snapshot_id,
    agent_id,
    round,
    tick,
    source_action_id,
    execution_status,
    writeback_ids,
    exposure_summary,
    reaction_summary,
    memory_writebacks,
    raw_snapshot,
  };
}

export function serializeSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}
