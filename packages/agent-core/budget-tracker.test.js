import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBudgetTracker, ESTIMATED_COST_PER_CALL } from "./budget-tracker.js";

describe("createBudgetTracker", () => {
  it("starts with zero spent", () => {
    const t = createBudgetTracker({ budgetCapUsd: 2.0 });
    assert.equal(t.spentUsd, 0);
    assert.equal(t.totalCalls, 0);
    assert.equal(t.exhausted, false);
  });

  it("tracks calls and accumulates cost", () => {
    const t = createBudgetTracker({ budgetCapUsd: 2.0 });
    t.record();
    t.record();
    assert.equal(t.totalCalls, 2);
    assert.ok(t.spentUsd > 0);
    assert.ok(t.remainingUsd < 2.0);
  });

  it("reports exhausted when budget exceeded", () => {
    const t = createBudgetTracker({ budgetCapUsd: 0.01 });
    // 0.01 / ~0.003 per call ≈ 3-4 calls to exhaust
    for (let i = 0; i < 10; i++) t.record();
    assert.equal(t.exhausted, true);
    assert.equal(t.remainingUsd, 0);
  });

  it("canAfford returns false when budget too low", () => {
    const t = createBudgetTracker({ budgetCapUsd: 0.005 });
    assert.ok(t.canAfford(1));
    // exhaust: 0.005 / ~0.003 ≈ 1-2 calls
    t.record();
    t.record();
    t.record();
    assert.equal(t.canAfford(1), false);
  });

  it("canAfford checks for N calls ahead", () => {
    const t = createBudgetTracker({ budgetCapUsd: 2.0 });
    // 2.0 / ~0.003 ≈ 666 calls
    assert.ok(t.canAfford(600));
    assert.equal(t.canAfford(700), false);
  });

  it("snapshot returns structured data", () => {
    const t = createBudgetTracker({ budgetCapUsd: 1.5 });
    t.record();
    const snap = t.snapshot();
    assert.equal(snap.budgetCapUsd, 1.5);
    assert.equal(snap.totalCalls, 1);
    assert.ok(snap.spentUsd > 0);
    assert.ok(snap.remainingUsd < 1.5);
    assert.equal(snap.exhausted, false);
  });

  it("accepts custom token counts", () => {
    const t = createBudgetTracker({ budgetCapUsd: 2.0 });
    t.record({ inputTokens: 1000, outputTokens: 500 });
    // (1000 * 2.5 + 500 * 10) / 1_000_000 = 0.0075
    assert.ok(Math.abs(t.spentUsd - 0.0075) < 0.001);
  });
});
