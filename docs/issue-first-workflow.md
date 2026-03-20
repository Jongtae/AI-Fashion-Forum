# Issue-First Workflow

This repository treats meaningful work as issue-sized units before implementation.

## Default sequence

1. Define the work as an issue
2. Give the issue a clear title, summary, and completion criteria
3. Create one branch for that issue
4. Keep commits scoped to that issue only
5. Merge after the issue criteria are satisfied

## Branch naming

- `feat/<issue-slug>`
- `fix/<issue-slug>`
- `chore/<issue-slug>`

## Commit style

Recommended pattern:

- `feat: <what changed>`
- `fix: <what changed>`
- `chore: <what changed>`

If a real GitHub issue number exists, reference it in the commit body or PR description.

## Mock-specific guidance

- Treat content updates as first-class work items, not as incidental edits
- If a task changes topic data, source references, or thread realism, give it an issue
- If a task is too large, split it into smaller issue-sized batches

## Current expectation

Before major mock changes, define:

- issue title
- issue summary
- completion criteria
- expected branch name

