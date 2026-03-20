# GitHub Issue Workflow

This repository treats meaningful work as GitHub Issue-sized units before implementation.

## Default sequence

1. Define the work as a GitHub Issue
2. Give the issue a clear title, summary, and completion criteria
3. Create one branch for that issue
4. Keep commits scoped to that issue only
5. Merge after the issue criteria are satisfied

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
