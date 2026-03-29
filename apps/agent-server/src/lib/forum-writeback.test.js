import { test } from "node:test";
import assert from "node:assert/strict";
import { getForumWritebackMode, shouldWriteForumArtifacts } from "./forum-writeback.js";

test("forum writeback is enabled by default outside tests", () => {
  assert.equal(getForumWritebackMode({}), "on");
  assert.equal(shouldWriteForumArtifacts({}), true);
});

test("forum writeback is disabled in node test contexts", () => {
  assert.equal(getForumWritebackMode({ NODE_TEST_CONTEXT: "child-v8" }), "off");
  assert.equal(shouldWriteForumArtifacts({ NODE_TEST_CONTEXT: "child-v8" }), false);
});

test("forum writeback can be explicitly disabled or enabled", () => {
  assert.equal(getForumWritebackMode({ AGENT_FORUM_WRITEBACK: "off" }), "off");
  assert.equal(getForumWritebackMode({ AGENT_FORUM_WRITEBACK: "on" }), "on");
  assert.equal(shouldWriteForumArtifacts({ AGENT_FORUM_WRITEBACK: "0" }), false);
  assert.equal(shouldWriteForumArtifacts({ AGENT_FORUM_WRITEBACK: "1" }), true);
});
