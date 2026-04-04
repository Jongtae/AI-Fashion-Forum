import test from "node:test";
import assert from "node:assert/strict";

import {
  buildThreadStatsByPostId,
  computeCommentThreadStats,
  rankReplyTargets,
  rankTargetPosts,
} from "./social-threading.js";

test("computeCommentThreadStats measures nested reply depth", () => {
  const stats = computeCommentThreadStats([
    { _id: "c1", content: "root", authorId: "A01" },
    { _id: "c2", content: "reply", authorId: "A02", replyToCommentId: "c1" },
    { _id: "c3", content: "reply 2", authorId: "A03", replyToCommentId: "c2" },
  ]);

  assert.equal(stats.totalComments, 3);
  assert.equal(stats.maxDepth, 3);
  assert.equal(stats.byCommentId.get("c1").childCount, 1);
  assert.equal(stats.byCommentId.get("c3").depth, 3);
});

test("rankTargetPosts prefers active discussion hooks over flat posts", () => {
  const agent = { agent_id: "A99", interest_vector: { pricing: 1, office: 0.8 } };
  const posts = [
    {
      forumPostId: "p1",
      agent_id: "A01",
      title: "가격 괜찮나요?",
      body: "오피스룩으로 이 가격이 맞는지 궁금해요.",
      tags: ["pricing", "office"],
      createdAt: new Date().toISOString(),
    },
    {
      forumPostId: "p2",
      agent_id: "A02",
      title: "오늘 메모",
      body: "그냥 기록용이에요.",
      tags: ["fashion"],
    },
  ];
  const threadStatsByPostId = buildThreadStatsByPostId(posts, [
    { _id: "c1", forumPostId: "p1", content: "저는 비싸다고 봐요", authorId: "A03" },
    { _id: "c2", forumPostId: "p1", content: "근데 핏은 괜찮죠", authorId: "A04", replyToCommentId: "c1" },
  ]);
  const ranked = rankTargetPosts({
    agent,
    posts,
    existingCommentCounts: new Map([["p1", 2], ["p2", 0]]),
    threadStatsByPostId,
    seed: 42,
  });

  assert.equal(ranked[0].forumPostId, "p1");
});

test("rankReplyTargets prefers deeper, discussable replies", () => {
  const agent = { agent_id: "A99", interest_vector: { pricing: 1 } };
  const post = {
    forumPostId: "p1",
    agent_id: "A01",
    title: "가격 괜찮나요?",
    body: "이 가격이 맞는지 궁금해요.",
    tags: ["pricing"],
  };
  const comments = [
    { _id: "c1", content: "전 비싸다고 봐요", authorId: "A02" },
    { _id: "c2", content: "근데 품질은 괜찮지 않나요?", authorId: "A03", replyToCommentId: "c1" },
    { _id: "c3", content: "좋아요", authorId: "A04" },
  ];
  const threadStats = computeCommentThreadStats(comments);
  const ranked = rankReplyTargets({ agent, post, comments, threadStats, seed: 7 });

  assert.equal(ranked[0]._id, "c2");
});
