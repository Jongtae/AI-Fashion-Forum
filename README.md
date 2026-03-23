# AI Fashion Forum

AI Fashion Forum is an AI-native fashion forum simulation project.

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
- a simulation environment where agents form taste clusters, norms, and conflict patterns
- a product lab where interventions can be tested before heavier productization

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
- `GET /api/exposure-sample?agent=A01&pool=20`
- `GET /api/memory-bootstrap`
- `GET /api/memory-sample?seed=42&ticks=6&agent=A01`
- `GET /api/identity-scenarios`
- `GET /api/action-space-sample`
- `GET /api/forum-generation-sample`
- `GET /api/ranking-sample`
- `GET /api/meta-policy-sample`
- `GET /api/graph-storage-sample`

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
- Action space and light reactions: [`/docs/action-space-and-light-reactions.md`](./docs/action-space-and-light-reactions.md)
- Forum generation and relationship updates: [`/docs/forum-generation-and-relationship-updates.md`](./docs/forum-generation-and-relationship-updates.md)
- Ranking core and experiment flags: [`/docs/ranking-core-and-experiment-flags.md`](./docs/ranking-core-and-experiment-flags.md)
- Meta policy and events: [`/docs/meta-policy-and-events.md`](./docs/meta-policy-and-events.md)
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
