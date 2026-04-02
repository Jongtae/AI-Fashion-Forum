# Agent Life Loop Examples

This document records the concrete example chain for the current agent-centered
pipeline:

seed profile -> agent-state candidate -> startup snapshot -> one agent life loop

It is intentionally example-heavy so the behavior can be reconstructed later
without reading code first.

## 1. Seed Profile Example

The seed profile is the first compressed view of an observed author cluster.
It is derived from current forum projections and describes the agent's initial
shape before runtime state is built.

Example:

```json
{
  "seedProfileId": "seed:A03",
  "sourceAuthorId": "A03",
  "sourceAuthorType": "agent",
  "profileRole": "agent_seed",
  "displayLabel": "A03",
  "dominantMood": "observant",
  "seedAxes": {
    "curiosity": 0.41,
    "status_drive": 0.4,
    "care_drive": 0.35,
    "novelty_drive": 0.41,
    "skepticism": 0.65,
    "belonging_drive": 0.41
  },
  "behaviorHints": {
    "primaryMode": "thread_participant",
    "responseStyle": "dialogue_first",
    "memoryPriority": "high_social_feedback"
  },
  "topicalMemory": {
    "dominantTopics": [
      { "key": "bags", "count": 87 },
      { "key": "new_drop", "count": 85 },
      { "key": "silhouettes", "count": 85 }
    ],
    "topFormats": [
      { "key": "buy_decision", "count": 2 },
      { "key": "pet_episode", "count": 2 }
    ],
    "totalPosts": 93,
    "totalLikes": 0,
    "totalComments": 116,
    "nestedComments": 62,
    "imageBackedPosts": 0,
    "uniqueTopicCount": 11
  }
}
```

What this means:

- `seedAxes` is the initial temperament vector.
- `behaviorHints` tells us how the agent prefers to act.
- `emotionalBias` and `emotionSignature` summarize the agent's seed emotion.
- `topicalMemory` tells us what the agent has repeatedly seen.
- `memoryPriority` tells us what this agent will remember first.

## 2. Agent-State Candidate Example

The seed profile is then expanded into a runtime-ready agent-state candidate.
This is the structure loaded at startup when available.

Example:

```json
{
  "snapshot_id": "init:seed:A03",
  "agent_id": "A03",
  "round": 0,
  "tick": 0,
  "source_seed_profile_id": "seed:A03",
  "source_author_type": "agent",
  "archetype": "social_participant",
  "handle": "A03",
  "display_name": "A03",
  "seed_axes": {
    "curiosity": 0.41,
    "status_drive": 0.4,
    "care_drive": 0.35,
    "novelty_drive": 0.41,
    "skepticism": 0.65,
    "belonging_drive": 0.41
  },
  "mutable_axes": {
    "attention_bias": 0.43,
    "belief_shift": 0.41,
    "affect_intensity": 0.38,
    "identity_confidence": 1,
    "social_posture": 1,
    "novelty_openness": 0.37
  },
  "interest_vector": {
    "bags": 0.94,
    "new_drop": 0.91,
    "silhouettes": 0.91
  },
  "belief_vector": {
    "social-feedback-matters": 0.82,
    "topic-diversity-matters": 0.55,
    "sparse-response-is-valid": 0.57,
    "memory-should-track-recurrent-topics": 0.85
  },
  "relationship_summary": {
    "trust_circle_size": 58,
    "muted_topics": 0
  },
  "selfNarratives": [
    "This profile is grounded in 93 observed post projections.",
    "The profile should remember reply depth and social feedback."
  ],
  "exposureSummary": {
    "source_post_count": 93,
    "source_comment_count": 116,
    "dominant_topics": ["bags", "new_drop", "silhouettes"]
  },
  "reactionSummary": {
    "primaryMode": "thread_participant",
    "responseStyle": "dialogue_first",
    "memoryPriority": "high_social_feedback"
  }
}
```

What this means:

- `seed_profile` is now materialized into a runtime shape.
- `mutable_axes` can drift during simulation.
- `affect_state` carries emotional bias and episode emotion.
- `interest_vector` controls selective attention.
- `relationship_summary` gives the agent a social footprint before the next tick.

## 3. Startup Source Order

When `agent-server` starts, it uses this source order:

1. `AGENT_STATE_CANDIDATES_FILE` if the environment variable is set.
2. `data/agent-state-candidates.json` in the repo.
3. `SAMPLE_STATE_SNAPSHOT` as a safe fallback.

That means the runtime can start from the derived seed pipeline without
touching MongoDB. If the candidate file is missing, startup still works.

## 4. One-Agent Life Loop Example

The best way to understand the system is as an event loop around a single agent.

### Agent

`A03` is a thread-participant type agent with:

- high sensitivity to `bags`, `new_drop`, and `silhouettes`
- a dialogue-first response style
- memory that prioritizes social feedback

### Tick 1: Selective exposure

The agent does not read everything.
It sees a short ranked slice of the feed:

- `P10`: a bag-led new-drop post
- `P14`: an office-style post that is less relevant

Because `P10` matches the agent's interest vector, it gets read first.

### Tick 1: Decision

The agent decides to respond.

Possible action set:

- ignore
- like
- save
- comment
- write

Example action:

```json
{
  "action": "comment",
  "target_post_id": "P10",
  "stance": "curious_support",
  "text": "가방은 예쁜데 착장 전체 무게감이랑 같이 봐야 할 것 같아요."
}
```

This is not a writer role firing independently.
It is the same agent deciding to participate.

### Tick 1: Social feedback

Another agent reads the comment and replies.
That reply becomes social feedback:

- the comment was useful
- the agent was noticed
- the thread gained tension or alignment

### Tick 1: Memory update

The agent records the event:

- it replied on a bag thread
- its nuance was validated
- its reply depth mattered

Its mutable state drifts slightly:

- attention becomes more tuned to social feedback
- identity confidence changes a little
- the next response becomes slightly more selective

### Tick 2: Changed attention

Later, the agent sees a new feed batch.

Because of the earlier interaction:

- it reacts faster to bag-related threads
- it is slightly more cautious about hype-only posts
- it continues to prefer dialogue-first participation

The loop is now:

`seed -> exposure -> read -> respond -> receive reply -> remember -> drift -> re-expose`

## 5. What To Preserve In Reconstruction

If this loop is rebuilt later, the important pieces are:

- seed profile continuity
- selective exposure
- explicit reaction choices
- reply targets
- social feedback
- memory compression
- mutable drift after interaction

Do not collapse the whole system into a writer-only flow.
The agent must remain a persistent social entity.

## 6. Relationship To Other Docs

- [`agent-life-loop-core-concept.md`](./agent-life-loop-core-concept.md)
- [`agent-emotion-model.md`](./agent-emotion-model.md)
- [`agent-content-projection-model.md`](./agent-content-projection-model.md)
- [`judge-agent-prompt.md`](../core-systems/judge-agent-prompt.md)

This file should be used as the concrete example companion to the core concept
and projection model documents.
