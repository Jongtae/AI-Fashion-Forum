import test from "node:test";
import assert from "node:assert/strict";

import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
  createActionRecord,
} from "../shared-types/index.js";

import {
  chooseForumAction,
  getEffectiveTopicAffinity,
} from "./action-space.js";
import {
  applyLowCostActionWriteback,
  buildLowCostActionWriteback,
} from "./low-cost-action-writeback.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("silence writeback preserves context without creating a target dependency", () => {
  const agent = clone(SAMPLE_AGENT_STATES[0]);
  const actionRecord = createActionRecord({
    action_id: "ACT:A01:3:silence",
    tick: 3,
    agent_id: "A01",
    type: "silence",
    visibility: "stored_only",
    payload: {
      reason: "활동성과 친화도가 낮아 침묵을 유지했다.",
    },
    ui: {
      label: "침묵했다",
    },
  });

  const result = buildLowCostActionWriteback({
    agentState: agent,
    actionRecord,
    round: 2,
    tick: 3,
  });

  assert.equal(result.writebackRecord.memory_channel, "recent_memory");
  assert.equal(result.writebackRecord.state_delta.activity_level_delta, -0.04);
  assert.equal(result.recentMemoryItem.kind, "low_cost_action");
  assert.equal(result.recentMemoryItem.details.target_content_id, null);
  assert.equal(result.agent.mutable_state.recent_arc, "quiet_observer");
  assert.equal(result.agent.activity_level, 0.28);
});

test("lurk writeback boosts effective affinity enough to change the next action", () => {
  const agent = clone(SAMPLE_AGENT_STATES[0]);
  const content = SAMPLE_CONTENT_RECORDS[0];
  const initialAffinity = getEffectiveTopicAffinity(agent, content);
  const initialAction = chooseForumAction({
    agentState: agent,
    contentRecord: content,
    tick: 1,
  });

  assert.equal(initialAction.type, "lurk");
  assert(initialAffinity < 0.28);

  const result = applyLowCostActionWriteback(null, {
    agentState: agent,
    actionRecord: initialAction,
    contentRecord: content,
    round: 2,
    tick: 1,
  });

  const nextAffinity = getEffectiveTopicAffinity(result.agent, content);
  const nextAction = chooseForumAction({
    agentState: result.agent,
    contentRecord: content,
    tick: 2,
  });

  assert.equal(result.writebackRecord.memory_channel, "belief_shift");
  assert(nextAffinity > initialAffinity);
  assert(nextAffinity >= 0.28);
  assert.equal(nextAction.type, "react");
  assert.equal(result.writebackRecord.state_delta.attention_bias.office_style > 0, true);
});
