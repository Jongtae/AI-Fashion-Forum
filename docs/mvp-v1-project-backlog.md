# MVP-v1 Project Backlog

This document is the planning deliverable for GitHub issue `#80`.

It defines the repository-native project structure for the MVP-v1 identity-forming forum backlog without relying on GitHub Projects.

## Project grouping method

Because GitHub Projects access is not available in the current token context, this repository will use:

- Milestone: `MVP-v1 Identity-Forming Forum`
- Label: `project:mvp-v1`
- Epic labels: `epic:*`
- Umbrella issue: `#80`

This combination is the project boundary.

## Why the raw 54-item list was reshaped

The proposed 54 items were strong as a research backlog, but too granular to hand directly to a development team.

Main problems:

- too many adjacent items that share the same write scope
- too many items that only make sense after prerequisite schemas exist
- too many tiny tasks that would create issue-management overhead larger than the implementation gain

So the backlog was reshaped into:

- 10 epic issues
- 20 delivery issues

This keeps ownership clear while preserving the original architecture.

## Merge and split rules

### Merged

- Adjacent schema tasks were merged when they belong to the same write scope.
- Adjacent runtime loop tasks were merged when they are not independently shippable.
- Adjacent UI tasks were merged when they form one visible user slice.
- Adjacent evaluation tasks were merged when they use the same metric/output pipeline.

### Kept separate

- ADR and architectural justification remained separate from implementation.
- Memory/identity work stayed separate from content ingestion work.
- Feed/meta policy work stayed separate from forum action generation.
- API/queue work stayed separate from deploy/cost/demo work.

## Original-to-issued mapping

### Epic: Foundation

- Original `1`, `3`, `4` -> delivery issue: foundation bootstrap and local services
- Original `2` -> delivery issue: stack ADR and architecture baseline

### Epic: Simulation core

- Original `5`, `6`, `7` -> delivery issue: base state schemas for agents, content, and graph
- Original `8`, `9`, `10` -> delivery issue: tick engine, GM rules, and replayability

### Epic: Content exposure

- Original `11`, `12` -> delivery issue: content provider and normalization pipeline
- Original `13`, `14`, `15`, `35` -> delivery issue: indexing, candidate generation, biased exposure, and Chroma collection design

### Epic: Memory and identity

- Original `16`, `17`, `18` -> delivery issue: short-term memory, long-term memory, and self narrative
- Original `19`, `20`, `21`, `22` -> delivery issue: identity update, thresholds, contradiction handling, and radicalization/softening scenarios

### Epic: Forum actions

- Original `23`, `26`, `27` -> delivery issue: action space, silence/lurking, and lightweight reactions
- Original `24`, `25`, `28` -> delivery issue: post/comment generation and relationship updates

### Epic: Feed and meta systems

- Original `29`, `30`, `31` -> delivery issue: ranking core and recommendation experiment flags
- Original `32`, `33`, `34` -> delivery issue: moderation policy engine, hot-topic detection, and external event injection

### Epic: Storage and observability

- Original `36`, `37` -> delivery issue: Neo4j sync and simulation event-log storage
- Original `38` -> delivery issue: retrieval and decision-debug console

### Epic: Frontend

- Original `39`, `40`, `41` -> delivery issue: feed, profiles, and topic views
- Original `42`, `43` -> delivery issue: simulation control panel and replay timeline

### Epic: Evaluation

- Original `44`, `45`, `46` -> delivery issue: core metrics, scenario tests, and consistency evaluation
- Original `47`, `48` -> delivery issue: social-dynamics evaluation and batch A/B runner

### Epic: Operations

- Original `49`, `50` -> delivery issue: sim-server API and background job queue
- Original `51`, `52`, `53`, `54` -> delivery issue: staging pipeline, guardrails, cost tracking, and MVP demo scenario

## Recommended build order

The first delivery wave should be:

1. foundation bootstrap and local services
2. stack ADR and architecture baseline
3. base state schemas for agents, content, and graph
4. tick engine, GM rules, and replayability
5. content provider and normalization pipeline
6. indexing, candidate generation, biased exposure, and Chroma collection design
7. short-term memory, long-term memory, and self narrative
8. identity update, thresholds, contradiction handling, and radicalization/softening scenarios
9. action space, silence/lurking, and lightweight reactions
10. feed, profiles, and topic views

This preserves the spirit of the original “first 10” list while grouping work into more executable slices.

## Issued GitHub backlog

### Umbrella

- `#80` Define MVP-v1 execution project and issue backlog for the identity-forming forum stack

### Epics

- `#81` Epic: Foundation and platform bootstrap
- `#82` Epic: Simulation core and world loop
- `#83` Epic: Content ingestion and biased exposure
- `#84` Epic: Memory and identity formation
- `#85` Epic: Forum actions and relationship dynamics
- `#86` Epic: Feed ranking and meta systems
- `#87` Epic: Storage and observability
- `#88` Epic: Frontend forum and replay UI
- `#92` Epic: APIs, queues, deployment, and demo operations
- `#93` Epic: Evaluation and experiment runners

### Delivery issues

- `#94` Bootstrap monorepo workspaces and local service baseline
- `#95` Document stack ADR and architecture baseline for the MVP-v1 stack
- `#96` Define base schemas for agent state, content state, and social graph
- `#97` Implement tick engine, world-rule layer, and deterministic replay foundation
- `#98` Design content-provider interface and normalization pipeline
- `#99` Implement content indexing, Chroma collections, candidate generation, and biased exposure selection
- `#100` Implement short-term memory, long-term memory integration, and self-narrative storage
- `#101` Implement identity update rules, thresholds, contradiction handling, and radicalization/softening paths
- `#102` Define the forum action space with silence, lurking, and lightweight reactions
- `#103` Implement post, comment, quote, and relationship-update generation
- `#104` Implement ranking core and recommendation experiment flags
- `#105` Implement moderation policy engine, hot-topic detection, and external event injection
- `#106` Implement Neo4j sync and simulation event-log storage
- `#107` Build retrieval and decision-debug console for agent explainability
- `#108` Build the core forum UI for feed, profiles, and topic views
- `#109` Build simulation controls and replay timeline UI
- `#110` Define core metrics, scenario tests, and agent consistency evaluation
- `#111` Implement social-dynamics evaluator and batch experiment runner
- `#114` Design the sim-server API and background job queue
- `#115` Set up staging, resilience guardrails, cost tracking, and the MVP demo scenario
