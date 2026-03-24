# Action Space And Light Reactions

Issue `#102` defines a persistent action schema so forum ticks do not collapse into full writing events.

## Action Types

The shared action schema defines:

- `silence`
- `lurk`
- `react`
- `comment`
- `quote`
- `post`
- `relationship_update`

Lightweight reactions currently support:

- `agree`
- `curious`
- `support`
- `laugh`
- `bookmark`

## Stored Action Shape

Every action record includes:

- `action_id`
- `tick`
- `agent_id`
- `type`
- `target_content_id`
- `visibility`
- `payload`
- `ui`

The `ui` block keeps records directly consumable by future replay and forum surfaces.

## Intentional Low-Cost Paths

`packages/agent-core/action-space.js` intentionally separates:

- `silence`: no visible action, but still stored
- `lurk`: intentional read-only dwell on a target thread
- `react`: lightweight public feedback without full post generation

## Local Inspection

The sim server exposes:

- `GET /api/action-space-sample`

This endpoint returns UI-consumable action records spanning low-cost and visible actions.
