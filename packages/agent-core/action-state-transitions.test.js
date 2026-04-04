import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPostActionDelta,
  applyCommentActionDelta,
  applyReactActionDelta,
  calculateActionBias,
  createActionStateScenarios,
} from "./action-state-transitions.js";

describe("action-state-transitions", () => {
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

  describe("applyPostActionDelta", () => {
    it("should increase engagement and belief strength on post", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.engagement_level > baseAgent.engagement_level, `expected ${result.agent.engagement_level} > ${baseAgent.engagement_level}`);
      assert.ok(result.agent.belief_strength > baseAgent.belief_strength, `expected ${result.agent.belief_strength} > ${baseAgent.belief_strength}`);
    });

    it("should increase post action bias after posting", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.action_bias_post > baseAgent.action_bias_post, `expected ${result.agent.action_bias_post} > ${baseAgent.action_bias_post}`);
    });

    it("should decrease silence bias after posting", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.action_bias_silence < (baseAgent.action_bias_silence ?? 0.2), `expected ${result.agent.action_bias_silence} < ${baseAgent.action_bias_silence ?? 0.2}`);
    });

    it("should add narrative entry for post", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.self_narrative.length > 0, `expected ${result.agent.self_narrative.length} > 0`);
      assert.strictEqual(result.agent.self_narrative[0].type, "action_post");
      assert.match(result.writebackRecord.summary, /[가-힣]/);
      assert.doesNotMatch(result.writebackRecord.summary, /Posted with/i);
    });

    it("should cap values at 1.0", () => {
      const agent = {
        ...baseAgent,
        engagement_level: 0.95,
        belief_strength: 0.95,
      };

      const result = applyPostActionDelta({
        agentState: agent,
        topicRelevance: 1.0,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.engagement_level <= 1, `expected ${result.agent.engagement_level} <= 1`);
      assert.ok(result.agent.belief_strength <= 1, `expected ${result.agent.belief_strength} <= 1`);
    });
  });

  describe("applyCommentActionDelta", () => {
    it("should increase engagement on comment", () => {
      const result = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.engagement_level > baseAgent.engagement_level, `expected ${result.agent.engagement_level} > ${baseAgent.engagement_level}`);
    });

    it("should increase belief strength more with disagreement", () => {
      const agreementResult = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        disagreement: 0,
        tick: 0,
        round: 1,
      });

      const disagreementResult = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U124",
        topicRelevance: 0.6,
        disagreement: -0.5,
        tick: 0,
        round: 1,
      });

      assert.ok(disagreementResult.agent.belief_strength > agreementResult.agent.belief_strength, `expected ${disagreementResult.agent.belief_strength} > ${agreementResult.agent.belief_strength}`);
    });

    it("should update relationship state with target author", () => {
      const result = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        disagreement: 0.1,
        tick: 0,
        round: 1,
      });

      assert.notStrictEqual(result.agent.relationship_state["U123"], undefined);
      assert.ok(result.agent.relationship_state["U123"].engagement > 0, `expected ${result.agent.relationship_state["U123"].engagement} > 0`);
      assert.ok(result.agent.relationship_state["U123"].affinity > 0, `expected ${result.agent.relationship_state["U123"].affinity} > 0`);
    });

    it("should decrease affinity on strong disagreement", () => {
      const result = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        disagreement: -0.8,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.relationship_state["U123"].affinity < (baseAgent.relationship_state["U123"]?.affinity ?? 0.5), `expected ${result.agent.relationship_state["U123"].affinity} < ${baseAgent.relationship_state["U123"]?.affinity ?? 0.5}`);
    });

    it("should increase comment bias", () => {
      const result = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.action_bias_comment > baseAgent.action_bias_comment, `expected ${result.agent.action_bias_comment} > ${baseAgent.action_bias_comment}`);
    });

    it("should add narrative entry for comment", () => {
      const result = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        disagreement: -0.3,
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.self_narrative.length > 0, `expected ${result.agent.self_narrative.length} > 0`);
      assert.strictEqual(result.agent.self_narrative[0].type, "action_comment");
      assert.strictEqual(result.agent.self_narrative[0].disagreement, -0.3);
      assert.match(result.writebackRecord.summary, /[가-힣]/);
      assert.doesNotMatch(result.writebackRecord.summary, /Commented on/i);
    });
  });

  describe("applyReactActionDelta", () => {
    it("should slightly increase engagement on react", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.engagement_level > baseAgent.engagement_level, `expected ${result.agent.engagement_level} > ${baseAgent.engagement_level}`);
      assert.ok(result.agent.engagement_level < baseAgent.engagement_level + 0.05, `expected ${result.agent.engagement_level} < ${baseAgent.engagement_level + 0.05}`);
    });

    it("should NOT increase belief strength significantly", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      // Belief strength should be unchanged (reactions don't articulate belief)
      assert.strictEqual(result.agent.belief_strength, baseAgent.belief_strength);
    });

    it("should increase react action bias", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.action_bias_react > baseAgent.action_bias_react, `expected ${result.agent.action_bias_react} > ${baseAgent.action_bias_react}`);
    });

    it("should boost affinity for support reactions", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.relationship_state["U123"].affinity > 0.5, `expected ${result.agent.relationship_state["U123"].affinity} > 0.5`);
    });

    it("should have smaller affinity boost for non-support reactions", () => {
      const supportResult = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      const curiouscResult = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U124",
        reactionType: "curious",
        tick: 0,
        round: 1,
      });

      assert.ok(supportResult.agent.relationship_state["U123"].affinity > curiouscResult.agent.relationship_state["U124"].affinity, `expected ${supportResult.agent.relationship_state["U123"].affinity} > ${curiouscResult.agent.relationship_state["U124"].affinity}`);
    });

    it("should increment reaction frequency index", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.reaction_frequency_index > 0, `expected ${result.agent.reaction_frequency_index} > 0`);
    });

    it("should add lightweight narrative entry", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      assert.ok(result.agent.self_narrative.length > 0, `expected ${result.agent.self_narrative.length} > 0`);
      assert.strictEqual(result.agent.self_narrative[0].type, "action_react");
      assert.strictEqual(result.agent.self_narrative[0].reaction_type, "support");
      assert.match(result.writebackRecord.summary, /[가-힣]/);
      assert.doesNotMatch(result.writebackRecord.summary, /engagement \+/i);
    });
  });

  describe("calculateActionBias", () => {
    it("should calculate baseline action biases", () => {
      const bias = calculateActionBias(baseAgent);

      assert.ok("post_bias" in bias);
      assert.ok("comment_bias" in bias);
      assert.ok("react_bias" in bias);
      assert.ok("silence_bias" in bias);
    });

    it("should scale biases based on state", () => {
      const lowEngagementAgent = {
        ...baseAgent,
        engagement_level: 0.2,
        belief_assertion_tendency: 0,
      };

      const bias = calculateActionBias(lowEngagementAgent);

      assert.ok(bias.silence_bias > 0.3, `expected ${bias.silence_bias} > 0.3`);
      assert.ok(bias.react_bias > bias.comment_bias, `expected ${bias.react_bias} > ${bias.comment_bias}`);
    });

    it("should increase post_bias with assertion tendency", () => {
      const assertiveAgent = {
        ...baseAgent,
        belief_assertion_tendency: 0.8,
      };

      const biasBefore = calculateActionBias(baseAgent);
      const biasAfter = calculateActionBias(assertiveAgent);

      assert.ok(biasAfter.post_bias > biasBefore.post_bias, `expected ${biasAfter.post_bias} > ${biasBefore.post_bias}`);
    });
  });

  describe("action sequence scenarios", () => {
    it("should execute post -> comment -> react sequence", () => {
      const scenarios = createActionStateScenarios();

      assert.ok(scenarios.scenarios.length > 0, `expected ${scenarios.scenarios.length} > 0`);
      assert.strictEqual(scenarios.scenarios[0].name, "post_commitment");
      assert.strictEqual(scenarios.scenarios[1].name, "comment_disagreement");
      assert.strictEqual(scenarios.scenarios[2].name, "reactions_accumulation");
    });

    it("should maintain monotonic engagement increase across sequence", () => {
      const scenarios = createActionStateScenarios();

      const postAgent = scenarios.scenarios[0].result.agent;
      const commentAgent = scenarios.scenarios[1].result.agent;
      const finalAgent = scenarios.scenarios[2].final_agent;

      assert.ok(commentAgent.engagement_level >= postAgent.engagement_level, `expected ${commentAgent.engagement_level} >= ${postAgent.engagement_level}`);
      assert.ok(finalAgent.engagement_level >= commentAgent.engagement_level, `expected ${finalAgent.engagement_level} >= ${commentAgent.engagement_level}`);
    });

    it("should accumulate narrative entries", () => {
      const scenarios = createActionStateScenarios();

      const postAgent = scenarios.scenarios[0].result.agent;
      const commentAgent = scenarios.scenarios[1].result.agent;
      const finalAgent = scenarios.scenarios[2].final_agent;

      assert.ok(commentAgent.self_narrative.length > postAgent.self_narrative.length, `expected ${commentAgent.self_narrative.length} > ${postAgent.self_narrative.length}`);
      assert.ok(finalAgent.self_narrative.length > commentAgent.self_narrative.length, `expected ${finalAgent.self_narrative.length} > ${commentAgent.self_narrative.length}`);
    });
  });
});
