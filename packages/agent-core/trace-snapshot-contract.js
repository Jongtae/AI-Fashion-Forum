/**
 * trace-snapshot-contract.js
 *
 * Defines storage contracts for action tracing, snapshots, and events.
 * Enables replay, comparison, and forensic analysis of agent state changes.
 *
 * Core concepts:
 * - Snapshot: Agent state at a point in time (round, tick)
 * - Event: Something that happened (action execution, content consumption)
 * - Trace: Causal link from event to state change
 * - Replay: Reconstruct agent trajectory from stored artifacts
 */

import { serializeSnapshot } from "@ai-fashion-forum/shared-types";

/**
 * Snapshot Contract
 *
 * A snapshot is a complete agent state capture at (round, tick).
 * Version/timestamp rules ensure deterministic replay.
 */
export function createSnapshot({
  agent,
  round = 0,
  tick = 0,
  context = {},
} = {}) {
  return {
    // Identity
    snapshot_id: `SN:${agent.agent_id}:${round}:${tick}`,
    agent_id: agent.agent_id,
    round,
    tick,

    // Timestamp in UTC, deterministic for replay
    timestamp: new Date().toISOString(),

    // Version: schema evolution tracking
    // Format: MAJOR.MINOR (e.g., "1.0", "1.1")
    // Increment MAJOR on breaking changes, MINOR on additions
    schema_version: "1.0",

    // Full agent state at this point
    agent_state: serializeSnapshot(agent),

    // Context tags for categorization
    context: {
      trigger: context.trigger || "tick_loop",  // tick_loop, external, manual, replay
      phase: context.phase || "post_consumption", // pre_action, post_action, post_consumption
      ...context,
    },

    // Reference: which event led to this snapshot?
    previous_event_id: context.previous_event_id || null,
  };
}

/**
 * Event Contract
 *
 * An event represents something that happened to the agent.
 * Events have duration (dwell_ticks) and consume content.
 */
export function createEvent({
  agentId,
  round = 0,
  tick = 0,
  eventType = "action",
  action_id = null,
  contentId = null,
  contentType = null,
  metadata = {},
} = {}) {
  return {
    // Identity
    event_id: `EV:${agentId}:${round}:${tick}:${eventType}`,
    agent_id: agentId,
    round,
    tick,

    // Event classification
    event_type: eventType, // "action", "consumption_internal", "consumption_external"
    action_id, // Reference to executed action record
    content_id: contentId,
    content_type: contentType,

    // Timestamp
    timestamp: new Date().toISOString(),

    // How long did this event last?
    dwell_ticks: metadata.dwell_ticks || 1,

    // Event-specific metadata
    metadata: {
      execution_status: metadata.execution_status || "success",
      ...metadata,
    },
  };
}

/**
 * Trace Contract
 *
 * A trace links an event to state changes.
 * Traces enable "why did the agent change?" questions.
 */
export function createTrace({
  eventId,
  previousSnapshotId,
  nextSnapshotId,
  stateDelta = {},
  writebackIds = [],
} = {}) {
  return {
    // Identity
    trace_id: `TR:${eventId}:${nextSnapshotId}`,
    event_id: eventId,

    // Snapshot references: before → after
    previous_snapshot_id: previousSnapshotId,
    next_snapshot_id: nextSnapshotId,

    // What changed?
    state_delta: {
      belief_strength_delta: stateDelta.belief_delta || 0,
      engagement_delta: stateDelta.engagement_delta || 0,
      interest_deltas: stateDelta.interest_deltas || {},
      relationship_deltas: stateDelta.relationship_deltas || {},
      narrative_additions: stateDelta.narrative_additions || [],
      memory_channels: stateDelta.memory_channels || [],
    },

    // Causal chain: which writebacks produced this delta?
    writeback_ids: writebackIds,

    // Timestamp for audit trail
    timestamp: new Date().toISOString(),

    // Schema version for evolution
    schema_version: "1.0",
  };
}

/**
 * Action Snapshot Pair
 *
 * Standard pattern: (request, response, snapshot_before, snapshot_after, event, trace)
 */
export function recordActionExecution({
  actionRequest,
  actionResponse,
  snapshotBefore,
  stateDeltaResult,
  tick = 0,
  round = 0,
} = {}) {
  const snapshotAfter = createSnapshot({
    agent: stateDeltaResult.agent,
    round,
    tick,
    context: {
      trigger: "action_execution",
      phase: "post_action",
      previous_event_id: null,
    },
  });

  const event = createEvent({
    agentId: actionRequest.agent_id,
    round,
    tick,
    eventType: "action",
    action_id: actionResponse.action_id,
    contentId: actionRequest.target_content_id,
    contentType: actionRequest.target_type,
    metadata: {
      execution_status: actionResponse.status || "success",
      action_type: actionRequest.type,
    },
  });

  const trace = createTrace({
    eventId: event.event_id,
    previousSnapshotId: snapshotBefore.snapshot_id,
    nextSnapshotId: snapshotAfter.snapshot_id,
    stateDelta: stateDeltaResult.deltaLog || {},
    writebackIds: stateDeltaResult.writebackRecord
      ? [stateDeltaResult.writebackRecord.writeback_id]
      : [],
  });

  return {
    request: actionRequest,
    response: actionResponse,
    snapshot_before: snapshotBefore,
    snapshot_after: snapshotAfter,
    event,
    trace,
    writeback: stateDeltaResult.writebackRecord,
  };
}

/**
 * Content Consumption Snapshot Pair
 *
 * Pattern: (consumption_request, snapshot_before, snapshot_after, event, trace)
 */
export function recordContentConsumption({
  contentRecord,
  consumptionType = "internal",
  snapshotBefore,
  consumptionResult,
  tick = 0,
  round = 0,
} = {}) {
  const eventType = consumptionType === "internal" ? "consumption_internal" : "consumption_external";

  const snapshotAfter = createSnapshot({
    agent: consumptionResult.agent,
    round,
    tick,
    context: {
      trigger: "content_consumption",
      phase: "post_consumption",
      consumption_type: consumptionType,
      previous_event_id: null,
    },
  });

  const event = createEvent({
    agentId: snapshotBefore.agent_id,
    round,
    tick,
    eventType,
    contentId: contentRecord.content_id,
    contentType: "post",
    metadata: {
      consumption_type: consumptionType,
      topics: contentRecord.topics || [],
      dwell_ticks: contentRecord.dwell_ticks || 1,
    },
  });

  const trace = createTrace({
    eventId: event.event_id,
    previousSnapshotId: snapshotBefore.snapshot_id,
    nextSnapshotId: snapshotAfter.snapshot_id,
    stateDelta: consumptionResult.deltaLog || {},
    writebackIds: consumptionResult.writebackRecord
      ? [consumptionResult.writebackRecord.writeback_id]
      : [],
  });

  return {
    content: contentRecord,
    snapshot_before: snapshotBefore,
    snapshot_after: snapshotAfter,
    event,
    trace,
    writeback: consumptionResult.writebackRecord,
  };
}

/**
 * Replay Engine
 *
 * Reconstructs agent state from trace/event history
 */
export class TraceReplayEngine {
  constructor(initialSnapshot) {
    this.currentSnapshot = initialSnapshot;
    this.traceHistory = [];
    this.eventHistory = [];
  }

  applyTrace(trace, snapshot) {
    // Validate: does the trace's previous_snapshot match current?
    if (trace.previous_snapshot_id !== this.currentSnapshot.snapshot_id) {
      throw new Error(
        `Trace validation failed: expected ${this.currentSnapshot.snapshot_id}, got ${trace.previous_snapshot_id}`
      );
    }

    // Update current snapshot
    this.currentSnapshot = snapshot;
    this.traceHistory.push(trace);
    return {
      success: true,
      snapshot: snapshot,
    };
  }

  recordEvent(event) {
    this.eventHistory.push(event);
    return {
      success: true,
      event_id: event.event_id,
    };
  }

  getTrajectory() {
    return {
      initial_snapshot: this.traceHistory[0]?.previous_snapshot_id || this.currentSnapshot.snapshot_id,
      current_snapshot: this.currentSnapshot,
      trace_count: this.traceHistory.length,
      event_count: this.eventHistory.length,
      traces: this.traceHistory,
      events: this.eventHistory,
    };
  }

  /**
   * Find all traces that modified a specific field
   */
  findTracesModifyingField(fieldName) {
    return this.traceHistory.filter((trace) => {
      const delta = trace.state_delta;
      return (
        (fieldName === "belief" && delta.belief_strength_delta !== 0) ||
        (fieldName === "engagement" && delta.engagement_delta !== 0) ||
        (fieldName === "interest" && Object.keys(delta.interest_deltas || {}).length > 0) ||
        (fieldName === "relationship" && Object.keys(delta.relationship_deltas || {}).length > 0) ||
        (fieldName === "narrative" && delta.narrative_additions?.length > 0)
      );
    });
  }

  /**
   * Compare two snapshots to generate a diff
   */
  compareTwoSnapshots(snap1, snap2) {
    const state1 = snap1.agent_state;
    const state2 = snap2.agent_state;

    return {
      before_round: snap1.round,
      before_tick: snap1.tick,
      after_round: snap2.round,
      after_tick: snap2.tick,
      belief_delta: (state2.belief_strength || 0) - (state1.belief_strength || 0),
      engagement_delta: (state2.engagement_level || 0) - (state1.engagement_level || 0),
      interest_changes: Object.keys(state2.interest_vector || {}).filter(
        (k) => (state2.interest_vector[k] || 0) !== (state1.interest_vector?.[k] || 0)
      ),
      relationship_changes: Object.keys(state2.relationship_state || {}).filter(
        (k) => JSON.stringify(state2.relationship_state[k]) !== JSON.stringify(state1.relationship_state?.[k])
      ),
      narrative_delta: (state2.self_narrative?.length || 0) - (state1.self_narrative?.length || 0),
    };
  }
}

/**
 * Test scenario: Full trace/snapshot/event lifecycle
 */
export function createStorageScenario() {
  // Initial snapshot
  const baseAgent = {
    agent_id: "A01",
    belief_strength: 0.6,
    engagement_level: 0.5,
    interest_vector: { fit: 0.5 },
    relationship_state: {},
    self_narrative: [],
  };

  const snap0 = createSnapshot({
    agent: baseAgent,
    round: 1,
    tick: 0,
    context: { trigger: "initial" },
  });

  // Simulate an action execution
  const actionRequest = {
    agent_id: "A01",
    type: "comment",
    target_content_id: "C001",
    target_type: "post",
  };

  const actionResponse = {
    action_id: "ACT:A01:1:0:comment",
    status: "success",
  };

  // Simulate state delta result
  const agent1 = { ...baseAgent, engagement_level: 0.52, belief_strength: 0.61 };
  const stateDeltaResult = {
    agent: agent1,
    deltaLog: {
      engagement_delta: 0.02,
      belief_delta: 0.01,
    },
    writebackRecord: {
      writeback_id: "WB:A01:1:0:comment",
      memory_channel: "action_comment",
    },
  };

  const executionRecord = recordActionExecution({
    actionRequest,
    actionResponse,
    snapshotBefore: snap0,
    stateDeltaResult,
    tick: 0,
    round: 1,
  });

  // Simulate content consumption
  const contentRecord = {
    content_id: "C002",
    topics: ["fit"],
    likes: 10,
    reply_count: 2,
    direction: 1,
  };

  const agent2 = { ...agent1, engagement_level: 0.53, belief_strength: 0.63 };
  const consumptionResult = {
    agent: agent2,
    deltaLog: {
      engagement_delta: 0.01,
      belief_delta: 0.02,
    },
    writebackRecord: {
      writeback_id: "WB:A01:1:1:internal_content",
      memory_channel: "content_internal",
    },
  };

  const consumptionRecord = recordContentConsumption({
    contentRecord,
    consumptionType: "internal",
    snapshotBefore: executionRecord.snapshot_after,
    consumptionResult,
    tick: 1,
    round: 1,
  });

  // Replay engine
  const engine = new TraceReplayEngine(snap0);
  engine.applyTrace(executionRecord.trace, executionRecord.snapshot_after);
  engine.recordEvent(executionRecord.event);
  engine.applyTrace(consumptionRecord.trace, consumptionRecord.snapshot_after);
  engine.recordEvent(consumptionRecord.event);

  return {
    snapshots: [snap0, executionRecord.snapshot_after, consumptionRecord.snapshot_after],
    events: [executionRecord.event, consumptionRecord.event],
    traces: [executionRecord.trace, consumptionRecord.trace],
    writebacks: [executionRecord.writeback, consumptionRecord.writeback],
    engine,
  };
}
