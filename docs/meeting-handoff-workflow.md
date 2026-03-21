# Meeting Handoff Workflow

This document is the workflow deliverable for GitHub issue `#54`.

It defines how product-meeting conclusions should be handed off to the development team when a GitHub issue alone is not enough to preserve the real intent.

## Why this exists

Some work items come from multi-round product meetings.

In those cases, the final issue often captures the task, but not the full reasoning behind:

- why the team chose this direction
- what should explicitly be avoided
- which UI or realism decisions are intentional
- which failure modes already happened and should not recur

When that context matters for implementation quality, the meeting result should also be written into a developer-facing handoff doc under `docs/`.

## Default rule

Use a meeting handoff doc when:

- the issue comes out of a product meeting or review meeting
- the direction depends on nuanced UX/product judgment
- the team is trying to prevent a previously repeated mistake
- the issue needs non-goals and anti-patterns, not just requirements
- the issue summary would become too long if all context were packed into GitHub alone

Do not use a meeting handoff doc for every small issue.

If the work is straightforward and the issue fully explains it, the issue alone is enough.

## What the issue should do vs what the doc should do

The GitHub issue should capture:

- the implementation task
- scope
- completion criteria
- expected branch name
- concise identity framing

The meeting handoff doc should capture:

- why the task exists
- the decisions the meeting already made
- non-goals
- rejected directions
- UI or realism rules that should guide implementation
- review gates
- follow-up links to the issue(s)

## File location

Store meeting handoff docs under `docs/`.

Recommended naming:

- `docs/<topic>-meeting-handoff.md`

Examples:

- `docs/outfit-image-regression-meeting-handoff.md`
- `docs/text-first-feed-priority-meeting-handoff.md`

## Minimum handoff doc sections

Each handoff doc should include:

1. Background
2. What triggered this handoff
3. Agreed decisions
4. Non-goals / what not to do
5. UI/content/review rules
6. Related GitHub issues

## Issue reference rule

When an implementation issue is derived from a meeting handoff doc:

- reference the handoff doc in the issue body
- mention it in the scope or notes
- treat the handoff doc as required reading before implementation

If the issue conflicts with the handoff doc, update the issue or reopen the meeting rather than silently improvising.

## Reviewer rule

When reviewing implementation derived from a meeting:

- check the GitHub issue
- check the linked handoff doc
- check the relevant policy docs

Do not review from the issue alone if the issue explicitly references a handoff doc.

## One-line rule

If a meeting made important product decisions that the development team could easily misread, write a handoff doc in `docs/` and make the implementation issue point to it directly.
