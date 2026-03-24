# Sprint 1 Biased Exposure Loop

Issue `#142` turns the Sprint 1 starter pack into a usable identity-loop input.

## Goal

The same small external world should not produce the same internal meaning for every agent.

Sprint 1 needs:

- overlapping inputs
- biased selection
- structured reaction records
- outputs that can be handed to memory and forum-generation layers

## What changed

The Sprint 1 exposure sample now does more than rank content.

It also produces reaction records that describe:

- what the agent felt
- what meaning frame the agent used
- what stance signal is likely to follow
- whether the item should be written into memory

## Reaction record fields

The current structured output includes:

- `reaction_id`
- `agent_id`
- `content_id`
- `rank`
- `dominant_feeling`
- `meaning_frame`
- `stance_signal`
- `resonance_score`
- `memory_write_hint`
- `explanation`
- `score_breakdown`

This is intentionally lightweight.

It exists so Sprint 1 can connect:

`content -> exposure -> reaction -> memory -> post`

without pretending that full psychological realism is already solved.

## Current meaning frames

The Sprint 1 loop currently collapses interpretation into a few explainable modes:

- `tradeoff_filter`
- `care_context`
- `signal_filter`
- `practicality_filter`
- `context_filter`

This is enough to make different agents read the same world differently in a reviewable way.

## Current sample endpoint

- `GET /api/sprint1-exposure-sample?agent=S01`

Use different Sprint 1 agents such as `S01`, `S02`, and `S03` to verify:

- different selection order
- different feeling/meaning outputs
- different memory-write hints

## Acceptance rule

Sprint 1 passes this layer only if a reviewer can see that:

1. the selected content differs by agent
2. the interpretation differs by agent
3. the reaction output is structured enough for downstream write-back

If the sample only looks like rank order variance without meaning variance, the loop is not strong enough yet.
