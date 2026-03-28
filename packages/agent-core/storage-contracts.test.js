import { test } from "node:test";
import * as assert from "node:assert";
import {
  validateActionRequest,
  validateActionExecutionResult,
  validateSnapshot,
  validateEvent,
  validateTrace,
  validateForumArtifact,
} from "./storage-contracts.js";

test("validateActionRequest - valid post action", () => {
  const request = {
    agent_id: "S01",
    type: "post",
    tick: 5,
    round: 1,
  };
  assert.strictEqual(validateActionRequest(request), true);
});

test("validateActionRequest - valid react action with target", () => {
  const request = {
    agent_id: "S01",
    type: "react",
    tick: 5,
    target_content_id: "POST:S02:post",
  };
  assert.strictEqual(validateActionRequest(request), true);
});

test("validateActionRequest - react without target should fail", () => {
  const request = {
    agent_id: "S01",
    type: "react",
    tick: 5,
  };
  assert.throws(() => validateActionRequest(request));
});

test("validateActionRequest - missing agent_id should fail", () => {
  const request = {
    type: "post",
    tick: 5,
  };
  assert.throws(() => validateActionRequest(request));
});

test("validateActionExecutionResult - valid result", () => {
  const result = {
    action_id: "ACT:S01:5:0:post",
    agent_id: "S01",
    tick: 5,
    round: 1,
    action_type: "post",
    execution_status: "success",
  };
  assert.strictEqual(validateActionExecutionResult(result), true);
});

test("validateActionExecutionResult - missing action_id should fail", () => {
  const result = {
    agent_id: "S01",
    tick: 5,
    round: 1,
    action_type: "post",
    execution_status: "success",
  };
  assert.throws(() => validateActionExecutionResult(result));
});

test("validateSnapshot - valid snapshot", () => {
  const snapshot = {
    snapshot_id: "SN:S01:1:5",
    agent_id: "S01",
    round: 1,
    tick: 5,
    timestamp: "2026-03-28T10:00:00Z",
    schema_version: "1.0",
    agent_state: {
      agent_id: "S01",
      engagement_level: 0.5,
    },
  };
  assert.strictEqual(validateSnapshot(snapshot), true);
});

test("validateSnapshot - missing agent_state should fail", () => {
  const snapshot = {
    snapshot_id: "SN:S01:1:5",
    agent_id: "S01",
    round: 1,
    tick: 5,
    timestamp: "2026-03-28T10:00:00Z",
    schema_version: "1.0",
  };
  assert.throws(() => validateSnapshot(snapshot));
});

test("validateEvent - valid action event", () => {
  const event = {
    event_id: "EV:S01:1:5:action",
    agent_id: "S01",
    round: 1,
    tick: 5,
    event_type: "action",
    action_id: "ACT:S01:5:0:post",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.strictEqual(validateEvent(event), true);
});

test("validateEvent - valid consumption event", () => {
  const event = {
    event_id: "EV:S01:1:5:consumption_internal",
    agent_id: "S01",
    round: 1,
    tick: 5,
    event_type: "consumption_internal",
    content_id: "POST:S02:post",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.strictEqual(validateEvent(event), true);
});

test("validateEvent - invalid event_type should fail", () => {
  const event = {
    event_id: "EV:S01:1:5:invalid",
    agent_id: "S01",
    round: 1,
    tick: 5,
    event_type: "invalid_type",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.throws(() => validateEvent(event));
});

test("validateTrace - valid trace", () => {
  const trace = {
    trace_id: "TR:EV:S01:1:5:action:SN:S01:1:6",
    event_id: "EV:S01:1:5:action",
    previous_snapshot_id: "SN:S01:1:5",
    next_snapshot_id: "SN:S01:1:6",
    state_delta: {
      engagement_delta: 0.02,
      interest_deltas: { fit: 0.1 },
    },
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.strictEqual(validateTrace(trace), true);
});

test("validateForumArtifact - valid post", () => {
  const artifact = {
    artifact_id: "GEN:S01:5:post",
    source_action_id: "ACT:S01:5:0:post",
    type: "post",
    author: {
      agent_id: "S01",
      handle: "fashion_maverick",
    },
    title: "Latest Fit Inspo",
    body: "Just spotted an amazing collection...",
    tone: "warm",
    visibility: "public_visible",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.strictEqual(validateForumArtifact(artifact), true);
});

test("validateForumArtifact - valid comment", () => {
  const artifact = {
    artifact_id: "GEN:S01:6:comment",
    source_action_id: "ACT:S01:6:0:comment",
    type: "comment",
    author: {
      agent_id: "S01",
      handle: "fashion_maverick",
    },
    body: "I totally agree...",
    tone: "steady",
    visibility: "public_visible",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.strictEqual(validateForumArtifact(artifact), true);
});

test("validateForumArtifact - valid reaction", () => {
  const artifact = {
    artifact_id: "GEN:S01:7:react",
    source_action_id: "ACT:S01:7:0:react",
    type: "reaction",
    author: {
      agent_id: "S01",
      handle: "fashion_maverick",
    },
    body: "support",
    tone: "support",
    visibility: "public_lightweight",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.strictEqual(validateForumArtifact(artifact), true);
});

test("validateForumArtifact - missing body should fail", () => {
  const artifact = {
    artifact_id: "GEN:S01:5:post",
    source_action_id: "ACT:S01:5:0:post",
    type: "post",
    author: {
      agent_id: "S01",
    },
    tone: "warm",
    visibility: "public_visible",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.throws(() => validateForumArtifact(artifact));
});

test("validateForumArtifact - invalid type should fail", () => {
  const artifact = {
    artifact_id: "GEN:S01:5:invalid",
    source_action_id: "ACT:S01:5:0:invalid",
    type: "invalid",
    author: {
      agent_id: "S01",
    },
    body: "test",
    tone: "warm",
    visibility: "public_visible",
    timestamp: "2026-03-28T10:00:00Z",
  };
  assert.throws(() => validateForumArtifact(artifact));
});
