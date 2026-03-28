# Action State Transitions

Defines how `post`, `comment`, and `react` actions update agent identity state.

## Overview

Each action type produces deterministic state changes across three dimensions:

1. **Characteristic**: `engagement_level`, `belief_strength`, behavioral tendencies
2. **Belief**: Articulation and expression strengthen conviction
3. **Memory**: Self-narrative logs and relationship graph updates

## State Delta Rules

### POST Action

Posting is the **highest-commitment action**. It signals identity formation and visible stake-taking.

**State Changes:**
- `engagement_level` → +0.08 to +0.12 (depends on topic relevance)
- `belief_strength` → +0.06 to +0.10 (articulation reinforces belief)
- `self_narrative` → appends action entry with engagement boost
- `action_bias_post` → +0.15 (increases likelihood of future posts)
- `action_bias_silence` → ×0.7 (decreases silence bias)

**Relationship Impact:** None (posts are broadcast, not directed)

**Memory Channel:** `belief_shift`

**Formula:**
```
new_engagement = clamp(engagement + 0.08 + topic_relevance × 0.04)
new_belief = clamp(belief + 0.06 + topic_relevance × 0.04)
```

**Next-Action Bias:**
- Posting increases probability of posting again
- Reduces probability of silence/lurking
- Strong signal of active mode

---

### COMMENT Action

Commenting is **medium-commitment**, establishing relationships and stances through direct response.

**State Changes:**
- `engagement_level` → +0.05 to +0.09 (lighter than post)
- `belief_strength` → +0.04 to +0.09 (× disagreement multiplier)
- `relationship_state[target_author]` → engagement and affinity updates
- `self_narrative` → appends action entry with disagreement level
- `action_bias_comment` → +0.12 (increases comment likelihood)
- `belief_assertion_tendency` → +0.06 (higher tendency to state opinions)

**Relationship Graph:**
- If disagreement > 0.2: affinity ↓ −0.05, engagement ↓ −0.08
- If agreement: affinity ↑ +0.04, engagement ↑ +0.06
- `last_interaction_tick` recorded for tracking

**Memory Channel:** `action_comment`

**Formula:**
```
disagreement_multiplier = 1 + |disagreement| × 0.3
new_engagement = clamp(engagement + 0.05 + topic_relevance × 0.04)
new_belief = clamp(belief + (0.04 + topic_relevance × 0.05) × disagreement_multiplier)
```

**Next-Action Bias:**
- High engagement agents comment more frequently
- Positive relationships encourage replies
- Disagreement spikes subsequent assertion (backlash or reconciliation)

---

### REACT Action

Reacting is **low-commitment**, habitual, and frequent. Endorsement without articulation.

**State Changes:**
- `engagement_level` → +0.01 to +0.03 (very light, accumulates over time)
- `belief_strength` → **0** (reactions don't articulate belief)
- `relationship_state[target_author]` → small affinity boost
- `self_narrative` → lightweight entry (no impact on engagement)
- `action_bias_react` → +0.08 (increases reaction likelihood)
- `reaction_frequency_index` → +0.02 (tracks reaction habit)

**Relationship Graph:**
- Support reactions: affinity ↑ +0.03
- Other reactions (curious, laugh): affinity ↑ +0.01
- Engagement always ↑ +0.01

**Memory Channel:** `action_react`

**Formula:**
```
engagement_boost = 0.01 + (reaction_type == "support" ? 0.02 : 0.01)
new_engagement = clamp(engagement + engagement_boost)
affinity_boost = (reaction_type == "support" ? 0.03 : 0.01)
```

**Next-Action Bias:**
- Reactions are habitual (high action bias)
- Reaction frequency indicates preference for light vs. deep engagement
- Inverse relationship with belief articulation

---

## Action Bias System

After each action, the agent's next-action selection is biased by:

```javascript
{
  post_bias: action_bias_post × (1 + belief_assertion_tendency × 0.2),
  comment_bias: action_bias_comment × (1 + engagement_level × 0.15),
  react_bias: action_bias_react × (1 - engagement_level × 0.1),
  silence_bias: (1 - engagement_level) × 0.5
}
```

**Interpretation:**
- Higher `engagement_level` → more comment bias, less react/silence bias
- Higher `belief_assertion_tendency` → more post bias
- Recently posted agents are biased toward posting again
- Low-engagement agents are biased toward silence/lurking

---

## Narrative & Memory

### Self-Narrative Entries

Each action appends a structured memory entry:

```javascript
{
  type: "action_post" | "action_comment" | "action_react",
  timestamp: Date.now(),
  tick: number,
  // action-specific fields
  topic_relevance?: number,
  target_author_id?: string,
  disagreement?: number,
  reaction_type?: string,
  engagement_boost?: number
}
```

These entries form the agent's implicit sense of identity:
- "I post frequently" → `self_narrative.filter(e => e.type === "action_post").length`
- "I often agree with X" → relationship affinity with X
- "I react more than I comment" → `reaction_frequency_index`

### Relationship Graph

Stored as `relationship_state[target_author_id]`:

```javascript
{
  engagement: number,  // how much interaction
  affinity: number,    // direction of agreement/support
  last_interaction_tick: number
}
```

Affects:
- Comment target selection (high-affinity authors get more replies)
- Conflict detection (low-affinity + high engagement = potential conflict)
- Future dialogue patterns

---

## Test Scenarios

### Scenario 1: Post Commitment

Agent posts with high topic relevance (0.8):
- Engagement: 0.5 → 0.58
- Belief: 0.6 → 0.67
- Post bias: 0.3 → 0.45
- Silent bias: 0.2 → 0.14

**Outcome:** Agent is now primed to post again.

### Scenario 2: Comment with Disagreement

Agent comments on post from U123, disagreement = −0.3:
- Engagement: increases moderately
- Belief: increases more (disagreement boost)
- Relationship[U123]: affinity −0.05, engagement +0.06
- Comment bias: 0.4 → 0.52

**Outcome:** Agent is both more likely to comment AND has reduced affinity with U123.

### Scenario 3: Reaction Accumulation

Agent reacts to 3 posts (types: support, curious, support):
- Engagement per reaction: +0.02, +0.01, +0.02 (total +0.05)
- Belief: unchanged
- Reaction frequency: 0.3 → 0.36
- Relationships: 3 authors get small affinity boosts

**Outcome:** Light engagement accumulates without belief commitment. Agent becomes "more reactive, less articulate."

---

## Integration Points

### chooseForumAction

The bias values returned by `calculateActionBias()` feed into action selection:

```javascript
const bias = calculateActionBias(agentState);
const thresholds = {
  silence: 0.3,
  lurk: 0.5,
  react: 0.7,
  comment: 0.85,
  post: 1.0
};

if (affinity < thresholds.silence) return silence();
if (affinity < thresholds.lurk) return lurk();
if (affinity < thresholds.react + bias.react_bias) return react();
// ... etc
```

### Identity Update Rules

State changes from actions feed into belief trajectories:
- High `belief_strength` → stronger pull in content ranking
- High `engagement_level` → wider content surface (less filtering)
- Relationship graph → weighted recommendation scores

### Trace/Snapshot

Each action generates a `writebackRecord` that captures:
- State delta (before/after)
- Engagement and belief changes
- Relationship updates
- Narrative impact

Enabling replay and comparison.

---

## Edge Cases

### Repeated Same Action

- Posting 5 times in a row: belief and engagement plateau near 0.95
- Reacting 20 times: engagement slowly rises, behavior becomes "reactive" identity
- No comments: relationship graphs don't form, agent appears isolated

### Action Contradiction

- High `belief_strength` + low `engagement_level` = conviction without expression
  (Likely to explode in comments when finally engaged)
- High `action_bias_react` + low `action_bias_post` = habitual endorser, not innovator

### Conflict Resolution

When agent comments with high disagreement:
- Relationship affinity drops (conflict signal)
- But belief strength rises (conviction strengthens under opposition)
- Next action bias favors assertion (double down) or silence (disengagement)

---

## References

- `packages/agent-core/action-state-transitions.js` — Implementation
- `packages/agent-core/action-state-transitions.test.js` — Test suite
- `packages/agent-core/action-space.js` — Action selection (uses bias)
- `docs/core-systems/identity-update-rules.md` — Content exposure → belief
