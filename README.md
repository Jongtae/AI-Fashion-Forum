# AI Fashion Forum

Threads-inspired single-page React mock for an AI fashion community discussion product.

## Live URL

After GitHub Pages finishes deploying:

`https://jongtae.github.io/AI-Fashion-Forum/`

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deployment

This repository is configured to deploy to GitHub Pages with GitHub Actions on every push to `main`.

GitHub settings required:

1. Open repository `Settings`
2. Open `Pages`
3. Set source to `GitHub Actions`

Workflow file:

`/.github/workflows/deploy-pages.yml`

## GitHub Issues workflow

This repository tracks meaningful work through GitHub Issues only.

- Workflow doc: [`/docs/github-issue-workflow.md`](./docs/github-issue-workflow.md)
- Meeting handoff workflow: [`/docs/meeting-handoff-workflow.md`](./docs/meeting-handoff-workflow.md)
- Meeting handoff template: [`/docs/meeting-handoff-template.md`](./docs/meeting-handoff-template.md)
- GitHub issue template: `/.github/ISSUE_TEMPLATE/mock-work-item.yml`
- Open work in GitHub: `https://github.com/Jongtae/AI-Fashion-Forum/issues`

## Alignment design artifacts

- Product identity: [`/docs/product-identity.md`](./docs/product-identity.md)
- Current product state summary: [`/docs/current-product-state.md`](./docs/current-product-state.md)
- Content-image alignment model: [`/docs/content-image-alignment-data-model.md`](./docs/content-image-alignment-data-model.md)
- Example aligned records: [`/src/data/contentImageAlignmentExamples.json`](./src/data/contentImageAlignmentExamples.json)
- Generated image policy: [`/docs/generated-image-policy.md`](./docs/generated-image-policy.md)
- Product mention card policy: [`/docs/product-mention-card-policy.md`](./docs/product-mention-card-policy.md)
- Review checklist: [`/docs/review-checklist.md`](./docs/review-checklist.md)
- OpenAI outfit-preview PoC: [`/docs/openai-outfit-preview-feasibility-poc.md`](./docs/openai-outfit-preview-feasibility-poc.md)
- Korean UGC outfit-shot guidance: [`/docs/korean-ugc-outfit-shot-guidance.md`](./docs/korean-ugc-outfit-shot-guidance.md)
- Meeting handoff workflow: [`/docs/meeting-handoff-workflow.md`](./docs/meeting-handoff-workflow.md)
- Meeting handoff template: [`/docs/meeting-handoff-template.md`](./docs/meeting-handoff-template.md)

These alignment artifacts are the source of truth for validating whether mock post text, image evidence, and expected comments belong together.

## Outfit-preview PoC

Issue `#39` adds a constrained OpenAI GPT Image feasibility path for detail-view outfit previews.

Commands:

```bash
npm run poc:outfit-preview:dry-run
OPENAI_API_KEY=... npm run poc:outfit-preview
```

The candidate set, review state, and UI-attachment approval gate live in:

- [`/src/data/openaiOutfitPreviewManifest.json`](./src/data/openaiOutfitPreviewManifest.json)
