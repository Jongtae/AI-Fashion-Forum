import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAgentWriteRateLimit,
  getAgentWriteWindowStart,
} from "./write-rate-limit.js";

test("getAgentWriteWindowStart subtracts one hour by default", () => {
  const now = new Date("2026-03-29T12:00:00.000Z");
  const start = getAgentWriteWindowStart(now);
  assert.equal(start.toISOString(), "2026-03-29T11:00:00.000Z");
});

test("checkAgentWriteRateLimit allows agent writes under the hourly cap", async () => {
  const now = new Date("2026-03-29T12:00:00.000Z");
  const calls = [];
  const PostModel = {
    countDocuments: async (filter) => {
      calls.push({ source: "post", filter });
      return 2;
    },
  };
  const CommentModel = {
    countDocuments: async (filter) => {
      calls.push({ source: "comment", filter });
      return 0;
    },
  };

  const result = await checkAgentWriteRateLimit({
    authorId: "A01",
    authorType: "agent",
    now,
    limit: 3,
    windowMs: 60 * 60 * 1000,
    PostModel,
    CommentModel,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.currentCount, 2);
  assert.equal(result.remaining, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].filter.authorId, "A01");
  assert.equal(calls[0].filter.authorType, "agent");
  assert.equal(calls[0].filter.createdAt.$gte.toISOString(), "2026-03-29T11:00:00.000Z");
});

test("checkAgentWriteRateLimit blocks agent writes at the hourly cap", async () => {
  const result = await checkAgentWriteRateLimit({
    authorId: "A02",
    authorType: "agent",
    now: new Date("2026-03-29T12:00:00.000Z"),
    limit: 3,
    windowMs: 60 * 60 * 1000,
    PostModel: { countDocuments: async () => 2 },
    CommentModel: { countDocuments: async () => 1 },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.currentCount, 3);
  assert.equal(result.remaining, 0);
});

test("checkAgentWriteRateLimit does not block user writes", async () => {
  const result = await checkAgentWriteRateLimit({
    authorId: "user-1",
    authorType: "user",
    now: new Date("2026-03-29T12:00:00.000Z"),
    PostModel: { countDocuments: async () => 99 },
    CommentModel: { countDocuments: async () => 99 },
  });

  assert.equal(result.allowed, true);
  assert.equal(result.currentCount, 0);
});
