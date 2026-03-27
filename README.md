# AI Fashion Forum

AI Fashion Forum is an AI-native fashion forum simulation project.

Intent lock:

- [`/docs/product-strategy/simulation-intent-guardrails.md`](./docs/product-strategy/simulation-intent-guardrails.md)

The repository contains a high-fidelity mobile mock, treated as one visible seed world inside a larger product direction:

- validate community mechanics with seed materials and small simulations
- scale the simulation into a digital-twin style environment
- use a CAMEL-style company loop to propose, test, and evaluate product interventions

## Product framing

The project should feel like:

- a believable fashion-community world with dense lived-in content
- a simulation environment where norms, conflict patterns, clustering, identity shifts, and taste changes can emerge
- a product lab where interventions can be tested before heavier productization

Important clarification:

- the project goal is the environment, not any single phenomenon inside it
- taste divergence is one possible emergent outcome, not the repository mission by itself

## Current phase

- phase 1: seed-world and mechanism validation with MiroFish
- phase 2: scaling and digital-twin direction with OASIS
- company loop: CAMEL Workforce-style product team for intervention design and evaluation

The existing React mock remains useful as seed-world UI, content realism reference, scenario pack material, and future MVP surface candidate.

## Local development

```bash
# 1. Copy environment variables
cp .env.example .env   # edit as needed

# 2. Start infrastructure (MongoDB + Redis)
docker-compose up -d

# 3. Install dependencies
npm install

# 4. Boot all three services at once
npm run boot:local
# → forum-web  (port 5173)
# → forum-server  (port 4000)
# → agent-server  (port 4001)
```

Or start each service independently:

```bash
npm run dev:forum         # forum-web only
npm run dev:forum-server  # forum-server only
npm run dev:agent-server  # agent-server only
```

Run the end-to-end simulation loop (after servers are up):

```bash
curl -X POST http://localhost:4001/api/run \
  -H "Content-Type: application/json" \
  -d '{"seed": 42, "ticks": 5}'
# Returns: posts_created, replay_file, 8-metric report
```

Workspace structure:

| Package | Path | Role |
|---------|------|------|
| `@ai-fashion-forum/forum-web` | `apps/forum-web/` | Vite + React replay viewer and seed-world mock |
| `@ai-fashion-forum/forum-server` | `apps/forum-server/` | Express + Mongoose forum backend |
| `@ai-fashion-forum/agent-server` | `apps/agent-server/` | Express + Mongoose simulation and agent server |
| `@ai-fashion-forum/agent-core` | `packages/agent-core/` | Core simulation engine (no external deps) |
| `@ai-fashion-forum/shared-types` | `packages/shared-types/` | Type contracts, schemas, and sample data |

## Production build

```bash
npm run build
npm run preview
```

## Deployment

GitHub Actions (`.github/workflows/deploy-pages.yml`) builds and deploys `dist/` to GitHub Pages on every push to `main`.

- GitHub Pages is used as a static replay viewer host, not as a live simulation server
- simulation runs happen locally or on a server-capable environment

GitHub Pages settings required:

1. Open repository `Settings`
2. Open `Pages`
3. Set source to `GitHub Actions`

## Service endpoints

Default local ports:

- forum-web: `5173`
- forum-server: `4000`
- agent-server: `4001`

### agent-server endpoints

```
GET  /health

# End-to-end loop (M2-1 vertical slice)
POST /api/run                        seed, ticks → posts + metrics + replay export
GET  /api/run/replay/latest          most recent replay JSON
GET  /api/run/replay/:runId          specific replay JSON
GET  /api/run/report/latest          most recent evaluation report (8 metrics)

# Sprint 1 sample endpoints
GET  /api/sprint1-agent-seed-sample
GET  /api/sprint1-exposure-sample?agent=S01
GET  /api/sprint1-memory-writeback-sample?agent=S01
GET  /api/sprint1-forum-post-sample
GET  /api/sprint1-evaluation-sample
GET  /api/run-sample?seed=42&ticks=10

# Agent loop (incremental ticks)
POST /api/agent-loop/tick
GET  /api/agent-loop/status
GET  /api/agent-loop/states

# Traces
GET  /api/traces
GET  /api/traces/:agentId/summary
GET  /api/events
```

### forum-server endpoints

```
GET    /health
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/posts
POST   /api/posts
GET    /api/posts/:postId
PUT    /api/posts/:postId
DELETE /api/posts/:postId
POST   /api/posts/:postId/like
POST   /api/posts/:postId/comments
GET    /api/posts/:postId/comments
DELETE /api/posts/:postId/comments/:commentId
POST   /api/posts/:postId/report
GET    /api/feed
POST   /api/engagement/interactions
GET    /api/engagement/interactions
POST   /api/engagement/feedback
GET    /api/engagement/feedback
GET    /api/operator/metrics
GET    /api/operator/logs
GET    /api/operator/reports
GET    /api/operator/feedback
GET    /api/operator/feedback/summary
GET    /api/operator/moderation/queue
POST   /api/operator/moderation/recheck/:postId
```

Moderation notes:

- forum-server computes a lightweight text moderation prediction when posts are created or updated
- predictions store score, label, matched reasons, and model version on each post document
- flagged posts can be reviewed through the operator moderation queue and rechecked after edits

## GitHub issue workflow

Full rules are in [`WORKFLOW.md`](./WORKFLOW.md) — the shared source of truth for issue tracking, execution rules, branch conventions, delivery sequence, and autonomous continuation behavior.

Open work: [Jongtae/AI-Fashion-Forum issues](https://github.com/Jongtae/AI-Fashion-Forum/issues)

## Documentation map

### Product strategy and direction

- Simulation intent guardrails: [`/docs/product-strategy/simulation-intent-guardrails.md`](./docs/product-strategy/simulation-intent-guardrails.md)
- Phase-2 direction summary: [`/docs/product-strategy/phase-2-ai-native-forum-direction.md`](./docs/product-strategy/phase-2-ai-native-forum-direction.md)
- Current product state: [`/docs/product-strategy/current-product-state.md`](./docs/product-strategy/current-product-state.md)
- Product identity: [`/docs/product-strategy/product-identity.md`](./docs/product-strategy/product-identity.md)

### Stack and architecture

- Stack ADR: [`/docs/adr/001-stack.md`](./docs/adr/001-stack.md)
- Data architecture / memory and self-narrative: [`/docs/data-architecture/memory-and-self-narrative.md`](./docs/data-architecture/memory-and-self-narrative.md)
- Data architecture / content-image alignment model: [`/docs/data-architecture/content-image-alignment-data-model.md`](./docs/data-architecture/content-image-alignment-data-model.md)
- Data architecture / Neo4j state model: [`/docs/data-architecture/neo4j-state-model.md`](./docs/data-architecture/neo4j-state-model.md)
- Mock-to-service transition: [`/docs/mock-to-service/`](./docs/mock-to-service/)

### Sprint 1 specs (`docs/sprint1/`)

- Agent seed schema: [`/docs/sprint1/sprint1-agent-seed-schema.md`](./docs/sprint1/sprint1-agent-seed-schema.md)
- Content starter pack: [`/docs/sprint1/sprint1-content-starter-pack.md`](./docs/sprint1/sprint1-content-starter-pack.md)
- Biased exposure loop: [`/docs/sprint1/sprint1-biased-exposure-loop.md`](./docs/sprint1/sprint1-biased-exposure-loop.md)
- Memory write-back: [`/docs/sprint1/sprint1-memory-writeback.md`](./docs/sprint1/sprint1-memory-writeback.md)
- State-driven posts: [`/docs/sprint1/sprint1-state-driven-posts.md`](./docs/sprint1/sprint1-state-driven-posts.md)
- Replay drift UI: [`/docs/sprint1/sprint1-replay-drift-ui.md`](./docs/sprint1/sprint1-replay-drift-ui.md)
- Divergence evaluation: [`/docs/sprint1/sprint1-divergence-evaluation.md`](./docs/sprint1/sprint1-divergence-evaluation.md)

### Core system specs (`docs/core-systems/`)

- Chroma indexing and biased exposure: [`/docs/core-systems/chroma-indexing-and-biased-exposure.md`](./docs/core-systems/chroma-indexing-and-biased-exposure.md)
- Content-provider normalization: [`/docs/core-systems/content-provider-normalization.md`](./docs/core-systems/content-provider-normalization.md)
- Identity update rules: [`/docs/core-systems/identity-update-rules.md`](./docs/core-systems/identity-update-rules.md)
- Action space and light reactions: [`/docs/core-systems/action-space-and-light-reactions.md`](./docs/core-systems/action-space-and-light-reactions.md)
- Forum generation and relationship updates: [`/docs/core-systems/forum-generation-and-relationship-updates.md`](./docs/core-systems/forum-generation-and-relationship-updates.md)
- Ranking core and experiment flags: [`/docs/core-systems/ranking-core-and-experiment-flags.md`](./docs/core-systems/ranking-core-and-experiment-flags.md)
- Meta policy and events: [`/docs/core-systems/meta-policy-and-events.md`](./docs/core-systems/meta-policy-and-events.md)
- Retrieval and decision-debug console: [`/docs/core-systems/retrieval-and-decision-debug-console.md`](./docs/core-systems/retrieval-and-decision-debug-console.md)
- Core metrics and consistency: [`/docs/core-systems/core-metrics-and-consistency.md`](./docs/core-systems/core-metrics-and-consistency.md)
- Social dynamics and batch runner: [`/docs/core-systems/social-dynamics-and-batch-runner.md`](./docs/core-systems/social-dynamics-and-batch-runner.md)
- sim-server API and queue: [`/docs/core-systems/sim-server-api-and-queue.md`](./docs/core-systems/sim-server-api-and-queue.md)
- Staging, guardrails, cost, and demo: [`/docs/core-systems/staging-guardrails-cost-and-demo.md`](./docs/core-systems/staging-guardrails-cost-and-demo.md)
- Graph sync and event log: [`/docs/core-systems/graph-sync-and-event-log.md`](./docs/core-systems/graph-sync-and-event-log.md)

### Governance and workflow (`docs/governance-workflow/`)

- GitHub issue workflow: [`/docs/governance-workflow/github-issue-workflow.md`](./docs/governance-workflow/github-issue-workflow.md)
- Meeting handoff workflow: [`/docs/governance-workflow/meeting-handoff-workflow.md`](./docs/governance-workflow/meeting-handoff-workflow.md)
- Meeting handoff template: [`/docs/governance-workflow/meeting-handoff-template.md`](./docs/governance-workflow/meeting-handoff-template.md)
- Review checklist: [`/docs/governance-workflow/review-checklist.md`](./docs/governance-workflow/review-checklist.md)

### Meeting handoffs (`docs/meeting-handoffs/`)

- Round-1 pivot handoff: [`/docs/meeting-handoffs/identity-formation-agent-pivot-round1-meeting-handoff.md`](./docs/meeting-handoffs/identity-formation-agent-pivot-round1-meeting-handoff.md)
- Local export replay handoff: [`/docs/meeting-handoffs/local-export-replay-viewer-meeting-handoff.md`](./docs/meeting-handoffs/local-export-replay-viewer-meeting-handoff.md)
- Lifestyle and pet expansion handoff: [`/docs/meeting-handoffs/lifestyle-pet-expansion-meeting-handoff.md`](./docs/meeting-handoffs/lifestyle-pet-expansion-meeting-handoff.md)

### Seed-world policy (`docs/seed-world-policy/`)

- Generated image policy: [`/docs/seed-world-policy/generated-image-policy.md`](./docs/seed-world-policy/generated-image-policy.md)
- Product mention card policy: [`/docs/seed-world-policy/product-mention-card-policy.md`](./docs/seed-world-policy/product-mention-card-policy.md)
- Product image binding rules: [`/docs/seed-world-policy/product-image-binding-layout-rules.md`](./docs/seed-world-policy/product-image-binding-layout-rules.md)
- Image crawling workflow: [`/docs/seed-world-policy/image-crawling-workflow.md`](./docs/seed-world-policy/image-crawling-workflow.md)
- Korean UGC outfit-shot guidance: [`/docs/seed-world-policy/korean-ugc-outfit-shot-guidance.md`](./docs/seed-world-policy/korean-ugc-outfit-shot-guidance.md)
- Real-photo-preferred pet lifestyle strategy: [`/docs/seed-world-policy/real-photo-preferred-pet-lifestyle-strategy.md`](./docs/seed-world-policy/real-photo-preferred-pet-lifestyle-strategy.md)

### Project planning (`docs/project-planning/`)

- MVP v1 backlog: [`/docs/project-planning/mvp-v1-project-backlog.md`](./docs/project-planning/mvp-v1-project-backlog.md)
- AI forum world implementation plan: [`/docs/project-planning/ai-forum-world-implementation-plan.md`](./docs/project-planning/ai-forum-world-implementation-plan.md)

## Legacy mock and image experiments

The repository includes mock-specific assets and image experiments such as the outfit-preview PoC.
Under the phase-2 direction, these are treated as seed-world or realism-support artifacts.

The outfit-preview PoC manifest lives in:

- [`/apps/forum-web/src/data/openaiOutfitPreviewManifest.json`](./apps/forum-web/src/data/openaiOutfitPreviewManifest.json)
