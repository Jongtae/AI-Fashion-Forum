# Sprint 1 Agent Seed Schema

Issue `#140` defines the minimum agent/state contract for the first identity-loop vertical slice.

Sprint 1 does not try to model a full lifelong person. It only needs enough structure to show:

1. weak starting differences
2. biased exposure to overlapping world inputs
3. reaction and meaning formation
4. memory/state write-back
5. visibly changed forum posts by round

## Core rule

Agents should **not** start as fully written characters.

They should start as:

- weak seed traits
- weak interest/value seeds
- a small voice hint set
- mutable state that can drift over repeated rounds

## Contract layers

### 1. Seed profile

`seed_profile` is the low-strength initialization layer.

It should explain:

- what kind of agent this may become
- what it is initially drawn toward
- what kind of emotional reaction comes easily
- what kind of language or posture feels natural at the start

Required fields:

- `seed_id`
- `archetype_hint`
- `baseline_traits`
- `interest_seeds`
- `value_seeds`
- `emotional_bias`
- `voice_notes`

### 2. Mutable state

`mutable_state` is the per-agent layer that actually changes over time.

It should be updated by:

- exposure
- reaction
- memory write-back
- self-narrative updates
- later forum/social reinforcement

Required fields:

- `current_traits`
- `current_interests`
- `current_beliefs`
- `attention_bias`
- `affect_state`
- `self_narrative_summary`
- `recent_arc`
- `stance_markers`
- `drift_log`

### 3. Round snapshot

Sprint 1 needs replay/debug-friendly snapshots that let the team inspect why an agent changed.

`createAgentRoundSnapshot()` and `createSimulationRoundSnapshot()` capture:

- what the agent saw
- how the agent reacted
- what changed in identity/state
- what memory was written
- which post(s) were produced

Required agent-round fields:

- `snapshot_id`
- `tick`
- `agent_id`
- `exposure_summary`
- `reaction_summary`
- `identity_delta`
- `memory_write_summary`
- `generated_post_ids`
- `self_narrative_summary`

## Minimal acceptance for Sprint 1

The schema is sufficient only if a reviewer can answer:

1. What weak traits did this agent start with?
2. What overlapping content did the agent actually see?
3. What meaning or affect did the agent derive from it?
4. What changed in identity or narrative state?
5. How did that change show up in the generated forum post?

If the answer is not inspectable from the snapshot data, the schema is still too weak.

## Repository references

- Shared type definitions: `packages/shared-types/state-schema.js`
- Sprint 1 sample cohort and round snapshots: `packages/shared-types/sample-data.js`
- Sample endpoint: `GET /api/sprint1-agent-seed-sample`
