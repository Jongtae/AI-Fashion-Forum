import test from "node:test";
import assert from "node:assert/strict";

import {
  createDiscussionSeedContentRecord,
  createDiscussionSeedSignalHints,
  selectDiscussionSeedForContent,
} from "./discussion-seeds.js";

test("selectDiscussionSeedForContent prefers matching pricing-style seeds", () => {
  const selected = selectDiscussionSeedForContent({
    contentRecord: {
      title: "무신사 봄 세일 시작",
      body: "가격이 올라서 지금 사도 될지 고민된다.",
      topics: ["fashion", "pricing"],
      source_metadata: {
        anchor_payload: {
          factAnchors: ["무신사 봄 세일"],
        },
      },
    },
    discussionSeeds: [
      {
        seedId: "seed-fashion",
        subjectKo: "서울패션위크",
        contextKo: "패션 행사 시즌",
        tensionPoint: "사람 많다는데 괜찮을까요",
        categoryTags: ["fashion"],
        reactionType: "event_reaction",
      },
      {
        seedId: "seed-pricing",
        subjectKo: "에어맥스 DN8",
        contextKo: "4/5 출시, 189,000원",
        tensionPoint: "전작보다 비싸짐",
        categoryTags: ["fashion", "pricing"],
        reactionType: "price_reaction",
      },
    ],
    variationSeed: 7,
  });

  assert.equal(selected?.seedId, "seed-pricing");
});

test("createDiscussionSeedSignalHints maps reaction seeds into run-usable hints", () => {
  const hints = createDiscussionSeedSignalHints({
    seedId: "seed-pricing",
    reactionType: "price_reaction",
    subjectKo: "에어맥스 DN8",
    contextKo: "4/5 출시, 189,000원",
    tensionPoint: "전작보다 비싸짐",
    possibleAngles: ["가성비 분석", "실사용 후기"],
    categoryTags: ["fashion", "pricing"],
  });

  assert.equal(hints?.eventType, "question_prompt");
  assert.equal(hints?.primaryCategory, "fashion");
  assert.deepEqual(hints?.suggestedPostModes, ["value_check_post", "ask_the_feed_to_choose"]);
  assert.ok(hints?.anchors.includes("에어맥스 DN8"));
  assert.ok(hints?.anchors.includes("전작보다 비싸짐"));
  assert.ok(hints?.discussionHooks.includes("가성비 분석"));
});

test("createDiscussionSeedContentRecord upgrades a seed into world-event-style metadata", () => {
  const contentRecord = createDiscussionSeedContentRecord({
    contentRecord: {
      title: "무신사 세일 랭킹",
      body: "가격 흐름이 궁금하다.",
      topics: ["fashion"],
      source_metadata: {
        origin: "public_seed_corpus",
        anchor_payload: {
          factAnchors: ["무신사 랭킹"],
        },
      },
    },
    discussionSeed: {
      seedId: "seed-pricing",
      reactionType: "price_reaction",
      subjectKo: "에어맥스 DN8",
      contextKo: "4/5 출시, 189,000원",
      tensionPoint: "전작보다 비싸짐",
      possibleAngles: ["가성비 분석", "실사용 후기"],
      categoryTags: ["fashion", "pricing"],
      freshnessScore: 0.92,
      sourceUrl: "https://example.com/dn8",
    },
  });

  assert.equal(contentRecord.source_metadata?.origin, "world_event_signal");
  assert.equal(contentRecord.source_metadata?.signal_id, "seed-pricing");
  assert.equal(contentRecord.source_metadata?.event_type, "question_prompt");
  assert.equal(contentRecord.source_metadata?.primary_category, "fashion");
  assert.ok(contentRecord.topics.includes("pricing"));
  assert.ok(contentRecord.source_metadata?.anchor_payload?.factAnchors.includes("에어맥스 DN8"));
  assert.ok(contentRecord.source_metadata?.anchor_payload?.questionAnchors.includes("전작보다 비싸짐"));
  assert.ok(contentRecord.source_metadata?.anchor_payload?.discussionHooks.includes("실사용 후기"));
  assert.ok(contentRecord.source_metadata?.agent_hooks?.suggestedPostModes.includes("value_check_post"));
  assert.ok(contentRecord.source_metadata?.agent_hooks?.detectionTriggers.includes("source:discussion_seed"));
  assert.equal(contentRecord.source_metadata?.novelty_bucket, "fresh");
});
