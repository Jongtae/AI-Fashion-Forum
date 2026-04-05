import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runTicks,
  createBaselineWorldRules,
  serializeTickState,
  deserializeTickState,
} from "./tick-engine.js";

describe("serializeTickState / deserializeTickState roundtrip", () => {
  it("does not append raw tick-system narration to agent self narrative", () => {
    const result = runTicks({
      seed: 42,
      tickCount: 12,
      worldRules: createBaselineWorldRules(),
    });

    const allNarratives = result.finalState.agents.flatMap((agent) => agent.self_narrative || []);
    assert.ok(allNarratives.length > 0);
    assert.ok(allNarratives.every((entry) => !/^\d+틱: 눈에 보이는 글을 남겼다\./.test(String(entry))));
  });

  it("preserves seed, tick count, and final tick", () => {
    const result = runTicks({
      seed: 77,
      tickCount: 5,
      worldRules: createBaselineWorldRules(),
    });

    const serialized = serializeTickState(result);
    const restored = deserializeTickState(serialized);

    assert.equal(restored.seed, 77);
    assert.equal(restored.tickCount, 5);
    assert.equal(restored.finalTick, result.finalTick);
  });

  it("preserves finalState agents after roundtrip", () => {
    const result = runTicks({
      seed: 42,
      tickCount: 3,
      worldRules: createBaselineWorldRules(),
    });

    const serialized = serializeTickState(result);
    const restored = deserializeTickState(serialized);

    assert.equal(restored.finalState.agents.length, result.finalState.agents.length);

    for (let i = 0; i < result.finalState.agents.length; i++) {
      assert.equal(restored.finalState.agents[i].agent_id, result.finalState.agents[i].agent_id);
      assert.equal(restored.finalState.agents[i].activity_level, result.finalState.agents[i].activity_level);
    }
  });

  it("preserves replay entries after roundtrip", () => {
    const result = runTicks({
      seed: 42,
      tickCount: 4,
      worldRules: createBaselineWorldRules(),
    });

    const serialized = serializeTickState(result);
    const restored = deserializeTickState(serialized);

    assert.equal(restored.entries.length, result.entries.length);
    for (let i = 0; i < result.entries.length; i++) {
      assert.equal(restored.entries[i].tick, result.entries[i].tick);
      assert.equal(restored.entries[i].action, result.entries[i].action);
      assert.equal(restored.entries[i].actor_id, result.entries[i].actor_id);
    }
  });

  it("serialized state is a deep copy (no shared references)", () => {
    const result = runTicks({ seed: 42, tickCount: 2 });
    const serialized = serializeTickState(result);

    // Mutate original
    result.finalState.agents[0].activity_level = 999;

    const restored = deserializeTickState(serialized);
    assert.notEqual(restored.finalState.agents[0].activity_level, 999);
  });

  it("restored state can seed a new runTicks call", () => {
    const first = runTicks({
      seed: 42,
      tickCount: 3,
      worldRules: createBaselineWorldRules(),
    });

    const serialized = serializeTickState(first);
    const restored = deserializeTickState(serialized);

    // Use restored state as initial state for continuation
    const continuation = runTicks({
      seed: restored.seed + 1,
      tickCount: 2,
      initialState: restored.finalState,
      worldRules: createBaselineWorldRules(),
    });

    assert.equal(continuation.entries.length, 2);
    assert.equal(continuation.finalState.agents.length, restored.finalState.agents.length);
  });
});
