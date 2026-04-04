import { test } from "node:test";
import * as assert from "node:assert";

import { deriveDiscussionAnchors, scoreCommunityDraft } from "./content-quality.js";

test("deriveDiscussionAnchors preserves concrete question anchors from seed content", () => {
  const anchors = deriveDiscussionAnchors({
    title: "What pair with a pastel aqua green shirt?",
    body: "Need advice on whether it still works for office wear.",
    topics: ["color", "office_style"],
  });

  assert.equal(anchors.intent, "question");
  assert.match(anchors.questionAnchor, /파스텔 아쿠아|셔츠|오피스/);
  assert.match(anchors.questionAnchor, /궁금|어떻게|뭐가 잘 맞을까/);
  assert.ok(Array.isArray(anchors.anchorTerms));
  assert.ok(anchors.anchorTerms.includes("파스텔 아쿠아") || anchors.anchorTerms.includes("셔츠"));
});

test("deriveDiscussionAnchors preserves concrete comparison anchors from seed content", () => {
  const anchors = deriveDiscussionAnchors({
    title: "Which is better for office wear, pastel aqua or cream?",
    body: "I am comparing the two because the office setting makes the colors read differently.",
    topics: ["color", "office_style"],
  });

  assert.equal(anchors.intent, "comparison");
  assert.match(anchors.comparisonAnchor, /파스텔 아쿠아|크림|오피스 스타일|색감/);
  assert.match(anchors.comparisonAnchor, /중 뭐가 더 나을까|비교/);
});

test("deriveDiscussionAnchors preserves concrete fact anchors from seed content", () => {
  const anchors = deriveDiscussionAnchors({
    title: "Sofia Coppola’s ELLE cover looks define effortless style",
    body: "A cover look article with clear styling details.",
    topics: ["fashion", "style"],
  });

  assert.equal(anchors.intent, "fact");
  assert.match(anchors.factualAnchor, /소피아 코폴라|ELLE|커버|스타일/);
  assert.ok(anchors.anchorTerms.includes("소피아 코폴라"));
  assert.ok(anchors.anchorTerms.includes("ELLE"));
});

test("scoreCommunityDraft rewards concrete anchor preservation", () => {
  const specific = scoreCommunityDraft({
    kind: "post",
    title: "파스텔 아쿠아와 크림 중 뭐가 더 나을까?",
    content: "오피스룩이면 파스텔 아쿠아보다 크림이 더 안정적으로 보여요. 다들 어느 쪽이 더 자연스럽게 보이는지 궁금해요.",
    sourceIntent: "comparison",
    sourceAnchorTerms: ["파스텔 아쿠아", "크림", "오피스룩"],
    sourceTopics: ["color", "office_style"],
  });

  const flattened = scoreCommunityDraft({
    kind: "post",
    title: "패션과 일상 사이의 기준",
    content: "패션과 일상을 같이 보게 된 글이에요. 기준을 다시 보게 돼요.",
    sourceIntent: "comparison",
    sourceAnchorTerms: ["파스텔 아쿠아", "크림", "오피스룩"],
    sourceTopics: ["color", "office_style"],
  });

  assert.ok(specific.dimension_scores.anchor_preservation > flattened.dimension_scores.anchor_preservation);
  assert.ok(specific.dimension_scores.claim_surface > flattened.dimension_scores.claim_surface);
});

test("scoreCommunityDraft rewards believable emotion tied to the concrete anchor", () => {
  const emotional = scoreCommunityDraft({
    kind: "comment",
    title: "오피스룩 댓글",
    content: "오피스룩에 셔츠 핏 얘기가 붙으니 괜히 마음이 먼저 쓰여요. 파스텔 아쿠아보다 크림이 더 편하다는 말도 이해돼요.",
    sourceIntent: "comparison",
    sourceAnchorTerms: ["파스텔 아쿠아", "크림", "오피스룩", "셔츠"],
    sourceTopics: ["color", "office_style"],
  });

  const flat = scoreCommunityDraft({
    kind: "comment",
    title: "오피스룩 댓글",
    content: "오피스룩에 대한 이야기예요. 비교 포인트가 보이고 기준이 남아요.",
    sourceIntent: "comparison",
    sourceAnchorTerms: ["파스텔 아쿠아", "크림", "오피스룩", "셔츠"],
    sourceTopics: ["color", "office_style"],
  });

  assert.ok(
    emotional.dimension_scores.emotional_believability > flat.dimension_scores.emotional_believability,
    `${emotional.dimension_scores.emotional_believability} <= ${flat.dimension_scores.emotional_believability}`,
  );
});
