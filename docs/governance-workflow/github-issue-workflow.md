# GitHub Issue Workflow

This repository treats meaningful work as GitHub Issue-sized units before implementation.

Under the phase-2 direction, issues should describe not only UI work but also simulation, data, and company-loop changes.

## Default sequence

1. Define the work as a GitHub Issue
2. Give the issue a clear title, summary, and completion criteria
3. State which layer the issue belongs to
4. Check the work against the active product identity before implementation
5. Create one branch for that issue
6. Keep commits scoped to that issue only
7. Merge after the issue criteria are satisfied

## Required issue classification

Every substantial issue should say which layer it affects:

- `seed-world realism`
- `simulation mechanics`
- `company loop`
- `digital twin / productization`

Multiple layers are allowed, but the issue should name the primary layer.

## Required issue details

Before major changes, define:

- issue title
- issue summary
- completion criteria
- expected branch name
- primary layer
- whether Data Engineering review is required

Also include an identity check that answers:

- Does this strengthen the AI-native fashion forum direction?
- Does it improve seed-world realism, explainable dynamics, or product-iteration capability?
- Does it preserve fashion-community-native specificity?
- If it changes actions, traces, or schemas, will those changes be reviewable later?

## Meeting-derived work

Use a meeting handoff doc when:

- the issue comes from a product or simulation-design meeting
- the direction depends on nuanced trade-offs
- the work changes norms, categories, actions, recsys logic, moderation rules, or seed-world framing
- the issue needs non-goals, failure modes, or review gates

## Source of truth

GitHub Issues are the only active work-tracking source of truth for this repository.

- Do not create local issue trackers for active work
- Open or update the issue directly on GitHub before substantial work
- When resuming work, align with an existing issue whenever possible

## Branch naming

- `feat/<issue-slug>`
- `fix/<issue-slug>`
- `chore/<issue-slug>`
- `docs/<issue-slug>` when the issue is doc-heavy and policy-heavy

## Contributor rule

Before opening or expanding product-facing work, reference:

- [`/docs/product-identity.md`](./product-identity.md)
- [`/docs/phase-2-ai-native-forum-direction.md`](./phase-2-ai-native-forum-direction.md)
- [`/docs/current-product-state.md`](./current-product-state.md)
