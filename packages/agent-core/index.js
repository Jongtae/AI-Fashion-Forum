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
export * from "./memory-stack.js";
export * from "./tick-engine.js";
