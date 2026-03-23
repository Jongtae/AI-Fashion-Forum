export const WORKSPACE_APPS = Object.freeze({
  forumWeb: "@ai-fashion-forum/forum-web",
  simServer: "@ai-fashion-forum/sim-server",
});

export const SIM_SERVER_PORT = 4318;

export const MVP_DEMO_SCENARIO = Object.freeze({
  id: "mvp-v1-seed-world",
  name: "MVP-v1 Seed World",
  description: "Identity-forming fashion forum seed world with replay-friendly local services.",
  primaryLayer: "seed-world realism",
});

export const LOCAL_SERVICE_BASELINE = Object.freeze([
  Object.freeze({
    id: "forum-web",
    displayName: "Forum Web",
    devCommand: "npm run dev:forum",
    defaultPort: 5173,
  }),
  Object.freeze({
    id: "sim-server",
    displayName: "Sim Server",
    devCommand: "npm run dev:sim",
    defaultPort: SIM_SERVER_PORT,
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
