# Chroma Indexing And Biased Exposure

Issue `#99` defines a Chroma-ready indexing layer for normalized content and a deterministic exposure selector that can be inspected locally.

## Chroma Collections

The repository defines three collection groups in `packages/agent-core/content-indexing.js`:

- `forum-seed-posts`: forum-native content used for baseline replay realism
- `external-signals`: normalized article and social inputs used to inject outside taste signals
- `scene-descriptions`: image-description records used to preserve visual context

These rules are Chroma-ready even though the current MVP implementation indexes them in-process for local simulation work.

## Indexed Corpus

The indexing layer expands the current forum and provider seed set into a synthetic corpus of 120 validated `ContentRecord` items.

Each derived record keeps:

- `topics`
- `emotions`
- original `source_type`
- provenance fields such as `derived_from`, `provider_id`, and `provider_item_id`
- retrieval signals such as `popularity_score`, `controversy_signal`, and `novelty_bucket`

## Candidate Generation

`generateCandidatePool()` scores all indexed records and returns the top 20 for a target agent.

Scoring inputs:

- affinity: topic overlap with `agentState.interest_vector`
- novelty: freshness plus repeated-topic penalty
- social proof: topic popularity and record popularity metadata
- controversy: controversy signal multiplied by agent conflict tolerance

## Biased Exposure Selection

`selectBiasedExposure()` chooses from the candidate pool and logs why each exposure surfaced.

The current log format records:

- `content_id`
- rank
- weighted score breakdown
- a natural-language reason string

## Local Inspection

The sim server exposes:

- `GET /api/exposure-sample?agent=A01&pool=20`

Use different agent ids such as `A01` and `A06` to verify that exposure ordering changes with agent state.

## Data Engineering Review Note

Because this issue changes indexing and retrieval behavior, each future ingestion source should be reviewed for:

- Chroma collection assignment
- metadata completeness for provenance and filtering
- synthetic-corpus replacement path when real content volume increases
- compatibility with replay exports and downstream retrieval evaluation
