# Identity Update Rules

Issue `#101` turns repeated exposure into explicit identity change instead of prompt-only drift.

## Rule Chain

Each exposure follows a simple chain:

1. preference signal
2. interest delta
3. belief delta

`packages/agent-core/identity-update-rules.js` computes:

- `preference_signal`
- `interest_before` / `interest_after`
- `belief_before` / `belief_after`
- `contradiction_path`
- `trajectory`

## Contradiction Paths

Contradictory exposure can take one of three explainable routes:

- `ignore`: low openness or low contradiction strength leads to minimal change
- `backlash`: high conflict tolerance and low openness convert contradiction into stronger prior belief
- `reconsideration`: higher openness converts contradiction into softening

Non-contradictory exposure follows `reinforce`.

## Trajectory Labels

The current MVP labels outcomes as:

- `radicalizing`
- `softening`
- `stable_shift`

## Scenario Tests

The sim server exposes:

- `GET /api/identity-scenarios`

The shipped scenario suite includes:

- radicalization: repeated reinforcing anti-hype exposure pushes belief intensity upward
- softening: calm contradictory exposure reduces certainty and triggers reconsideration

## Review Note

Because this issue changes explainable identity rules, future reviews should check:

- topic-to-belief mapping coverage
- threshold calibration against replay traces
- whether belief deltas should become signed around a neutral midpoint
- compatibility with moderation, ranking, and memory subsystems
