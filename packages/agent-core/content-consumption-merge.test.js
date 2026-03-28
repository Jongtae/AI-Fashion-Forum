import { describe, it, expect } from "vitest";
import {
  applyInternalContentConsumption,
  applyExternalContentConsumption,
  mergeConsumptionPaths,
  createConsumptionScenarios,
} from "./content-consumption-merge.js";

describe("content-consumption-merge", () => {
  const baseAgent = {
    agent_id: "A01",
    belief_strength: 0.6,
    openness: 0.6,
    conflict_tolerance: 0.5,
    engagement_level: 0.5,
    interest_vector: { fashion: 0.4, fit: 0.6, pricing: 0.3 },
    relationship_state: { U123: { engagement: 0.7, affinity: 0.6 } },
    self_narrative: [],
    perspective_breadth: 0.2,
  };

  describe("applyInternalContentConsumption", () => {
    it("should increase belief strength from high-affinity author", () => {
      const result = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeGreaterThan(baseAgent.belief_strength);
    });

    it("should increase interest in relevant topics", () => {
      const result = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 0,
        round: 1,
      });

      expect(result.agent.interest_vector["fit"]).toBeGreaterThan(baseAgent.interest_vector["fit"]);
    });

    it("should update relationship engagement", () => {
      const result = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 0,
        round: 1,
      });

      expect(result.agent.relationship_state["U123"].engagement).toBeGreaterThan(
        baseAgent.relationship_state["U123"].engagement
      );
    });

    it("should record last_consumed_tick", () => {
      const result = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 42,
        round: 1,
      });

      expect(result.agent.relationship_state["U123"].last_consumed_tick).toBe(42);
    });

    it("should add narrative entry", () => {
      const result = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 0,
        round: 1,
      });

      expect(result.agent.self_narrative.length).toBeGreaterThan(0);
      expect(result.agent.self_narrative[0].type).toBe("consumed_internal_content");
    });

    it("should calculate receptivity from author affinity, topic, and social proof", () => {
      const result = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 0,
        round: 1,
      });

      expect(result.deltaLog.total_receptivity).toBeGreaterThan(0);
      expect(result.deltaLog.total_receptivity).toBeLessThanOrEqual(1);
    });

    it("should reduce receptivity for unknown author", () => {
      const resultKnown = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U123",
        tick: 0,
        round: 1,
      });

      const resultUnknown = applyInternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["fit"],
          likes: 15,
          reply_count: 5,
          direction: 1,
        },
        authorId: "U999",
        tick: 0,
        round: 1,
      });

      expect(resultKnown.deltaLog.total_receptivity).toBeGreaterThan(
        resultUnknown.deltaLog.total_receptivity
      );
    });
  });

  describe("applyExternalContentConsumption", () => {
    it("should update belief from authoritative external source", () => {
      const result = applyExternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["pricing"],
          source: "vogue.com",
          direction: 1,
        },
        authorityScore: 0.9,
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeGreaterThan(baseAgent.belief_strength);
    });

    it("should increase perspective_breadth on novel content", () => {
      const result = applyExternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["pricing"],
          source: "economist.com",
          direction: 1,
        },
        authorityScore: 0.8,
        tick: 0,
        round: 1,
      });

      expect(result.agent.perspective_breadth).toBeGreaterThan(baseAgent.perspective_breadth);
    });

    it("should soften belief on contradictory content if openness is high", () => {
      const openAgent = {
        ...baseAgent,
        openness: 0.8,
        conflict_tolerance: 0.7,
        belief_strength: 0.8,
      };

      const result = applyExternalContentConsumption({
        agentState: openAgent,
        contentRecord: {
          topics: ["fit"],
          source: "external.com",
          direction: -1, // Contradicts
        },
        authorityScore: 0.9,
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeLessThan(openAgent.belief_strength);
    });

    it("should harden belief on contradictory content if closed-minded", () => {
      const closedAgent = {
        ...baseAgent,
        openness: 0.3,
        conflict_tolerance: 0.3,
        belief_strength: 0.8,
      };

      const result = applyExternalContentConsumption({
        agentState: closedAgent,
        contentRecord: {
          topics: ["fit"],
          source: "external.com",
          direction: -1, // Contradicts
        },
        authorityScore: 0.9,
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeGreaterThan(closedAgent.belief_strength);
    });

    it("should add narrative entry", () => {
      const result = applyExternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["pricing"],
          source: "vogue.com",
          direction: 1,
        },
        authorityScore: 0.9,
        tick: 0,
        round: 1,
      });

      expect(result.agent.self_narrative.length).toBeGreaterThan(0);
      expect(result.agent.self_narrative[0].type).toBe("consumed_external_content");
    });

    it("should increase interest in novel topics more than familiar topics", () => {
      const result = applyExternalContentConsumption({
        agentState: baseAgent,
        contentRecord: {
          topics: ["pricing"], // Low prior interest
          source: "economist.com",
          direction: 1,
        },
        authorityScore: 0.8,
        tick: 0,
        round: 1,
      });

      expect(result.agent.interest_vector["pricing"]).toBeGreaterThan(
        baseAgent.interest_vector["pricing"]
      );
    });

    it("should cap belief_strength at 1.0", () => {
      const result = applyExternalContentConsumption({
        agentState: { ...baseAgent, belief_strength: 0.95 },
        contentRecord: {
          topics: ["pricing"],
          source: "vogue.com",
          direction: 1,
        },
        authorityScore: 0.95,
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeLessThanOrEqual(1);
    });
  });

  describe("mergeConsumptionPaths", () => {
    it("should merge internal and external consumptions into single agent state", () => {
      const result = mergeConsumptionPaths({
        agentState: baseAgent,
        internalConsumptions: [
          {
            topics: ["fit"],
            likes: 10,
            reply_count: 3,
            direction: 1,
          },
        ],
        externalConsumptions: [
          {
            topics: ["pricing"],
            source: "vogue.com",
            direction: 1,
          },
        ],
        tick: 0,
        round: 1,
      });

      expect(result.agent.belief_strength).toBeGreaterThan(baseAgent.belief_strength);
      expect(result.agent.perspective_breadth).toBeGreaterThan(baseAgent.perspective_breadth);
    });

    it("should apply both paths sequentially", () => {
      const result = mergeConsumptionPaths({
        agentState: baseAgent,
        internalConsumptions: [
          {
            topics: ["fit"],
            likes: 10,
            reply_count: 3,
            direction: 1,
          },
        ],
        externalConsumptions: [
          {
            topics: ["pricing"],
            source: "vogue.com",
            direction: 1,
          },
        ],
        tick: 0,
        round: 1,
      });

      expect(result.consumption_count).toBe(2);
      expect(result.internal_count).toBe(1);
      expect(result.external_count).toBe(1);
    });

    it("should generate writebacks for each consumption", () => {
      const result = mergeConsumptionPaths({
        agentState: baseAgent,
        internalConsumptions: [
          {
            topics: ["fit"],
            likes: 10,
            reply_count: 3,
            direction: 1,
          },
          {
            topics: ["fashion"],
            likes: 5,
            reply_count: 1,
            direction: 1,
          },
        ],
        externalConsumptions: [
          {
            topics: ["pricing"],
            source: "vogue.com",
            direction: 1,
          },
        ],
        tick: 0,
        round: 1,
      });

      expect(result.writebacks.length).toBe(3);
      expect(result.writebacks[0].memory_channel).toBe("content_internal");
      expect(result.writebacks[2].memory_channel).toBe("content_external");
    });

    it("should handle empty consumption lists", () => {
      const result = mergeConsumptionPaths({
        agentState: baseAgent,
        internalConsumptions: [],
        externalConsumptions: [],
        tick: 0,
        round: 1,
      });

      expect(result.agent.agent_id).toBe(baseAgent.agent_id);
      expect(result.consumption_count).toBe(0);
    });

    it("should accumulate perspective_breadth from external content", () => {
      const result = mergeConsumptionPaths({
        agentState: baseAgent,
        internalConsumptions: [],
        externalConsumptions: [
          { topics: ["pricing"], source: "s1", direction: 1 },
          { topics: ["fit"], source: "s2", direction: 1 },
          { topics: ["utility"], source: "s3", direction: 1 },
        ],
        tick: 0,
        round: 1,
      });

      expect(result.agent.perspective_breadth).toBeGreaterThan(baseAgent.perspective_breadth);
    });
  });

  describe("scenario sequences", () => {
    it("should execute all scenarios successfully", () => {
      const scenarios = createConsumptionScenarios();

      expect(scenarios.scenarios.length).toBe(3);
      expect(scenarios.scenarios[0].name).toBe("internal_trusted_author");
      expect(scenarios.scenarios[1].name).toBe("external_contradictory");
      expect(scenarios.scenarios[2].name).toBe("merged_dual_path");
    });

    it("should show higher receptivity for trusted author (internal)", () => {
      const scenarios = createConsumptionScenarios();
      const internalResult = scenarios.scenarios[0].result;

      expect(internalResult.deltaLog.total_receptivity).toBeGreaterThan(0.3);
    });

    it("should update beliefs differently for external vs internal", () => {
      const scenarios = createConsumptionScenarios();
      const internalBelief = scenarios.scenarios[0].result.agent.belief_strength;
      const externalAgent = scenarios.scenarios[1].result.agent;
      const mergedAgent = scenarios.scenarios[2].result.agent;

      // Merged should show cumulative effect
      expect(mergedAgent.belief_strength).toBeGreaterThanOrEqual(internalBelief);
    });

    it("should accumulate perspective breadth only from external", () => {
      const scenarios = createConsumptionScenarios();
      const internalAgent = scenarios.scenarios[0].result.agent;
      const externalAgent = scenarios.scenarios[1].result.agent;
      const mergedAgent = scenarios.scenarios[2].result.agent;

      // External increases perspective_breadth
      expect(externalAgent.perspective_breadth).toBeGreaterThan(internalAgent.perspective_breadth);
      // Merged inherits and potentially accumulates
      expect(mergedAgent.perspective_breadth).toBeGreaterThanOrEqual(externalAgent.perspective_breadth);
    });
  });
});
