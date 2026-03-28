# Trace/Snapshot/Event Storage Contract

Defines the storage and replay contracts for action tracing, snapshots, and events. Enables forensic analysis: "What happened?" and "Why did the agent change?"

## Core Concepts

Three complementary artifacts form a complete record:

| Artifact | Purpose | Format |
|----------|---------|--------|
| **Snapshot** | Complete agent state at (round, tick) | `SN:agent_id:round:tick` |
| **Event** | Something that happened | `EV:agent_id:round:tick:type` |
| **Trace** | Causal link: event → state change | `TR:event_id:snapshot_id` |

---

## Snapshot Contract

### Structure

```javascript
{
  // Identity
  snapshot_id: "SN:A01:1:0",      // Unique, deterministic
  agent_id: "A01",
  round: 1,
  tick: 0,

  // Versioning (for schema evolution)
  schema_version: "1.0",          // MAJOR.MINOR
  timestamp: "2026-03-28T...",   // ISO 8601, UTC

  // Full agent state at this point
  agent_state: {
    belief_strength: 0.62,
    engagement_level: 0.52,
    interest_vector: { fit: 0.55 },
    relationship_state: { U123: { engagement: 0.71, affinity: 0.6 } },
    self_narrative: [...]
  },

  // Context: what triggered this snapshot?
  context: {
    trigger: "action_execution",  // tick_loop, action_execution, content_consumption, manual, replay
    phase: "post_action",         // pre_action, post_action, post_consumption
    custom_field: "value"         // extensible
  },

  // Causal: which event led here?
  previous_event_id: "EV:A01:1:0:action" || null
}
```

### Versioning Rules

- `schema_version: "1.0"` → Initial version
- `schema_version: "1.1"` → Added new field to agent_state (backward compatible)
- `schema_version: "2.0"` → Breaking change (e.g., removed field)

Replay engine checks schema_version to apply migrations.

### Snapshot Guarantees

- **Deterministic ID**: Same (agent, round, tick) → Same snapshot_id
- **Complete**: Contains full agent_state (no sparse updates)
- **Immutable**: Once written, never modified (append-only)
- **Traceable**: previous_event_id links back to causal event

---

## Event Contract

### Structure

```javascript
{
  // Identity
  event_id: "EV:A01:1:0:action",     // Unique, deterministic
  agent_id: "A01",
  round: 1,
  tick: 0,

  // Event classification
  event_type: "action",               // "action", "consumption_internal", "consumption_external"
  action_id: "ACT:A01:1:0:comment",  // For action events
  content_id: "C001",                 // Content being consumed or acted upon
  content_type: "post",               // "post", "comment", "external_article"

  // Timing
  timestamp: "2026-03-28T...",       // ISO 8601, UTC
  dwell_ticks: 1,                    // How long did agent dwell on content?

  // Event-specific metadata
  metadata: {
    execution_status: "success",     // "success", "failed", "skipped"
    topics: ["fit", "pricing"],       // For consumption events
    source: "vogue.com",              // For external consumption
    ...
  }
}
```

### Event Types

**Action Events:**
```javascript
{
  event_type: "action",
  action_id: "ACT:A01:1:0:post",
  metadata: { action_type: "post", execution_status: "success" }
}
```

**Internal Content Consumption:**
```javascript
{
  event_type: "consumption_internal",
  content_id: "C001",
  metadata: { consumption_type: "internal", topics: ["fit"], dwell_ticks: 1 }
}
```

**External Content Consumption:**
```javascript
{
  event_type: "consumption_external",
  content_id: "EX001",
  metadata: {
    consumption_type: "external",
    source: "economist.com",
    topics: ["pricing"],
    dwell_ticks: 2
  }
}
```

---

## Trace Contract

### Structure

```javascript
{
  // Identity
  trace_id: "TR:EV:A01:1:0:action:SN:A01:1:1",
  event_id: "EV:A01:1:0:action",

  // Snapshot reference: before → after
  previous_snapshot_id: "SN:A01:1:0",
  next_snapshot_id: "SN:A01:1:1",

  // What changed?
  state_delta: {
    belief_strength_delta: 0.02,
    engagement_delta: 0.01,
    interest_deltas: { fit: 0.05 },
    relationship_deltas: { U123: { engagement_delta: 0.02, affinity_delta: 0 } },
    narrative_additions: [{ type: "action_post", tick: 0 }],
    memory_channels: ["belief_shift"]
  },

  // Causal: which writebacks produced this delta?
  writeback_ids: ["WB:A01:1:0:comment"],

  // Metadata
  timestamp: "2026-03-28T...",
  schema_version: "1.0"
}
```

### State Delta Fields

Each trace captures deltas for:

- `belief_strength_delta`: Change in conviction
- `engagement_delta`: Change in activity level
- `interest_deltas`: Map of topic → delta
- `relationship_deltas`: Map of author_id → {engagement_delta, affinity_delta}
- `narrative_additions`: Entries added to self_narrative
- `memory_channels`: Channels used (belief_shift, action_post, content_internal, etc.)

---

## Causal Chain Structure

Complete action execution:

```
ActionRequest
    ↓
[Snapshot Before] ← previous_event_id points here
    ↓
    Event (action_id, execution_status)
    ↓
    [State Delta Calculation]
    ↓
    Writeback (memory_channel, state_delta)
    ↓
[Snapshot After]
    ↓
    Trace (event_id → previous_snapshot → next_snapshot → writeback_ids)
```

Example trace linking:
```
SN:A01:1:0 (belief=0.60)
    ↑
    └─ previous_snapshot_id in TR:EV:...

EV:A01:1:0:action (action_id=ACT:A01:1:0:comment)
    ↓
    TR:EV:... (writeback_id=WB:A01:1:0:comment)

WB:A01:1:0:comment (state_delta: {belief_delta: 0.02})
    ↓
    next_snapshot_id in TR:EV:...

SN:A01:1:1 (belief=0.62)
```

---

## Replay Engine

### Basic Operations

```javascript
const engine = new TraceReplayEngine(initialSnapshot);

// Apply a trace
engine.applyTrace(trace, snapshotAfter);

// Record an event
engine.recordEvent(event);

// Get trajectory
const trajectory = engine.getTrajectory();
```

### Validation

Before applying a trace, engine validates:

```javascript
if (trace.previous_snapshot_id !== engine.currentSnapshot.snapshot_id) {
  throw new Error("Trace causality broken");
}
```

### Queries

**Find what changed a field:**
```javascript
const beliefTraces = engine.findTracesModifyingField("belief");
// Returns all traces where belief_strength_delta ≠ 0
```

**Compare two points:**
```javascript
const diff = engine.compareTwoSnapshots(snap1, snap2);
// Returns: { belief_delta, engagement_delta, interest_changes, ... }
```

**Get full trajectory:**
```javascript
const trajectory = engine.getTrajectory();
// Returns: { initial, current, traces[], events[] }
```

---

## Storage Format

### Snapshots

**MongoDB collection: `agent_snapshots`**

```javascript
{
  snapshot_id: "SN:A01:1:0",
  agent_id: "A01",
  round: 1,
  tick: 0,
  schema_version: "1.0",
  timestamp: ISODate,
  agent_state: { ... },
  context: { ... },
  previous_event_id: "EV:A01:1:0:action"
}
```

**Index:** `{ agent_id: 1, round: 1, tick: 1 }`

### Events

**MongoDB collection: `agent_events`**

```javascript
{
  event_id: "EV:A01:1:0:action",
  agent_id: "A01",
  round: 1,
  tick: 0,
  event_type: "action",
  action_id: "ACT:A01:1:0:comment",
  content_id: "C001",
  timestamp: ISODate,
  dwell_ticks: 1,
  metadata: { ... }
}
```

**Index:** `{ agent_id: 1, round: 1, tick: 1 }`

### Traces

**MongoDB collection: `agent_traces`**

```javascript
{
  trace_id: "TR:EV:A01:1:0:action:SN:A01:1:1",
  event_id: "EV:A01:1:0:action",
  previous_snapshot_id: "SN:A01:1:0",
  next_snapshot_id: "SN:A01:1:1",
  state_delta: { ... },
  writeback_ids: ["WB:A01:1:0:comment"],
  timestamp: ISODate,
  schema_version: "1.0"
}
```

**Index:** `{ event_id: 1 }`, `{ agent_id: 1, round: 1 }`

---

## Example: Full Lifecycle

### Setup

Agent A01, round 1, tick 0–2:

```
Tick 0: Post action (engagement 0.5 → 0.52)
Tick 1: Consume internal content (belief 0.6 → 0.62)
Tick 2: Consume external content (belief 0.62 → 0.59, perspective 0.2 → 0.25)
```

### Artifacts

```
SN:A01:1:0 (engagement=0.5, belief=0.6)
  ↓ EV:A01:1:0:action + TR:... + WB:A01:1:0:comment
SN:A01:1:1 (engagement=0.52, belief=0.6)
  ↓ EV:A01:1:1:consumption_internal + TR:... + WB:A01:1:1:internal_content
SN:A01:1:2 (engagement=0.52, belief=0.62)
  ↓ EV:A01:1:2:consumption_external + TR:... + WB:A01:1:2:external_content
SN:A01:1:3 (engagement=0.52, belief=0.59, perspective=0.25)
```

### Replay

```javascript
const engine = new TraceReplayEngine(snap0);
engine.applyTrace(trace0, snap1);  // Post
engine.applyTrace(trace1, snap2);  // Internal consumption
engine.applyTrace(trace2, snap3);  // External consumption

// Query: What changed belief?
const beliefTraces = engine.findTracesModifyingField("belief");
// → [trace1 (internal: +0.02), trace2 (external: -0.03)]

// Query: Compare start to end
const diff = engine.compareTwoSnapshots(snap0, snap3);
// → { belief_delta: -0.01, engagement_delta: 0.02, ... }
```

---

## References

- `packages/agent-core/trace-snapshot-contract.js` — Implementation
- `packages/agent-core/trace-snapshot-contract.test.js` — Test suite (30 tests)
- Used by: action-state-transitions, content-consumption-merge
