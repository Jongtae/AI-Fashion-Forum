import assert from "node:assert/strict";
import test from "node:test";

import { SAMPLE_STATE_SNAPSHOT } from "@ai-fashion-forum/shared-types";

import {
  classifyDifferentiationTrend,
  computeAgentPairwiseDistanceMetrics,
  createDifferentiationTimeline,
} from "./evaluation-metrics.js";

test("computeAgentPairwiseDistanceMetrics returns pairwise summary for agent snapshots", () => {
  const result = computeAgentPairwiseDistanceMetrics(SAMPLE_STATE_SNAPSHOT.agents);

  assert.equal(result.pair_count, 15);
  assert.ok(result.average_distance > 0);
  assert.ok(result.max_distance >= result.min_distance);
  assert.ok(result.nearest_pair);
  assert.ok(result.farthest_pair);
});

test("createDifferentiationTimeline builds round summaries from run results", () => {
  const timeline = createDifferentiationTimeline([
    {
      seed: 42,
      tickCount: 4,
      finalTick: 4,
      finalState: SAMPLE_STATE_SNAPSHOT,
    },
    {
      seed: 43,
      tickCount: 4,
      finalTick: 8,
      finalState: SAMPLE_STATE_SNAPSHOT,
    },
  ]);

  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].round, 1);
  assert.equal(timeline[1].round, 2);
  assert.equal(timeline[0].agent_count, SAMPLE_STATE_SNAPSHOT.agents.length);
  assert.ok(timeline[0].average_distance > 0);
});

test("classifyDifferentiationTrend distinguishes convergence, stability, and divergence", () => {
  const converging = classifyDifferentiationTrend([
    { average_distance: 0.4 },
    { average_distance: 0.33 },
  ]);
  const stable = classifyDifferentiationTrend([
    { average_distance: 0.4 },
    { average_distance: 0.41 },
  ]);
  const diverging = classifyDifferentiationTrend([
    { average_distance: 0.4 },
    { average_distance: 0.45 },
  ]);

  assert.equal(converging.verdict, "converging");
  assert.equal(stable.verdict, "stable");
  assert.equal(diverging.verdict, "diverging");
});
