import test from "node:test";
import assert from "node:assert/strict";

import { rankFeed, RANKING_EXPERIMENT_FLAGS } from "./ranking-core.js";

test("ranking reasons stay Korean-first", () => {
  const ranked = rankFeed({
    agentId: "A01",
    experimentFlag: RANKING_EXPERIMENT_FLAGS.baseline,
  });

  assert.ok(ranked.length > 0);
  assert.match(ranked[0].reason, /[가-힣]/);
  assert.ok(!/interest=|trust=|novelty=|controversy=|recency=/i.test(ranked[0].reason));
  assert.match(ranked[0].reason, /관심|신뢰|새로움|논쟁성|최신성/);
});
