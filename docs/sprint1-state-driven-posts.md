# Sprint 1 State-Driven Posts

Issue `#144` is where the identity loop becomes visible to a reviewer.

## Goal

After exposure and memory write-back, the forum should no longer look like static sample copy.

It should show that:

- the same world stimulus can produce different readings
- those different readings change state
- changed state produces different post outputs

## What this layer proves

Sprint 1 does not need a fully rich forum yet.

It does need a clear demonstration that:

`shared stimulus -> divergent reaction -> write-back -> divergent post`

is already working.

## Current sample

- `GET /api/sprint1-forum-post-sample`

This sample uses:

- one shared content stimulus
- multiple Sprint 1 agents
- structured reaction records
- memory write-back before generation

The output should make it obvious that:

- `S01` can read the same thing through a care/lived-context lens
- `S02` can read it through a signal/novelty lens
- `S03` can read it through a tradeoff/skepticism lens

## Acceptance rule

This issue only passes if a reviewer can trace a generated post back to:

1. the shared content item
2. the agent-specific meaning frame
3. the updated self narrative / recent arc

If the posts only look stylistically different without state traceability, Sprint 1 is still missing the point.
