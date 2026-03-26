import {
  CONTENT_FORMATS,
  CONTENT_SOURCE_TYPES,
  createContentRecord,
} from "./state-schema.js";

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
}

function assertString(name, value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertNumber(name, value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a valid number`);
  }
}

function assertArray(name, value) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const INGESTIBLE_CONTENT_SOURCE_TYPES = Object.freeze(
  CONTENT_SOURCE_TYPES.filter((sourceType) => sourceType !== "forum_post"),
);

export const CONTENT_INGESTION_SOURCE_FAMILIES = Object.freeze([
  "internal_forum",
  "external_web",
]);

export const CONTENT_PROVIDER_INTERFACE = Object.freeze({
  name: "ContentProvider",
  version: "0.1.0",
  requiredMethods: Object.freeze(["getRecords"]),
  recordContract: Object.freeze({
    requiredFields: Object.freeze([
      "provider_id",
      "provider_item_id",
      "source_type",
      "title",
      "body",
      "topics",
      "emotions",
      "source_metadata",
    ]),
    optionalFields: Object.freeze(["author_id", "format", "created_tick"]),
  }),
  notes: Object.freeze([
    "Providers return raw records from external or internal content sources.",
    "Normalization maps every provider record into the shared ContentRecord schema.",
    "Source metadata must preserve provenance so retrieval and replay can explain origin.",
  ]),
});

export function createIngestionEnvelope(input) {
  const {
    ingestion_id,
    source_family,
    source_type,
    content_id,
    title,
    body = "",
    topics = [],
    emotions = [],
    intensity = 0.6,
    social_proof = 0.4,
    direction = 1,
    created_tick = 0,
    metadata = {},
  } = input;

  assertString("ingestion_id", ingestion_id);
  assertEnum("source_family", source_family, CONTENT_INGESTION_SOURCE_FAMILIES);
  assertEnum("source_type", source_type, CONTENT_SOURCE_TYPES);
  assertString("content_id", content_id);
  assertString("title", title);
  if (body && typeof body !== "string") {
    throw new Error("body must be a string");
  }
  assertArray("topics", topics);
  assertArray("emotions", emotions);
  assertNumber("intensity", intensity);
  assertNumber("social_proof", social_proof);
  assertNumber("direction", direction);
  assertNumber("created_tick", created_tick);

  return {
    ingestion_id,
    source_family,
    source_type,
    content_id,
    title,
    body,
    topics,
    emotions,
    intensity,
    social_proof,
    direction,
    created_tick,
    metadata,
  };
}

export function createProviderRecord(input) {
  const {
    provider_id,
    provider_item_id,
    source_type,
    title,
    body,
    topics = [],
    emotions = [],
    source_metadata = {},
    author_id = "system:provider",
    format = "daily_snapshot",
    created_tick = 0,
  } = input;

  assertString("provider_id", provider_id);
  assertString("provider_item_id", provider_item_id);
  assertEnum("source_type", source_type, INGESTIBLE_CONTENT_SOURCE_TYPES);
  assertString("title", title);
  assertString("body", body);
  assertArray("topics", topics);
  assertArray("emotions", emotions);
  assertString("author_id", author_id);
  assertEnum("format", format, CONTENT_FORMATS);
  assertNumber("created_tick", created_tick);

  return {
    provider_id,
    provider_item_id,
    source_type,
    title,
    body,
    topics,
    emotions,
    source_metadata,
    author_id,
    format,
    created_tick,
  };
}

export function normalizeProviderRecord(
  providerRecord,
  { content_id, author_id, created_tick, format } = {},
) {
  const validatedRecord = createProviderRecord(providerRecord);
  const normalizedContentId =
    content_id ||
    `normalized:${validatedRecord.provider_id}:${slugify(validatedRecord.provider_item_id)}`;

  return createContentRecord({
    content_id: normalizedContentId,
    author_id: author_id || validatedRecord.author_id,
    source_type: validatedRecord.source_type,
    format: format || validatedRecord.format,
    created_tick:
      typeof created_tick === "number" ? created_tick : validatedRecord.created_tick,
    title: validatedRecord.title,
    body: validatedRecord.body,
    topics: validatedRecord.topics,
    emotions: validatedRecord.emotions,
    source_metadata: {
      provider_id: validatedRecord.provider_id,
      provider_item_id: validatedRecord.provider_item_id,
      normalization_version: CONTENT_PROVIDER_INTERFACE.version,
      ...validatedRecord.source_metadata,
    },
  });
}
