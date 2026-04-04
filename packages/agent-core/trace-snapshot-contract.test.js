import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

      assert.strictEqual(snapshot.snapshot_id, "SN:A01:1:0");
      assert.strictEqual(snapshot.agent_id, "A01");
      assert.strictEqual(snapshot.round, 1);
      assert.strictEqual(snapshot.tick, 0);
      assert.strictEqual(snapshot.schema_version, "1.0");
      assert.notStrictEqual(snapshot.timestamp, undefined);
      assert.notStrictEqual(snapshot.agent_state, undefined);
    });

    it("should include context in snapshot", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };

      const snapshot = createSnapshot({
        agent,
        round: 1,
        tick: 0,
        context: { trigger: "action_execution", custom_field: "value" },
      });

      assert.strictEqual(snapshot.context.trigger, "action_execution");
      assert.strictEqual(snapshot.context.custom_field, "value");
    });

    it("should track previous_event_id for causal chain", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };

      const snapshot = createSnapshot({
        agent,
        round: 1,
        tick: 1,
        context: { previous_event_id: "EV:A01:1:0:action" },
      });

      assert.strictEqual(snapshot.previous_event_id, "EV:A01:1:0:action");
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

      assert.strictEqual(event.event_id, "EV:A01:1:0:action");
      assert.strictEqual(event.agent_id, "A01");
      assert.strictEqual(event.event_type, "action");
      assert.strictEqual(event.action_id, "ACT:A01:1:0:comment");
      assert.notStrictEqual(event.timestamp, undefined);
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

      assert.strictEqual(event.event_type, "consumption_internal");
      assert.strictEqual(event.content_id, "C001");
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

      assert.strictEqual(event.event_type, "consumption_external");
      assert.strictEqual(event.metadata.source, "external.com");
    });

    it("should include dwell_ticks in metadata", () => {
      const event = createEvent({
        agentId: "A01",
        round: 1,
        tick: 0,
        eventType: "consumption_internal",
        metadata: { dwell_ticks: 3 },
      });

      assert.strictEqual(event.dwell_ticks, 3);
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

      assert.ok(trace.trace_id.includes("EV:A01:1:0:action"));
      assert.strictEqual(trace.previous_snapshot_id, "SN:A01:1:0");
      assert.strictEqual(trace.next_snapshot_id, "SN:A01:1:1");
      assert.strictEqual(trace.state_delta.belief_strength_delta, 0.02);
      assert.strictEqual(trace.state_delta.engagement_delta, 0.01);
    });

    it("should include writeback_ids for causal chain", () => {
      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: "SN:A01:1:0",
        nextSnapshotId: "SN:A01:1:1",
        writebackIds: ["WB:A01:1:0:comment"],
      });

      assert.ok(trace.writeback_ids.includes("WB:A01:1:0:comment"));
    });

    it("should include schema version for evolution tracking", () => {
      const trace = createTrace({
        eventId: "EV:A01:1:0:action",
        previousSnapshotId: "SN:A01:1:0",
        nextSnapshotId: "SN:A01:1:1",
      });

      assert.strictEqual(trace.schema_version, "1.0");
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

      assert.strictEqual(record.snapshot_before.snapshot_id, "SN:A01:1:0");
      assert.strictEqual(record.snapshot_after.snapshot_id, "SN:A01:1:0");
      assert.strictEqual(record.event.event_type, "action");
      assert.strictEqual(record.trace.previous_snapshot_id, record.snapshot_before.snapshot_id);
      assert.strictEqual(record.trace.next_snapshot_id, record.snapshot_after.snapshot_id);
      assert.strictEqual(record.writeback.writeback_id, "WB:A01:1:0:comment");
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

      assert.strictEqual(record.event.event_type, "consumption_internal");
      assert.strictEqual(record.event.metadata.consumption_type, "internal");
      assert.strictEqual(record.trace.state_delta.belief_strength_delta, 0.02);
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

      assert.strictEqual(record.event.event_type, "consumption_external");
      assert.strictEqual(record.event.metadata.consumption_type, "external");
    });
  });

  describe("TraceReplayEngine", () => {
    it("should initialize with snapshot", () => {
      const agent = { agent_id: "A01", belief_strength: 0.6 };
      const snapshot = createSnapshot({ agent, round: 1, tick: 0 });

      const engine = new TraceReplayEngine(snapshot);

      assert.strictEqual(engine.currentSnapshot.snapshot_id, snapshot.snapshot_id);
      assert.strictEqual(engine.traceHistory.length, 0);
      assert.strictEqual(engine.eventHistory.length, 0);
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

      assert.strictEqual(result.success, true);
      assert.strictEqual(engine.currentSnapshot.snapshot_id, snap2.snapshot_id);
      assert.strictEqual(engine.traceHistory.length, 1);
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

      assert.throws(() => engine.applyTrace(trace, snap3));
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

      assert.strictEqual(engine.eventHistory.length, 1);
      assert.strictEqual(engine.eventHistory[0].event_id, event.event_id);
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

      assert.strictEqual(beliefTraces.length, 1);
      assert.strictEqual(engagementTraces.length, 1);
    });

    it("should compare two snapshots and generate diff", () => {
      const agent1 = { agent_id: "A01", belief_strength: 0.6, engagement_level: 0.5 };
      const snap1 = createSnapshot({ agent: agent1, round: 1, tick: 0 });

      const agent2 = { ...agent1, belief_strength: 0.64, engagement_level: 0.52 };
      const snap2 = createSnapshot({ agent: agent2, round: 1, tick: 2 });

      const engine = new TraceReplayEngine(snap1);
      const diff = engine.compareTwoSnapshots(snap1, snap2);

      assert.ok(Math.abs(diff.belief_delta - 0.04) < 1e-10, `expected belief_delta ≈ 0.04, got ${diff.belief_delta}`);
      assert.ok(Math.abs(diff.engagement_delta - 0.02) < 1e-10, `expected engagement_delta ≈ 0.02, got ${diff.engagement_delta}`);
      assert.strictEqual(diff.before_round, 1);
      assert.strictEqual(diff.after_round, 1);
      assert.strictEqual(diff.before_tick, 0);
      assert.strictEqual(diff.after_tick, 2);
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

      assert.strictEqual(trajectory.trace_count, 1);
      assert.strictEqual(trajectory.event_count, 1);
      assert.strictEqual(trajectory.current_snapshot.snapshot_id, snap2.snapshot_id);
    });
  });

  describe("full storage scenario", () => {
    it("should execute complete lifecycle with replay", () => {
      const scenario = createStorageScenario();

      assert.strictEqual(scenario.snapshots.length, 3);
      assert.strictEqual(scenario.events.length, 2);
      assert.strictEqual(scenario.traces.length, 2);
      assert.strictEqual(scenario.writebacks.length, 2);
    });

    it("should maintain causal chain through replay", () => {
      const scenario = createStorageScenario();

      // Verify trace connectivity
      assert.strictEqual(scenario.traces[0].previous_snapshot_id, scenario.snapshots[0].snapshot_id);
      assert.strictEqual(scenario.traces[0].next_snapshot_id, scenario.snapshots[1].snapshot_id);
      assert.strictEqual(scenario.traces[1].previous_snapshot_id, scenario.snapshots[1].snapshot_id);
      assert.strictEqual(scenario.traces[1].next_snapshot_id, scenario.snapshots[2].snapshot_id);
    });

    it("should accumulate state changes through trajectory", () => {
      const scenario = createStorageScenario();
      const trajectory = scenario.engine.getTrajectory();

      const snap0 = scenario.snapshots[0].agent_state;
      const snap2 = scenario.snapshots[2].agent_state;

      assert.ok(snap2.engagement_level > snap0.engagement_level, `expected ${snap2.engagement_level} > ${snap0.engagement_level}`);
      assert.ok(snap2.belief_strength > snap0.belief_strength, `expected ${snap2.belief_strength} > ${snap0.belief_strength}`);
      assert.strictEqual(trajectory.trace_count, 2);
    });

    it("should be able to query what changed the agent", () => {
      const scenario = createStorageScenario();

      const beliefChanges = scenario.engine.findTracesModifyingField("belief");
      const engagementChanges = scenario.engine.findTracesModifyingField("engagement");

      assert.ok(beliefChanges.length > 0, `expected ${beliefChanges.length} > 0`);
      assert.ok(engagementChanges.length > 0, `expected ${engagementChanges.length} > 0`);
    });
  });
});
