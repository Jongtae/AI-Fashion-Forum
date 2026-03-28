import { describe, it, expect } from "vitest";
import {
  createSnapshot,
  createEvent,
  createTrace,
  recordActionExecution,
  recordContentConsumption,
  TraceReplayEngine,
  createStorageScenario,
} from "./trace-snapshot-contract.js";

describe("trace-snapshot-contract", () => {
  describe("createSnapshot", () => {
    it("should create snapshot with correct structure", () => {
      const agent = {
        agent_id: "A01",
        belief_strength: 0.6,
        engagement_level: 0.5,
      };

      const snapshot = createSnapshot({
        agent,
        round: 1,
        tick: 0,
      });

      expect(snapshot.snapshot_id).toBe("SN:A01:1:0");
      expect(snapshot.agent_id).toBe("A01");
      expect(snapshot.round).toBe(1);
      expect(snapshot.tick).toBe(0);
      expect(snapshot.schema_version).toBe("1.0");
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.agent_state).toBeDefined();
    });

    it("should include context in snapshot", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };

      const snapshot = createSnapshot({
        agent,
        round: 1,
        tick: 0,
        context: { trigger: "action_execution", custom_field: "value" },
      });

      expect(snapshot.context.trigger).toBe("action_execution");
      expect(snapshot.context.custom_field).toBe("value");
    });

    it("should track previous_event_id for causal chain", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };

      const snapshot = createSnapshot({
        agent,
        round: 1,
        tick: 1,
        context: { previous_event_id: "EV:A01:1:0:action" },
      });

      expect(snapshot.previous_event_id).toBe("EV:A01:1:0:action");
    });
  });

  describe("createEvent", () => {
    it("should create event with correct structure", () => {
      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 0,
        eventType: "action",
        action_id: "ACT:A01:1:0:comment",
      });

      expect(event.event_id).toBe("EV:A01:1:0:action");
      expect(event.agent_id).toBe("A01");
      expect(event.event_type).toBe("action");
      expect(event.action_id).toBe("ACT:A01:1:0:comment");
      expect(event.timestamp).toBeDefined();
    });

    it("should support consumption_internal event type", () => {
      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 1,
        eventType: "consumption_internal",
        contentId: "C001",
        contentType: "post",
      });

      expect(event.event_type).toBe("consumption_internal");
      expect(event.content_id).toBe("C001");
    });

    it("should support consumption_external event type", () => {
      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 2,
        eventType: "consumption_external",
        contentId: "C002",
        metadata: { source: "external.com" },
      });

      expect(event.event_type).toBe("consumption_external");
      expect(event.metadata.source).toBe("external.com");
    });

    it("should include dwell_ticks in metadata", () => {
      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 0,
        eventType: "consumption_internal",
        metadata: { dwell_ticks: 3 },
      });

      expect(event.dwell_ticks).toBe(3);
    });
  });

  describe("createTrace", () => {
    it("should create trace linking event to snapshots", () => {
      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: "SN:A01:1:0",
        nextSnapshotId: "SN:A01:1:1",
        stateDelta: {
          belief_delta: 0.02,
          engagement_delta: 0.01,
        },
      });

      expect(trace.trace_id).toContain("EV:A01:1:0:action");
      expect(trace.previous_snapshot_id).toBe("SN:A01:1:0");
      expect(trace.next_snapshot_id).toBe("SN:A01:1:1");
      expect(trace.state_delta.belief_strength_delta).toBe(0.02);
      expect(trace.state_delta.engagement_delta).toBe(0.01);
    });

    it("should include writeback_ids for causal chain", () => {
      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: "SN:A01:1:0",
        nextSnapshotId: "SN:A01:1:1",
        writebackIds: ["WB:A01:1:0:comment"],
      });

      expect(trace.writeback_ids).toContain("WB:A01:1:0:comment");
    });

    it("should include schema version for evolution tracking", () => {
      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: "SN:A01:1:0",
        nextSnapshotId: "SN:A01:1:1",
      });

      expect(trace.schema_version).toBe("1.0");
    });
  });

  describe("recordActionExecution", () => {
    it("should record full action execution with snapshots, event, trace", () => {
      const baseAgent = { agent_id: "A01", belief_strength: 0.6, engagement_level: 0.5 };
      const snapshotBefore = createSnapshot({
        agent: baseAgent,
        round: 1,
        tick: 0,
      });

      const actionAgent = { ...baseAgent, engagement_level: 0.52 };
      const stateDeltaResult = {
        agent: actionAgent,
        deltaLog: { engagement_delta: 0.02 },
        writebackRecord: { writeback_id: "WB:A01:1:0:comment" },
      };

      const record = recordActionExecution({
        actionRequest: { agent_id: "A01", type: "comment", target_content_id: "C001" },
        actionResponse: { action_id: "ACT:A01:1:0:comment", status: "success" },
        snapshotBefore,
        stateDeltaResult,
        tick: 0,
        round: 1,
      });

      expect(record.snapshot_before.snapshot_id).toBe("SN:A01:1:0");
      expect(record.snapshot_after.snapshot_id).toBe("SN:A01:1:0");
      expect(record.event.event_type).toBe("action");
      expect(record.trace.previous_snapshot_id).toBe(record.snapshot_before.snapshot_id);
      expect(record.trace.next_snapshot_id).toBe(record.snapshot_after.snapshot_id);
      expect(record.writeback.writeback_id).toBe("WB:A01:1:0:comment");
    });
  });

  describe("recordContentConsumption", () => {
    it("should record internal content consumption", () => {
      const baseAgent = { agent_id: "A01", belief_strength: 0.6, engagement_level: 0.5 };
      const snapshotBefore = createSnapshot({
        agent: baseAgent,
        round: 1,
        tick: 0,
      });

      const contentAgent = { ...baseAgent, belief_strength: 0.62 };
      const consumptionResult = {
        agent: contentAgent,
        deltaLog: { belief_delta: 0.02 },
        writebackRecord: { writeback_id: "WB:A01:1:0:internal_content" },
      };

      const record = recordContentConsumption({
        contentRecord: { content_id: "C001", topics: ["fit"] },
        consumptionType: "internal",
        snapshotBefore,
        consumptionResult,
        tick: 0,
        round: 1,
      });

      expect(record.event.event_type).toBe("consumption_internal");
      expect(record.event.metadata.consumption_type).toBe("internal");
      expect(record.trace.state_delta.belief_strength_delta).toBe(0.02);
    });

    it("should record external content consumption", () => {
      const baseAgent = { agent_id: "A01", belief_strength: 0.6, perspective_breadth: 0.2 };
      const snapshotBefore = createSnapshot({
        agent: baseAgent,
        round: 1,
        tick: 0,
      });

      const contentAgent = { ...baseAgent, perspective_breadth: 0.25 };
      const consumptionResult = {
        agent: contentAgent,
        deltaLog: {},
        writebackRecord: { writeback_id: "WB:A01:1:0:external_content" },
      };

      const record = recordContentConsumption({
        contentRecord: { content_id: "C002", topics: ["pricing"], source: "vogue.com" },
        consumptionType: "external",
        snapshotBefore,
        consumptionResult,
        tick: 0,
        round: 1,
      });

      expect(record.event.event_type).toBe("consumption_external");
      expect(record.event.metadata.consumption_type).toBe("external");
    });
  });

  describe("TraceReplayEngine", () => {
    it("should initialize with snapshot", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };
      const snapshot = createSnapshot({ agent, round: 1, tick: 0 });

      const engine = new TraceReplayEngine(snapshot);

      expect(engine.currentSnapshot.snapshot_id).toBe(snapshot.snapshot_id);
      expect(engine.traceHistory.length).toBe(0);
      expect(engine.eventHistory.length).toBe(0);
    });

    it("should apply traces and update current snapshot", () => {
      const agent1 = { agent_id: "A01", belief_strength: 0.6 };
      const snap1 = createSnapshot({ agent: agent1, round: 1, tick: 0 });

      const agent2 = { ...agent1, belief_strength: 0.62 };
      const snap2 = createSnapshot({ agent: agent2, round: 1, tick: 1 });

      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: snap1.snapshot_id,
        nextSnapshotId: snap2.snapshot_id,
      });

      const engine = new TraceReplayEngine(snap1);
      const result = engine.applyTrace(trace, snap2);

      expect(result.success).toBe(true);
      expect(engine.currentSnapshot.snapshot_id).toBe(snap2.snapshot_id);
      expect(engine.traceHistory.length).toBe(1);
    });

    it("should validate trace causality", () => {
      const agent1 = { agent_id: "A01", belief_strength: 0.6 };
      const snap1 = createSnapshot({ agent: agent1, round: 1, tick: 0 });

      const agent2 = { ...agent1, belief_strength: 0.62 };
      const snap2 = createSnapshot({ agent: agent2, round: 1, tick: 1 });

      const agent3 = { ...agent2, belief_strength: 0.64 };
      const snap3 = createSnapshot({ agent: agent3, round: 1, tick: 2 });

      const trace = createTrace({
        eventId: "EV:A01:1:1:action",
        previousSnapshotId: snap2.snapshot_id, // Expects snap2, but engine has snap1
        nextSnapshotId: snap3.snapshot_id,
      });

      const engine = new TraceReplayEngine(snap1);

      expect(() => engine.applyTrace(trace, snap3)).toThrow();
    });

    it("should record events", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };
      const snapshot = createSnapshot({ agent, round: 1, tick: 0 });

      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 0,
        eventType: "action",
      });

      const engine = new TraceReplayEngine(snapshot);
      engine.recordEvent(event);

      expect(engine.eventHistory.length).toBe(1);
      expect(engine.eventHistory[0].event_id).toBe(event.event_id);
    });

    it("should find traces modifying specific fields", () => {
      const agent1 = { agent_id: "A01", belief_strength: 0.6, engagement_level: 0.5 };
      const snap1 = createSnapshot({ agent: agent1, round: 1, tick: 0 });

      const agent2 = { ...agent1, belief_strength: 0.62 };
      const snap2 = createSnapshot({ agent: agent2, round: 1, tick: 1 });

      const agent3 = { ...agent2, engagement_level: 0.52 };
      const snap3 = createSnapshot({ agent: agent3, round: 1, tick: 2 });

      const trace1 = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: snap1.snapshot_id,
        nextSnapshotId: snap2.snapshot_id,
        stateDelta: { belief_delta: 0.02 },
      });

      const trace2 = createTrace({
        eventId: "EV:A01:1:1:action",
        previousSnapshotId: snap2.snapshot_id,
        nextSnapshotId: snap3.snapshot_id,
        stateDelta: { engagement_delta: 0.02 },
      });

      const engine = new TraceReplayEngine(snap1);
      engine.applyTrace(trace1, snap2);
      engine.applyTrace(trace2, snap3);

      const beliefTraces = engine.findTracesModifyingField("belief");
      const engagementTraces = engine.findTracesModifyingField("engagement");

      expect(beliefTraces.length).toBe(1);
      expect(engagementTraces.length).toBe(1);
    });

    it("should compare two snapshots and generate diff", () => {
      const agent1 = { agent_id: "A01", belief_strength: 0.6, engagement_level: 0.5 };
      const snap1 = createSnapshot({ agent: agent1, round: 1, tick: 0 });

      const agent2 = { ...agent1, belief_strength: 0.64, engagement_level: 0.52 };
      const snap2 = createSnapshot({ agent: agent2, round: 1, tick: 2 });

      const engine = new TraceReplayEngine(snap1);
      const diff = engine.compareTwoSnapshots(snap1, snap2);

      expect(diff.belief_delta).toBe(0.04);
      expect(diff.engagement_delta).toBe(0.02);
      expect(diff.before_round).toBe(1);
      expect(diff.after_round).toBe(1);
      expect(diff.before_tick).toBe(0);
      expect(diff.after_tick).toBe(2);
    });

    it("should provide full trajectory", () => {
      const agent1 = { agent_id: "A01", belief_strength: 0.6 };
      const snap1 = createSnapshot({ agent: agent1, round: 1, tick: 0 });

      const agent2 = { ...agent1, belief_strength: 0.62 };
      const snap2 = createSnapshot({ agent: agent2, round: 1, tick: 1 });

      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: snap1.snapshot_id,
        nextSnapshotId: snap2.snapshot_id,
      });

      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 0,
        eventType: "action",
      });

      const engine = new TraceReplayEngine(snap1);
      engine.applyTrace(trace, snap2);
      engine.recordEvent(event);

      const trajectory = engine.getTrajectory();

      expect(trajectory.trace_count).toBe(1);
      expect(trajectory.event_count).toBe(1);
      expect(trajectory.current_snapshot.snapshot_id).toBe(snap2.snapshot_id);
    });
  });

  describe("full storage scenario", () => {
    it("should execute complete lifecycle with replay", () => {
      const scenario = createStorageScenario();

      expect(scenario.snapshots.length).toBe(3);
      expect(scenario.events.length).toBe(2);
      expect(scenario.traces.length).toBe(2);
      expect(scenario.writebacks.length).toBe(2);
    });

    it("should maintain causal chain through replay", () => {
      const scenario = createStorageScenario();

      // Verify trace connectivity
      expect(scenario.traces[0].previous_snapshot_id).toBe(scenario.snapshots[0].snapshot_id);
      expect(scenario.traces[0].next_snapshot_id).toBe(scenario.snapshots[1].snapshot_id);
      expect(scenario.traces[1].previous_snapshot_id).toBe(scenario.snapshots[1].snapshot_id);
      expect(scenario.traces[1].next_snapshot_id).toBe(scenario.snapshots[2].snapshot_id);
    });

    it("should accumulate state changes through trajectory", () => {
      const scenario = createStorageScenario();
      const trajectory = scenario.engine.getTrajectory();

      const snap0 = scenario.snapshots[0].agent_state;
      const snap2 = scenario.snapshots[2].agent_state;

      expect(snap2.engagement_level).toBeGreaterThan(snap0.engagement_level);
      expect(snap2.belief_strength).toBeGreaterThan(snap0.belief_strength);
      expect(trajectory.trace_count).toBe(2);
    });

    it("should be able to query what changed the agent", () => {
      const scenario = createStorageScenario();

      const beliefChanges = scenario.engine.findTracesModifyingField("belief");
      const engagementChanges = scenario.engine.findTracesModifyingField("engagement");

      expect(beliefChanges.length).toBeGreaterThan(0);
      expect(engagementChanges.length).toBeGreaterThan(0);
    });
  });
});
