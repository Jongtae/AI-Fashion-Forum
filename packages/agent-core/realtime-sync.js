/**
 * Real-time Synchronization Module
 * 
 * Provides WebSocket-based event streaming for agent state changes,
 * memory writeback, and post generation events.
 * 
 * This is a skeleton implementation demonstrating the interface contract.
 * Full WebSocket server implementation in sim-server/src/realtime.js
 */

export const REALTIME_EVENTS = Object.freeze({
  AGENT_STATE_UPDATED: "agent:state_updated",
  MEMORY_WRITTEN: "agent:memory_written",
  POST_GENERATED: "agent:post_generated",
  EXPOSURE_RECORDED: "agent:exposure_recorded",
  CONSISTENCY_METRIC: "agent:consistency_metric",
});

/**
 * Real-time event descriptor
 * 
 * @typedef {Object} RealtimeEvent
 * @property {string} event - Event type from REALTIME_EVENTS
 * @property {string} agentId - Agent ID (or "broadcast" for system events)
 * @property {number} tick - Current simulation tick
 * @property {Object} payload - Event-specific data
 * @property {string} timestamp - ISO timestamp
 */

/**
 * Stream agent state updates to connected clients
 * 
 * @param {string} agentId
 * @param {Object} newState - Updated agent state
 * @param {Object} previousState - Prior state for delta calculation
 * @returns {RealtimeEvent}
 */
export function createStateUpdateEvent(agentId, newState, previousState = {}) {
  // Calculate state delta for minimal bandwidth
  const delta = {};
  const keys = new Set([
    ...Object.keys(newState || {}),
    ...Object.keys(previousState || {}),
  ]);

  for (const key of keys) {
    if (JSON.stringify(newState[key]) !== JSON.stringify(previousState[key])) {
      delta[key] = newState[key];
    }
  }

  return {
    event: REALTIME_EVENTS.AGENT_STATE_UPDATED,
    agentId,
    tick: newState.current_tick ?? null,
    payload: {
      delta,
      state: newState,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Stream memory writeback events
 * 
 * @param {string} agentId
 * @param {Object} memoryRecord - New memory entry
 * @returns {RealtimeEvent}
 */
export function createMemoryWriteEvent(agentId, memoryRecord = {}) {
  return {
    event: REALTIME_EVENTS.MEMORY_WRITTEN,
    agentId,
    tick: memoryRecord.tick ?? null,
    payload: {
      memoryType: memoryRecord.type ?? "episodic",
      entry: memoryRecord,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Stream generated post events
 * 
 * @param {string} agentId
 * @param {Object} post - Generated post object
 * @returns {RealtimeEvent}
 */
export function createPostGeneratedEvent(agentId, post = {}) {
  return {
    event: REALTIME_EVENTS.POST_GENERATED,
    agentId,
    tick: post.generated_tick ?? null,
    payload: {
      postId: post.id ?? null,
      content: post.content ?? "",
      meaningFrame: post.meaning_frame ?? null,
      stanceSignal: post.stance_signal ?? null,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Stream exposure and reaction events
 * 
 * @param {string} agentId
 * @param {Object} exposure - Exposure record with reaction
 * @returns {RealtimeEvent}
 */
export function createExposureEvent(agentId, exposure = {}) {
  return {
    event: REALTIME_EVENTS.EXPOSURE_RECORDED,
    agentId,
    tick: exposure.tick ?? null,
    payload: {
      contentId: exposure.content_id ?? null,
      reaction: exposure.reaction ?? null,
      meaningFrame: exposure.meaning_frame ?? null,
      confidenceScore: exposure.confidence_score ?? null,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sync consistency metric snapshots
 * 
 * @param {string} agentId
 * @param {number} consistencyScore
 * @param {number} tick
 * @returns {RealtimeEvent}
 */
export function createConsistencyMetricEvent(agentId, consistencyScore = 0, tick = 0) {
  return {
    event: REALTIME_EVENTS.CONSISTENCY_METRIC,
    agentId,
    tick,
    payload: {
      score: Number(consistencyScore.toFixed(4)),
      signalTime: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * WebSocket client subscription interface
 * (To be implemented in sim-server/src/realtime.js)
 * 
 * @example
 * const ws = new WebSocket('ws://localhost:4318/realtime');
 * 
 * ws.addEventListener('message', (event) => {
 *   const realtimeEvent = JSON.parse(event.data);
 *   console.log(realtimeEvent.event, realtimeEvent.payload);
 * });
 * 
 * // Subscribe to specific agent
 * ws.send(JSON.stringify({
 *   action: 'subscribe',
 *   agentId: 'A01'
 * }));
 */
