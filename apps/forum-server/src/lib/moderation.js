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
