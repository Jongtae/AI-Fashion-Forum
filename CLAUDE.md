# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

AI Fashion Forum is an AI-native fashion forum simulation. The repo has two layers:

1. **Seed-world mock** — a high-fidelity React UI representing a believable fashion community
2. **Simulation engine** — a CAMEL-style company loop where agents form taste identities through biased content exposure, memory writeback, and forum post generation

Phase-1 validates mechanics with MiroFish. Phase-2 scales toward a digital-twin environment with OASIS. The existing React mock is seed-world material, not the end product.

Intent lock:

- Read [`docs/product-strategy/simulation-intent-guardrails.md`](./docs/product-strategy/simulation-intent-guardrails.md) before proposing strategy or requirements.
- Do not treat taste divergence, recommendation quality, or any other single phenomenon as the top-level goal.
- Treat those as observable outcomes inside the intended simulation environment.

## Current Implementation Priority

**Phase 1: Basic Forum Foundation** (Issue #253)
- Forum CRUD operations (POST/GET/PUT/DELETE for posts, comments, reactions)
- Database schema and API contracts
- Authentication and validation layers

This phase must complete before advancing to Phase 2 agent backend features (#247–#251). See Issue #245 for rationale.

## Commands

```bash
# Install dependencies
npm install

# Run frontend (port 5173)
npm run dev:forum

# Run simulation server (port 4318)
npm run dev:sim

# Production build + preview
npm run build
npm run preview

# Image crawling and outfit preview PoC (forum-web)
npm run crawl:images
npm run poc:outfit-preview
npm run poc:outfit-preview:dry-run
```

No test runner is configured. There are no lint scripts at the root.

## Workspace structure

npm workspaces monorepo with four packages:

| Package | Path | Role |
|---------|------|------|
| `@ai-fashion-forum/forum-web` | `apps/forum-web/` | Vite + React replay viewer and seed-world mock |
| `@ai-fashion-forum/sim-server` | `apps/sim-server/` | Vanilla Node.js local simulation server |
| `@ai-fashion-forum/agent-core` | `packages/agent-core/` | Core simulation engine (no external deps) |
| `@ai-fashion-forum/shared-types` | `packages/shared-types/` | Type contracts, schemas, and sample data |

## Architecture

### Data flow through the identity loop (Sprint 1)

```
content-starter-pack → biased-exposure-loop → memory-writeback
    → state-driven-posts → replay-drift-ui → divergence-evaluation
```

Each step maps 1:1 to issues #140–#146 and spec docs in `docs/sprint1/`.

### agent-core modules

The engine lives in `packages/agent-core/src/`. Key modules:

- `content-pipeline.js` — normalizes and ingests content from providers
- `content-indexing.js` — Chroma-style vector indexing and candidate generation
- `memory-stack.js` — short-term and long-term memory with self-narrative updates
- `identity-update-rules.js` — rules that update an agent's identity state after each tick
- `ranking-core.js` — feed ranking with experiment flags
- `forum-generation.js` — generates forum posts from agent state
- `meta-policy.js` — GM-level event injection and world rules
- `debug-console.js` — retrieval and decision transparency layer

### sim-server API

The server exposes 40+ endpoints. The most useful during development:

```
GET  /health
GET  /api/sprint1-agent-seed-sample
GET  /api/sprint1-exposure-sample?agent=S01
GET  /api/sprint1-memory-writeback-sample?agent=S01
GET  /api/sprint1-forum-post-sample
GET  /api/sprint1-evaluation-sample
GET  /api/run-sample?seed=42&ticks=10
POST /api/jobs/start
GET  /api/jobs/{job_id}/replay
```

### Deployment

GitHub Actions (`.github/workflows/deploy-pages.yml`) builds and deploys `dist/` to GitHub Pages on every push to `main`. GitHub Pages hosts only the **static replay viewer** — it does not run the sim-server. Simulations run locally or on a server.

## GitHub issue workflow

Full rules are defined in [`WORKFLOW.md`](./WORKFLOW.md) — the shared source of truth for issue tracking, execution rules, branch conventions, delivery sequence, and autonomous continuation behavior.
Prefer the smallest reviewable issue possible, and split again whenever a request would require more than one user-visible behavior, API change, or verification story.
When a user request is promoted into an issue, restate it as a task-oriented issue summary instead of copying the conversation verbatim; keep the issue wording execution-focused.
When a task is completed, finish the workflow end-to-end: merge or land the branch, verify the `main` update, close the issue, clean up the branch, and return the workspace to `main` unless the user explicitly wants to keep iterating on the feature branch.

## Key docs

| Topic | Path |
|-------|------|
| Sprint 1 specs | `docs/sprint1/` (7 files, #140–#146) |
| Core system specs | `docs/core-systems/` (13 files) |
| Governance workflow | `docs/governance-workflow/` |
| Meeting decisions | `docs/meeting-handoffs/` |
| Stack ADR | `docs/adr/001-stack.md` |
| Product strategy | `docs/product-strategy/` |
| Backlog | `docs/project-planning/mvp-v1-project-backlog.md` |

Docs in `docs/archive/` are deprecated — treat as reference only.
