import test from "node:test";
import assert from "node:assert/strict";
import { buildModerationState, scoreModerationText } from "./moderation.js";

test("scoreModerationText keeps benign fashion content safe", () => {
  const result = scoreModerationText({
    content: "Looking for gentle feedback on this weekday office outfit and loafers pairing.",
    tags: ["office_style", "trousers"],
  });

  assert.equal(result.shouldFlag, false);
  assert.equal(result.label, "safe");
  assert.equal(result.reasons.length, 0);
  assert.ok(result.score < 0.45);
});

test("scoreModerationText flags abusive and scammy language", () => {
  const result = scoreModerationText({
    content: "You are stupid trash. Send money now for this crypto giveaway!!!",
    tags: ["harassment"],
  });

  assert.equal(result.shouldFlag, true);
  assert.equal(result.label, "review");
  assert.ok(result.score >= 0.45);
  assert.ok(result.reasons.includes("harassment:stupid"));
  assert.ok(result.reasons.includes("scam:crypto giveaway"));
});

test("buildModerationState preserves removed status while refreshing prediction fields", () => {
  const state = buildModerationState({
    content: "멍청아 꺼져",
    existingStatus: "removed",
  });

  assert.equal(state.moderationStatus, "removed");
  assert.equal(state.moderationLabel, "review");
  assert.equal(state.moderationModelVersion, "prototype-v1");
  assert.ok(state.moderationEvaluatedAt instanceof Date);
});
