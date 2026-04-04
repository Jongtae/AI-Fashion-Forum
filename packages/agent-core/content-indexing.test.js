import test from "node:test";
import assert from "node:assert/strict";

import {
  createExposureSample,
  createSprint1ExposureSample,
} from "./content-indexing.js";
import { createSprint1StarterPackBundle } from "./content-pipeline.js";

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

test("sprint1 starter pack prefers public seed corpus when available", async () => {
  const starterPack = await createSprint1StarterPackBundle({ startTick: 0 });

  assert.strictEqual(starterPack.provider_id, "public-seed-corpus");
  assert.ok(starterPack.normalized_count >= 50, `normalized_count=${starterPack.normalized_count}`);
  assert.ok(
    starterPack.normalizedRecords.some((record) => record.source_metadata?.origin === "public_seed_corpus"),
  );
});
