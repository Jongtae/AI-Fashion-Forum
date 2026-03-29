import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPopulationGrowthPlan,
  DEFAULT_AGENT_MAX_COUNT,
  DEFAULT_INITIAL_AGENT_COUNT,
} from "./population-growth.js";

test("buildPopulationGrowthPlan grows gradually on a fixed interval", () => {
  const start = buildPopulationGrowthPlan({ elapsedTicks: 0, currentCount: DEFAULT_INITIAL_AGENT_COUNT });
  const mid = buildPopulationGrowthPlan({ elapsedTicks: 4, currentCount: DEFAULT_INITIAL_AGENT_COUNT });
  const later = buildPopulationGrowthPlan({ elapsedTicks: 8, currentCount: DEFAULT_INITIAL_AGENT_COUNT + 1 });

  assert.equal(start.desiredCount, DEFAULT_INITIAL_AGENT_COUNT);
  assert.equal(start.shouldSpawn, false);
  assert.equal(mid.desiredCount, DEFAULT_INITIAL_AGENT_COUNT + 1);
  assert.equal(mid.shouldSpawn, true);
  assert.equal(mid.nextSpawnAtTick, 8);
  assert.equal(later.desiredCount, DEFAULT_INITIAL_AGENT_COUNT + 2);
  assert.equal(later.shouldSpawn, true);
});

test("buildPopulationGrowthPlan saturates at the maximum count", () => {
  const plan = buildPopulationGrowthPlan({
    elapsedTicks: 200,
    currentCount: DEFAULT_AGENT_MAX_COUNT,
  });

  assert.equal(plan.desiredCount, DEFAULT_AGENT_MAX_COUNT);
  assert.equal(plan.nextSpawnAtTick, null);
  assert.equal(plan.growthStage, "saturated");
});

