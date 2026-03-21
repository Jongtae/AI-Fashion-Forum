# GitHub Issue Workflow

This repository treats meaningful work as GitHub Issue-sized units before implementation.

## Default sequence

1. Define the work as a GitHub Issue
2. Give the issue a clear title, summary, and completion criteria
3. Check the work against the product identity before implementation
4. Create one branch for that issue
5. Keep commits scoped to that issue only
6. Merge after the issue criteria are satisfied

## Source of truth

GitHub Issues are the only work-tracking source of truth for this repository.

- Do not create or maintain local `issues/*.md` files for active work tracking
- Open or update the issue directly on GitHub before starting substantial implementation
- When resuming work, align with an existing GitHub Issue whenever possible

## Branch naming

- `feat/<issue-slug>`
- `fix/<issue-slug>`
- `chore/<issue-slug>`

## Commit style

Recommended pattern:

- `feat: <what changed>`
- `fix: <what changed>`
- `chore: <what changed>`

Reference the GitHub issue number in the commit body or PR description whenever possible.

## Mock-specific guidance

- Treat content updates as first-class work items, not as incidental edits
- If a task changes topic data, source references, or thread realism, give it an issue
- If a task is too large, split it into smaller issue-sized batches

## Required issue details

Before major mock changes, define:

- issue title
- issue summary
- completion criteria
- expected branch name

Also include an identity check that answers:

- Does this help users understand or debate the post more clearly?
- Does it keep text as the main content?
- Does it avoid making the app feel like a lookbook, shopping surface, or image-first feed?
- If imagery is involved, is it supporting judgment rather than replacing it?

If these questions are not answered clearly, reduce the scope or rewrite the issue before implementation.

## Identity-first rule

GitHub Issues are not only work containers. They are the first gate for keeping the service aligned with its product identity.

Contributors should reference:

- [`/docs/product-identity.md`](./product-identity.md)
- [`/docs/current-product-state.md`](./current-product-state.md)

before opening or expanding product-facing work.
