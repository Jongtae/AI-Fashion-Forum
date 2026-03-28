import { describe, it, expect } from "vitest";
import { scoreModerationText } from "../lib/moderation.js";

describe("POST /api/moderation/filter", () => {
  it("should classify safe content as allowed", () => {
    const result = scoreModerationText({ content: "I love this fashion trend!" });
    expect(result.shouldFlag).toBe(false);
    expect(result.label).toBe("safe");
  });

  it("should flag harassment content", () => {
    const result = scoreModerationText({ content: "You are stupid and trash" });
    expect(result.shouldFlag).toBe(true);
    expect(result.label).toBe("review");
    expect(result.dominantCategories).toContain("harassment");
  });

  it("should flag hate speech", () => {
    const result = scoreModerationText({ content: "This is hate speech 혐오" });
    expect(result.shouldFlag).toBe(true);
    expect(result.dominantCategories).toContain("hate");
  });

  it("should flag self-harm content", () => {
    const result = scoreModerationText({ content: "I want to self harm 자해" });
    expect(result.shouldFlag).toBe(true);
    expect(result.dominantCategories).toContain("self_harm");
  });

  it("should flag scam content", () => {
    const result = scoreModerationText({ content: "Send money for crypto giveaway! 투자금" });
    expect(result.shouldFlag).toBe(true);
    expect(result.dominantCategories).toContain("scam");
  });

  it("should boost score with intensity signals (CAPS + !)", () => {
    const result = scoreModerationText({ content: "YOU ARE STUPID!!!" });
    expect(result.shouldFlag).toBe(true);
    expect(result.score).toBeGreaterThan(0.45);
  });

  it("should detect categorical tags", () => {
    const result = scoreModerationText({ content: "A nice post", tags: ["harassment"] });
    expect(result.shouldFlag).toBe(true);
    expect(result.reasons).toContain("harassment:tag:harassment");
  });

  it("should handle multiple categories", () => {
    const result = scoreModerationText({ content: "stupid idiot" });
    expect(result.dominantCategories.length).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("should return normalized score between 0 and 1", () => {
    const result = scoreModerationText({ content: "test content with STUPID stupid stupid" });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
