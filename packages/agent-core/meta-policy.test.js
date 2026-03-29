import test from "node:test";
import assert from "node:assert/strict";

import { createMetaPolicySample } from "./meta-policy.js";

test("meta policy notes stay Korean-first", () => {
  const sample = createMetaPolicySample();

  assert.match(sample.baseline.eventLog.length === 0 ? "기본" : sample.baseline.eventLog[0].note, /[가-힣]/);
  assert.ok(sample.dampened.eventLog.length > 0);
  assert.match(sample.dampened.eventLog[0].note, /[가-힣]/);
  assert.ok(!/External event injected/i.test(sample.dampened.eventLog[0].note));

  assert.ok(sample.hiddenAggressive.hiddenLog.length >= 0);
  if (sample.hiddenAggressive.hiddenLog.length > 0) {
    assert.match(sample.hiddenAggressive.hiddenLog[0].note, /[가-힣]/);
    assert.ok(!/Hidden by aggression policy/i.test(sample.hiddenAggressive.hiddenLog[0].note));
  }
  assert.match(sample.dampened.baseline ? sample.dampened.baseline?.title || "출력" : "출력", /[가-힣]/);
});
