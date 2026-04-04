/**
 * evaluator-agent.js
 *
 * LLM-based evaluator agent that assesses simulation quality after each round.
 * Produces structured verdicts on diversity, naturalness, coherence, and
 * provides recommendations for meta-policy adjustments.
 *
 * Falls back to heuristic evaluation when no LLM API key is available.
 */

import { requestLLMContexts, extractLLMResponseText, resolveLLMConfig } from "./llm-gateway.js";

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function round(v) {
  return Math.round(v * 100) / 100;
}

function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ── Heuristic evaluator (offline, no LLM) ──────────────────────────────────

function computeDiversityScore(posts) {
  if (!posts || posts.length === 0) return 0;
  const meaningFrames = new Set(posts.map(p => p.meaning_frame).filter(Boolean));
  const stanceSignals = new Set(posts.map(p => p.stance_signal).filter(Boolean));
  const frameRatio = meaningFrames.size / posts.length;
  const stanceRatio = stanceSignals.size / Math.max(1, posts.length);
  return round(clamp(frameRatio * 0.6 + stanceRatio * 0.4));
}

function computeNaturalnessScore(posts) {
  if (!posts || posts.length === 0) return 0;

  const scores = posts.map(post => {
    const body = post.body || post.content || "";
    if (!body) return 0;

    let score = 0.5;
    // Penalize very short or very long posts
    if (body.length >= 20 && body.length <= 500) score += 0.2;
    else if (body.length < 10 || body.length > 1000) score -= 0.15;

    // Reward Korean content
    const koreanChars = (body.match(/[가-힣]/g) || []).length;
    if (koreanChars / body.length > 0.3) score += 0.15;

    // Penalize repetitive patterns
    const sentences = body.split(/[.!?。\n]+/).filter(s => s.trim());
    if (sentences.length >= 2) {
      const uniqueStarts = new Set(sentences.map(s => s.trim().slice(0, 6)));
      if (uniqueStarts.size / sentences.length < 0.5) score -= 0.2;
    }

    return clamp(score);
  });

  return round(average(scores));
}

function computeCoherenceScore(agents, posts) {
  if (!agents || agents.length === 0) return 0;

  const scores = agents.map(agent => {
    const agentPosts = (posts || []).filter(p => p.agent_id === agent.agent_id);
    if (agentPosts.length === 0) return 0.5;

    let score = 0.5;
    // Check if posts align with agent's archetype
    const archetype = agent.archetype || "";
    if (archetype.includes("quiet") && agentPosts.length <= 1) score += 0.2;
    if (archetype.includes("social") && agentPosts.length >= 1) score += 0.15;

    // Check belief/interest alignment
    const interests = Object.keys(agent.interest_vector || {});
    for (const post of agentPosts) {
      const frame = post.meaning_frame || "";
      if (interests.some(i => frame.toLowerCase().includes(i.toLowerCase()))) {
        score += 0.1;
      }
    }

    return clamp(score);
  });

  return round(average(scores));
}

function generateHeuristicRecommendations(diversity, naturalness, coherence) {
  const recs = [];

  if (diversity < 0.3) {
    recs.push({
      area: "diversity",
      severity: "high",
      message: "의미 프레임과 입장 신호의 다양성이 낮습니다. 에이전트 아키타입 분포를 확인하세요.",
    });
  } else if (diversity < 0.5) {
    recs.push({
      area: "diversity",
      severity: "medium",
      message: "다양성이 보통입니다. 반대 성향 에이전트를 추가하면 개선될 수 있습니다.",
    });
  }

  if (naturalness < 0.4) {
    recs.push({
      area: "naturalness",
      severity: "high",
      message: "생성된 글의 자연스러움이 낮습니다. 프롬프트 품질이나 말투 프로필을 점검하세요.",
    });
  }

  if (coherence < 0.4) {
    recs.push({
      area: "coherence",
      severity: "high",
      message: "에이전트 행동과 프로필 간 일관성이 낮습니다. 아이덴티티 업데이트 규칙을 확인하세요.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      area: "overall",
      severity: "info",
      message: "시뮬레이션 품질이 양호합니다. 인구 확장이나 외부 이벤트 주입을 고려하세요.",
    });
  }

  return recs;
}

/**
 * Evaluate a simulation round using heuristic metrics.
 * No LLM required.
 */
export function evaluateRoundHeuristic({ agents = [], posts = [], tickMetrics = [] } = {}) {
  const diversity = computeDiversityScore(posts);
  const naturalness = computeNaturalnessScore(posts);
  const coherence = computeCoherenceScore(agents, posts);
  const overall = round(clamp(diversity * 0.35 + naturalness * 0.35 + coherence * 0.3));

  const lastTick = tickMetrics[tickMetrics.length - 1] || {};

  return {
    method: "heuristic",
    scores: {
      diversity,
      naturalness,
      coherence,
      overall,
      identityDifferentiation: lastTick.identityDifferentiation ?? null,
      conflictHeat: lastTick.conflictHeat ?? null,
    },
    recommendations: generateHeuristicRecommendations(diversity, naturalness, coherence),
    agentCount: agents.length,
    postCount: posts.length,
    evaluatedAt: new Date().toISOString(),
  };
}

// ── LLM-based evaluator ─────────────────────────────────────────────────────

function buildEvaluationPrompt({ agents, posts, heuristicResult }) {
  const agentSummary = agents.slice(0, 10).map(a =>
    `- ${a.handle} (${a.archetype}): 관심사 ${Object.keys(a.interest_vector || {}).slice(0, 3).join(", ")}`
  ).join("\n");

  const postSummary = posts.slice(0, 8).map(p =>
    `- [${p.agent_id}] "${(p.body || p.content || "").slice(0, 80)}..." (${p.meaning_frame}, ${p.stance_signal})`
  ).join("\n");

  return `당신은 AI 패션 포럼 시뮬레이션의 품질 평가 에이전트입니다.
아래는 이번 라운드의 시뮬레이션 요약입니다. 평가해주세요.

## 에이전트 요약 (${agents.length}명)
${agentSummary}

## 생성된 글 요약 (${posts.length}개)
${postSummary}

## 자동 측정 점수
- 다양성: ${heuristicResult.scores.diversity}
- 자연스러움: ${heuristicResult.scores.naturalness}
- 일관성: ${heuristicResult.scores.coherence}
- 종합: ${heuristicResult.scores.overall}

## 요청
다음 JSON 형식으로 평가 결과를 반환해주세요:
{
  "overall_assessment": "한 줄 종합 평가",
  "strengths": ["강점 1", "강점 2"],
  "weaknesses": ["약점 1", "약점 2"],
  "recommendations": ["개선 제안 1", "개선 제안 2"],
  "adjusted_scores": {
    "diversity": 0.0~1.0,
    "naturalness": 0.0~1.0,
    "coherence": 0.0~1.0
  }
}

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;
}

function parseLLMEvaluation(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      overall_assessment: parsed.overall_assessment || "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      adjusted_scores: {
        diversity: round(clamp(Number(parsed.adjusted_scores?.diversity) || 0)),
        naturalness: round(clamp(Number(parsed.adjusted_scores?.naturalness) || 0)),
        coherence: round(clamp(Number(parsed.adjusted_scores?.coherence) || 0)),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Evaluate a simulation round using LLM + heuristic baseline.
 * Falls back to heuristic-only if LLM call fails or no API key.
 */
export async function evaluateSimulationRound({
  agents = [],
  posts = [],
  tickMetrics = [],
  provider,
  apiKey,
  model,
  fetchImpl,
} = {}) {
  const heuristicResult = evaluateRoundHeuristic({ agents, posts, tickMetrics });

  const llmConfig = resolveLLMConfig();
  const resolvedApiKey = apiKey ?? llmConfig.apiKey;

  if (!resolvedApiKey) {
    return heuristicResult;
  }

  const resolvedProvider = provider || llmConfig.provider;
  const resolvedModel = model || llmConfig.model;

  try {
    const prompt = buildEvaluationPrompt({ agents, posts, heuristicResult });
    const result = await requestLLMContexts({
      provider: resolvedProvider,
      apiKey: resolvedApiKey,
      model: resolvedModel,
      prompt,
      fetchImpl,
    });

    const text = extractLLMResponseText(result, resolvedProvider);
    const llmEval = parseLLMEvaluation(text);

    if (!llmEval) {
      return { ...heuristicResult, llmFallback: true, llmRawText: text };
    }

    return {
      method: "llm",
      provider: resolvedProvider,
      scores: {
        diversity: llmEval.adjusted_scores.diversity,
        naturalness: llmEval.adjusted_scores.naturalness,
        coherence: llmEval.adjusted_scores.coherence,
        overall: round(clamp(
          llmEval.adjusted_scores.diversity * 0.35 +
          llmEval.adjusted_scores.naturalness * 0.35 +
          llmEval.adjusted_scores.coherence * 0.3
        )),
        heuristic: heuristicResult.scores,
      },
      llmAssessment: {
        overall: llmEval.overall_assessment,
        strengths: llmEval.strengths,
        weaknesses: llmEval.weaknesses,
      },
      recommendations: llmEval.recommendations.map(r => ({
        area: "llm",
        severity: "info",
        message: r,
      })),
      agentCount: agents.length,
      postCount: posts.length,
      evaluatedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ...heuristicResult,
      llmError: err.message,
    };
  }
}
