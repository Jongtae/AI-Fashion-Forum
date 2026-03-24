# staging, guardrails, cost, and demo

Issue `#115` packages the MVP for repeatable demos and shared development.

## Shared environment

- GitHub Pages is treated as the staging-equivalent shared surface for the product UI
- The repository-local sim-server remains the operational companion for local demo and replay execution

## Runtime guardrails

- Simulation jobs cap at `120` ticks
- Job failures return structured `failed` status instead of crashing the whole process
- Cost estimates are tracked per run using prompt/completion/total token estimates and USD estimate fields

## Fixed demo package

- `GET /api/demo-run-package`
- Fixed seed: `77`
- Agents: `8`
- Ticks: `50`

This package is meant to be the repeatable MVP showcase run for operator demos and handoff reviews.
