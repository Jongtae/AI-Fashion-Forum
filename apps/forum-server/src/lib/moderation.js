export const MODERATION_MODEL_VERSION = "prototype-v1";

const CATEGORY_RULES = [
  {
    category: "harassment",
    weight: 0.38,
    terms: ["stupid", "idiot", "trash", "loser", "죽어", "멍청", "꺼져", "병신"],
  },
  {
    category: "hate",
    weight: 0.42,
    terms: ["slur", "vermin", "혐오", "열등", "추방"],
  },
  {
    category: "sexual",
    weight: 0.36,
    terms: ["nude", "explicit", "sexual", "야동", "벗겨", "노출"],
  },
  {
    category: "scam",
    weight: 0.28,
    terms: ["crypto giveaway", "send money", "투자금", "즉시 입금", "사기"],
  },
  {
    category: "self_harm",
    weight: 0.45,
    terms: ["self harm", "kill myself", "자해", "극단적 선택"],
  },
];

function countMatches(text, term) {
  if (!term) return 0;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(escaped, "gi"));
  return matches ? matches.length : 0;
}

function calculateIntensitySignals(content) {
  const uppercaseChars = [...content].filter((char) => /[A-Z]/.test(char)).length;
  const exclamationChars = [...content].filter((char) => char === "!").length;
  const length = Math.max(content.length, 1);

  const uppercaseRatio = uppercaseChars / length;
  const exclamationRatio = exclamationChars / length;

  return {
    uppercaseRatio,
    exclamationRatio,
    intensityBoost: Math.min(0.18, uppercaseRatio * 0.35 + exclamationRatio * 0.6),
  };
}

export function scoreModerationText({ content = "", tags = [] } = {}) {
  const normalizedContent = content.toLowerCase();
  const normalizedTags = tags.map((tag) => String(tag).toLowerCase());
  const matchedTerms = [];
  let score = 0;

  for (const rule of CATEGORY_RULES) {
    let categoryMatches = 0;
    for (const term of rule.terms) {
      const matches = countMatches(normalizedContent, term);
      if (matches > 0) {
        categoryMatches += matches;
        matchedTerms.push({ category: rule.category, term, matches });
      }
    }

    if (normalizedTags.includes(rule.category)) {
      categoryMatches += 1;
      matchedTerms.push({ category: rule.category, term: `tag:${rule.category}`, matches: 1 });
    }

    if (categoryMatches > 0) {
      score += rule.weight + Math.min(0.24, (categoryMatches - 1) * 0.1);
    }
  }

  const intensitySignals = calculateIntensitySignals(content);
  score += intensitySignals.intensityBoost;

  const normalizedScore = Math.min(1, Number(score.toFixed(3)));
  const reasons = matchedTerms.map((match) => `${match.category}:${match.term}`);
  const dominantCategories = [...new Set(matchedTerms.map((match) => match.category))];

  return {
    score: normalizedScore,
    label: normalizedScore >= 0.45 ? "review" : "safe",
    shouldFlag: normalizedScore >= 0.45,
    reasons,
    dominantCategories,
    matchedTerms,
    intensitySignals,
  };
}

export function buildModerationState({ content = "", tags = [], existingStatus = "approved" } = {}) {
  const evaluation = scoreModerationText({ content, tags });

  return {
    moderationScore: evaluation.score,
    moderationLabel: evaluation.label,
    moderationReasons: evaluation.reasons,
    moderationCategories: evaluation.dominantCategories,
    moderationModelVersion: MODERATION_MODEL_VERSION,
    moderationEvaluatedAt: new Date(),
    moderationStatus:
      existingStatus === "removed" ? "removed" : evaluation.shouldFlag ? "flagged" : "approved",
  };
}

/**
 * Classify moderation decision type based on score and categories.
 *
 * Type 1 (Clear): score >= 0.65 → auto-reject, high confidence
 * Type 2 (Borderline): 0.45 <= score < 0.65 → human review needed
 * Type 3 (Context-aware): score < 0.45 OR ambiguous categories → contextual review
 *
 * @param {Object} evaluation - Result from scoreModerationText()
 * @returns {Object} { type: "1"|"2"|"3", action: string, confidence: number }
 */
export function classifyDecisionType(evaluation = {}) {
  const { score = 0, dominantCategories = [] } = evaluation;

  // Type 1: Clear violation - auto-reject
  if (score >= 0.65) {
    return {
      type: "1",
      action: "auto_reject",
      confidence: Math.min(1, score),
      reason: "Clear violation detected with high confidence",
    };
  }

  // Type 2: Borderline - human review required
  if (score >= 0.45) {
    return {
      type: "2",
      action: "human_review",
      confidence: score,
      reason: "Borderline content - human judgment needed",
    };
  }

  // Type 3: Context-aware - assign to experienced reviewer
  return {
    type: "3",
    action: "context_review",
    confidence: 1 - score, // low score = high context-dependency
    reason: "Context-dependent content - assign to experienced reviewer",
  };
}

/**
 * Check for self-harm content and determine if escalation is needed.
 *
 * Self-harm escalation triggers:
 * 1. Self-harm category detected (always escalate)
 * 2. Score >= 0.65 with self-harm (immediate operator notification)
 * 3. Multiple self-harm terms (high intensity)
 *
 * @param {Object} evaluation - Result from scoreModerationText()
 * @returns {Object} { shouldEscalate: boolean, severity: "low"|"medium"|"high", action: string }
 */
export function checkSelfHarmEscalation(evaluation = {}) {
  const {
    score = 0,
    dominantCategories = [],
    matchedTerms = [],
    intensitySignals = {},
  } = evaluation;

  const hasSelfHarmCategory = dominantCategories.includes("self_harm");
  if (!hasSelfHarmCategory) {
    return {
      shouldEscalate: false,
      severity: "none",
      action: "no_escalation",
    };
  }

  // Count self-harm mentions
  const selfHarmMatches = matchedTerms.filter(
    (m) => m.category === "self_harm"
  );
  const selfHarmCount = selfHarmMatches.reduce((sum, m) => sum + m.matches, 0);

  // Determine severity
  let severity = "low";
  let shouldEscalate = true;

  if (score >= 0.65 || selfHarmCount >= 2) {
    severity = "high";
  } else if (score >= 0.55 || selfHarmCount >= 1) {
    severity = "medium";
  }

  // High intensity signals (all caps, excessive punctuation)
  const intensityBoost = intensitySignals.intensityBoost || 0;
  if (intensityBoost > 0.12) {
    severity = severity === "low" ? "medium" : "high";
  }

  return {
    shouldEscalate: true, // Always escalate self-harm
    severity,
    action: `immediate_notify_operator:${severity}`,
    escalationReason: `Self-harm detected with ${severity} severity (matches: ${selfHarmCount}, score: ${score.toFixed(2)})`,
  };
}

/**
 * Generate author feedback based on moderation decision.
 *
 * @param {Object} decision - { type, action, evaluation }
 * @returns {Object} { message: string, showPublicly: boolean, category: string }
 */
export function generateAuthorFeedback(decision = {}) {
  const { type = "3", evaluation = {} } = decision;
  const { score = 0, dominantCategories = [] } = evaluation;

  if (type === "1") {
    // Clear violation - brief explanation
    const category = dominantCategories[0] || "violation";
    const categoryLabel = {
      harassment: "harassment or bullying",
      hate: "hate speech",
      sexual: "sexual or explicit content",
      scam: "scam or fraud",
      self_harm: "self-harm content",
    }[category] || "community guidelines";

    return {
      message: `Your post was removed for containing ${categoryLabel}. Please review our community guidelines and try again.`,
      showPublicly: false,
      category: "removal_reason",
      actionable: true,
    };
  }

  if (type === "2") {
    // Borderline - suggest improvement
    return {
      message:
        "Your post has been flagged for review. While it may be acceptable, please consider rephrasing for clarity and to avoid misinterpretation.",
      showPublicly: false,
      category: "review_pending",
      actionable: false,
    };
  }

  // Type 3 - context-dependent
  return {
    message:
      "Your post is being reviewed for consistency with community standards. Thank you for your patience.",
    showPublicly: false,
    category: "review_pending",
    actionable: false,
  };
}
