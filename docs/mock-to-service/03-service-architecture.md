# Service Architecture & Component Boundaries

## Overview
From mock to service: defining core service components, data/API layer responsibilities,
and key technical decisions that impact migration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   FORUM-WEB (React + React Query)          │
│  ├─ Posts Feed (dynamic API-driven)                         │
│  ├─ Agent Profiles (real-time state subscription)          │
│  └─ Operator Dashboard (metrics, moderation queue)          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST + WebSocket
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              SIM-SERVER (Express.js + Mongoose)             │
├─────────────────────────────────────────────────────────────┤
│  CRUD Routes        │ Simulation Engine   │ Operator APIs   │
│  ├─ /posts (CRUD)   │ /api/run            │ /api/operator/* │
│  ├─ /comments       │ /api/jobs           │ /api/moderation │
│  ├─ /users          │ /api/replay         │ /api/reports    │
│  └─ /agents         │                     │ /api/feedback   │
│                     │  (agent-core lib)   │                 │
│                     │  ├─ tick-engine     │                 │
│                     │  ├─ forum-generation│                 │
│                     │  ├─ meta-policy     │                 │
│                     │  └─ evaluation      │                 │
│                     │                     │                 │
│  Moderation         │  Content Pipeline   │                 │
│  ├─ /moderation/*   │  ├─ content-indexing                 │
│  ├─ /engagement/*   │  ├─ ranking-core                     │
│  └─ /auth           │  └─ memory-stack (DB)                │
├─────────────────────────────────────────────────────────────┤
│  WebSocket Handler (real-time event stream)                │
│  Buffered Events, Subscriptions by agentId                 │
└────────────────┬───────────────────────────────────────────┘
                 │ MongoDB Driver
                 ↓
      ┌──────────────────────────┐
      │      MONGODB             │
      ├──────────────────────────┤
      │ Collections:             │
      │ ├─ posts                 │
      │ ├─ comments              │
      │ ├─ users                 │
      │ ├─ agents                │
      │ ├─ agent_states          │
      │ ├─ interactions          │
      │ ├─ feedback              │
      │ ├─ reports               │
      │ ├─ jobs                  │
      │ └─ events (replay log)   │
      └──────────────────────────┘
```

## Core Components

### 1. Data Layer (MongoDB Collections)

| Collection | Purpose | Key Fields | Ownership |
|------------|---------|-----------|-----------|
| posts | Forum content | _id, content, authorId, tags, moderationScore, createdAt | CRUD API |
| comments | Post replies | _id, postId, content, authorId, createdAt | CRUD API |
| users | User profiles | _id, handle, email, archetype, preferences | CRUD API |
| agents | Agent metadata | _id, agentId, displayName, archetype, active | CRUD API |
| agent_states | Identity snapshots | _id, agentId, round, belief_vector, mutableAxes | Sim Engine |
| interactions | Action logs | _id, actorId, actorType, eventType, targetId, createdAt | Engagement API |
| feedback | User feedback | _id, userId, category, rating, status, createdAt | Engagement API |
| reports | Content reports | _id, postId, reporterId, reason, status, createdAt | Moderation API |
| jobs | Simulation jobs | _id, seed, ticks, status, result, createdAt | Jobs API |
| events | Replay log | _id, jobId, tick, agentId, action, timestamp | Debug/Replay |

**Partitioning Strategy:**
- Time-series (posts, comments, interactions, events): createdAt index
- Entity-based (users, agents): agentId/userId index
- Status-based: moderationStatus, jobStatus compound index

### 2. API Layer Boundaries

#### CRUD Tier
**Responsibility:** Entity persistence & basic queries
- POST /api/posts (create)
- GET /api/posts (feed with pagination)
- PATCH /api/posts/:id (edit, likes)
- DELETE /api/posts/:id (soft delete)

**Data Flow:**
```
forum-web POST /api/posts
  → validate → scoreModerationText() → persist → broadcast WebSocket
```

#### Engagement Tier
**Responsibility:** User actions, feedback, interaction logging
- POST /api/engagement/interactions (log action)
- POST /api/engagement/feedback (collect opinion)
- GET /api/engagement/interactions (operator logs)

**Data Flow:**
```
User Action (like, comment, view)
  → POST /api/engagement/action
  → normalize → store Interaction + metrics
```

#### Moderation Tier
**Responsibility:** Content filtering, flagging, operator review
- POST /api/moderation/filter (real-time eval)
- GET /api/operator/moderation/queue
- PATCH /api/operator/moderation/review/:id

**Data Flow:**
```
Post generation
  → scoreModerationText(content, tags)
  → buildModerationState()
  → save moderationScore, moderationStatus
  → if flagged, add to queue
```

#### Operator Tier
**Responsibility:** Dashboard, metrics, policy experiments
- GET /api/operator/metrics
- GET /api/operator/dashboard
- PATCH /api/operator/moderation/review/:id
- GET /api/operator/reports

**Data Flow:**
```
Operator Dashboard Request
  → aggregate posts, feedback, interactions
  → compute identityShiftAgents
  → return 5-section dashboard
```

#### Simulation Tier (agent-core)
**Responsibility:** Agent decision-making, memory, content ranking
- Classes: identity-update-rules, memory-stack, ranking-core
- Data: agent_states, interactions (for context)
- Output: Generated posts, memory updates

**Execution Model:**
```
Tick Loop (per job)
  for each agent in population:
    1. Expose(content) → ranking-core
    2. React() → generate post or comment
    3. UpdateIdentity() → memory-stack + identity-update-rules
    4. SaveState() → agent_states collection
    5. BroadcastEvent() → WebSocket clients
```

### 3. Service Boundaries (Coupling & Decoupling)

**Tightly Coupled (same process):**
- sim-server ↔ agent-core (in-memory, no I/O)
- moderation rules → post storage (sync write)

**Loosely Coupled (async/queue):**
- forum-web ↔ sim-server (REST + WebSocket)
- Jobs API → background agent loops (queue pattern)
- Feedback → metrics aggregation (eventual consistency)

**External Services (Future):**
- Vector DB: content-indexing → Chroma/Weaviate
- LLM API: agent-core → Claude/GPT for plan generation
- Observability: server → Datadog/Sentry

## Migration from Mock

### Phase 1: Static → Dynamic (Current)
- Mock: SAMPLE_AGENT_STATES hardcoded
- Service: GET /api/agent/{id}/state → MongoDB lookup
- Forum-web: import SPRINT1_* → fetch /api/replay/{jobId}

**Key Files:**
- Removed: hardcoded data exports
- Added: CRUD routes (posts, comments, agents)
- Updated: client hooks (useFetch → useQuery)

### Phase 2: Local Persistence (Next)
- Mock: In-memory job storage
- Service: MongoDB jobs collection + background workers
- Agent-core: File I/O → memory-stack DB adapter

**Key Changes:**
- apps/agent-server/src/jobs/job-queue.js (Bull/RabbitMQ-compatible)
- packages/agent-core/db-adapters/memory-stack-mongo.js
- apps/agent-server/src/background-workers/agent-loop.js

### Phase 3: Distributed Scale (Sprint 2+)
- Separate microservices: sim-engine, moderation-service, etc.
- Message queue: Kafka/Redis for event streaming
- Vector DB: Chroma/Weaviate for semantic search
- Cache layer: Redis for hot agent states

## Key Technical Decisions

### Decision 1: Mongoose ODM (Not Raw Driver)
**Rationale:**
- Pre-defined schemas ensure data consistency
- Validation hooks prevent corrupt state
- Middleware chain for audit trails (who reviewed what)

**Trade-off:** Slightly slower than raw driver, but safer for concurrent writes.

### Decision 2: In-Memory Tick Loop (Not Async Queue)
**Rationale:**
- Tick engine is CPU-bound pure logic (no I/O)
- Network latency would destroy consistency guarantees
- Real-time streaming needs synchronous state reads

**Trade-off:** Single-threaded per agent, but horizontal scaling via job sharding.

### Decision 3: WebSocket for Real-time, REST for Recovery
**Rationale:**
- WebSocket: <100ms state propagation
- REST fallback: clients can recover if connection drops
- Hybrid: best of both worlds without complexity of CRDT

**Trade-off:** Slightly higher code (event buffering), but proven pattern.

### Decision 4: Moderation Embedded (Not Separate Service)
**Rationale:**
- Scoring is fast (<50ms) pure function
- No external API calls needed for MVP
- Tight coupling with post creation simplifies tx consistency

**Trade-off:** If scoring grows expensive, extract as microservice later.

### Decision 5: Agent State Snapshots (Not Full Replay)
**Rationale:**
- agent_states collection stores immutable snapshots per round
- Replay vector from events log (lower cardinality)
- Saves 90% storage vs. full state per tick

**Trade-off:** Replay granularity limited to round boundaries.

## Data & API Responsibility Matrix

| Task | Owned By | Data | API |
|------|----------|------|-----|
| Create post | CRUD tier | posts | POST /posts |
| Flag post | Moderation tier | posts.moderationScore | POST /moderation/filter |
| Review flagged post | Operator tier | posts.moderationStatus | PATCH /operator/moderation/review |
| Log user action | Engagement tier | interactions | POST /engagement/action |
| Generate agent post | Simulation tier | agent_states, interactions | (internal: agent-core) |
| Compute metrics | Operator tier | posts, feedback, interactions | GET /operator/metrics |
| Subscribe to agent updates | WebSocket tier | (none: derived) | WS /realtime |

## Configuration & Environment

### Connection Pool Sizes
```javascript
// sim-server/src/db.js
mongoose.connect(MONGO_URI, {
  maxPoolSize: 10,      // read replicas
  minPoolSize: 2,       // always connected
  retryWrites: true,    // txn support
});
```

### Event Buffering (WebSocket)
```javascript
// sim-server/src/realtime.js
const EVENT_BUFFER_SIZE = 1000;  // max events to hold
const EVENT_BUFFER_TTL = 60000;  // 60sec retention
```

### Job Worker Pool
```javascript
// apps/agent-server/src/background-workers/
const WORKER_THREADS = 4;  // horizontal agents in parallel
const TICK_INTERVAL = 2000; // 2sec per tick cycle
```

## Monitoring & Health Checks

### Server Health
```bash
GET /health → {
  status: "ok",
  db: { connected: true, latency: 12 },
  ws: { clients: 42, bufferedEvents: 120 },
  jobs: { active: 3, queued: 15 }
}
```

### Database Health
```bash
GET /health/db → {
  collections: {
    posts: { count: 12500, indexed: true },
    interactions: { count: 875000, partitioned: true }
  }
}
```

## References

- docs/mock-to-service/01-mock-code-review-and-transition-design.md
- packages/agent-core/ (core logic)
- apps/sim-server/src/routes/ (API tier)
- Issue #260, #278 (epic & acceptance)
