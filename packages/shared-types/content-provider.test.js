import test from "node:test";
import assert from "node:assert/strict";
import { createIngestionEnvelope } from "./content-provider.js";

test("createIngestionEnvelope supports internal forum payloads", () => {
  const envelope = createIngestionEnvelope({
    ingestion_id: "ING:A01:1:1",
    source_family: "internal_forum",
    source_type: "forum_post",
    content_id: "content-1",
    title: "Office style note",
    topics: ["office_style"],
    emotions: ["curiosity"],
    created_tick: 1,
  });

  assert.equal(envelope.source_family, "internal_forum");
  assert.equal(envelope.source_type, "forum_post");
});

test("createIngestionEnvelope supports external boundaries without fetch implementation", () => {
  const envelope = createIngestionEnvelope({
    ingestion_id: "ING:external:1",
    source_family: "external_web",
    source_type: "external_article",
    content_id: "external-1",
    title: "Trend recap",
    body: "Normalized article summary",
    topics: ["trend_report"],
    emotions: ["curiosity"],
    created_tick: 0,
  });

  assert.equal(envelope.source_family, "external_web");
  assert.equal(envelope.content_id, "external-1");
});
