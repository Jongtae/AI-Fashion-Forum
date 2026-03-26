import test from "node:test";
import assert from "node:assert/strict";
import {
  createMemoryWritebackRecord,
  createPersistedAgentSnapshot,
} from "./state-schema.js";

test("createMemoryWritebackRecord preserves linkage keys", () => {
  const record = createMemoryWritebackRecord({
    writeback_id: "WB:A01:3:belief",
    action_id: "ACT:A01:3:comment",
    agent_id: "A01",
    round: 2,
    tick: 3,
    belief_key: "fit-before-brand",
    dominant_topic: "office_style",
    state_delta: { belief_delta: 0.12 },
  });

  assert.equal(record.action_id, "ACT:A01:3:comment");
  assert.equal(record.round, 2);
  assert.equal(record.memory_channel, "belief_shift");
});

test("createPersistedAgentSnapshot stores writeback references", () => {
  const snapshot = createPersistedAgentSnapshot({
    snapshot_id: "SNAP:A01:2:3",
    agent_id: "A01",
    round: 2,
    tick: 3,
    source_action_id: "ACT:A01:3:comment",
    writeback_ids: ["WB:A01:3:belief"],
    memory_writebacks: [{ writeback_id: "WB:A01:3:belief" }],
    raw_snapshot: { agent_id: "A01" },
  });

  assert.equal(snapshot.source_action_id, "ACT:A01:3:comment");
  assert.deepEqual(snapshot.writeback_ids, ["WB:A01:3:belief"]);
});
