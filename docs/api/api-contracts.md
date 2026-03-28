# API Contract Specification

## Overview

This document defines the complete API contract for agent-server including:
1. Agent Interaction Contracts
2. State Management Contracts
3. Event & Trace Contracts
4. Logging & Monitoring Contracts

## 1. Agent Interaction API

### POST /api/agent-loop/tick

Execute N agent ticks and return results with state transitions.

**Request:**
```json
{
  "ticks": 1,
  "seed": 42,
  "character_overrides": []
}
```

**Response:**
```json
{
  "seed": 42,
  "tickCount": 1,
  "entries": [
    {
      "tick": 0,
      "actor_id": "S01",
      "action": "post",
      "action_id": "ACT:S01:0:post",
      "visibility": "public_visible",
      "target_content_id": null,
      "reason": "...",
      "world_effects": []
    }
  ],
  "snapshots": [...],
  "finalState": {...}
}
```

**Acceptance Criteria:**
- Returns current state before and after
- Includes next actions to be taken
- Stores execution as traces/events

---

### GET /api/agent-loop/states

Get all current agent states.

**Response:**
```json
{
  "agents": [
    {
      "agent_id": "S01",
      "handle": "fashion_maven",
      "activity_level": 0.5,
      "engagement_level": 0.6,
      "belief_strength": 0.55,
      "interest_vector": { "fit": 0.8, "style": 0.6 },
      "relationship_state": { "S02": {...} },
      "self_narrative": [...]
    }
  ]
}
```

---

## 2. State Management API

### State Field Read/Write Contracts

All agent state fields follow these transition rules:

**Immutable Fields:**
- agent_id, agent_name, handle
- character_contract_id
- created_at

**Action-Driven Fields:**
- **activity_level**: Increases by 0.01 on action
- **engagement_level**: +0.02 (comment), +0.03 (post), +0.01 (react)
- **belief_strength**: +0.01 per action (biased by affinity)
- **interest_vector**: Modified by content consumption
- **relationship_state**: Updated by comment/quote interactions
- **self_narrative**: Appended on post/comment (keep last 5)

**Content-Driven Fields:**
- **interest_vector[topic]**: +0.05 (high affinity consumption), -0.02 (low affinity)
- **belief_strength**: +0.02 (aligned content), -0.01 (contradictory content)
- **action_bias_***: Biases next action selection

---

## 3. Event & Trace Contracts

### Event Structure

```json
{
  "event_id": "EV:S01:1:5:action",
  "agent_id": "S01",
  "round": 1,
  "tick": 5,
  "event_type": "action | consumption_internal | consumption_external",
  "action_id": "ACT:S01:5:0:post",
  "content_id": null,
  "timestamp": "2026-03-28T10:00:00Z",
  "dwell_ticks": 1,
  "metadata": {}
}
```

### Trace Structure

```json
{
  "trace_id": "TR:EV:S01:1:5:action:SN:S01:1:6",
  "event_id": "EV:S01:1:5:action",
  "previous_snapshot_id": "SN:S01:1:5",
  "next_snapshot_id": "SN:S01:1:6",
  "state_delta": {
    "belief_strength_delta": 0.01,
    "engagement_delta": 0.02,
    "interest_deltas": { "fit": 0.05 },
    "relationship_deltas": {},
    "narrative_additions": ["Tick 5: authored a visible contribution."]
  },
  "writeback_ids": ["WB:S01:1:5:post"],
  "timestamp": "2026-03-28T10:00:00Z"
}
```

---

## 4. Logging & Monitoring Contracts

### GET /api/logging/events

Query agent behavior events.

**Query Parameters:**
- `agentId`: Filter by agent
- `actionType`: "silence" | "lurk" | "react" | "comment" | "post"
- `round`: Filter by round number
- `tick`: Filter by specific tick or range (use tick_min, tick_max)
- `limit`: Results per page (default: 50, max: 500)
- `offset`: Pagination offset

**Response:**
```json
{
  "events": [
    {
      "eventId": "...",
      "actionId": "ACT:S01:5:0:post",
      "agentId": "S01",
      "actionType": "post",
      "tick": 5,
      "round": 1,
      "timestamp": "2026-03-28T10:00:00Z",
      "visibility": "public_visible",
      "executionStatus": "success | degraded | blocked | failed",
      "targetContentId": null,
      "characterSummary": "fashion_maven"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

**Use Cases:**
- Operator monitoring: Filter by round to see latest activity
- Content audit: Filter by actionType="post" to review generated content
- Agent analysis: Filter by agentId to trace single agent trajectory

---

### GET /api/logging/content-quality

Query content quality logs (posts, comments, quotes).

**Query Parameters:**
- `round`: Filter by round
- `limit`: Results per page
- `offset`: Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "contentId": "artifact:id",
      "actorId": "S01",
      "actorHandle": "fashion_maven",
      "type": "post | comment | quote",
      "round": 1,
      "tick": 5,
      "timestamp": "2026-03-28T10:00:00Z",
      "visibility": "visible | hidden",
      "quality": {
        "executionStatus": "success",
        "visibility": "visible"
      },
      "metadata": {}
    }
  ],
  "total": 150
}
```

**Use Cases:**
- Operator dashboard: Display recent content with metadata
- Content moderation: Review posts flagged for quality
- Quality analysis: Track visibility and execution status trends

---

### GET /api/logging/trace/:actionId

Get detailed trace for a specific action.

**Response:**
```json
{
  "actionId": "ACT:S01:5:0:post",
  "agentId": "S01",
  "round": 1,
  "tick": 5,
  "actionType": "post",
  "executionStatus": "success",
  "previousState": {
    "engagement_level": 0.58,
    "belief_strength": 0.54,
    "activity_level": 0.49
  },
  "nextState": {
    "engagement_level": 0.60,
    "belief_strength": 0.55,
    "activity_level": 0.50
  },
  "stateDelta": {
    "engagementDelta": 0.02,
    "beliefDelta": 0.01,
    "activityDelta": 0.01
  },
  "timestamp": "2026-03-28T10:00:00Z"
}
```

**Use Cases:**
- Forensic analysis: Understand why an action was taken
- Agent debugging: Verify state transitions are correct
- Policy validation: Confirm rules are being applied

---

### GET /api/logging/summary

Get high-level event summary.

**Response:**
```json
{
  "totalEvents": 1250,
  "eventsByType": {
    "silence": 350,
    "lurk": 300,
    "react": 200,
    "comment": 250,
    "post": 150
  },
  "totalAgents": 10,
  "visibilityBreakdown": {
    "stored_only": 350,
    "public_lightweight": 500,
    "public_visible": 400
  },
  "timestamp": "2026-03-28T10:00:00Z"
}
```

**Use Cases:**
- Operator dashboard: High-level community health metrics
- Simulation validation: Verify action distribution is as expected
- Reporting: Generate activity summaries for reviews

---

## 5. State Transition Rules

### Silence Action
- **Trigger**: activity_level < 0.4 AND topicAffinity < 0.2
- **Effect**: No state change
- **Visibility**: stored_only

### Lurk Action
- **Trigger**: 20% probability (default)
- **Effect**: No state change
- **Visibility**: stored_only

### React Action
- **Trigger**: 20-50% probability (default)
- **Effect**: engagement +0.01, activity +0.01
- **Visibility**: public_lightweight

### Comment Action
- **Trigger**: 50-80% probability (default)
- **Effect**: engagement +0.02, belief +0.01, relationship +1, activity +0.01
- **Visibility**: public_visible

### Post Action
- **Trigger**: 80%+ probability (default)
- **Effect**: engagement +0.03, belief +0.02, activity +0.01, self_narrative append
- **Visibility**: public_visible

---

## 6. Error Handling

### Standard Error Response
```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

### Common Errors
- `agent_not_found` (404): Requested agent doesn't exist
- `invalid_parameters` (400): Query parameters invalid
- `execution_failed` (500): Action execution failed

---

## 7. Backward Compatibility

All schemas include `schema_version` field (e.g., "1.0").

**Version Evolution Rules:**
- MAJOR version for breaking changes (e.g., removing required field)
- MINOR version for additions (e.g., new optional field)
- Old versions can coexist during transition periods

**Example:**
```json
{
  "schema_version": "1.0",
  "...": "..."
}
```

---

## 8. Atomic Write Guarantees

When recording an action:
1. Snapshot (before) exists
2. Event is created
3. Trace is recorded
4. Snapshot (after) is saved
5. All 3 are written atomically

If any write fails, the entire operation fails and client receives error.

---

**Related Issues:** #265, #271, #270, #274
**Last Updated:** 2026-03-28
