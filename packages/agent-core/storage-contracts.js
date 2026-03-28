/**
 * storage-contracts.js
 *
 * Unified backend storage contract for all agent-generated artifacts.
 *
 * This file documents the complete data model for:
 * - Action Requests & Execution Results
 * - Snapshots (agent state captures)
 * - Events (agent activities)
 * - Traces (causal links between events and state changes)
 * - Forum Artifacts (generated posts, comments, reactions)
 *
 * Part of Issue #271: trace/snapshot/event/forum artifact 저장 스키마 정의
 */

/**
 * STORAGE CONTRACT 1: ACTION REQUEST
 *
 * An action request is sent to the agent decision system.
 * It includes all inputs needed to decide on an action.
 *
 * Structure:
 * {
 *   agent_id: string (required) - "S01", "A02", etc.
 *   type: enum (required) - "silence" | "lurk" | "react" | "comment" | "quote" | "post" | "relationship_update"
 *   tick: number (required) - which tick in the simulation
 *   round: number (optional, default 0) - which round
 *   target_content_id: string (conditional) - required for lurk, react, comment, quote
 *   target_type: string (conditional) - "post" | "comment" | "reaction"
 *   payload: object (optional) - action-specific data
 * }
 *
 * Examples:
 * POST: { agent_id: "S01", type: "post", tick: 5, round: 1, payload: {...} }
 * REACT: { agent_id: "S01", type: "react", tick: 5, target_content_id: "POST:01:post", payload: {...} }
 * COMMENT: { agent_id: "S01", type: "comment", tick: 5, target_content_id: "POST:01:post", payload: {...} }
 * SILENCE: { agent_id: "S01", type: "silence", tick: 5, payload: { reason: "low_engagement" } }
 */
export function validateActionRequest(request) {
  const { agent_id, type, tick, target_content_id, target_type } = request;

  // Required fields
  if (!agent_id) throw new Error("action_request.agent_id is required");
  if (!type) throw new Error("action_request.type is required");
  if (typeof tick !== "number") throw new Error("action_request.tick must be a number");

  // Conditional: some actions require target content
  const actionRequiresTarget = ["lurk", "react", "comment", "quote"].includes(type);
  if (actionRequiresTarget && !target_content_id) {
    throw new Error(`action_request.target_content_id is required for action type: ${type}`);
  }

  return true;
}

/**
 * STORAGE CONTRACT 2: ACTION EXECUTION RESULT
 *
 * When an action is executed, we record the result.
 *
 * Structure:
 * {
 *   action_id: string (required) - "ACT:S01:5:0:post"
 *   agent_id: string (required)
 *   tick: number (required)
 *   round: number (required)
 *   action_type: enum (required) - same as action request type
 *   visibility: enum (required) - "stored_only" | "public_lightweight" | "public_visible"
 *   target_content_id: string (nullable) - which content was targeted
 *   execution_status: enum (required) - "success" | "degraded" | "blocked" | "invalid" | "failed"
 *   persistence: object - flags for what was written to storage
 *   artifact_refs: object - references to generated artifacts (post_id, comment_id, etc.)
 * }
 *
 * Example:
 * {
 *   action_id: "ACT:S01:5:0:post",
 *   agent_id: "S01",
 *   tick: 5,
 *   round: 1,
 *   action_type: "post",
 *   visibility: "public_visible",
 *   execution_status: "success",
 *   persistence: {
 *     trace_written: true,
 *     event_written: true,
 *     artifact_written: true,
 *     snapshot_written: true
 *   },
 *   artifact_refs: {
 *     artifact_id: "GEN:S01:5:post",
 *     artifact_type: "post"
 *   }
 * }
 */
export function validateActionExecutionResult(result) {
  const { action_id, agent_id, tick, round, action_type, execution_status } = result;

  if (!action_id) throw new Error("action_execution_result.action_id is required");
  if (!agent_id) throw new Error("action_execution_result.agent_id is required");
  if (typeof tick !== "number") throw new Error("action_execution_result.tick must be a number");
  if (typeof round !== "number") throw new Error("action_execution_result.round must be a number");
  if (!action_type) throw new Error("action_execution_result.action_type is required");
  if (!execution_status) throw new Error("action_execution_result.execution_status is required");

  return true;
}

/**
 * STORAGE CONTRACT 3: SNAPSHOT
 *
 * A complete agent state capture at a point in time (round, tick).
 * Used for replay, comparison, and forensic analysis.
 *
 * Structure:
 * {
 *   snapshot_id: string (required) - "SN:S01:1:5"
 *   agent_id: string (required)
 *   round: number (required)
 *   tick: number (required)
 *   timestamp: ISO string (required)
 *   schema_version: string (required) - "1.0", "1.1", etc.
 *   agent_state: object (required) - complete serialized agent state
 *   context: object (required) - metadata about why this snapshot was taken
 *   previous_event_id: string (nullable) - what event led to this snapshot
 * }
 *
 * agent_state includes:
 *   - agent_id, agent_name, handle
 *   - activity_level, engagement_level, belief_strength
 *   - interest_vector (topics → affinity scores)
 *   - relationship_state (relationships with other agents)
 *   - self_narrative (memory log)
 *   - recent_actions (last N actions taken)
 */
export function validateSnapshot(snapshot) {
  const { snapshot_id, agent_id, round, tick, timestamp, schema_version, agent_state } = snapshot;

  if (!snapshot_id) throw new Error("snapshot.snapshot_id is required");
  if (!agent_id) throw new Error("snapshot.agent_id is required");
  if (typeof round !== "number") throw new Error("snapshot.round must be a number");
  if (typeof tick !== "number") throw new Error("snapshot.tick must be a number");
  if (!timestamp) throw new Error("snapshot.timestamp is required");
  if (!schema_version) throw new Error("snapshot.schema_version is required");
  if (!agent_state) throw new Error("snapshot.agent_state is required");

  return true;
}

/**
 * STORAGE CONTRACT 4: EVENT
 *
 * An event represents something that happened to an agent.
 * Events have duration (dwell_ticks) and may consume content.
 *
 * Structure:
 * {
 *   event_id: string (required) - "EV:S01:1:5:action"
 *   agent_id: string (required)
 *   round: number (required)
 *   tick: number (required)
 *   event_type: enum (required) - "action" | "consumption_internal" | "consumption_external"
 *   action_id: string (nullable) - for action events, reference to execution result
 *   content_id: string (nullable) - for consumption events, which content was consumed
 *   content_type: string (nullable) - "post" | "comment" | "reaction"
 *   timestamp: ISO string (required)
 *   dwell_ticks: number (default 1) - how long this event lasted
 *   metadata: object - event-specific metadata
 * }
 *
 * Examples:
 * Action event: { event_id: "EV:S01:1:5:action", event_type: "action", action_id: "ACT:S01:5:0:post" }
 * Consumption event: { event_id: "EV:S01:1:5:consumption_internal", event_type: "consumption_internal", content_id: "POST:S02:post" }
 */
export function validateEvent(event) {
  const { event_id, agent_id, round, tick, event_type, timestamp } = event;

  if (!event_id) throw new Error("event.event_id is required");
  if (!agent_id) throw new Error("event.agent_id is required");
  if (typeof round !== "number") throw new Error("event.round must be a number");
  if (typeof tick !== "number") throw new Error("event.tick must be a number");
  if (!event_type) throw new Error("event.event_type is required");
  if (!timestamp) throw new Error("event.timestamp is required");

  const validEventTypes = ["action", "consumption_internal", "consumption_external"];
  if (!validEventTypes.includes(event_type)) {
    throw new Error(`event.event_type must be one of: ${validEventTypes.join(", ")}`);
  }

  return true;
}

/**
 * STORAGE CONTRACT 5: TRACE
 *
 * A trace links an event to state changes.
 * Traces enable "why did the agent change?" forensic analysis.
 *
 * Structure:
 * {
 *   trace_id: string (required) - "TR:EV:S01:1:5:action:SN:S01:1:6"
 *   event_id: string (required) - which event caused this change
 *   previous_snapshot_id: string (required) - state before
 *   next_snapshot_id: string (required) - state after
 *   state_delta: object (required) - what changed
 *   writeback_ids: array (required) - which memory writebacks contributed
 *   timestamp: ISO string (required)
 *   schema_version: string (required)
 * }
 *
 * state_delta structure:
 * {
 *   belief_strength_delta: number
 *   engagement_delta: number
 *   interest_deltas: { topic → number }
 *   relationship_deltas: { agent_id → relationship_delta }
 *   narrative_additions: array<string>
 *   memory_channels: array<string>
 * }
 */
export function validateTrace(trace) {
  const { trace_id, event_id, previous_snapshot_id, next_snapshot_id, state_delta, timestamp } = trace;

  if (!trace_id) throw new Error("trace.trace_id is required");
  if (!event_id) throw new Error("trace.event_id is required");
  if (!previous_snapshot_id) throw new Error("trace.previous_snapshot_id is required");
  if (!next_snapshot_id) throw new Error("trace.next_snapshot_id is required");
  if (!state_delta) throw new Error("trace.state_delta is required");
  if (!timestamp) throw new Error("trace.timestamp is required");

  return true;
}

/**
 * STORAGE CONTRACT 6: FORUM ARTIFACT
 *
 * A generated post, comment, quote, or reaction created by an agent.
 * This is the actual content that appears in the forum UI.
 *
 * Structure:
 * {
 *   artifact_id: string (required) - "GEN:S01:5:post"
 *   source_action_id: string (required) - which action generated this
 *   type: enum (required) - "post" | "comment" | "quote"
 *   author: object (required) - agent info
 *   title: string (conditional) - for posts
 *   body: string (required) - content text
 *   tone: string (required) - "warm" | "sharp" | "steady" | "guarded"
 *   timestamp: ISO string (required)
 *   visibility: enum (required) - "public_visible" | "stored_only"
 *   relationship_context: object - agent's relationship state with target
 *   target: object (conditional) - for comments/quotes: what was targeted
 *   metadata: object - additional context
 * }
 *
 * Example post:
 * {
 *   artifact_id: "GEN:S01:5:post",
 *   source_action_id: "ACT:S01:5:0:post",
 *   type: "post",
 *   author: { agent_id: "S01", handle: "fashion_maverick" },
 *   title: "Latest Fit Inspo Thread",
 *   body: "Just spotted an amazing collection...",
 *   tone: "warm",
 *   visibility: "public_visible",
 *   timestamp: "2026-03-28T10:00:00Z"
 * }
 *
 * Example comment:
 * {
 *   artifact_id: "GEN:S01:6:comment",
 *   source_action_id: "ACT:S01:6:0:comment",
 *   type: "comment",
 *   author: { agent_id: "S01", handle: "fashion_maverick" },
 *   body: "I totally agree, the draping is incredible...",
 *   tone: "steady",
 *   target: { content_id: "POST:S02:post", content_type: "post" },
 *   visibility: "public_visible",
 *   timestamp: "2026-03-28T10:05:00Z"
 * }
 *
 * Example reaction:
 * {
 *   artifact_id: "GEN:S01:7:react",
 *   source_action_id: "ACT:S01:7:0:react",
 *   type: "reaction",
 *   author: { agent_id: "S01", handle: "fashion_maverick" },
 *   reaction_type: "support" | "curious" | "laugh" | "agree" | "bookmark",
 *   intensity: 0.5,
 *   target: { content_id: "POST:S02:post", content_type: "post" },
 *   visibility: "public_lightweight",
 *   timestamp: "2026-03-28T10:07:00Z"
 * }
 */
export function validateForumArtifact(artifact) {
  const { artifact_id, source_action_id, type, author, body, timestamp, visibility } = artifact;

  if (!artifact_id) throw new Error("forum_artifact.artifact_id is required");
  if (!source_action_id) throw new Error("forum_artifact.source_action_id is required");
  if (!type) throw new Error("forum_artifact.type is required");
  if (!author || !author.agent_id) throw new Error("forum_artifact.author is required and must have agent_id");
  if (!body) throw new Error("forum_artifact.body is required");
  if (!timestamp) throw new Error("forum_artifact.timestamp is required");
  if (!visibility) throw new Error("forum_artifact.visibility is required");

  const validTypes = ["post", "comment", "quote", "reaction"];
  if (!validTypes.includes(type)) {
    throw new Error(`forum_artifact.type must be one of: ${validTypes.join(", ")}`);
  }

  return true;
}

/**
 * ============================================================================
 * READ/WRITE CONTRACTS
 * ============================================================================
 *
 * This section documents the API contracts for reading and writing these artifacts.
 *
 * WRITE OPERATIONS
 * ----------------
 *
 * 1. Record Action Execution
 *    Input: ActionRequest + ActionExecutionResult
 *    Output: Trace + Event + Snapshot (after)
 *    Side effects: Store all three, update agent state
 *    Idempotency: Use action_id as write key
 *
 * 2. Record Content Consumption
 *    Input: ContentRecord + ConsumptionResult
 *    Output: Trace + Event + Snapshot (after)
 *    Side effects: Store all three, update agent state
 *    Idempotency: Use event_id as write key
 *
 * 3. Store Forum Artifact
 *    Input: ForumArtifact (generated from action)
 *    Output: artifact_id confirmation
 *    Side effects: Persist to artifact storage, update forum UI
 *    Idempotency: Use artifact_id as write key
 *
 * READ OPERATIONS
 * ----------------
 *
 * 1. Get Agent Snapshot at (round, tick)
 *    Query: GET /snapshots?agent_id=S01&round=1&tick=5
 *    Returns: Snapshot
 *
 * 2. Get Agent Trajectory (all snapshots + traces)
 *    Query: GET /trajectories?agent_id=S01&round=1
 *    Returns: { snapshots[], traces[], events[] }
 *
 * 3. Get Forum Artifacts (posts + comments for display)
 *    Query: GET /artifacts?type=post&round=1&limit=20
 *    Returns: ForumArtifact[]
 *
 * 4. Get Trace History (forensic analysis)
 *    Query: GET /traces?agent_id=S01&field=engagement&round=1
 *    Returns: Trace[] (filtered by state delta)
 *
 * 5. Get Events by Agent
 *    Query: GET /events?agent_id=S01&event_type=action&round=1
 *    Returns: Event[]
 *
 * STORAGE GUARANTEES
 * -------------------
 *
 * 1. Snapshot + Trace + Event atomicity:
 *    When recording an action execution, all three must be written together.
 *    If any write fails, the entire operation fails.
 *
 * 2. Immutability:
 *    Once written, artifacts are immutable.
 *    Updates require writing a new snapshot + trace, not modifying existing ones.
 *
 * 3. Schema versioning:
 *    All artifacts include schema_version.
 *    Old versions (e.g., "1.0") can coexist with new versions (e.g., "1.1").
 *    Readers must handle version evolution.
 *
 * 4. Ordering:
 *    Snapshots and events are ordered by (round, tick).
 *    Traces are ordered by the event that created them.
 *    This ensures deterministic replay.
 *
 * 5. References:
 *    Snapshots reference the previous event that led to them.
 *    Traces reference both before and after snapshots.
 *    Events reference actions or content.
 *    All cross-references use string IDs, enabling flexible storage backends.
 */

/**
 * UNIFIED STORAGE PATTERN
 *
 * The recommended pattern for recording agent activity:
 *
 * 1. Fetch current snapshot for agent at (round, tick)
 * 2. Execute action (or consume content)
 * 3. Generate new snapshot
 * 4. Compute state delta (compare before/after)
 * 5. Create event + trace
 * 6. Write all artifacts:
 *    - Save trace (references both snapshots)
 *    - Save event (references the action/content)
 *    - Save new snapshot
 *    - If artifact was generated, save it (post/comment/reaction)
 * 7. Return execution result
 *
 * This ensures:
 * - Complete auditability (every state change has a trace)
 * - Replay-ability (snapshots can be reconstructed)
 * - Forensic analysis (traces show causality)
 */

export const STORAGE_CONTRACTS = {
  ACTION_REQUEST: "See validateActionRequest()",
  ACTION_EXECUTION_RESULT: "See validateActionExecutionResult()",
  SNAPSHOT: "See validateSnapshot()",
  EVENT: "See validateEvent()",
  TRACE: "See validateTrace()",
  FORUM_ARTIFACT: "See validateForumArtifact()",
};
