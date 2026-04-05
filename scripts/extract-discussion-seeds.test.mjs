import test from "node:test";
import assert from "node:assert/strict";

import {
  isFreshSeedSource,
  resolveSeedSourceTimestamp,
} from "./extract-discussion-seeds.mjs";

test("resolveSeedSourceTimestamp prefers publishedAt over crawledAt", () => {
  const timestamp = resolveSeedSourceTimestamp({
    source: {
      publishedAt: "2026-04-05T10:00:00Z",
      crawledAt: "2026-04-06T10:00:00Z",
    },
  });

  assert.equal(timestamp, "2026-04-05T10:00:00Z");
});

test("isFreshSeedSource rejects stale dated records", () => {
  const now = new Date("2026-04-06T00:00:00Z");
  const stale = {
    source: {
      platform: "hankyung",
      publishedAt: "2026-03-20T00:00:00Z",
    },
  };

  assert.equal(isFreshSeedSource(stale, { now, maxAgeDays: 7 }), false);
});

test("isFreshSeedSource keeps timeless platforms", () => {
  const now = new Date("2026-04-06T00:00:00Z");
  const timeless = {
    source: {
      platform: "curated",
      crawledAt: "2026-01-01T00:00:00Z",
    },
  };

  assert.equal(isFreshSeedSource(timeless, { now, maxAgeDays: 7 }), true);
});
