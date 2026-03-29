import test from "node:test";
import assert from "node:assert/strict";

import {
  createExposureSample,
  createSprint1ExposureSample,
} from "./content-indexing.js";

test("content indexing reasons stay Korean-first", async () => {
  const exposureSample = await createExposureSample({ agentId: "A01", poolSize: 5, targetCount: 24 });
  const sprint1ExposureSample = await createSprint1ExposureSample({ agentId: "S01", poolSize: 4 });
  assert.ok(exposureSample.exposure.exposureLog.length > 0);
  assert.match(exposureSample.exposure.exposureLog[0].reason, /[가-힣]/);
  assert.ok(!/affinity=|novelty=|social_proof=|controversy=/i.test(exposureSample.exposure.exposureLog[0].reason));

  assert.ok(sprint1ExposureSample.exposure.exposureLog.length > 0);
  assert.match(sprint1ExposureSample.exposure.exposureLog[0].reason, /[가-힣]/);
  assert.ok(!/total=|interest_pull=|value_pull=|audience_pull=/i.test(sprint1ExposureSample.exposure.exposureLog[0].reason));
});
