import { Router } from "express";
import {
  scoreModerationText,
  classifyDecisionType,
  checkSelfHarmEscalation,
  generateAuthorFeedback,
} from "../lib/moderation.js";
import {
  recordModerationDecision,
  submitAppeal,
  reviewAppeal,
  getAuditLog,
  getAppealStatistics,
  getPendingAppeals,
} from "../lib/moderation-decision.js";

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

// ── POST /api/moderation/appeals ─────────────────────────────────────────────────
// Submit an appeal for a moderation decision
//
// Request Body:
//   - postId: post ID (required)
//   - userId: user ID submitting appeal (required)
//   - appealReason: explanation for appeal (required)

router.post("/appeals", async (req, res) => {
  const { postId, userId, appealReason } = req.body;

  if (!postId || !userId || !appealReason) {
    return res
      .status(400)
      .json({ error: "postId, userId, and appealReason are required" });
  }

  try {
    const { decision, feedback } = await submitAppeal({
      postId,
      userId,
      appealReason,
    });

    res.json({
      success: true,
      decisionId: decision._id,
      feedbackId: feedback._id,
      message: "Appeal submitted and is pending review",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/moderation/audit/:postId ────────────────────────────────────────────
// Get complete audit log for a post (all decisions and appeals)

router.get("/audit/:postId", async (req, res) => {
  try {
    const auditLog = await getAuditLog(req.params.postId);

    if (!auditLog) {
      return res.status(404).json({ error: "No moderation decisions found for this post" });
    }

    res.json(auditLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/moderation/appeals/pending ──────────────────────────────────────────
// Get pending appeals awaiting operator review

router.get("/appeals/pending", async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    const appeals = await getPendingAppeals({
      limit: Math.min(parseInt(limit) || 50, 500),
      status: "pending",
    });

    res.json({
      appeals,
      total: appeals.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/moderation/appeals/:postId ────────────────────────────────────────
// Review and decide on an appeal
//
// Request Body:
//   - operatorId: operator ID (required)
//   - appealDecision: "sustained"|"overturned" (required)
//   - reasoning: optional explanation

router.patch("/appeals/:postId", async (req, res) => {
  const { postId } = req.params;
  const { operatorId, appealDecision, reasoning } = req.body;

  if (!operatorId || !appealDecision) {
    return res.status(400).json({ error: "operatorId and appealDecision are required" });
  }

  try {
    const decision = await reviewAppeal({
      postId,
      operatorId,
      appealDecision,
      reasoning,
    });

    res.json({
      success: true,
      decision: {
        postId: decision.postId,
        finalDecision: decision.decision,
        appealDecision: decision.appealDecision,
        reviewedBy: decision.appealReviewedBy,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/moderation/appeals/stats ────────────────────────────────────────────
// Get appeal statistics for operator dashboard

router.get("/appeals/stats", async (req, res) => {
  try {
    const stats = await getAppealStatistics();

    res.json({
      appeals: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
