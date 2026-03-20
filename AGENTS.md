## Issue-First Workflow
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
- Record meaningful progress with commits while implementation is underway, not only at the very end.
- The default delivery sequence for a completed issue is:
  1. implement on the issue branch
  2. commit the work with issue references
  3. open a pull request
  4. land the change to `main`
  5. verify deployment success after the `main` update
  6. update the GitHub issue checklist/state and close the issue
- Do not consider an issue complete just because code exists locally or has been merged; the issue is only done after deployment is verified and the GitHub issue is closed.
- If PR automation is blocked by permissions or tooling limits, leave a note on the issue explaining the blocker, keep the branch pushed, and then proceed with the safest available landing path while still verifying deployment and closing the issue explicitly afterward.

## Collaboration Notes
- If the user asks for quick exploratory work, keep the work small and suggest converting it into an issue before expanding scope.
- When resuming work, align the task with an existing issue if one already covers the requested change.
