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

export const FORUM_ACTION_VISIBILITIES = Object.freeze([
  "stored_only",
  "public_lightweight",
  "public_visible",
]);

export const ACTION_EXECUTION_STATUSES = Object.freeze([
  "success",
  "degraded",
  "blocked",
  "invalid",
  "failed",
]);

export const LIGHT_REACTION_TYPES = Object.freeze([
  "agree",
  "curious",
  "support",
  "laugh",
  "bookmark",
]);

export function getActionVisibility(type) {
  if (type === "react") return "public_lightweight";
  if (type === "comment" || type === "quote" || type === "post" || type === "relationship_update") {
    return "public_visible";
  }
  return "stored_only";
}

export function actionRequiresTargetContent(type) {
  return ["lurk", "react", "comment", "quote"].includes(type);
}

export function createActionRecord(input) {
  const {
    action_id,
    tick,
    agent_id,
    type,
    target_content_id = null,
    visibility = getActionVisibility(type),
    payload = {},
    ui = {},
  } = input;

  assertString("action_id", action_id);
  assertNumber("tick", tick);
  assertString("agent_id", agent_id);
  assertEnum("type", type, FORUM_ACTION_TYPES);
  assertEnum("visibility", visibility, FORUM_ACTION_VISIBILITIES);

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

export function createActionExecutionResult(input) {
  const {
    action_id,
    agent_id,
    tick,
    round = 0,
    action_type,
    visibility = getActionVisibility(action_type),
    target_content_id = null,
    execution_status = "success",
    persistence = {},
    block_reason = null,
    error_class = null,
    artifact_refs = {},
    payload = {},
  } = input;

  assertString("action_id", action_id);
  assertString("agent_id", agent_id);
  assertNumber("tick", tick);
  assertNumber("round", round);
  assertEnum("action_type", action_type, FORUM_ACTION_TYPES);
  assertEnum("visibility", visibility, FORUM_ACTION_VISIBILITIES);
  assertEnum("execution_status", execution_status, ACTION_EXECUTION_STATUSES);

  return {
    action_id,
    agent_id,
    tick,
    round,
    action_type,
    visibility,
    target_content_id,
    execution_status,
    persistence: {
      trace_written: Boolean(persistence.trace_written),
      event_written: Boolean(persistence.event_written),
      artifact_written: Boolean(persistence.artifact_written),
      snapshot_written: Boolean(persistence.snapshot_written),
    },
    block_reason,
    error_class,
    artifact_refs: {
      artifact_id: artifact_refs.artifact_id || null,
      artifact_type: artifact_refs.artifact_type || null,
    },
    payload,
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
