# Phase 2 AI-Native Forum Direction

This document is the repository-level direction summary for GitHub issue `#76`.

It translates the plan in [`/docs/Step-by-Step Implementation Plan to Validate and Evolve an AI-Native Fashion Forum Using MiroFish an.pdf`](./Step-by-Step%20Implementation%20Plan%20to%20Validate%20and%20Evolve%20an%20AI-Native%20Fashion%20Forum%20Using%20MiroFish%20an.pdf) into the operating direction for this repository.

## Core framing

AI Fashion Forum is no longer defined only as a polished static mock.

It is now defined as:

- an AI-native fashion forum validation environment
- a seed-world simulation where fashion taste, norms, and conflict patterns can emerge
- a future digital twin whose behavior can inform product decisions

The visible mock remains important, but it is only one layer of the system.

## Two-loop model

The repository should now be read through two interacting loops:

1. User society loop
- agents or users post, comment, react, cluster, and evolve norms
- fashion-community-native content remains the main domain language

2. Company loop
- a product team made of humans and CAMEL-style agents reviews metrics, interviews, and traces
- the team proposes changes to prompts, onboarding, category structure, recommendation settings, and moderation rules
- the next simulation or product run tests those changes

## Phase structure

### Phase 1: seed validation with MiroFish

Use small, cheap, repeated simulations to validate:

- whether stable taste clusters emerge
- whether recognizable community norms appear
- whether interventions measurably change behavior

Artifacts in this phase include:

- seed packs
- ontology/graph outputs
- personas
- short-run simulation logs
- interview notes

### Phase 2: scaling with OASIS

Move into OASIS when:

- mechanisms repeat across runs
- seed packs and personas are stable enough to port
- the main questions now depend on time, recommendations, stateful history, or longer network effects

Artifacts in this phase include:

- explicit action schemas
- users/posts/comments/relations/traces/recommendations
- simulation databases
- dashboards
- digital-twin adapters

### Productization

The repository may still ship a forum-like mock or MVP surface, but that surface should be designed so it can:

- emit replayable events
- sync with the twin
- receive simulation-driven recommendations

## What stays important

- realism
- density
- polished product state
- believable community content
- coherence between text, image, and interaction
- fashion-community-native tone

These are still essential, but now they are judged as simulation-world quality, not only as UI polish.

## What changes operationally

- seed docs, policy docs, and content examples are now simulation inputs
- data models should expand beyond post-only records into actions, traces, memory, and trajectories
- review should evaluate community dynamics and mechanism stability in addition to visual realism
- meetings and issues should explicitly state whether the work touches seed-world realism, simulation mechanics, company-loop tooling, or twin integration

## Repository rule

When there is tension between:

- making the mock prettier
- making the world dynamics more explainable and testable

prefer the option that improves explainable world dynamics unless it clearly harms the seed-world realism needed for credible simulation.
