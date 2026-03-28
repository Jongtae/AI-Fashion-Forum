# Conflict Detection & Resolution

Defines how agents detect interpersonal conflicts and respond strategically based on personality traits and conflict severity.

## Conflict Definition

A conflict emerges when three conditions align:

1. **Low Affinity** (< 0.4): Agent doesn't trust the author
2. **High Engagement** (> 0.6): Author is visible/vocal in agent's feed
3. **Belief Contradiction** (agent belief > 0.65 AND content direction < -0.3): Ideas contradict

```
conflict_strength = (lowAffinity: 0.3) + (highEngagement: 0.3) +
                    (beliefContradiction: 0.2) + (recentEngagement: 0.2)
```

**Conflict Levels:**
- `none` (< 0.3): No conflict
- `mild` (0.3–0.5): Disagreement, manageable
- `moderate` (0.5–0.7): Salient disagreement
- `severe` (> 0.7): Fundamental opposition

---

## Detection Algorithm

### Input

```javascript
{
  agentState: { belief_strength, relationship_state[author], ... },
  targetAuthorId: "U999",
  contentRecord: { direction, topics, likes },
  recentInteractionHistory: [{ target_author_id, ... }, ...]
}
```

### Indicators

```javascript
const lowAffinity = relationship.affinity < 0.4
const highEngagement = relationship.engagement > 0.6
const beliefContradiction =
  agentBeliefStrength > 0.65 && contentDirection < -0.3
const recentEngagementIntensity =
  clamp(recentWithAuthor / 3)
```

### Output

```javascript
{
  has_conflict: boolean,
  conflict_strength: 0.0–1.0,
  conflict_level: "none" | "mild" | "moderate" | "severe",
  lowAffinity: boolean,
  highEngagement: boolean,
  beliefContradiction: boolean,
  recentEngagementIntensity: 0.0–1.0,
  indicators: { affinity, engagement, agent_belief_strength, content_direction }
}
```

---

## Response Strategies

After detecting conflict, agent chooses response based on personality:

### Dialogue (Open + Tolerant)

**Conditions:**
- `openness > 0.6`
- `conflict_tolerance > 0.6`

**Action Priority:** `["comment", "react", "lurk", "silence"]`

**State Changes:**
- Belief softens (−0.06 × conflict_strength)
- Engagement increases
- Comment bias increases

**Rationale:** "Let me understand their perspective."

---

### Escalation (Assertive + Conviction)

**Conditions:**
- `belief_strength > 0.7`
- `conflict_tolerance < 0.5`

**Action Priority:** `["post", "comment", "react", "silence"]`

**State Changes:**
- Belief hardens (+0.12 × conflict_strength)
- Engagement increases
- Post and comment bias increase

**Rationale:** "I need to defend my position."

---

### Careful Engagement (Moderate)

**Conditions:**
- `openness > 0.4`
- `conflict_tolerance > 0.4`
- Other traits moderate

**Action Priority:** `["react", "lurk", "comment", "silence"]`

**State Changes:**
- Cautious, measured response
- Bias toward light engagement (react) before heavy (comment)

**Rationale:** "I'll engage carefully."

---

### Withdrawal (Closed + Low Tolerance)

**Conditions:**
- `openness < 0.4` OR
- `conflict_tolerance < 0.4`

**Action Priority:** `["silence", "lurk", "react", "comment"]`

**State Changes:**
- Belief slightly reinforces (+0.03 × conflict_strength)
- Engagement decreases
- Silence bias increases (+0.2)

**Rationale:** "I don't want to engage."

---

## State Delta Rules

### Belief Entrenchment

| Strategy | Formula | Impact |
|----------|---------|--------|
| Escalation | +0.12 × conflict_strength | Hardens conviction |
| Dialogue | −0.06 × conflict_strength | Softens conviction (reconsider) |
| Withdrawal | +0.03 × conflict_strength | Slight reinforcement (isolation) |
| Careful | No change | Neutral |

### Relationship Deterioration

All conflicts decrease affinity:

```javascript
affinityDelta = −0.15 × conflict_strength
```

Engagement changes depend on strategy:

| Strategy | Engagement Delta |
|----------|-----------------|
| Escalation | +0.1 × conflict_strength (doubles down) |
| Dialogue | −0.08 × conflict_strength (cautious) |
| Withdrawal | −0.08 × conflict_strength (disengages) |
| Careful | −0.05 × conflict_strength (light engagement) |

### Action Bias Updates

**Escalation Response:**
- `action_bias_post` → +0.15
- `action_bias_comment` → +0.12

**Dialogue Response:**
- `action_bias_comment` → +0.15
- `action_bias_react` → ×0.7 (reduce light engagement)

**Withdrawal Response:**
- `action_bias_silence` → +0.2
- `action_bias_react` → ×0.6 (avoid even light engagement)

---

## Conflict Activation Flag

During and after conflict, agent maintains per-author activation:

```javascript
conflict_activation[author_id] = {
  level: "mild" | "moderate" | "severe",
  strength: 0.0–1.0,
  tick: number,           // When did it start?
  strategy: "escalate" | "dialogue" | "careful" | "withdraw"
}
```

Affects:
- Future action selection with same author
- Relationship graph weighting
- Content ranking (may suppress author's posts)

---

## Example Scenarios

### Scenario 1: Severe Conflict with Escalation

**Agent Profile:**
- Belief: 0.8 (strong conviction)
- Openness: 0.3 (closed-minded)
- Tolerance: 0.3 (low)

**Conflict:**
- Author affinity: 0.2 (mistrusted)
- Engagement: 0.8 (very visible)
- Direction: −0.8 (fundamental disagreement)
- Strength: 0.75 (severe)

**Response:**
- Strategy: Escalation
- Action priority: [post, comment, react, silence]

**State Changes:**
- Belief: 0.8 → 0.89 (hardens under opposition)
- Affinity: 0.2 → 0.09 (further deteriorates)
- Engagement: 0.8 → 0.88 (doubles down in engagement)
- Post bias: +0.15, Comment bias: +0.12

**Outcome:** Agent becomes more vocal, more polarized, less likely to interact with this person in open-minded ways.

---

### Scenario 2: Mild Conflict with Dialogue

**Agent Profile:**
- Belief: 0.6 (moderate conviction)
- Openness: 0.75 (open-minded)
- Tolerance: 0.7 (high)

**Conflict:**
- Author affinity: 0.6 (neutral relationship)
- Engagement: 0.5 (moderately visible)
- Direction: −0.3 (mild disagreement)
- Strength: 0.35 (mild)

**Response:**
- Strategy: Dialogue
- Action priority: [comment, react, lurk, silence]

**State Changes:**
- Belief: 0.6 → 0.58 (slightly softens, open to reconsideration)
- Affinity: 0.6 → 0.55 (modest decrease)
- Engagement: 0.5 → 0.46 (cautious engagement)
- Comment bias: +0.15

**Outcome:** Agent engages respectfully, questions own assumptions, explores common ground.

---

### Scenario 3: Severe Conflict with Withdrawal

**Agent Profile:**
- Belief: 0.55 (moderate conviction)
- Openness: 0.2 (closed-minded)
- Tolerance: 0.2 (very low)

**Conflict:**
- Author affinity: 0.3 (mistrusted)
- Engagement: 0.7 (salient presence)
- Direction: −0.6 (strong disagreement)
- Strength: 0.68 (severe)

**Response:**
- Strategy: Withdrawal
- Action priority: [silence, lurk, react, comment]

**State Changes:**
- Belief: 0.55 → 0.57 (slightly reinforced by isolation)
- Affinity: 0.3 → 0.2 (relationship degrades)
- Engagement: 0.7 → 0.63 (withdraws)
- Silence bias: +0.2, React bias: ×0.6

**Outcome:** Agent stops engaging with this person, hides posts, mutes participation.

---

## Integration Points

### chooseForumAction

Conflict activation biases action selection. High conflict with an author makes:
- Reply-to-that-author less likely (affinity down)
- Public assertion more likely (belief hardened)
- Lurking more likely (withdrawal strategy)

### relationship_state

Conflict decreases affinity permanently (until repair). Subsequent interactions with that author are colder.

### content_ranking

High-conflict authors may be deprioritized in feed ranking (if agent chose withdrawal).

### trace/snapshot/event

Conflict resolution generates:
- `conflict_event` type narrative entry
- State delta with belief/affinity/engagement changes
- `memory_channel: "conflict_resolution"` writeback

Enables replay queries:
- "What conflicts did agent X have?"
- "How did conflict with Y change X's beliefs?"
- "Which conflicts led to belief hardening vs. softening?"

---

## References

- `packages/agent-core/conflict-detection.js` — Implementation
- `packages/agent-core/conflict-detection.test.js` — Test suite (25 tests)
- Used by: chooseForumAction (next priority adjustment)
- Integrates with: action-state-transitions, content-consumption-merge, trace-snapshot-contract
