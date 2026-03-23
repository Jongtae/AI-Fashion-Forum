# Local Export Replay Viewer Meeting Handoff

## Background

The repository is currently deployed to GitHub Pages.

GitHub Pages can host static assets, but it cannot run the simulation server, background jobs, vector stores, graph databases, or live world-tick processing required by the identity-forming forum stack.

The team therefore needs a deployment mode that preserves shareability without pretending the full simulation is live on Pages.

## What Triggered This Handoff

Deployment planning reached a practical boundary:

- the sim stack is serverful and stateful
- GitHub Pages is static-only
- the team still wants to publish and inspect simulation results through the existing Pages deployment path

The agreed direction is to treat GitHub Pages as a replay/result viewer rather than a live simulation runtime.

## Agreed Decisions

- Simulations run locally or on a server-capable environment, not on GitHub Pages.
- GitHub Pages hosts a static replay viewer only.
- The viewer reads exported artifacts from completed runs.
- A run export should be treated as a publishable snapshot of one simulation result, not as a live environment.
- Frontend work for Pages should target deterministic replay and exploration of exported data.

## Non-Goals

- Do not try to run `sim-server` on GitHub Pages.
- Do not design the Pages site as if it can write to Chroma, Neo4j, or Mem0 at runtime.
- Do not imply that the deployed site is a live multi-agent service when it is only rendering exported results.
- Do not block frontend progress on a full production backend before replay viewing exists.

## System / UI / Content Rules

- The replay viewer should be able to render feed, post detail, profiles, timeline, and metrics from static artifacts.
- Export artifacts should be stable enough that a run can be re-opened later without the live simulation process.
- The UI should clearly treat a run as a recorded world state, not a currently mutating environment.
- Run metadata should identify the seed, timestamp, tick count, and scenario name so viewers know what they are looking at.

## Replay Artifact Shape

The first export format should be simple and static-friendly.

Recommended run folder shape:

```text
public/replays/<run-id>/
  manifest.json
  agents.json
  posts.json
  ticks.json
  metrics.json
  graph-summary.json
```

Recommended responsibilities:

- `manifest.json`
  - run id
  - scenario name
  - seed
  - created at
  - total ticks
  - available files

- `agents.json`
  - agent profiles for the run snapshot
  - current interest axes
  - relation summary
  - self-narrative timeline summary

- `posts.json`
  - feed-visible posts/comments/reactions
  - author ids
  - topic ids
  - tick/time references

- `ticks.json`
  - key events by tick
  - bookmarks for major divergence moments
  - replay timeline data

- `metrics.json`
  - run-level metrics
  - tick-level metrics
  - scenario evaluation outputs

- `graph-summary.json`
  - compressed topic/relationship summaries for the UI
  - not a full Neo4j dump

## Review Gates

- Can the Pages viewer load one exported run with no live backend?
- Can a developer inspect feed, profile, and timeline from exported files alone?
- Is the artifact format small and clear enough to version or archive?
- Does the UI avoid implying live write capability when deployed on Pages?
- Is the separation between local simulation execution and static replay rendering obvious to the team?

## Related GitHub Issues

- Handoff/decision issue: `#117`
- Frontend viewer epic: `#88`
- Core forum UI issue: `#108`
- Replay UI issue: `#109`
- Sim-server API issue: `#114`
- MVP demo/ops issue: `#115`
