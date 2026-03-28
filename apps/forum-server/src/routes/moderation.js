import { Router } from "express";
import {
  scoreModerationText,
  classifyDecisionType,
  checkSelfHarmEscalation,
  generateAuthorFeedback,
} from "../lib/moderation.js";

const router = Router();

// ── POST /api/moderation/filter ──────────────────────────────────────────────
// Real-time content filtering API.
// Input: { content, tags } → Output: { allowed, score, label, reasons, categories, decisionType }

router.post("/filter", async (req, res) => {
  const { content, tags } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "content (string) is required" });
  }

  if (content.trim().length === 0) {
    return res.status(400).json({ error: "content cannot be empty" });
  }

  const evaluation = scoreModerationText({
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
  });

  // Classify decision type
  const decisionType = classifyDecisionType(evaluation);

  // Check for self-harm escalation
  const escalation = checkSelfHarmEscalation(evaluation);

  res.json({
    allowed: !evaluation.shouldFlag,
    score: evaluation.score,
    label: evaluation.label,
    reasons: evaluation.reasons,
    categories: evaluation.dominantCategories,
    decisionType: decisionType.type,
    decisionAction: decisionType.action,
    decisionConfidence: decisionType.confidence,
    escalation: escalation.shouldEscalate
      ? {
          severity: escalation.severity,
          reason: escalation.escalationReason,
          action: escalation.action,
        }
      : null,
    modelVersion: "prototype-v1",
  });
});

// ── POST /api/moderation/evaluate ────────────────────────────────────────────
// Full moderation evaluation with decision classification and author feedback
// Input: { content, tags } → Output: { evaluation, decision, feedback, escalation }

router.post("/evaluate", async (req, res) => {
  const { content, tags } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "content (string) is required" });
  }

  const evaluation = scoreModerationText({
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
  });

  const decisionType = classifyDecisionType(evaluation);
  const escalation = checkSelfHarmEscalation(evaluation);

  const feedback = generateAuthorFeedback({
    type: decisionType.type,
    evaluation,
  });

  res.json({
    evaluation: {
      score: evaluation.score,
      label: evaluation.label,
      categories: evaluation.dominantCategories,
      reasons: evaluation.reasons,
    },
    decision: {
      type: decisionType.type,
      action: decisionType.action,
      confidence: decisionType.confidence,
      reason: decisionType.reason,
    },
    feedback: {
      message: feedback.message,
      category: feedback.category,
      actionable: feedback.actionable,
    },
    escalation: escalation.shouldEscalate
      ? {
          severity: escalation.severity,
          action: escalation.action,
          reason: escalation.escalationReason,
        }
      : null,
  });
});

export default router;
