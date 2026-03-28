# Content Consumption & Merge

Defines state read/write rules for internal forum and external web content consumption, unified into a single memory writeback flow.

## Overview

Content consumption has two distinct paths that merge into unified state updates:

1. **Internal Forum Content** — Posts from other agents within the forum
2. **External Web Content** — Information from external sources (news, blogs, authorities)

Both paths impact belief, interest, and relationship state, but through different mechanisms.

## Internal Forum Content Consumption

### State READ

Before updating, the agent reads its current relationship state with the content author:

```javascript
const authorRelationship = agentState.relationship_state[authorId] || {
  engagement: 0.5,
  affinity: 0.5
};
```

Also reads current interests in the content topics:

```javascript
const topicAffinities = contentRecord.topics.map(
  topic => agentState.interest_vector[topic] || 0.5
);
```

### Receptivity Calculation

Receptivity determines how much this content affects the agent:

```
authorReceptivity = affinity × 0.4 + engagement × 0.2
topicReceptivity = avgTopicAffinity × 0.3
socialReceptivity = socialProof × 0.1  // likes + replies
totalReceptivity = clamp(authorReceptivity + topicReceptivity + socialReceptivity)
```

**Factors:**
- **Author affinity** (40%): Trust in the author's judgment
- **Author engagement** (20%): Familiarity with the author
- **Topic relevance** (30%): How interested is the agent in this topic?
- **Social proof** (10%): Validation from likes/replies

### State WRITE

#### Belief Strength

```javascript
beliefDelta = clamp(totalReceptivity × 0.08 × (contentDirection ≥ 0 ? 1 : 0.6))
belief_strength = clamp(belief_strength + beliefDelta)
```

- Reinforcing content: Full impact (1.0x)
- Contradicting content: Reduced impact (0.6x)

#### Interest Vector

```javascript
interestDelta = clamp(totalReceptivity × 0.06)
interest_vector[topic] = clamp(interest_vector[topic] + interestDelta)
```

Topics increase based on receptivity and social proof.

#### Relationship State

```javascript
relationship_state[authorId].engagement += 0.02
relationship_state[authorId].last_consumed_tick = tick
```

Affinity remains unchanged (only direct interactions modify affinity).

#### Memory

Narrative entry records consumption:

```javascript
{
  type: "consumed_internal_content",
  author_id: authorId,
  topics: contentRecord.topics,
  receptivity: totalReceptivity,
  social_proof: socialProof
}
```

---

## External Web Content Consumption

### State READ

External content receptivity depends on agent characteristics:

```javascript
const agentOpenness = agentState.openness || 0.5;
const agentConflictTolerance = agentState.conflict_tolerance || 0.5;
const currentBeliefStrength = agentState.belief_strength || 0.6;
```

### Receptivity Calculation

```
authorityReceptivity = authority × 0.4          // domain reputation
noveltyReceptivity = novelty × 0.3 × (openness × 0.5 + 0.5)
contradictionReceptivity = contradiction × 0.3 × conflictTolerance
totalReceptivity = clamp(authorityReceptivity + noveltyReceptivity + contradictionReceptivity)
```

**Factors:**
- **Authority** (40%): Source credibility (vogue.com > random blog)
- **Novelty** (30%): How different from current interests (modulated by openness)
- **Contradiction** (30%): Does it contradict current beliefs? (modulated by conflict tolerance)

### State WRITE

#### Belief Strength (Conditional)

**If contradictory (contradiction > 0):**

```javascript
if (conflictTolerance > 0.6 && openness > 0.6) {
  // Open agent: reconsidering
  beliefDelta = -clamp(totalReceptivity × 0.12);  // belief softens
} else {
  // Closed agent: backlash
  beliefDelta = clamp(totalReceptivity × 0.06);   // belief hardens
}
```

**If reinforcing:**

```javascript
beliefDelta = clamp(totalReceptivity × 0.1);
```

External content can shift beliefs more dramatically than internal (0.12 vs 0.08).

#### Perspective Breadth (NEW)

```javascript
perspective_breadth = clamp(perspective_breadth + novelty × 0.05)
```

Tracks exposure to diverse viewpoints (external-only metric).

#### Interest Vector

```javascript
interestDelta = clamp(novelty × totalReceptivity × 0.08)
interest_vector[topic] = clamp(interest_vector[topic] + interestDelta)
```

External content drives interest in novel topics.

#### Memory

```javascript
{
  type: "consumed_external_content",
  authority_source: contentRecord.source,
  topics: contentRecord.topics,
  novelty,
  caused_contradiction: contradiction > 0
}
```

---

## Merge Logic

### Sequential Application

Internal and external consumptions apply sequentially to the same agent state:

```javascript
let agent = baseAgent;
internalConsumptions.forEach(c => {
  const result = applyInternalContentConsumption({ agentState: agent, ... });
  agent = result.agent;
  writebacks.push(result.writebackRecord);
});
externalConsumptions.forEach(c => {
  const result = applyExternalContentConsumption({ agentState: agent, ... });
  agent = result.agent;
  writebacks.push(result.writebackRecord);
});
```

### Unified Writeback

All consumptions generate writebacks under unified channels:

- Internal: `memory_channel: "content_internal"`
- External: `memory_channel: "content_external"`

Enables replay and contrastive analysis.

---

## Example Scenarios

### Scenario 1: Trusted Forum Author

Agent A01 reads a post from U123 (high affinity: 0.6):

```
Topics: [fit, fashion]
Likes: 15, Replies: 5
Direction: +1 (reinforcing)
```

**Receptivity:**
- Author: 0.6 × 0.4 + 0.7 × 0.2 = 0.38
- Topic: 0.6 × 0.3 = 0.18
- Social: 0.5 × 0.1 = 0.05
- **Total: 0.61**

**Impact:**
- Belief: +0.08 × 0.61 × 1 = +0.049
- Interest[fit]: +0.06 × 0.61 = +0.037
- Engagement[U123]: +0.02

---

### Scenario 2: Contradictory External Authority

Agent A01 (openness: 0.8, closed on pricing) reads Economist article:

```
Topics: [pricing]
Authority: 0.85
Direction: -1 (contradicts)
Novelty: 1.0 - 0.3 = 0.7
```

**Receptivity:**
- Authority: 0.85 × 0.4 = 0.34
- Novelty: 0.7 × 0.3 × 0.9 = 0.19
- Contradiction: 1 × 0.3 × 0.8 = 0.24
- **Total: 0.77**

**Impact (open-minded):**
- Belief: −0.12 × 0.77 = −0.092 (softens conviction)
- Perspective: +0.7 × 0.05 = +0.035
- Interest[pricing]: +0.7 × 0.77 × 0.08 = +0.043

---

### Scenario 3: Echo Chamber

Same agent reads 3 internal posts from like-minded authors (all direction: +1):

**Cumulative Effect:**
- Belief strength approaches 0.8–0.9
- Interest vector narrows (familiar topics amplified)
- Relationship engagement increases with echo group
- Perspective breadth remains flat (no external exposure)

**Risk:** Radicalization without external check.

---

### Scenario 4: Perspective Broadening

Agent reads 1 internal post + 1 contradictory external post:

**After internal:**
- Belief: 0.65
- Perspective: 0.2

**After external (contradictory, authority 0.9):**
- Belief: 0.58 (softened by opposition)
- Perspective: 0.27 (broadened)

**Outcome:** Agent now has "tempered conviction" state — belief is weaker but perspective is broader.

---

## Integration Points

### identity-update-rules.js

Content consumption triggers `applyIdentityExposure()` to calculate larger-scale identity trajectories. This module provides the immediate state delta; identity rules provide the cumulative effect.

### action-state-transitions.js

Consuming content can bias future action choices. High perspective breadth may increase openness to commenting on opposing views.

### chooseForumAction

Belief strength and openness from consumption history modulate action selection:
- High belief + low openness → more aggressive posting
- High perspective + high openness → more exploratory reactions

### trace/snapshot/event replay

Each writebackRecord captures consumption type, receptivity, and state delta, enabling:
- "What changed this agent's mind?"
- "Was it internal community pressure or external evidence?"
- Contrastive analysis of echo chamber vs. broadened agents

---

## Testing

Run with:
```bash
npm test -- content-consumption-merge.test.js
```

Tests cover:
- Internal receptivity modulation by author/topic/social
- External receptivity modulation by authority/novelty/contradiction
- Belief softening vs. hardening on contradiction
- Perspective broadth accumulation
- Sequential and merged path composition
- Edge cases (no social proof, unknown author, zero novelty)

---

## References

- `packages/agent-core/content-consumption-merge.js` — Implementation
- `packages/agent-core/content-consumption-merge.test.js` — Test suite
- `docs/core-systems/action-state-transitions.md` — Action-driven state updates
- `docs/core-systems/identity-update-rules.md` — Exposure-driven belief trajectories
