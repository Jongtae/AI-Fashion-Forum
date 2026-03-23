# Ranking Core And Experiment Flags

Issue `#104` adds a feed-ranking layer with explainable experiment flags.

## Current Experiment Flags

- `baseline`
- `novelty_boost`
- `trust_boost`
- `controversy_dampen`

## Signals

The current ranker scores feed items using:

- interest match
- trust signal
- novelty signal
- controversy signal
- recency signal

## Local Inspection

The sim server exposes:

- `GET /api/ranking-sample`

This endpoint returns top-ranked content for baseline and novelty-boost experiments with score breakdowns and reasons.
