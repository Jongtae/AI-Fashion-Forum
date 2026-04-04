import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectExposure, applyExposureDrift, measureDrift } from "./cross-exposure.js";

const AGENT = {
  agent_id: "A01",
  archetype: "quiet_observer",
  interest_vector: { style: 0.8, fit: 0.6, pricing: 0.3 },
  belief_vector: { "price-over-hype": 0.6 },
  conformity: 0.5,
  conflict_tolerance: 0.4,
};

const POSTS = [
  { agent_id: "A02", body: "핏이 좋아요", tags: ["style", "fit"], meaning_frame: "style_expression", stance_signal: "supportive" },
  { agent_id: "A03", body: "가격이 너무 높아요", tags: ["pricing", "brand"], meaning_frame: "value_assessment", stance_signal: "skeptical" },
  { agent_id: "A04", body: "스트릿웨어 트렌드", tags: ["streetwear", "sneakers"], meaning_frame: "trend_signal", stance_signal: "enthusiastic" },
  { agent_id: "A01", body: "내가 쓴 글", tags: ["style"], meaning_frame: "self", stance_signal: "neutral" },
];

describe("selectExposure", () => {
  it("excludes agent's own posts", () => {
    const { exposedPosts } = selectExposure({ agent: AGENT, recentPosts: POSTS, rng: () => 0.5 });
    assert.ok(exposedPosts.every((p) => p.agent_id !== "A01"));
  });

  it("returns at most maxExposure posts", () => {
    const { exposedPosts } = selectExposure({ agent: AGENT, recentPosts: POSTS, maxExposure: 2, rng: () => 0.5 });
    assert.ok(exposedPosts.length <= 2);
  });

  it("ranks by topic overlap", () => {
    const { scores } = selectExposure({ agent: AGENT, recentPosts: POSTS, rng: () => 0 });
    // style/fit post should rank higher than streetwear for A01
    const stylePosScore = scores.find((s) => s.agent_id === "A02")?.score || 0;
    const streetScore = scores.find((s) => s.agent_id === "A04")?.score || 0;
    assert.ok(stylePosScore >= streetScore, `style ${stylePosScore} should >= streetwear ${streetScore}`);
  });

  it("returns empty for no candidates", () => {
    const { exposedPosts } = selectExposure({ agent: AGENT, recentPosts: [], rng: () => 0.5 });
    assert.equal(exposedPosts.length, 0);
  });
});

describe("applyExposureDrift", () => {
  it("boosts interest vector for exposed topics", () => {
    const agent = JSON.parse(JSON.stringify(AGENT));
    const before = agent.interest_vector.style;
    applyExposureDrift({ agent, exposedPosts: [POSTS[0]] });
    assert.ok(agent.interest_vector.style > before, "style interest should increase");
  });

  it("adjusts belief vector based on stance", () => {
    const agent = JSON.parse(JSON.stringify(AGENT));
    // Skeptical stance on value_assessment
    applyExposureDrift({ agent, exposedPosts: [POSTS[1]] });
    assert.ok(agent.belief_vector["value_assessment"] != null);
  });

  it("nudges conformity when many aligned posts", () => {
    const agent = JSON.parse(JSON.stringify(AGENT));
    const before = agent.conformity;
    applyExposureDrift({
      agent,
      exposedPosts: [
        { ...POSTS[0], stance_signal: "supportive" },
        { ...POSTS[0], stance_signal: "supportive" },
        { ...POSTS[0], stance_signal: "supportive" },
      ],
    });
    assert.ok(agent.conformity >= before, "conformity should not decrease with aligned exposure");
  });

  it("nudges conflict_tolerance when conflicting posts", () => {
    const agent = JSON.parse(JSON.stringify(AGENT));
    const before = agent.conflict_tolerance;
    applyExposureDrift({
      agent,
      exposedPosts: [
        { ...POSTS[1], stance_signal: "skeptical" },
        { ...POSTS[1], stance_signal: "critical" },
      ],
    });
    assert.ok(agent.conflict_tolerance >= before);
  });

  it("returns drift record with deltas", () => {
    const agent = JSON.parse(JSON.stringify(AGENT));
    const { driftRecord } = applyExposureDrift({ agent, exposedPosts: [POSTS[0]] });
    assert.equal(driftRecord.agent_id, "A01");
    assert.equal(driftRecord.exposureCount, 1);
    assert.ok(Object.keys(driftRecord.interest_deltas).length > 0);
  });
});

describe("measureDrift", () => {
  it("returns 0 for identical states", () => {
    assert.equal(measureDrift(AGENT, AGENT), 0);
  });

  it("returns positive value for changed states", () => {
    const after = {
      ...AGENT,
      interest_vector: { ...AGENT.interest_vector, style: 0.9 },
      conformity: 0.6,
    };
    const d = measureDrift(AGENT, after);
    assert.ok(d > 0);
  });

  it("tracks new keys added after drift", () => {
    const after = {
      ...AGENT,
      interest_vector: { ...AGENT.interest_vector, streetwear: 0.3 },
    };
    const d = measureDrift(AGENT, after);
    assert.ok(d > 0, "new interest key should register as drift");
  });
});
