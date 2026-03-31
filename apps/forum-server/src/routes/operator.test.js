import test from "node:test";
import assert from "node:assert/strict";

import { buildAgentStateSummaryPipeline } from "./operator.js";

test("operator dashboard agent state pipeline only keeps the latest two states per agent", () => {
  const pipeline = buildAgentStateSummaryPipeline();

  assert.equal(Array.isArray(pipeline), true);
  assert.equal(pipeline.length, 2);

  const [sortStage, groupStage] = pipeline;
  assert.deepEqual(sortStage, { $sort: { agentId: 1, round: -1 } });
  assert.ok(groupStage?.$group);

  const statesAccumulator = groupStage.$group.states;
  assert.ok(statesAccumulator?.$firstN, "expected $firstN accumulator");
  assert.equal(statesAccumulator.$firstN.n, 2);
  assert.ok(
    JSON.stringify(statesAccumulator).includes("rawSnapshot"),
    "expected summary payload to keep only the trimmed snapshot fields"
  );
  assert.equal(
    JSON.stringify(groupStage).includes("$$ROOT"),
    false,
    "pipeline should not push full documents into the grouped state array"
  );
});
