# Forum Generation And Relationship Updates

Issue `#103` builds the first visible-generation layer on top of stored action records.

## Inputs

Generation now considers:

- current identity and belief anchors
- recent self-narrative context
- target relationship state

## Outputs

`packages/agent-core/forum-generation.js` produces:

- a generated forum artifact for `post`, `comment`, or `quote`
- tone selection based on trust, hostility, and alignment
- relationship deltas for trust, hostility, alignment, and fatigue

## Neo4j Handoff

Relationship updates are emitted as structured before/after values so the next storage issue can synchronize graph edges without re-deriving interaction outcomes.

## Local Inspection

The sim server exposes:

- `GET /api/forum-generation-sample`
