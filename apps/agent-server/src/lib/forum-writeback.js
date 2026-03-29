const DISABLED_VALUES = new Set(["0", "false", "off", "disabled", "dry-run", "test"]);
const ENABLED_VALUES = new Set(["1", "true", "on", "enabled", "write"]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function getForumWritebackMode(env = process.env) {
  const explicit = normalize(env.AGENT_FORUM_WRITEBACK);
  if (ENABLED_VALUES.has(explicit)) {
    return "on";
  }

  if (DISABLED_VALUES.has(explicit)) {
    return "off";
  }

  if (env.NODE_ENV === "test" || env.NODE_TEST_CONTEXT) {
    return "off";
  }

  return "on";
}

export function shouldWriteForumArtifacts(env = process.env) {
  return getForumWritebackMode(env) === "on";
}
