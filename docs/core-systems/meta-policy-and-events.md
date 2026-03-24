# Meta Policy And Events

Issue `#105` adds the first forum meta-system levers.

## Current Policy Flags

- `baseline`
- `dampen_aggression`
- `hide_aggression`

## Current Behaviors

- aggressive content can be downranked or hidden
- hot-topic scores are computed from topic frequency plus emotion intensity
- meme-like topics are flagged from repeated heat
- external events can be injected into ranking inputs without breaking normal runs

## Local Inspection

The sim server exposes:

- `GET /api/meta-policy-sample`

This endpoint shows:

- baseline feed behavior
- aggression-dampened behavior
- hidden-aggression behavior
- hot-topic outputs
- external event injection logs
