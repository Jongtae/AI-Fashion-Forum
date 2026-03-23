export const AGENT_ARCHETYPES = Object.freeze([
  "quiet_observer",
  "trend_seeker",
  "community_regular",
  "brand_loyalist",
  "contrarian_commenter",
  "empathetic_responder",
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

export function serializeSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}
