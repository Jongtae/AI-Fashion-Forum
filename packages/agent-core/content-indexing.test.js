import test from "node:test";
import assert from "node:assert/strict";

import {
  createIndexableContentCorpus,
  createExposureSample,
  createSprint1ExposureSample,
  buildChromaContentIndex,
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

test("indexable corpus includes world-event signal records in external-signals collection", async () => {
  const corpus = await createIndexableContentCorpus({ targetCount: 160 });
  const worldEventRecords = corpus.filter(
    (record) => record.source_metadata?.origin === "world_event_signal",
  );
  assert.ok(worldEventRecords.length > 0, "expected world-event-derived records in corpus");

  const index = buildChromaContentIndex(corpus);
  const externalCollection = index.collections.find((collection) => collection.id === "external-signals");
  assert.ok(externalCollection);
  assert.ok(externalCollection.count > 0);
  assert.ok(
    worldEventRecords.some((record) => ["external_article", "social_post"].includes(record.source_type)),
  );
});

test("exposure sample can surface world-event-derived external signals", async () => {
  const exposureSample = await createExposureSample({ agentId: "A01", poolSize: 12, targetCount: 160 });
  const exposedOrigins = exposureSample.exposure.candidatePool.map((record) => record.source_metadata?.origin);
  assert.ok(
    exposedOrigins.includes("world_event_signal"),
    `expected world_event_signal in candidatePool, got ${JSON.stringify(exposedOrigins)}`,
  );
});
