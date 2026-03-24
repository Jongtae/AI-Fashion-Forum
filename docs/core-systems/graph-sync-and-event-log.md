# Graph Sync And Event Log

Issue `#106` adds repository-local event logging and Neo4j-sync-ready graph export.

## Event Log

The sim server now persists event-log entries to:

- `apps/sim-server/data/event-log.json`

Each stored event entry includes:

- `tick`
- `actor_id`
- `action`
- `target_id`
- `reason`

## Neo4j Sync Payload

`packages/agent-core/graph-storage.js` emits:

- Neo4j node payloads
- Neo4j relationship payloads
- browser-friendly graph exports

## Core Queries

The stored sample includes five documented query templates:

- trust neighbors
- content by topic
- authored content
- agent interest topics
- content topic clusters

## Local Inspection

The sim server exposes:

- `GET /api/graph-storage-sample`
