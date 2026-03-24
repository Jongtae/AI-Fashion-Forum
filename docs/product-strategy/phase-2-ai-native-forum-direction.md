# Phase 2 AI-Native Forum Direction

This document is the repository-level direction summary for GitHub issue `#76`.

초기 계획 원본 PDF는 [`/docs/archive/`](../archive/)에 보관되어 있습니다.

## Core framing

AI Fashion Forum is no longer defined only as a polished static mock.

It is now defined as:

- an AI-native fashion forum validation environment
- a seed-world simulation where fashion taste, norms, and conflict patterns can emerge
- a future digital twin whose behavior can inform product decisions
- a society where identity differentiates through biased exposure, affect, reinforcement, and memory

The visible mock remains important, but it is only one layer of the system.

Search and retrieval are not the goal by themselves.
They are inputs into identity formation.

## System layers

The repository should now be read as a modular system, not a single multi-agent framework:

1. social simulation core
- Concordia and/or Mesa style world logic

2. orchestration loop
- LangGraph style long-running stateful execution

3. memory and retrieval
- long-term memory plus vector retrieval for prior content and episodes

4. relationship and identity graph
- graph structure for affinities, conflict, clusters, and topic attachment

5. forum environment and UI
- feed, ranking, reactions, profiles, and surface realism

6. company loop
- product team and moderator/evaluator agents that observe and intervene

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

### Phase 1: seed validation and identity-loop proof

Use small, cheap, repeated simulations to validate:

- whether stable taste clusters emerge
- whether recognizable community norms appear
- whether interventions measurably change behavior
- whether identity differentiation can be explained from prior exposure and memory

Artifacts in this phase include:

- seed packs
- personas
- short-run simulation logs
- interview notes
- identity-change traces

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
- richer feed and action mechanics inspired by social-platform simulators

### Productization

The repository may still ship a forum-like mock or MVP surface, but that surface should be designed so it can:

- emit replayable events
- sync with the twin
- receive simulation-driven recommendations

For the current repository deployment model:

- GitHub Pages should be treated as a static replay viewer host
- live simulation execution belongs in local or server-capable environments
- exported run artifacts are the contract between simulation execution and the Pages-hosted frontend

## What stays important

시뮬레이션 월드 품질 기준으로 판단해야 하는 필수 요소 목록은 [product-identity.md](./product-identity.md)를 참조하세요.

## What changes operationally

- seed docs, policy docs, and content examples are now simulation inputs
- data models should expand beyond post-only records into actions, traces, memory, and trajectories
- review should evaluate community dynamics and mechanism stability in addition to visual realism
- meetings and issues should explicitly state whether the work touches seed-world realism, simulation mechanics, company-loop tooling, or twin integration
- contributors should avoid treating generic collaboration frameworks as the world engine unless they also define long-run identity state, memory, and environment rules

## Repository rule

When there is tension between:

- making the mock prettier
- making the world dynamics more explainable and testable

prefer the option that improves explainable world dynamics unless it clearly harms the seed-world realism needed for credible simulation.
