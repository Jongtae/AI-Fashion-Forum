# WORKFLOW.md

Shared workflow rules referenced by both `AGENTS.md` and `CLAUDE.md`.
When rules change, update only this file.

## GitHub Issue Workflow

- Treat any meaningful feature, refactor, bug fix, or content change as a GitHub Issue-sized unit of work.
- Start substantial development from GitHub Issues that reflect project or product meeting decisions whenever such issues exist.
- If a request reflects decided work but no matching GitHub Issue exists yet, create or propose that issue before implementation.
- Before starting implementation, first define the work as an issue with a clear title, summary, and completion criteria.
- Prefer the smallest reviewable issue that can be validated end-to-end in one branch and one PR.
- If the request is too large or spans multiple user outcomes, split it into smaller issues before coding.
- When splitting, keep each issue scoped to one user-visible behavior, one API contract change, or one UI surface.
- Do not bundle unrelated improvements into the same issue just because they share a component or file.
- If an issue would require more than one distinct verification story, treat it as a parent tracker and create child issues for the actual implementation.
- Unless the user explicitly asks to skip it, do not start substantial code changes before proposing the issue unit.
- When a user request becomes an issue, translate it into task-oriented issue language instead of copying the conversation verbatim; preserve intent, scope, and constraints.
- Keep the issue wording aligned with the work item the team will execute, not the exact phrasing of the chat message.

## Execution Rules

- Before starting any code change, confirm the latest `origin/main` state and align the workspace to it unless the user explicitly asks not to.
- For a new task, propose:
  - issue title
  - issue summary
  - completion criteria
  - expected branch name
- One branch should map to one issue.
- Use branch names that reflect the issue, such as `feat/<issue-slug>`, `fix/<issue-slug>`, or `chore/<issue-slug>`.
- Reference the related issue in commits and pull requests whenever possible.
- Record meaningful progress with commits while implementation is underway, not only at the very end.
- Keep the GitHub Issue updated with work-log comments during execution.
- Work-log comments should include the branch name, commit SHAs or commit milestones, verification notes, and what remains before closure.
- The default delivery sequence for a completed issue is mandatory unless the user explicitly changes it:
  1. implement on the issue branch
  2. commit the work with issue references
  3. push the branch to GitHub
  4. open a pull request
  5. complete code cleanup needed to leave the branch in a reviewable state
  6. land the change to `main`
  7. verify deployment success after the `main` update
  8. update the GitHub issue checklist/state, leave final work-log notes, and close the issue
  9. delete or archive the no-longer-needed feature branch and return the working branch to `main`
- Do not consider an issue complete just because code exists locally or has been merged; the issue is only done after deployment is verified and the GitHub issue is closed.
- Do not consider a task finished until the issue is closed, the branch is cleaned up, and the local workspace is back on `main` unless the user explicitly wants to keep working on the feature branch.
- Do not consider an issue complete if code cleanup is still pending, even if the feature works.
- If PR automation is blocked by permissions or tooling limits, leave a note on the issue explaining the blocker, keep the branch pushed, and then proceed with the safest available landing path while still verifying deployment and closing the issue explicitly afterward.
- If the issue changes data models, asset pipelines, manifests, crawling workflows, or other repository-local data operations, involve the Data Engineering team for review before closing the issue.
- Treat the GitHub Issue body and state as the source of truth for completion.
- If local docs or notes also track the work, update them second; do not leave the GitHub Issue checklist stale.
- Before closing an issue, make sure the issue itself contains enough history that someone can reconstruct what changed from the issue comments and linked PR/commits.

## Diligent Issue Handling

- Treat diligence as an enforceable workflow requirement, not as a personal preference.
- Do not start implementation from an issue that is still incomplete, vague, or missing verification details.
- An issue is not ready for implementation until it contains all of the following:
  - a clear problem or outcome summary
  - explicit scope, including what is out of scope when that boundary matters
  - completion criteria written as verifiable checklist items
  - a verification plan covering tests, manual checks, or deployment/runtime confirmation as applicable
- If an issue is still broad after this pass, split it again until the implementation step is obvious and narrowly testable.
- If any required issue section is missing or too vague, first update or propose updates to the issue before coding.
- Treat incomplete issues as draft work items, not executable work items.
- Write completion criteria as outcome-based truths to verify, not as vague activity notes such as "update code" or "do testing."
- Keep the issue body aligned with reality during execution; when scope, risks, or validation steps change, update the issue before or alongside the code changes.
- If new work appears during implementation and is not required to close the current issue cleanly, split it into a separate issue instead of silently expanding scope.
- Leave meaningful work-log comments throughout execution, not only at the end.
- Each meaningful work-log update should include:
  - current branch name
  - what changed since the last update
  - what was verified
  - what remains
  - blockers or risks, if any
- Do not treat local implementation progress as sufficient evidence of diligence unless the issue history also reflects that progress.
- Do not close an issue with unchecked completion criteria, missing verification notes, or stale scope.
- Before closing an issue, confirm that a third party can understand what was changed, how it was verified, and whether any follow-up work remains by reading the issue and its linked PR or commits.
- If follow-up work remains, record it explicitly in the issue and open or reference the next issue instead of hiding unfinished work inside a closed issue.
- A diligently handled issue is only complete when the implementation, verification, documentation in the issue, and closure state all agree.

## Issue Relationship Handling

- Before starting any open issue, first identify its type and its relationship to other issues.
- Treat epics as coordination containers by default, not as the normal implementation unit.
- Prefer executing the most specific actionable issue, such as a task, bug, or subtask, rather than starting from a parent epic.
- Before implementation, check whether the issue:
  - belongs to an epic
  - has child issues
  - depends on another open issue
  - is blocked by another unfinished issue
- Do not start an issue if an unfinished dependency must be completed first for safe, correct, or reviewable execution.
- If the issue is part of a larger chain, work in dependency order before considering convenience or personal preference.
- If an epic contains multiple actionable child issues, prefer the next unblocked child issue with the clearest completion path.
- Do not silently collapse multiple related issues into one implementation branch unless the issue structure is updated first and that consolidation is explicitly justified.
- Do not close an epic while its required child issues remain open, unless the epic is being intentionally re-scoped and its issue body is updated to reflect that change.
- When progress is made on a child issue, update the parent epic or related tracking issue when needed so that the relationship remains understandable from the issue history.
- If issue relationships are unclear, ambiguous, or missing, clarify or update that structure before starting substantial implementation work.

## Collaboration Notes

- If the user asks for quick exploratory work, keep the work small and suggest converting it into an issue before expanding scope.
- When resuming work, align the task with an existing issue if one already covers the requested change.
- Default to calling in the Data Engineering team when the work affects how data is sourced, transformed, validated, packaged, or handed off to development.

## Autonomous Continuation

- If the user says to continue autonomously, keep working through the remaining open implementation issues in dependency order until the open implementation issue count reaches zero, unless a real blocker prevents safe progress.
- Do not stop just because one issue is complete; immediately move to the next open issue after branch/PR/merge/deploy/close is finished.
- Treat intermediate status updates as brief progress notes, not as a handoff or stopping point.
- When the user explicitly asks to "not stop" or to finish "all issues," only pause for:
  - a real external blocker such as missing permissions, failing infrastructure, or unavailable credentials
  - a decision with material product risk that cannot be resolved from repository or issue context
- Epic or tracking issues should be closed only after their covered implementation issues are complete, but they should not block progress on the next actionable issue.
