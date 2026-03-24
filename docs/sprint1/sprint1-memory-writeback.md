# Sprint 1 Memory Write-Back

Issue `#143` makes the first identity-loop reactions stick.

## Goal

Sprint 1 needs more than ranked exposure and reaction labels.

It needs a minimal path where:

`reaction -> durable memory -> self narrative -> updated mutable state`

actually happens.

## What this layer is for

This is not a final memory architecture.

It is the smallest write-back layer that lets the team prove:

- a selected reaction can become memory
- that memory can update self-narrative
- that self-narrative and mutable state can drift
- downstream post generation can consume changed state instead of static seeds

## Current write-back path

`rememberSprint1Reaction()` now:

1. converts a structured reaction record into recent memory
2. writes a durable memory record
3. writes a self-narrative entry
4. updates mutable state fields such as:
   - `current_beliefs`
   - `current_traits`
   - `affect_state`
   - `attention_bias`
   - `self_narrative_summary`
   - `recent_arc`
   - `stance_markers`
   - `drift_log`

## Meaning-frame drift mapping

Sprint 1 currently maps:

- `care_context` -> stronger `care-over-performance`
- `signal_filter` -> stronger `novelty-has-value`
- `tradeoff_filter` -> stronger `hype-obscures-tradeoffs`
- `practicality_filter` -> stronger `daily-utility`

This is intentionally simple and inspectable.

## Current sample endpoint

- `GET /api/sprint1-memory-writeback-sample?agent=S01`

This should let a reviewer see:

- which reactions were written
- what durable memories were created
- what self-narrative entries were created
- how the mutable state changed

## Acceptance rule

Sprint 1 passes this layer only if a reviewer can say:

1. this reaction was important enough to be remembered
2. it changed what the agent now believes or attends to
3. the self-narrative changed in a readable way

If memory records are written but state does not visibly move, the write-back loop is still too weak.
