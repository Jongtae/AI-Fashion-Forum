import { MVP_DEMO_SCENARIO, createServiceStatus } from "@ai-fashion-forum/shared-types";

export function createSeedWorldBootstrap() {
  return {
    scenario: MVP_DEMO_SCENARIO,
    services: [
      createServiceStatus("forum-web", {
        role: "seed-world replay surface",
      }),
      createServiceStatus("sim-server", {
        role: "local simulation coordinator",
      }),
    ],
  };
}

export * from "./content-pipeline.js";
export * from "./content-indexing.js";
export * from "./forum-generation.js";
export * from "./identity-update-rules.js";
export * from "./memory-stack.js";
export * from "./action-space.js";
export * from "./tick-engine.js";
