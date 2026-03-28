/**
 * moderation-decision.js
 *
 * Functions for recording moderation decisions and managing appeals.
 *
 * Part of Issue #275-3: Decision audit log & appeal integration
 */

import { ModerationDecision } from "../models/ModerationDecision.js";
import { Feedback } from "../models/Feedback.js";

/**
 * Record a moderation decision to audit log
 *
 * @param {Object} input - Decision data
 * @returns {Promise<Object>} Saved ModerationDecision document
 */
export async function recordModerationDecision(input = {}) {
  const {
    postId,
    authorId,
    decisionType,
    decision,
    reason,
    reasoning,
    score,
    escalated = false,
    escalationSeverity = null,
    escalationNotificationId = null,
    decidedBy = "system",
    contentSnapshot = "",
    tags = [],
  } = input;

  const moderationDecision = new ModerationDecision({
    postId,
    authorId,
    decisionType,
    decision,
    reason,
    reasoning,
    score,
    escalated,
    escalationSeverity,
    escalationNotificationId,
    decidedBy,
    decidedAt: new Date(),
    context: {
      contentSnapshot,
      tags,
    },
  });

  return moderationDecision.save();
}

/**
 * Submit an appeal for a moderation decision
 *
 * @param {Object} input - Appeal data
 * @returns {Promise<Object>} Updated ModerationDecision
 */
export async function submitAppeal(input = {}) {
  const { postId, userId, appealReason } = input;

  // Find the original decision
  const decision = await ModerationDecision.findOne({ postId });
  if (!decision) {
    throw new Error(`No moderation decision found for post: ${postId}`);
  }

  // Can only appeal if decision was removal or flagged
  if (decision.decision === "approved") {
    throw new Error("Cannot appeal an approved decision");
  }

  // Update decision record
  decision.appealed = true;
  decision.appealedAt = new Date();
  decision.appealedBy = userId;
  decision.appealReason = appealReason;
  decision.appealStatus = "pending";

  await decision.save();

  // Create feedback record for appeal tracking
  const feedback = new Feedback({
    userId,
    category: "moderation_appeal",
    targetId: postId,
    targetType: "post",
    message: appealReason,
    metadata: {
      originalDecision: decision.decision,
      decisionType: decision.decisionType,
      score: decision.score,
    },
    status: "pending",
  });

  await feedback.save();

  return {
    decision,
    feedback,
  };
}

/**
 * Review and decide on an appeal
 *
 * @param {Object} input - Appeal review data
 * @returns {Promise<Object>} Updated ModerationDecision
 */
export async function reviewAppeal(input = {}) {
  const { postId, operatorId, appealDecision, reasoning } = input;

  if (!["sustained", "overturned"].includes(appealDecision)) {
    throw new Error("appealDecision must be 'sustained' or 'overturned'");
  }

  const decision = await ModerationDecision.findOne({ postId });
  if (!decision) {
    throw new Error(`No moderation decision found for post: ${postId}`);
  }

  if (!decision.appealed) {
    throw new Error("This decision has not been appealed");
  }

  // Update decision
  decision.appealReviewedBy = operatorId;
  decision.appealReviewedAt = new Date();
  decision.appealDecision = appealDecision;

  // If overturned, revert original decision
  if (appealDecision === "overturned") {
    decision.decision = "approved";
  }

  decision.appealStatus = "reviewed";
  await decision.save();

  // Update feedback record
  await Feedback.findOneAndUpdate(
    {
      userId: decision.appealedBy,
      category: "moderation_appeal",
      targetId: postId,
    },
    {
      status: appealDecision === "overturned" ? "accepted" : "dismissed",
      reviewedBy: operatorId,
      reviewedAt: new Date(),
    }
  );

  return decision;
}

/**
 * Get audit log for a post (all decisions and appeals)
 *
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Complete audit trail
 */
export async function getAuditLog(postId) {
  const decision = await ModerationDecision.findOne({ postId }).lean();

  if (!decision) {
    return null;
  }

  // Get associated feedback
  const appeals = await Feedback.find({
    category: "moderation_appeal",
    targetId: postId,
  }).lean();

  return {
    decision,
    appeals,
    timeline: buildTimeline(decision, appeals),
  };
}

/**
 * Build chronological timeline of events
 */
export function buildTimeline(decision, appeals) {
  const events = [
    {
      timestamp: decision.decidedAt,
      type: "decision",
      action: decision.decision,
      actor: decision.decidedBy,
      details: {
        reason: decision.reason,
        score: decision.score,
        decisionType: decision.decisionType,
      },
    },
  ];

  if (decision.escalated) {
    events.push({
      timestamp: decision.escalationAcknowledgedAt,
      type: "escalation_acknowledged",
      actor: "operator",
      details: {
        severity: decision.escalationSeverity,
      },
    });

    if (decision.escalationActionTakenAt) {
      events.push({
        timestamp: decision.escalationActionTakenAt,
        type: "escalation_action",
        actor: decision.decidedBy,
        details: {
          newDecision: decision.decision,
        },
      });
    }
  }

  if (decision.appealed) {
    events.push({
      timestamp: decision.appealedAt,
      type: "appeal_submitted",
      actor: decision.appealedBy,
      details: {
        reason: decision.appealReason,
      },
    });
  }

  if (decision.appealReviewedAt) {
    events.push({
      timestamp: decision.appealReviewedAt,
      type: "appeal_reviewed",
      actor: decision.appealReviewedBy,
      details: {
        decision: decision.appealDecision,
      },
    });
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);

  return events;
}

/**
 * Get appeal statistics for dashboard
 *
 * @returns {Promise<Object>} Appeal metrics
 */
export async function getAppealStatistics() {
  const [totalAppeals, pendingAppeals, overturnedAppeals] = await Promise.all([
    ModerationDecision.countDocuments({ appealed: true }),
    ModerationDecision.countDocuments({ appealed: true, appealStatus: "pending" }),
    ModerationDecision.countDocuments({ appealDecision: "overturned" }),
  ]);

  const overturnRate = totalAppeals > 0 ? (overturnedAppeals / totalAppeals) * 100 : 0;

  return {
    totalAppeals,
    pendingAppeals,
    overturnedAppeals,
    overturnRatePercent: overturnRate.toFixed(1),
  };
}

/**
 * Get decisions requiring review (appeals)
 *
 * @param {Object} options - { limit, status }
 * @returns {Promise<Array>} Pending appeals
 */
export async function getPendingAppeals(options = {}) {
  const { limit = 50, status = "pending" } = options;

  return ModerationDecision.find({
    appealed: true,
    appealStatus: status,
  })
    .sort({ appealedAt: -1 })
    .limit(limit)
    .lean();
}
