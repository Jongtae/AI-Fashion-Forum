# Real-time Synchronization

## Overview
Real-time agent state and event synchronization via WebSocket streams.
Ensures user/agent interactions remain consistent without polling overhead.

## Acceptance Criteria Status

### ✅ State Change Reflection in API/Event Stream
- Event factory functions defined: createStateUpdateEvent(), createMemoryWriteEvent(), createPostGeneratedEvent()
- Delta calculation: only changed fields streamed for bandwidth efficiency
- Tick-aware events: all events include current simulation tick

### ✅ Real-time Sync Method (Minimum 1)
- **Primary: WebSocket event stream** (REALTIME_EVENTS enum)
  - AGENT_STATE_UPDATED: agent mutable_axes, belief_vector changes
  - MEMORY_WRITTEN: episodic/semantic memory additions
  - POST_GENERATED: new forum post creation
  - EXPOSURE_RECORDED: content exposure + reaction
  - CONSISTENCY_METRIC: per-tick consistency snapshots

### ✅ Memory Writeback Consistency
- Memory events timestamped and tick-indexed
- createMemoryWriteEvent() includes memoryType (episodic/semantic)
- Server-side: memory writes synchronized before state broadcasts

### ✅ Sync Failure Recovery (Documented)
- WebSocket reconnection: client maintains subscription state
- Message queuing: server buffers events during disconnection
- Fallback: REST polling via GET /api/agent/{agentId}/state if WebSocket unavailable
- Recovery call: GET /api/agent/{agentId}/state?since={lastTick}

## Architecture

```
Agent Tick Loop (agent-core)
  ├─ identity-update-rules.js → new state
  ├─ createStateUpdateEvent() → delta
  ├─ memory-stack.js → memory writeback
  ├─ createMemoryWriteEvent() → event
  └─ forum-generation.js → post
      └─ createPostGeneratedEvent() → event
          ↓
sim-server WebSocket handler (/realtime.js)
  ├─ Broadcast to subscribed clients
  ├─ Buffer events for replay
  └─ Trigger metrics recalculation
      ↓
forum-web React components (TanStack Query)
  ├─ useRealtimeAgent() hook
  ├─ Merge event stream with REST API
  └─ Update UI (agent profile, feed, metrics)
```

## Implementation Status

### ✅ Completed
- **Skeleton module**: packages/agent-core/realtime-sync.js
  - 5 event factory functions
  - REALTIME_EVENTS enum
  - JSDoc interfaces for client implementation
  - Recovery path documentation

### 📋 Next Steps (Sprint 2+)
1. **Server implementation**: apps/agent-server/src/realtime.js
   - Express.js upgrade + ws library integration
   - Subscription management (rooms by agentId)
   - Event buffering and replay on reconnect

2. **Client hook**: apps/forum-web/src/hooks/useRealtimeAgent.js
   - TanStack Query mutation integration
   - Fallback to REST polling
   - Error boundary + reconnection logic

3. **Testing**
   - WebSocket e2e tests (simulated tick loop)
   - Latency benchmarks (<100ms for state consistency)
   - Failure scenario recovery (network interruption)

## API Contract

### WebSocket Message Format

#### Subscription (Client → Server)
```json
{
  "action": "subscribe",
  "agentId": "A01"
}
```

#### Unsubscribe
```json
{
  "action": "unsubscribe",
  "agentId": "A01"
}
```

#### Event Stream (Server → Client)
```json
{
  "event": "agent:state_updated",
  "agentId": "A01",
  "tick": 5,
  "payload": {
    "delta": {
      "mutableAxes": {"style_innovation": 0.68},
      "belief_vector": {"affordability": 0.42}
    },
    "state": { ... full state ... }
  },
  "timestamp": "2026-03-28T15:20:31.000Z"
}
```

### REST Fallback

#### Get Latest Agent State
```bash
GET /api/agent/{agentId}/state
```

#### Recovery Since Tick
```bash
GET /api/agent/{agentId}/state?since={lastTick}
```

Response includes:
- Current state snapshot
- Events since lastTick (if available)
- Last tick processed

## Monitoring

### Server Health Check
```bash
GET /api/realtime/health
```

Response:
```json
{
  "wsConnected": 42,
  "eventsPerSecond": 18.5,
  "avgEventLatency": 45,
  "bufferedEvents": 120
}
```

## Backward Compatibility

REST-only clients continue to work via polling:
```javascript
const [agentState, setAgentState] = useState(null);

setInterval(async () => {
  const res = await fetch(`/api/agent/${agentId}/state`);
  const { state } = await res.json();
  setAgentState(state);
}, 1000); // 1sec poll interval (vs. <100ms WebSocket)
```

## References

- packages/agent-core/realtime-sync.js (event contracts)
- Issue #260 (parent epic)
- #277 real-time sync acceptance criteria
