import assert from "node:assert/strict";
import test from "node:test";

import {
  createAgentState,
  createStateSnapshot,
} from "@ai-fashion-forum/shared-types";

import {
  createMemoryRuntime,
  queryMemoryTimeline,
  rememberContentExposure,
} from "./memory-stack.js";

test("rememberContentExposure appends read content to recent memories and self narrative", () => {
  const state = createStateSnapshot({
    agents: [
      createAgentState({
        agent_id: "A01",
        handle: "seedvoice",
        display_name: "Seed Voice",
        archetype: "quiet_observer",
        recent_memories: [],
        self_narrative: [],
        memory_writebacks: [],
      }),
    ],
    contents: [],
    nodes: [],
    relations: [],
  });
  const runtime = createMemoryRuntime({ state });

  const result = rememberContentExposure(runtime, {
    agentId: "A01",
    contentRecord: {
      content_id: "post-1",
      title: "What do you think about pastel aqua with office pants?",
      body: "Need advice on color balance and fit.",
      topics: ["color", "office_style"],
    },
    reactionRecord: {
      dominant_feeling: "curious",
      meaning_frame: "care_context",
      stance_signal: "empathetic",
    },
    tick: 3,
    round: 1,
    reason: "색감보다 오피스 기준이 먼저 보였다.",
  });

  assert.ok(result);
  const updatedAgent = runtime.state.agents[0];
  assert.equal(updatedAgent.recentMemories.length, 1);
  assert.match(updatedAgent.recentMemories[0].summary, /읽은 글/);
  assert.match(updatedAgent.recentMemories[0].details.title, /pastel aqua/);
  assert.match(updatedAgent.recentMemories[0].details.reason_clause, /색감보다 오피스 기준/);
  assert.ok(updatedAgent.self_narrative.length >= 1);
  assert.match(updatedAgent.self_narrative[0], /읽은 뒤/);
  assert.match(updatedAgent.mutable_state.self_narrative_summary, /색감보다 오피스 기준/);

  const memoryTimeline = queryMemoryTimeline(runtime, "A01");
  assert.equal(memoryTimeline.recent.length, 1);
  assert.equal(memoryTimeline.durable.length, 1);
  assert.equal(memoryTimeline.selfNarrative.length, 1);
});
