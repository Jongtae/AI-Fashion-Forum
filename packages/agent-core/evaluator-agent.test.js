import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateRoundHeuristic, evaluateSimulationRound } from "./evaluator-agent.js";

const SAMPLE_AGENTS = [
  { agent_id: "A01", handle: "김서연", archetype: "quiet_observer", interest_vector: { style: 0.8, fit: 0.6 }, belief_vector: {} },
  { agent_id: "A02", handle: "이준혁", archetype: "social_participant", interest_vector: { pricing: 0.7, brand: 0.5 }, belief_vector: {} },
  { agent_id: "A03", handle: "박소율", archetype: "trend_setter", interest_vector: { streetwear: 0.9, sneakers: 0.7 }, belief_vector: {} },
  { agent_id: "A04", handle: "정민재", archetype: "contrarian_observer", interest_vector: { sustainability: 0.8 }, belief_vector: {} },
];

const SAMPLE_POSTS = [
  { agent_id: "A01", body: "오늘 핏이 좀 달라 보이는데 괜찮은 것 같아요.", meaning_frame: "style_expression", stance_signal: "curious" },
  { agent_id: "A02", body: "이 브랜드 가격 대비 품질이 좋은 편이에요. 추천합니다.", meaning_frame: "value_assessment", stance_signal: "supportive" },
  { agent_id: "A03", body: "스트릿웨어 트렌드가 다시 돌아오는 느낌. 하이프 시즌인 것 같아요.", meaning_frame: "trend_signal", stance_signal: "enthusiastic" },
  { agent_id: "A04", body: "그런데 지속가능성 관점에서 보면 이 트렌드가 과연 좋은 건지 의문이에요.", meaning_frame: "ethical_critique", stance_signal: "skeptical" },
];

describe("evaluateRoundHeuristic", () => {
  it("returns scores between 0 and 1", () => {
    const result = evaluateRoundHeuristic({ agents: SAMPLE_AGENTS, posts: SAMPLE_POSTS });

    assert.ok(result.scores.diversity >= 0 && result.scores.diversity <= 1);
    assert.ok(result.scores.naturalness >= 0 && result.scores.naturalness <= 1);
    assert.ok(result.scores.coherence >= 0 && result.scores.coherence <= 1);
    assert.ok(result.scores.overall >= 0 && result.scores.overall <= 1);
  });

  it("reports high diversity for varied meaning frames", () => {
    const result = evaluateRoundHeuristic({ agents: SAMPLE_AGENTS, posts: SAMPLE_POSTS });
    // 4 unique frames / 4 posts = 1.0 frame ratio
    assert.ok(result.scores.diversity >= 0.6, `Expected high diversity, got ${result.scores.diversity}`);
  });

  it("reports low diversity for identical frames", () => {
    const sameFramePosts = SAMPLE_POSTS.map(p => ({ ...p, meaning_frame: "same", stance_signal: "same" }));
    const result = evaluateRoundHeuristic({ agents: SAMPLE_AGENTS, posts: sameFramePosts });
    assert.ok(result.scores.diversity < 0.5, `Expected low diversity, got ${result.scores.diversity}`);
  });

  it("includes recommendations when scores are low", () => {
    const emptyResult = evaluateRoundHeuristic({ agents: SAMPLE_AGENTS, posts: [] });
    assert.ok(emptyResult.recommendations.length > 0);
  });

  it("handles empty input gracefully", () => {
    const result = evaluateRoundHeuristic({});
    assert.equal(result.scores.overall, 0);
    assert.equal(result.agentCount, 0);
    assert.equal(result.postCount, 0);
    assert.equal(result.method, "heuristic");
  });

  it("includes agent and post counts", () => {
    const result = evaluateRoundHeuristic({ agents: SAMPLE_AGENTS, posts: SAMPLE_POSTS });
    assert.equal(result.agentCount, 4);
    assert.equal(result.postCount, 4);
  });
});

describe("evaluateSimulationRound", () => {
  it("falls back to heuristic when no API key is available", async () => {
    const result = await evaluateSimulationRound({
      agents: SAMPLE_AGENTS,
      posts: SAMPLE_POSTS,
    });

    assert.equal(result.method, "heuristic");
    assert.ok(result.scores.diversity > 0);
  });

  it("uses LLM when API key is provided and parses JSON response", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        content: [{
          type: "text",
          text: JSON.stringify({
            overall_assessment: "시뮬레이션 품질이 양호합니다.",
            strengths: ["다양한 관점"],
            weaknesses: ["글 길이 부족"],
            recommendations: ["프롬프트 개선"],
            adjusted_scores: { diversity: 0.75, naturalness: 0.65, coherence: 0.7 },
          }),
        }],
      }),
    });

    const result = await evaluateSimulationRound({
      agents: SAMPLE_AGENTS,
      posts: SAMPLE_POSTS,
      provider: "claude",
      apiKey: "test-key",
      fetchImpl: mockFetch,
    });

    assert.equal(result.method, "llm");
    assert.equal(result.scores.diversity, 0.75);
    assert.equal(result.scores.naturalness, 0.65);
    assert.equal(result.llmAssessment.overall, "시뮬레이션 품질이 양호합니다.");
  });

  it("falls back gracefully on LLM error", async () => {
    const mockFetch = async () => { throw new Error("network error"); };

    const result = await evaluateSimulationRound({
      agents: SAMPLE_AGENTS,
      posts: SAMPLE_POSTS,
      provider: "claude",
      apiKey: "test-key",
      fetchImpl: mockFetch,
    });

    assert.equal(result.method, "heuristic");
    assert.equal(result.llmError, "network error");
  });
});
