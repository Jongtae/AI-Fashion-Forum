# AI Fashion Forum

AI Fashion Forum is an AI-native fashion forum simulation project.

Intent lock:

- [`/docs/product-strategy/simulation-intent-guardrails.md`](./docs/product-strategy/simulation-intent-guardrails.md)

The repository still contains a high-fidelity mobile mock, but the mock is now treated as one visible seed world inside a larger product direction:

- validate community mechanics with seed materials and small simulations
- scale the simulation into a digital-twin style environment
- use a CAMEL-style company loop to propose, test, and evaluate product interventions

The phase-2 direction is grounded in:

- [`/docs/Step-by-Step Implementation Plan to Validate and Evolve an AI-Native Fashion Forum Using MiroFish an.pdf`](./docs/Step-by-Step%20Implementation%20Plan%20to%20Validate%20and%20Evolve%20an%20AI-Native%20Fashion%20Forum%20Using%20MiroFish%20an.pdf)
- [`/docs/phase-2-ai-native-forum-direction.md`](./docs/phase-2-ai-native-forum-direction.md)

## Product framing

The project should feel like:

- a believable fashion-community world with dense lived-in content
- a simulation environment where norms, conflict patterns, clustering, identity shifts, and taste changes can emerge
- a product lab where interventions can be tested before heavier productization

Important clarification:

- the project goal is the environment, not any single phenomenon inside it
- taste divergence is one possible emergent outcome, not the repository mission by itself

The repository is no longer only about polishing a static mock.
It is about building, validating, and evolving an AI-native fashion forum as a living social system.

## Current phase

The repository is now aligned to phase 2:

- phase 1: seed-world and mechanism validation with MiroFish
- phase 2: scaling and digital-twin direction with OASIS
- company loop: CAMEL Workforce-style product team for intervention design and evaluation

The existing React mock remains useful as:

- seed-world UI
- content realism reference
- scenario pack material
- future MVP surface candidate

## Local development

```bash
npm install
npm run dev:forum
npm run dev:sim
```

Workspace structure now starts from issue `#94`:

- `apps/forum-web`: Vite-based forum viewer and seed-world mock
- `apps/sim-server`: local simulation baseline server
- `packages/shared-types`: shared scenario and service contracts
- `packages/agent-core`: minimal agent/bootstrap wiring used by server-side flows

## Production build

```bash
npm run build
npm run preview
```

## Deployment

This repository is configured to deploy to GitHub Pages with GitHub Actions on every push to `main`.

Important deployment rule:

- GitHub Pages is used as a static replay viewer host, not as a live simulation server
- simulation runs should happen locally or on a server-capable environment
- exported replay artifacts are what the deployed frontend reads

## Local service baseline

The team can boot each app layer independently:

```bash
npm run dev:forum
npm run dev:sim
```

Default local ports:

- forum web: `5173`
- sim server: `4318`

Useful sim-server endpoints:

- `GET /health`
- `GET /api/demo-scenario`
- `GET /api/state-snapshot`
- `GET /api/run-sample?seed=42&ticks=10`
- `GET /api/normalized-content-sample`
- `GET /api/sprint1-content-starter-pack`
- `GET /api/exposure-sample?agent=A01&pool=20`
- `GET /api/sprint1-exposure-sample?agent=S01`
- `GET /api/memory-bootstrap`
- `GET /api/memory-sample?seed=42&ticks=6&agent=A01`
- `GET /api/sprint1-memory-writeback-sample?agent=S01`
- `GET /api/sprint1-agent-seed-sample`
- `GET /api/sprint1-evaluation-sample`
- `GET /api/identity-scenarios`
- `GET /api/action-space-sample`
- `GET /api/forum-generation-sample`
- `GET /api/sprint1-forum-post-sample`
- `GET /api/ranking-sample`
- `GET /api/meta-policy-sample`
- `GET /api/debug-console-sample`
- `GET /api/evaluation-sample`
- `GET /api/batch-experiment-sample`
- `GET /api/openapi-sample`
- `GET /api/staging-status`
- `GET /api/demo-run-package`
- `POST /api/jobs/start`
- `GET /api/jobs/{job_id}`
- `POST /api/jobs/{job_id}/tick`
- `GET /api/jobs/{job_id}/replay`
- `POST /api/jobs/{job_id}/retry`
- `GET /api/graph-storage-sample`

Useful forum-server endpoints:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/posts`
- `POST /api/posts`
- `POST /api/posts/{postId}/comments`
- `POST /api/posts/{postId}/report`
- `GET /api/feed`
- `POST /api/engagement/interactions`
- `GET /api/engagement/interactions`
- `POST /api/engagement/feedback`
- `GET /api/engagement/feedback`
- `GET /api/operator/metrics`
- `GET /api/operator/logs`
- `GET /api/operator/reports`
- `GET /api/operator/feedback`
- `GET /api/operator/feedback/summary`
- `GET /api/operator/moderation/queue`
- `POST /api/operator/moderation/recheck/{postId}`

Moderation prototype notes:

- forum-server now computes a lightweight text moderation prediction when posts are created or updated
- predictions store score, label, matched reasons, and model version on each post document
- flagged posts can be reviewed through the operator moderation queue and rechecked after edits

GitHub settings required:

1. Open repository `Settings`
2. Open `Pages`
3. Set source to `GitHub Actions`

Workflow file:

`/.github/workflows/deploy-pages.yml`

## Documentation map

### Phase-2 direction and active policy

- Stack ADR baseline: [`/docs/adr/001-stack.md`](./docs/adr/001-stack.md)
- Chroma indexing and biased exposure: [`/docs/chroma-indexing-and-biased-exposure.md`](./docs/chroma-indexing-and-biased-exposure.md)
- Content-provider normalization: [`/docs/content-provider-normalization.md`](./docs/content-provider-normalization.md)
- Identity update rules: [`/docs/identity-update-rules.md`](./docs/identity-update-rules.md)
- Memory and self-narrative: [`/docs/memory-and-self-narrative.md`](./docs/memory-and-self-narrative.md)
- Sprint 1 agent seed schema: [`/docs/sprint1-agent-seed-schema.md`](./docs/sprint1-agent-seed-schema.md)
- Sprint 1 content starter pack: [`/docs/sprint1-content-starter-pack.md`](./docs/sprint1-content-starter-pack.md)
- Sprint 1 biased exposure loop: [`/docs/sprint1-biased-exposure-loop.md`](./docs/sprint1-biased-exposure-loop.md)
- Sprint 1 memory write-back: [`/docs/sprint1-memory-writeback.md`](./docs/sprint1-memory-writeback.md)
- Sprint 1 state-driven posts: [`/docs/sprint1-state-driven-posts.md`](./docs/sprint1-state-driven-posts.md)
- Sprint 1 replay drift UI: [`/docs/sprint1-replay-drift-ui.md`](./docs/sprint1-replay-drift-ui.md)
- Sprint 1 divergence evaluation: [`/docs/sprint1-divergence-evaluation.md`](./docs/sprint1-divergence-evaluation.md)
- Action space and light reactions: [`/docs/action-space-and-light-reactions.md`](./docs/action-space-and-light-reactions.md)
- Forum generation and relationship updates: [`/docs/forum-generation-and-relationship-updates.md`](./docs/forum-generation-and-relationship-updates.md)
- Ranking core and experiment flags: [`/docs/ranking-core-and-experiment-flags.md`](./docs/ranking-core-and-experiment-flags.md)
- Meta policy and events: [`/docs/meta-policy-and-events.md`](./docs/meta-policy-and-events.md)
- Retrieval and decision-debug console: [`/docs/retrieval-and-decision-debug-console.md`](./docs/retrieval-and-decision-debug-console.md)
- Core metrics and consistency: [`/docs/core-metrics-and-consistency.md`](./docs/core-metrics-and-consistency.md)
- Social dynamics and batch runner: [`/docs/social-dynamics-and-batch-runner.md`](./docs/social-dynamics-and-batch-runner.md)
- sim-server API and queue: [`/docs/sim-server-api-and-queue.md`](./docs/sim-server-api-and-queue.md)
- staging, guardrails, cost, and demo: [`/docs/staging-guardrails-cost-and-demo.md`](./docs/staging-guardrails-cost-and-demo.md)
- Graph sync and event log: [`/docs/graph-sync-and-event-log.md`](./docs/graph-sync-and-event-log.md)
- Product identity: [`/docs/product-identity.md`](./docs/product-identity.md)
- Phase-2 direction summary: [`/docs/phase-2-ai-native-forum-direction.md`](./docs/phase-2-ai-native-forum-direction.md)
- Current state summary: [`/docs/current-product-state.md`](./docs/current-product-state.md)
- Review checklist: [`/docs/review-checklist.md`](./docs/review-checklist.md)

### Workflow and handoff docs

- GitHub issue workflow: [`/docs/github-issue-workflow.md`](./docs/github-issue-workflow.md)
- Meeting handoff workflow: [`/docs/meeting-handoff-workflow.md`](./docs/meeting-handoff-workflow.md)
- Meeting handoff template: [`/docs/meeting-handoff-template.md`](./docs/meeting-handoff-template.md)
- Round-1 pivot handoff: [`/docs/identity-formation-agent-pivot-round1-meeting-handoff.md`](./docs/identity-formation-agent-pivot-round1-meeting-handoff.md)
- Local export replay handoff: [`/docs/local-export-replay-viewer-meeting-handoff.md`](./docs/local-export-replay-viewer-meeting-handoff.md)

### Seed-world and realism-support docs

- Content-image alignment model: [`/docs/content-image-alignment-data-model.md`](./docs/content-image-alignment-data-model.md)
- Generated image policy: [`/docs/generated-image-policy.md`](./docs/generated-image-policy.md)
- Product mention card policy: [`/docs/product-mention-card-policy.md`](./docs/product-mention-card-policy.md)
- Product image binding rules: [`/docs/product-image-binding-layout-rules.md`](./docs/product-image-binding-layout-rules.md)
- Image crawling workflow: [`/docs/image-crawling-workflow.md`](./docs/image-crawling-workflow.md)
- Korean UGC outfit-shot guidance: [`/docs/korean-ugc-outfit-shot-guidance.md`](./docs/korean-ugc-outfit-shot-guidance.md)
- Lifestyle and pet expansion handoff: [`/docs/lifestyle-pet-expansion-meeting-handoff.md`](./docs/lifestyle-pet-expansion-meeting-handoff.md)
- Real-photo-preferred pet lifestyle strategy: [`/docs/real-photo-preferred-pet-lifestyle-strategy.md`](./docs/real-photo-preferred-pet-lifestyle-strategy.md)

## GitHub issue workflow

This repository tracks meaningful work through GitHub Issues only.

- Workflow doc: [`/docs/github-issue-workflow.md`](./docs/github-issue-workflow.md)
- Meeting handoff workflow: [`/docs/meeting-handoff-workflow.md`](./docs/meeting-handoff-workflow.md)
- Meeting handoff template: [`/docs/meeting-handoff-template.md`](./docs/meeting-handoff-template.md)
- Open work in GitHub: [Jongtae/AI-Fashion-Forum issues](https://github.com/Jongtae/AI-Fashion-Forum/issues)

## Legacy mock and image experiments

The repository still includes mock-specific assets and image experiments such as the outfit-preview PoC.
Under the phase-2 direction, these should be treated as seed-world or realism-support artifacts unless a newer policy doc explicitly promotes them.

The outfit-preview PoC manifest still lives in:

- [`/apps/forum-web/src/data/openaiOutfitPreviewManifest.json`](./apps/forum-web/src/data/openaiOutfitPreviewManifest.json)
