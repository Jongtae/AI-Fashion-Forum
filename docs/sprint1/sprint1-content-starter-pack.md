# Sprint 1 Content Starter Pack

Issue `#141` defines the smallest curated external world pack for the first identity-loop sprint.

## Goal

Sprint 1 does not need the whole internet.

It needs a **small, reviewable set of overlapping world inputs** that can make different agents:

- notice different things
- feel different emotions
- strengthen different values
- write different forum posts after repeated exposure

## Chosen pilot domain

Sprint 1 stays inside the current seed-world domain:

- fashion-community world
- daily-life context
- pricing / utility / novelty tension
- care / pet / lived-context warmth

This is enough to create visible divergence without widening the project scope too early.

## Pack design rules

The starter pack should be:

- small enough for manual review
- overlapping enough that agents share part of the same world
- varied enough that agents can branch in interpretation
- tagged enough to drive biased exposure

## Required tag dimensions

Each record should expose enough metadata for the next issue (`#142`) to bias selection.

Required dimensions:

- `topics`
- `emotions`
- `value_axes`
- `tension_axes`
- `audience_lenses`
- `novelty_level`

These currently live under `source_metadata.exposure_tags`.

## Current content mix

The Sprint 1 curated pack intentionally mixes:

- practical weekday/commute signals
- pricing skepticism
- novelty/signal tension
- mirror/entryway realism
- pet-episode warmth
- quality/comfort/repeat-wear reflection

This gives enough overlap for the same world to be read in at least three ways:

1. care-oriented / quiet interpretation
2. novelty/signal interpretation
3. skepticism/tradeoff interpretation

## Why this matters

If the starter pack is too broad, Sprint 1 becomes noisy.

If the starter pack is too narrow, every agent will say the same thing.

If the starter pack lacks exposure tags, the next identity-loop steps will look random instead of explainable.

## Repository references

- Provider bundle builder: `packages/agent-core/content-pipeline.js`
- Exposure sample on starter pack: `packages/agent-core/content-indexing.js`
- Sample endpoint: `GET /api/sprint1-content-starter-pack`
- Exposure endpoint: `GET /api/sprint1-exposure-sample?agent=S01`
