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

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
}

export const FORUM_ACTION_TYPES = Object.freeze([
  "silence",
  "lurk",
  "react",
  "comment",
  "quote",
  "post",
  "relationship_update",
]);

export const LIGHT_REACTION_TYPES = Object.freeze([
  "agree",
  "curious",
  "support",
  "laugh",
  "bookmark",
]);

export function createActionRecord(input) {
  const {
    action_id,
    tick,
    agent_id,
    type,
    target_content_id = null,
    visibility = "stored_only",
    payload = {},
    ui = {},
  } = input;

  assertString("action_id", action_id);
  assertNumber("tick", tick);
  assertString("agent_id", agent_id);
  assertEnum("type", type, FORUM_ACTION_TYPES);
  assertString("visibility", visibility);

  return {
    action_id,
    tick,
    agent_id,
    type,
    target_content_id,
    visibility,
    payload,
    ui,
  };
}

export function createLightReactionPayload(input) {
  const {
    reaction_type,
    target_content_id,
    intensity = 0.5,
    reason,
  } = input;

  assertEnum("reaction_type", reaction_type, LIGHT_REACTION_TYPES);
  assertString("target_content_id", target_content_id);
  assertNumber("intensity", intensity);
  assertString("reason", reason);

  return {
    reaction_type,
    target_content_id,
    intensity,
    reason,
  };
}
