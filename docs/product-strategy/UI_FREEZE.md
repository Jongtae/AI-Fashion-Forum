# UI Feature Freeze

**Effective:** 2026-04-03
**Status:** Active

## Rationale

Forum-web UI feature development is paused to focus engineering effort on:

1. **Simulation engine quality** — agent population scaling, checkpoint/restore, evaluator agents
2. **Observation tooling** — replay analysis, metric dashboards, agent state comparison
3. **LLM integration** — Claude API migration, prompt quality improvements

The existing forum UI (React + Vite) serves as seed-world material for the simulation. New UI features do not advance the core research goal of building a believable AI-native community simulation.

## What is frozen

- New forum-web pages, components, or visual features
- New user-facing interactions (likes, follows, notifications)
- CSS/styling changes beyond bug fixes

## What is NOT frozen

- Bug fixes in existing UI code
- Replay viewer improvements (directly supports observation)
- Build/deployment pipeline changes
- Data display components that surface simulation metrics

## When to unfreeze

Re-evaluate after the simulation engine reaches Phase 2 maturity:
- 30+ agents running stable multi-round simulations
- Checkpoint/restore working end-to-end
- Evaluator agent producing actionable quality assessments
