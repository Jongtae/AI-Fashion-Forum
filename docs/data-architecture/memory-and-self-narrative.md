# Memory And Self-Narrative

Issue `#100` adds a minimal memory stack that supports recent recall, durable persistence, and queryable self-narrative growth.

## Layers

- recent memory: in-process rolling buffers per agent capped by `memory_window`
- durable memory: file-backed records that survive process restarts
- self narrative: reflective entries linked to durable memory ids

## Storage

The current durable store lives at:

- `apps/sim-server/data/memory-store.json`

This is a repository-local persistence path for MVP development so memory survives a server restart without needing external infrastructure.

## Tick-End Summaries

Each replay entry becomes:

- a recent-memory item
- a durable-memory record with salience and tags
- a self-narrative entry that references the durable memory id

`buildTickEndSummaries()` turns replay entries into compact per-tick summaries for inspection.

## Query Path

The sim server exposes:

- `GET /api/memory-bootstrap`
- `GET /api/memory-sample?seed=42&ticks=6&agent=A01`

The memory sample endpoint returns:

- tick-end summaries
- recent recall for the requested agent
- durable memory records for that agent
- self-narrative entries for that agent
- persisted counts from the backing store

## Persistence Note

Durable memory is append-only in the current MVP implementation. Future work should add compaction, retention, and archival rules once evaluation needs are clearer.

## Data Engineering Review Note

Because this issue changes persistence behavior, future storage reviews should cover:

- durable store growth and compaction policy
- export/import compatibility for replay artifacts
- query shape stability for downstream identity updates
- migration path from file-backed storage to a dedicated memory service
