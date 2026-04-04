import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPopulationGrowthPlan } from "./population-growth.js";

test("buildPopulationGrowthPlan grows gradually on a fixed interval", () => {
  const initial = 6;
  const max = 20;
  const start = buildPopulationGrowthPlan({ elapsedTicks: 0, currentCount: initial, initialCount: initial, maxCount: max });
  const mid = buildPopulationGrowthPlan({ elapsedTicks: 4, currentCount: initial, initialCount: initial, maxCount: max });
  const later = buildPopulationGrowthPlan({ elapsedTicks: 8, currentCount: initial + 1, initialCount: initial, maxCount: max });

  assert.equal(start.desiredCount, initial);
  assert.equal(start.shouldSpawn, false);
  assert.equal(mid.desiredCount, initial + 1);
  assert.equal(mid.shouldSpawn, true);
  assert.equal(mid.nextSpawnAtTick, 8);
  assert.equal(later.desiredCount, initial + 2);
  assert.equal(later.shouldSpawn, true);
});

test("buildPopulationGrowthPlan saturates at the maximum count", () => {
  const max = 10;
  const plan = buildPopulationGrowthPlan({
    elapsedTicks: 200,
    currentCount: max,
    initialCount: 6,
    maxCount: max,
  });

  assert.equal(plan.desiredCount, max);
  assert.equal(plan.nextSpawnAtTick, null);
  assert.equal(plan.growthStage, "saturated");
});

