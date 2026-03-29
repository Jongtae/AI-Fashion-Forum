import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgentEvolutionTimeline } from "./agent-evolution.js";

test("buildAgentEvolutionTimeline tracks per-agent changes over snapshots", () => {
  const timeline = buildAgentEvolutionTimeline({
    snapshots: [
      {
        tick: 0,
        agents: [
          {
            agent_id: "A01",
            handle: "softweekend",
            joined_tick: 0,
            archetype: "quiet_observer",
            self_narrative: ["start"],
            mutable_state: {
              recent_arc: "stable",
              drift_log: ["t0 drift"],
            },
          },
        ],
      },
      {
        tick: 4,
        agents: [
          {
            agent_id: "A01",
            handle: "softweekend",
            joined_tick: 0,
            archetype: "quiet_observer",
            self_narrative: ["start", "next"],
            mutable_state: {
              recent_arc: "collecting_context",
              drift_log: ["t0 drift", "t4 drift"],
              self_narrative_summary: "changed",
            },
          },
          {
            agent_id: "A07",
            handle: "newvoice_A07",
            joined_tick: 4,
            archetype: "community_regular",
            self_narrative: ["new voice"],
            mutable_state: {
              recent_arc: "stable",
              drift_log: ["joined"],
            },
          },
        ],
      },
    ],
  });

  assert.equal(timeline.length, 2);
  const first = timeline.find((item) => item.agentId === "A01");
  const second = timeline.find((item) => item.agentId === "A07");
  assert.equal(first.timeline.length, 2);
  assert.equal(first.latestStep.recentArc, "collecting_context");
  assert.equal(first.latestStep.driftTail[0], "t0 drift");
  assert.equal(second.joinedTick, 4);
  assert.equal(second.latestStep.narrativeCount, 1);
});

