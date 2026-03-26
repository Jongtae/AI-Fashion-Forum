# Content Provider And Normalization Pipeline

Issue `#98` defines a minimal ingestion contract for content that originates outside the forum-post seed pack.

## Goal

Normalize heterogeneous content into one retrieval-ready schema so simulation and replay layers can reason over:

- article snippets
- social posts
- image descriptions

## Contract

`packages/shared-types/content-provider.js` defines the repository-level `ContentProvider` contract.

Required provider behavior:

- implement `getRecords(context)`
- return raw provider records with stable provenance fields
- preserve topic and emotion tags before normalization

Required raw record fields:

- `provider_id`
- `provider_item_id`
- `source_type`
- `title`
- `body`
- `topics`
- `emotions`
- `source_metadata`

## Normalization Shape

Every provider record normalizes into the shared `ContentRecord` schema from `packages/shared-types/state-schema.js`.

For Sprint 1 agent-loop writeback, the repository also uses a shared ingestion envelope from `packages/shared-types/content-provider.js`.

That envelope keeps internal forum exposure and external web exposure on the same identity-update entry path, even when external fetch is not yet implemented.

Important preserved metadata:

- `source_type`
- `source_family`
- `ingestion_id`
- `topics`
- `emotions`
- `source_metadata.provider_id`
- `source_metadata.provider_item_id`
- provider-specific origin details such as URL, detector, or engagement context

## Current Mock Provider

`packages/agent-core/content-pipeline.js` ships one mock provider with three source types:

- `external_article`
- `social_post`
- `image_description`

The sim server exposes the resulting sample bundle at:

- `GET /api/normalized-content-sample`

## Data Engineering Review Note

Because this pipeline changes how source records are modeled and normalized, each future ingestion source should be reviewed for:

- provenance completeness
- field-level validation coverage
- topic and emotion tagging consistency
- replay/export compatibility
