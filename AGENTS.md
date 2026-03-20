## GitHub Issue Workflow
- Treat any meaningful feature, refactor, bug fix, or content change as a GitHub Issue-sized unit of work.
- Before starting implementation, first define the work as an issue with a clear title, summary, and completion criteria.
- If the request is too large, split it into smaller issues before coding.
- Unless the user explicitly asks to skip it, do not start substantial code changes before proposing the issue unit.

## Execution Rules
- For a new task, propose:
  - issue title
  - issue summary
  - completion criteria
  - expected branch name
- One branch should map to one issue.
- Use branch names that reflect the issue, such as `feat/<issue-slug>`, `fix/<issue-slug>`, or `chore/<issue-slug>`.
- Reference the related issue in commits and pull requests whenever possible.

## Collaboration Notes
- If the user asks for quick exploratory work, keep the work small and suggest converting it into an issue before expanding scope.
- When resuming work, align the task with an existing issue if one already covers the requested change.
