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

export function createRecentMemoryItem(input) {
  const {
    memory_id,
    agent_id,
    tick,
    kind = "recent_experience",
    summary,
    details = {},
  } = input;

  assertString("memory_id", memory_id);
  assertString("agent_id", agent_id);
  assertNumber("tick", tick);
  assertString("kind", kind);
  assertString("summary", summary);

  return {
    memory_id,
    agent_id,
    tick,
    kind,
    summary,
    details,
  };
}

export function createDurableMemoryRecord(input) {
  const {
    memory_id,
    agent_id,
    tick,
    summary,
    salience = 0.5,
    tags = [],
    source = "tick_summary",
    details = {},
  } = input;

  assertString("memory_id", memory_id);
  assertString("agent_id", agent_id);
  assertNumber("tick", tick);
  assertString("summary", summary);
  assertNumber("salience", salience);
  assertString("source", source);

  return {
    memory_id,
    agent_id,
    tick,
    summary,
    salience,
    tags,
    source,
    details,
  };
}

export function createNarrativeEntry(input) {
  const {
    narrative_id,
    agent_id,
    tick,
    text,
    source_memory_id,
    tone = "reflective",
  } = input;

  assertString("narrative_id", narrative_id);
  assertString("agent_id", agent_id);
  assertNumber("tick", tick);
  assertString("text", text);
  assertString("source_memory_id", source_memory_id);
  assertString("tone", tone);

  return {
    narrative_id,
    agent_id,
    tick,
    text,
    source_memory_id,
    tone,
  };
}

export function createMemoryStoreSnapshot({
  durableMemories = [],
  selfNarratives = [],
} = {}) {
  return {
    durableMemories,
    selfNarratives,
  };
}
