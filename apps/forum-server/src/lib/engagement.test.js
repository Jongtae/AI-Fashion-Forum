import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFeedbackFilter,
  buildInteractionFilter,
  normalizeFeedbackPayload,
  normalizeInteractionPayload,
  validateFeedbackPayload,
  validateInteractionPayload,
} from "./engagement.js";

test("validateInteractionPayload rejects invalid event payloads", () => {
  const errors = validateInteractionPayload({
    actorId: "",
    actorType: "bot",
    targetType: "unknown",
    eventType: "hover",
  });

  assert.deepEqual(errors, [
    "actorId is required",
    "actorType must be 'user' or 'agent'",
    "targetId is required",
    "targetType must be one of: post, comment, agent, feed_slot, feed, system",
    "eventType must be one of: view, like, comment, share, click, scroll_past, bookmark, report, feedback_submit",
  ]);
});

test("normalizeInteractionPayload trims strings and preserves numeric context", () => {
  const payload = normalizeInteractionPayload({
    actorId: " user-1 ",
    targetId: " post-1 ",
    targetType: "post",
    eventType: "view",
    durationMs: 1200.2,
    feedPosition: 3,
    source: " web ",
  });

  assert.equal(payload.actorId, "user-1");
  assert.equal(payload.targetId, "post-1");
  assert.equal(payload.durationMs, 1200);
  assert.equal(payload.feedPosition, 3);
  assert.equal(payload.source, "web");
});

test("validateFeedbackPayload enforces category, message, and rating", () => {
  const errors = validateFeedbackPayload({
    userId: "",
    category: "praise",
    message: " ",
    rating: 7,
    targetType: "thread",
  });

  assert.deepEqual(errors, [
    "userId is required",
    "category must be one of: bug, suggestion, moderation, satisfaction, other",
    "message is required",
    "targetType must be one of: post, comment, agent, feed, system",
    "rating must be an integer between 1 and 5",
  ]);
});

test("normalizeFeedbackPayload trims strings and keeps optional target", () => {
  const payload = normalizeFeedbackPayload({
    userId: " user-9 ",
    category: "suggestion",
    message: " add mute controls ",
    targetId: " feed-home ",
    targetType: "feed",
    rating: 4,
  });

  assert.deepEqual(payload, {
    userId: "user-9",
    category: "suggestion",
    targetId: "feed-home",
    targetType: "feed",
    rating: 4,
    message: "add mute controls",
    metadata: undefined,
  });
});

test("build filters keep only supported query fields", () => {
  const interactionFilter = buildInteractionFilter({
    actorId: "u1",
    eventType: "view",
    since: "2026-03-26T00:00:00.000Z",
  });
  const feedbackFilter = buildFeedbackFilter({
    userId: "u2",
    category: "bug",
    targetType: "post",
  });

  assert.equal(interactionFilter.actorId, "u1");
  assert.equal(interactionFilter.eventType, "view");
  assert.ok(interactionFilter.createdAt.$gte instanceof Date);
  assert.deepEqual(feedbackFilter, {
    userId: "u2",
    category: "bug",
    targetType: "post",
  });
});
