import test from "node:test";
import assert from "node:assert/strict";

import { transformToWorldEventRecord } from "./world-event-signal-utils.mjs";

test("transformToWorldEventRecord preserves question and comparison anchors", () => {
  const record = transformToWorldEventRecord(
    {
      corpusId: "sample-1",
      sourcePlatform: "reddit",
      sourceCommunity: "r/malefashionadvice",
      title: "What pair with a pastel aqua green shirt?",
      excerpt: "Would cream trousers or black trousers work better for office wear?",
      tags: ["style"],
      topicBag: [
        { key: "color", count: 2 },
        { key: "office_style", count: 1 },
      ],
      createdAt: "2026-04-02T14:58:06.000Z",
      replyCount: 5,
      score: 7,
    },
    0,
  );

  assert.equal(record.eventType, "comparison_question");
  assert.equal(record.categories.primaryCategory, "fashion");
  assert.ok(record.anchorPayload.questionAnchors.length > 0);
  assert.ok(record.anchorPayload.comparisonAnchors.length > 0);
  assert.ok(record.agentHooks.suggestedPostModes.includes("answer_with_personal_preference"));
});

test("transformToWorldEventRecord detects celebrity and culture signals", () => {
  const record = transformToWorldEventRecord(
    {
      corpusId: "sample-2",
      sourcePlatform: "mastodon",
      sourceCommunity: "tag:fashion",
      title: "Sofia Coppola’s ELLE cover looks define effortless style",
      excerpt: "# Fashion # Culture A celebrity cover is pushing quiet luxury back into the conversation.",
      tags: ["fashion", "culture"],
      createdAt: "2026-04-02T15:00:00.000Z",
      replyCount: 1,
      score: 9,
    },
    1,
  );

  assert.equal(record.categories.primaryCategory, "celebrity");
  assert.ok(record.categories.categoryScores.some((item) => item.category === "culture"));
  assert.ok(record.anchorPayload.entities.some((item) => item.value.includes("Sofia Coppola")));
  assert.ok(record.agentHooks.suggestedPostModes.includes("quote_and_expand"));
});
