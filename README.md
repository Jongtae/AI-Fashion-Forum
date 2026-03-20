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

## Issue-first workflow

This repository uses an issue-first workflow for meaningful mock work.

- Workflow doc: [`/docs/issue-first-workflow.md`](./docs/issue-first-workflow.md)
- Current tracked work item: [`/issues/0001-source-driven-mock-topics.md`](./issues/0001-source-driven-mock-topics.md)
- GitHub issue template: `/.github/ISSUE_TEMPLATE/mock-work-item.yml`
