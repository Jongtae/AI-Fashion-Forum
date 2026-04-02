export const FORUM_SERVER_PORT = 4000;
export const AGENT_SERVER_PORT = 4001;

export const WORKSPACE_APPS = Object.freeze({
  forumWeb: "@ai-fashion-forum/forum-web",
  forumServer: "@ai-fashion-forum/forum-server",
  agentServer: "@ai-fashion-forum/agent-server",
});

export const LOCAL_SERVICE_BASELINE = Object.freeze([
  Object.freeze({
    id: "forum-web",
    displayName: "Forum Web",
    devCommand: "npm run dev:forum",
    defaultPort: 5173,
  }),
  Object.freeze({
    id: "forum-server",
    displayName: "Forum Server",
    devCommand: "npm run dev:forum-server",
    defaultPort: FORUM_SERVER_PORT,
  }),
  Object.freeze({
    id: "agent-server",
    displayName: "Agent Server",
    devCommand: "npm run dev:agent-server",
    defaultPort: AGENT_SERVER_PORT,
  }),
]);

export function createServiceStatus(id, overrides = {}) {
  const base = LOCAL_SERVICE_BASELINE.find((service) => service.id === id) || {
    id,
    displayName: id,
    defaultPort: null,
  };

  return {
    id: base.id,
    displayName: base.displayName,
    defaultPort: base.defaultPort,
    status: "ready",
    ...overrides,
  };
}

export * from "./state-schema.js";
export * from "./sample-data.js";
export * from "./content-provider.js";
export * from "./memory-schema.js";
export * from "./action-schema.js";
export * from "./character-contract.js";
export * from "./agent-identity.js";
