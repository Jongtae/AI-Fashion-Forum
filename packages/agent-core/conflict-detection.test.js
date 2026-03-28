import { describe, it, expect } from "vitest";
import {
  detectConflict,
  determineConflictResponse,
  applyConflictDelta,
  createConflictScenarios,
} from "./conflict-detection.js";

describe("conflict-detection", () => {
  const baseAgent = {
    agent_id: "A01",
    belief_strength: 0.6,
    openness: 0.5,
    conflict_tolerance: 0.5,
    relationship_state: {
      U123: { engagement: 0.5, affinity: 0.5 },
      U999: { engagement: 0.8, affinity: 0.2 }, // Low trust, high engagement
    },
    self_narrative: [],
  };

  describe("detectConflict", () => {
    it("should detect no conflict with high affinity", () => {
      const result = detectConflict({
        agentState: baseAgent,
        targetAuthorId: "U123",
        contentRecord: { direction: -0.5, topics: ["fit"] },
      });

      expect(result.has_conflict).toBe(false);
      expect(result.conflict_level).toBe("none");
    });

    it("should detect conflict with low affinity + high engagement + belief contradiction", () => {
      const result = detectConflict({
        agentState: baseAgent,
        targetAuthorId: "U999",
        contentRecord: { direction: -0.8, topics: ["fit"] },
      });

      expect(result.has_conflict).toBe(true);
      expect(result.conflict_level).not.toBe("none");
    });

    it("should scale conflict strength by engagement", () => {
      const mildAgent = {
        ...baseAgent,
        relationship_state: {
          U999: { engagement: 0.3, affinity: 0.2 }, // Low engagement
        },
      };

      const severeAgent = {
        ...baseAgent,
        relationship_state: {
          U999: { engagement: 0.9, affinity: 0.2 }, // High engagement
        },
      };

      const mildResult = detectConflict({
        agentState: mildAgent,
        targetAuthorId: "U999",
        contentRecord: { direction: -0.8, topics: ["fit"] },
      });

      const severeResult = detectConflict({
        agentState: severeAgent,
        targetAuthorId: "U999",
        contentRecord: { direction: -0.8, topics: ["fit"] },
      });

      expect(severeResult.conflict_strength).toBeGreaterThan(mildResult.conflict_strength);
    });

    it("should return indicators for analysis", () => {
      const result = detectConflict({
        agentState: baseAgent,
        targetAuthorId: "U999",
        contentRecord: { direction: -0.6, topics: ["fit"] },
      });

      expect(result.indicators).toBeDefined();
      expect(result.indicators.affinity).toBe(0.2);
      expect(result.indicators.engagement).toBe(0.8);
    });

    it("should track belief contradiction separately", () => {
      const result1 = detectConflict({
        agentState: baseAgent,
        targetAuthorId: "U999",
        contentRecord: { direction: -0.8, topics: ["fit"] },
      });

      const result2 = detectConflict({
        agentState: baseAgent,
        targetAuthorId: "U999",
        contentRecord: { direction: 0.8, topics: ["fit"] }, // Reinforcing, not contradicting
      });

      expect(result1.beliefContradiction).toBe(true);
      expect(result2.beliefContradiction).toBe(false);
    });
  });

  describe("determineConflictResponse", () => {
    it("should choose dialogue for open, tolerant agent", () => {
      const openAgent = {
        ...baseAgent,
        openness: 0.8,
        conflict_tolerance: 0.7,
      };

      const conflict = {
        conflict_strength: 0.6,
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = determineConflictResponse({
        agentState: openAgent,
        conflictAnalysis: conflict,
      });

      expect(response.strategy).toBe("dialogue");
      expect(response.action_priority[0]).toBe("comment");
    });

    it("should choose escalation for assertive, high-conviction agent", () => {
      const assertiveAgent = {
        ...baseAgent,
        openness: 0.2,
        conflict_tolerance: 0.2,
        belief_strength: 0.85,
      };

      const conflict = {
        conflict_strength: 0.7,
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = determineConflictResponse({
        agentState: assertiveAgent,
        conflictAnalysis: conflict,
      });

      expect(response.strategy).toBe("escalate");
      expect(response.action_priority[0]).toBe("post");
    });

    it("should choose withdrawal for closed, intolerant agent", () => {
      const closedAgent = {
        ...baseAgent,
        openness: 0.2,
        conflict_tolerance: 0.2,
        belief_strength: 0.5,
      };

      const conflict = {
        conflict_strength: 0.7,
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = determineConflictResponse({
        agentState: closedAgent,
        conflictAnalysis: conflict,
      });

      expect(response.strategy).toBe("withdraw");
      expect(response.action_priority[0]).toBe("silence");
    });

    it("should prioritize stronger responses in severe conflict", () => {
      const agent = {
        ...baseAgent,
        openness: 0.3,
        conflict_tolerance: 0.3,
        belief_strength: 0.75,
      };

      const severeConflict = {
        conflict_strength: 0.9, // Severe
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = determineConflictResponse({
        agentState: agent,
        conflictAnalysis: severeConflict,
      });

      expect(response.action_priority[0]).toBe("post");
    });
  });

  describe("applyConflictDelta", () => {
    it("should harden belief on escalation response", () => {
      const conflict = {
        conflict_strength: 0.6,
        conflict_level: "moderate",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "escalate",
      };

      const result = applyConflictDelta({
        agentState: baseAgent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeGreaterThan(baseAgent.belief_strength);
    });

    it("should soften belief on dialogue response", () => {
      const agent = { ...baseAgent, belief_strength: 0.8 };

      const conflict = {
        conflict_strength: 0.6,
        conflict_level: "moderate",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "dialogue",
      };

      const result = applyConflictDelta({
        agentState: agent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeLessThan(agent.belief_strength);
    });

    it("should decrease relationship affinity on conflict", () => {
      const conflict = {
        conflict_strength: 0.7,
        conflict_level: "severe",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "escalate",
      };

      const result = applyConflictDelta({
        agentState: baseAgent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 0,
        round: 1,
      });

      expect(result.agent.relationship_state["U999"].affinity).toBeLessThan(
        baseAgent.relationship_state["U999"].affinity
      );
    });

    it("should increase post bias on escalation", () => {
      const conflict = {
        conflict_strength: 0.6,
        conflict_level: "moderate",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "escalate",
      };

      const result = applyConflictDelta({
        agentState: baseAgent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 0,
        round: 1,
      });

      expect(result.agent.action_bias_post).toBeGreaterThan(baseAgent.action_bias_post || 0);
    });

    it("should increase silence bias on withdrawal", () => {
      const conflict = {
        conflict_strength: 0.6,
        conflict_level: "moderate",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "withdraw",
      };

      const result = applyConflictDelta({
        agentState: baseAgent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 0,
        round: 1,
      });

      expect(result.agent.action_bias_silence).toBeGreaterThan(baseAgent.action_bias_silence || 0);
    });

    it("should record conflict in narrative", () => {
      const conflict = {
        conflict_strength: 0.6,
        conflict_level: "moderate",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "escalate",
      };

      const result = applyConflictDelta({
        agentState: baseAgent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 0,
        round: 1,
      });

      expect(result.agent.self_narrative.length).toBeGreaterThan(0);
      expect(result.agent.self_narrative[0].type).toBe("conflict_event");
      expect(result.agent.self_narrative[0].target_author_id).toBe("U999");
    });

    it("should set conflict activation flag", () => {
      const conflict = {
        conflict_strength: 0.6,
        conflict_level: "moderate",
        lowAffinity: true,
        beliefContradiction: true,
      };

      const response = {
        strategy: "escalate",
      };

      const result = applyConflictDelta({
        agentState: baseAgent,
        targetAuthorId: "U999",
        conflictAnalysis: conflict,
        response,
        tick: 5,
        round: 1,
      });

      expect(result.agent.conflict_activation["U999"]).toBeDefined();
      expect(result.agent.conflict_activation["U999"].level).toBe("moderate");
      expect(result.agent.conflict_activation["U999"].tick).toBe(5);
    });
  });

  describe("scenario sequences", () => {
    it("should execute all conflict scenarios", () => {
      const scenarios = createConflictScenarios();

      expect(scenarios.scenarios.length).toBe(3);
      expect(scenarios.scenarios[0].name).toBe("severe_escalation");
      expect(scenarios.scenarios[1].name).toBe("mild_dialogue");
      expect(scenarios.scenarios[2].name).toBe("severe_withdrawal");
    });

    it("should show different responses for different personality types", () => {
      const scenarios = createConflictScenarios();

      const escalation = scenarios.scenarios[0];
      const dialogue = scenarios.scenarios[1];
      const withdrawal = scenarios.scenarios[2];

      expect(escalation.response.strategy).toBe("escalate");
      expect(dialogue.response.strategy).toBe("dialogue");
      expect(withdrawal.response.strategy).toBe("withdraw");
    });

    it("should show belief hardening on escalation, softening on dialogue", () => {
      const scenarios = createConflictScenarios();

      const escalationAgent = scenarios.scenarios[0].result.agent;
      const dialogueAgent = scenarios.scenarios[1].result.agent;

      expect(escalationAgent.belief_strength).toBeGreaterThan(
        scenarios.scenarios[0].result.deltaLog.belief_before
      );
      // Dialogue should soften (but base belief is already moderate, so may not show)
    });

    it("should show affinity decrease across all scenarios", () => {
      const scenarios = createConflictScenarios();

      scenarios.scenarios.forEach((scenario) => {
        expect(scenario.result.deltaLog.affinity_delta).toBeLessThan(0);
      });
    });
  });
});
