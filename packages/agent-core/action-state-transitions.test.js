import { describe, it, expect } from "vitest";
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

      expect(result.agent.engagement_level).toBeGreaterThan(baseAgent.engagement_level);
      expect(result.agent.belief_strength).toBeGreaterThan(baseAgent.belief_strength);
    });

    it("should increase post action bias after posting", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      expect(result.agent.action_bias_post).toBeGreaterThan(baseAgent.action_bias_post);
    });

    it("should decrease silence bias after posting", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      expect(result.agent.action_bias_silence).toBeLessThan(baseAgent.action_bias_silence ?? 0.2);
    });

    it("should add narrative entry for post", () => {
      const result = applyPostActionDelta({
        agentState: baseAgent,
        topicRelevance: 0.8,
        tick: 0,
        round: 1,
      });

      expect(result.agent.self_narrative.length).toBeGreaterThan(0);
      expect(result.agent.self_narrative[0].type).toBe("action_post");
      expect(result.writebackRecord.summary).toMatch(/[가-힣]/);
      expect(result.writebackRecord.summary).not.toMatch(/Posted with/i);
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

      expect(result.agent.engagement_level).toBeLessThanOrEqual(1);
      expect(result.agent.belief_strength).toBeLessThanOrEqual(1);
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

      expect(result.agent.engagement_level).toBeGreaterThan(baseAgent.engagement_level);
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

      expect(disagreementResult.agent.belief_strength).toBeGreaterThan(
        agreementResult.agent.belief_strength
      );
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

      expect(result.agent.relationship_state["U123"]).toBeDefined();
      expect(result.agent.relationship_state["U123"].engagement).toBeGreaterThan(0);
      expect(result.agent.relationship_state["U123"].affinity).toBeGreaterThan(0);
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

      expect(result.agent.relationship_state["U123"].affinity).toBeLessThan(
        baseAgent.relationship_state["U123"]?.affinity ?? 0.5
      );
    });

    it("should increase comment bias", () => {
      const result = applyCommentActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        topicRelevance: 0.6,
        tick: 0,
        round: 1,
      });

      expect(result.agent.action_bias_comment).toBeGreaterThan(baseAgent.action_bias_comment);
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

      expect(result.agent.self_narrative.length).toBeGreaterThan(0);
      expect(result.agent.self_narrative[0].type).toBe("action_comment");
      expect(result.agent.self_narrative[0].disagreement).toBe(-0.3);
      expect(result.writebackRecord.summary).toMatch(/[가-힣]/);
      expect(result.writebackRecord.summary).not.toMatch(/Commented on/i);
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

      expect(result.agent.engagement_level).toBeGreaterThan(baseAgent.engagement_level);
      expect(result.agent.engagement_level).toBeLessThan(baseAgent.engagement_level + 0.05);
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
      expect(result.agent.belief_strength).toBe(baseAgent.belief_strength);
    });

    it("should increase react action bias", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      expect(result.agent.action_bias_react).toBeGreaterThan(baseAgent.action_bias_react);
    });

    it("should boost affinity for support reactions", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      expect(result.agent.relationship_state["U123"].affinity).toBeGreaterThan(0.5);
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

      expect(supportResult.agent.relationship_state["U123"].affinity).toBeGreaterThan(
        curiouscResult.agent.relationship_state["U124"].affinity
      );
    });

    it("should increment reaction frequency index", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      expect(result.agent.reaction_frequency_index).toBeGreaterThan(0);
    });

    it("should add lightweight narrative entry", () => {
      const result = applyReactActionDelta({
        agentState: baseAgent,
        targetAuthorId: "U123",
        reactionType: "support",
        tick: 0,
        round: 1,
      });

      expect(result.agent.self_narrative.length).toBeGreaterThan(0);
      expect(result.agent.self_narrative[0].type).toBe("action_react");
      expect(result.agent.self_narrative[0].reaction_type).toBe("support");
      expect(result.writebackRecord.summary).toMatch(/[가-힣]/);
      expect(result.writebackRecord.summary).not.toMatch(/engagement \+/i);
    });
  });

  describe("calculateActionBias", () => {
    it("should calculate baseline action biases", () => {
      const bias = calculateActionBias(baseAgent);

      expect(bias).toHaveProperty("post_bias");
      expect(bias).toHaveProperty("comment_bias");
      expect(bias).toHaveProperty("react_bias");
      expect(bias).toHaveProperty("silence_bias");
    });

    it("should scale biases based on state", () => {
      const lowEngagementAgent = {
        ...baseAgent,
        engagement_level: 0.2,
        belief_assertion_tendency: 0,
      };

      const bias = calculateActionBias(lowEngagementAgent);

      expect(bias.silence_bias).toBeGreaterThan(0.3);
      expect(bias.react_bias).toBeGreaterThan(bias.comment_bias);
    });

    it("should increase post_bias with assertion tendency", () => {
      const assertiveAgent = {
        ...baseAgent,
        belief_assertion_tendency: 0.8,
      };

      const biasBefore = calculateActionBias(baseAgent);
      const biasAfter = calculateActionBias(assertiveAgent);

      expect(biasAfter.post_bias).toBeGreaterThan(biasBefore.post_bias);
    });
  });

  describe("action sequence scenarios", () => {
    it("should execute post -> comment -> react sequence", () => {
      const scenarios = createActionStateScenarios();

      expect(scenarios.scenarios.length).toBeGreaterThan(0);
      expect(scenarios.scenarios[0].name).toBe("post_commitment");
      expect(scenarios.scenarios[1].name).toBe("comment_disagreement");
      expect(scenarios.scenarios[2].name).toBe("reactions_accumulation");
    });

    it("should maintain monotonic engagement increase across sequence", () => {
      const scenarios = createActionStateScenarios();

      const postAgent = scenarios.scenarios[0].result.agent;
      const commentAgent = scenarios.scenarios[1].result.agent;
      const finalAgent = scenarios.scenarios[2].final_agent;

      expect(commentAgent.engagement_level).toBeGreaterThanOrEqual(
        postAgent.engagement_level
      );
      expect(finalAgent.engagement_level).toBeGreaterThanOrEqual(
        commentAgent.engagement_level
      );
    });

    it("should accumulate narrative entries", () => {
      const scenarios = createActionStateScenarios();

      const postAgent = scenarios.scenarios[0].result.agent;
      const commentAgent = scenarios.scenarios[1].result.agent;
      const finalAgent = scenarios.scenarios[2].final_agent;

      expect(commentAgent.self_narrative.length).toBeGreaterThan(
        postAgent.self_narrative.length
      );
      expect(finalAgent.self_narrative.length).toBeGreaterThan(
        commentAgent.self_narrative.length
      );
    });
  });
});
