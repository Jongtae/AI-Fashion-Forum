import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPostActionDelta,
  applyCommentActionDelta,
  applyReactActionDelta,
} from "./action-state-transitions.js";

const baseAgent = {
  agent_id: "A01",
  engagement_level: 0.5,
  belief_strength: 0.6,
  relationship_state: {},
  self_narrative: [],
  action_bias_post: 0.3,
  action_bias_comment: 0.4,
  action_bias_react: 0.5,
};

test("action state transition summaries stay Korean-first", () => {
  const post = applyPostActionDelta({ agentState: baseAgent, topicRelevance: 0.8, tick: 0, round: 1 });
  const comment = applyCommentActionDelta({
    agentState: baseAgent,
    targetAuthorId: "U123",
    topicRelevance: 0.6,
    disagreement: -0.3,
    tick: 0,
    round: 1,
  });
  const react = applyReactActionDelta({
    agentState: baseAgent,
    targetAuthorId: "U123",
    reactionType: "support",
    tick: 0,
    round: 1,
  });

  assert.match(post.writebackRecord.summary, /[가-힣]/);
  assert.match(comment.writebackRecord.summary, /[가-힣]/);
  assert.match(react.writebackRecord.summary, /[가-힣]/);
  assert.ok(!/Posted with/i.test(post.writebackRecord.summary));
  assert.ok(!/Commented on/i.test(comment.writebackRecord.summary));
  assert.ok(!/engagement \+/i.test(react.writebackRecord.summary));
});
