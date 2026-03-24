# Sprint 1 Replay Drift UI

Issue: `#145`

## Purpose

Sprint 1 needs a reviewer-facing surface that makes the identity loop legible without requiring someone to inspect raw JSON or server-side traces.

The replay UI is the minimum vertical slice for that review.

It should answer four questions quickly:

1. What shared stimulus did agents react to in this round?
2. How did each agent's state move?
3. What memory/self-narrative summary was written back?
4. What forum posts came out of that updated state?

## Current UI scope

The current replay surface is a static review UI backed by Sprint 1 sample data.

It includes:

- round timeline selection
- per-round shared stimulus panel
- per-agent drift inspection panel
- forum output grouped by round

## Why this is enough for Sprint 1

Sprint 1 is proving the minimum identity-evolution loop, not building a full simulation console.

The replay UI is intentionally small. It is meant to support sprint review and debugging by showing:

- the same external content stimulus
- divergent agent interpretation
- visible state drift
- forum output generated from changed state

## Reviewer checklist

When using the replay UI, a reviewer should be able to confirm:

1. the round order is understandable
2. the shared stimulus is visible
3. each agent panel feels different enough to inspect
4. the drift summary is concrete, not decorative
5. the resulting forum posts read as consequences of changed state

## Non-goals

The Sprint 1 replay UI does not yet try to provide:

- live server-backed replay playback
- full memory graph browsing
- moderation/admin tooling
- multi-run comparison
- experiment dashboards

Those are later-phase concerns.
