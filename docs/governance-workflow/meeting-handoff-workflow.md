# Meeting Handoff Workflow

This document defines how meeting conclusions should be handed off to the development and simulation team.

## Why this exists

Under the phase-2 direction, meetings may change:

- seed-world realism rules
- simulation mechanics
- intervention logic
- dashboards and metrics
- company-loop responsibilities

Those decisions are often too nuanced to compress into an issue alone.

## Use a handoff doc when

- a meeting sets or changes product direction
- a meeting decides how agents, users, or company roles should behave
- a meeting changes actions, traces, recommendations, moderation, or onboarding rules
- a meeting reclassifies older docs from final-product rules into seed-world support docs
- the issue would otherwise lose important non-goals or review gates

## What the issue should capture

- the implementation or documentation task
- scope
- completion criteria
- expected branch name
- primary layer affected

## What the handoff doc should capture

- why the meeting happened
- what changed in product or simulation direction
- agreed decisions
- non-goals
- realism or simulation rules
- review gates
- follow-up issues

## Minimum sections

Each handoff doc should include:

1. Background
2. What triggered this handoff
3. Agreed decisions
4. Non-goals
5. System / UI / content rules
6. Review gates
7. Related GitHub issues

## Reviewer rule

When reviewing implementation derived from a meeting:

- check the GitHub issue
- check the linked handoff doc
- check the relevant top-level direction docs

Do not review from the issue alone when a handoff doc exists.
