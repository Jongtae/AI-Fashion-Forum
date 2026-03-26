import test from "node:test";
import assert from "node:assert/strict";
import {
  actionRequiresTargetContent,
  createActionExecutionResult,
  createActionRecord,
  getActionVisibility,
} from "./action-schema.js";

test("createActionRecord infers visibility from action type", () => {
  const record = createActionRecord({
    action_id: "ACT:A01:1:react",
    tick: 1,
    agent_id: "A01",
    type: "react",
    target_content_id: "content-1",
  });

  assert.equal(record.visibility, "public_lightweight");
});

test("actionRequiresTargetContent matches visible content-followup actions", () => {
  assert.equal(actionRequiresTargetContent("silence"), false);
  assert.equal(actionRequiresTargetContent("lurk"), true);
  assert.equal(actionRequiresTargetContent("comment"), true);
  assert.equal(actionRequiresTargetContent("post"), false);
});

test("createActionExecutionResult normalizes persistence flags", () => {
  const result = createActionExecutionResult({
    action_id: "ACT:A01:2:comment",
    agent_id: "A01",
    tick: 2,
    round: 1,
    action_type: "comment",
    execution_status: "degraded",
    persistence: { trace_written: true, artifact_written: false },
    artifact_refs: { artifact_id: "post-1", artifact_type: "post" },
  });

  assert.equal(result.visibility, getActionVisibility("comment"));
  assert.equal(result.persistence.trace_written, true);
  assert.equal(result.persistence.snapshot_written, false);
  assert.equal(result.artifact_refs.artifact_id, "post-1");
});
