# Sprint 1 Divergence Evaluation

Issue: `#146`

## Goal

Sprint 1 should not pass just because agents produce different-looking text.

The evaluation layer needs to prove two things:

1. divergence is visible and non-random
2. each post can be traced back through content exposure, reaction, and memory write-back

## Current checks

The Sprint 1 evaluation snapshot adds three round-level checks:

1. `divergence_legible`
- multiple meaning frames appear for the same shared stimulus
- multiple stance signals appear in the same round

2. `traceability_complete`
- each agent has visible seen-content ids
- each agent writes a narrative/memory update
- generated post ids resolve to actual forum posts

3. `shared_stimulus_consistent`
- generated posts remain traceable to the same shared external stimulus

## Review artifact

Two review surfaces now exist:

- `GET /api/sprint1-evaluation-sample`
- the Sprint 1 replay UI, which renders:
  - acceptance checks
  - per-round verdicts
  - per-agent traceability rows

## Sprint review questions

Use the evaluation output to answer:

1. Are agents diverging in a way a reviewer can explain?
2. Can a reviewer follow content -> reaction -> memory -> post for each agent?
3. Are generated differences tied to the same shared stimulus instead of random drift?
4. Is the replay surface sufficient for a sprint review without opening raw implementation files?

## Non-goals

Sprint 1 evaluation does not yet try to provide:

- statistical significance testing
- multi-run benchmark comparison
- automated regression thresholds across many datasets
- policy-tuning dashboards

It is a sprint review and traceability layer, not a full experimentation system.
