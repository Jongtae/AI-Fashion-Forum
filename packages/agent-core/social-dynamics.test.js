import test from "node:test";
import assert from "node:assert/strict";

import { createBatchReport } from "./social-dynamics.js";

test("batch reports stay Korean-first", () => {
  const report = createBatchReport([
    {
      seed: 42,
      policy_flag: "baseline",
      average_consistency: 0.84,
      polarization: 0.21,
    },
    {
      seed: 43,
      policy_flag: "dampen_aggression",
      average_consistency: 0.77,
      polarization: 0.52,
    },
  ]);

  assert.equal(report.summary.length, 3);
  assert.match(report.summary[0], /배치 실행/);
  assert.match(report.summary[1], /가장 일관성이 높았던 실행/);
  assert.match(report.summary[2], /가장 양극화가 높았던 실행/);
  assert.match(report.recommendations[0], /정체성/);
  assert.match(report.recommendations[1], /양극화/);
  assert.match(report.recommendations[2], /영향 집중도/);
});
