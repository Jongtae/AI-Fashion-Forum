# Identity-Formation Agent Pivot Round 1 Meeting Handoff

## Background

AI Fashion Forum has so far evolved as a text-first fashion discussion mock and then as a fashion-centered lifestyle community with pet-episode content.

Recent issues improved realism, warmth, and feed variety, but they still treated the forum feed itself as the primary product.

The new proposal reframes the project at a deeper layer:

- the forum is not the core product by itself
- the real product is an agent society where identities form over time
- exploration is not just information retrieval, but a learning process that strengthens tendencies, values, and alliances

This meeting was called to decide whether the project should keep extending the current lifestyle-community direction or pivot toward identity formation as the main product thesis.

## What Triggered This Handoff

The current direction already made the product more believable through:

- text-first discussion rules
- realistic Korean lifestyle/fashion scenes
- pet-episode warmth and daily-life texture
- lighter UI and less explanatory product chrome

However, the new proposal identified a stronger differentiator:

- the interesting unit is not the post alone
- the interesting unit is who an agent becomes after repeated exposure, reaction, memory, and reinforcement
- the forum becomes a visible stage for long-running character divergence rather than a static mock feed

This is a product-direction decision, not a small feature addition.

## Round 1 Outcome

Round 1 approves a pivot in principle.

The project should move from:

- a fashion-centered lifestyle community mock

to:

- an identity-forming agent forum simulation, initially expressed through a fashion/lifestyle/pet seed world

This is a partial pivot, not an immediate deletion of the current direction.

The current fashion/lifestyle work remains valuable, but it should be reinterpreted as:

- a seed domain
- a realism layer
- a stimulus library
- an early social world where agent identity formation can be observed

Until a later round formally replaces top-level policy docs, the current shipped UI and current product-identity docs remain the active source of truth for `main`.

## Agreed Decisions

- The project's new north star is agent-based identity formation, not feed realism by itself.
- The forum is the visible outcome layer; the real engine is exposure, emotional response, meaning-making, memory, and reinforcement.
- Agents should begin with weak preference seeds, not fully written fixed personas.
- Character consistency should come from accumulated history, not prompt-only roleplay.
- Slow, cumulative identity drift is required; one interaction should not cause abrupt worldview flips.
- Counter-experiences and disagreement must remain possible so agents can branch, stall, soften, or radicalize in believable ways.
- Existing fashion/lifestyle/pet content should be reused as one controlled world for early experiments instead of being discarded.
- The current feed and assets should be evaluated as training/stimulus material for agents, not only as user-facing mock content.
- Data Engineering must be involved in follow-up design because the shift affects state shape, event history, memory records, validation, and content packaging.

## Product Reframe

Use this as the working product definition for post-Round-1 planning:

This project is an agent-based identity formation simulation in which forum discussions emerge from repeated exposure, reaction, memory, and reinforcement inside a believable social world.

Use this as the working definition of the current fashion/pet/lifestyle material:

The current AI Fashion Forum experience is the first seed world for observing identity formation, not necessarily the final product category.

## What Changes From The Current Direction

### Previously

- The main question was whether the feed feels like a believable Korean fashion/lifestyle community.
- Pets and daily-life posts were used to make the feed warmer and more lovable.
- Image realism and text-first layout were major quality gates.

### Now

- The main question becomes whether agents form recognizable identities over time.
- Content categories matter because they shape exposure patterns, not just because they diversify the feed.
- The most important artifact is not a single believable post, but a believable character arc.
- Feed realism still matters, but as simulation-world quality rather than the end goal.

## Non-Goals

- Do not treat this as a generic search-agent project.
- Do not solve the pivot by writing longer persona prompts.
- Do not replace slow identity formation with one-shot trait assignment.
- Do not discard the existing fashion/lifestyle/pet work as wasted effort.
- Do not broaden immediately into every possible topic domain before the identity loop works in one seed world.
- Do not let the project collapse into cute-pet content, image browsing, or shopping behavior.
- Do not create an opaque simulation where identity change cannot be explained from prior exposure and memory.

## System Rules For Follow-Up Work

- Start agents with small taste seeds, sensitivities, and reinforcement tendencies.
- Represent exposure as selective and biased, not fully random.
- Distinguish weak preference, strong emotional reaction, remembered event, and identity-level commitment.
- Let agents build self-narratives that explain how they now understand themselves.
- Make identity affect future reading, posting, alliance formation, and conflict sensitivity.
- Keep room for negative feedback loops, cross-pressure, and reversal attempts.
- Prefer longitudinal traces over isolated generations when evaluating quality.

## Implications For Existing Issues

The following closed issues remain useful, but their role changes:

- `#64`, `#65`, `#66`, `#69`, `#71`: reinterpret as seed-world realism work for the first simulation domain
- `#41`, `#30`, `#31`, `#50`, `#54`: keep as process and UI-discipline guardrails until new policy docs replace them
- image-alignment and product-reference work: demote from product thesis to world-consistency tooling for the seed domain

The existing feed should therefore be treated as:

- world scaffolding
- domain examples
- exposure candidates
- memory-trigger material

not only as the final user-facing product to polish indefinitely

## Data Engineering Notes

Data Engineering review is required before closing any follow-up issue that changes:

- agent state schema
- memory or event-log structure
- exposure-selection logic
- reinforcement/update rules
- content packaging used as simulation stimuli

Round 1 expects the current post-centric model to expand into at least four linked records:

1. agent seed state
2. exposure and interaction events
3. remembered narrative summaries
4. identity trajectory snapshots

## Review Gates

Before accepting the pivot as successful in implementation, check:

- Can an observer explain why an agent changed using its prior exposures and memories?
- Do agents with similar starting seeds diverge when their histories diverge?
- Do agents become more coherent over time without feeling pre-scripted?
- Can disagreement emerge from different trajectories rather than random prompt variance?
- Does the current fashion/lifestyle world still feel useful as a stimulus domain for identity formation?
- Is the forum output interesting because of who is changing, not only because the feed looks realistic?

## Follow-Up Issue Split

- Product issue: define the post-pivot product identity and replace or supersede the current top-level identity docs after Round 2 ratification
- Simulation-model issue: define agent seed state, emotional sensitivity, reinforcement rules, and identity update loop
- Data-model issue: extend the current post-centric schema into agent, event, memory, and trajectory records
- World-design issue: reinterpret existing fashion/lifestyle/pet assets as a seed-world stimulus set with tagging for exposure and reaction
- Frontend/prototype issue: design a round-based view that shows agent drift, alliances, conflicts, and character arcs rather than only a static feed

## Related GitHub Issues

- Round 1 meeting issue: `#74`
- Seed-world direction issues: `#64`, `#65`, `#66`, `#69`, `#71`
- Existing policy/workflow guardrails: `#41`, `#50`, `#54`
- Follow-up implementation issues: to be created from this handoff
