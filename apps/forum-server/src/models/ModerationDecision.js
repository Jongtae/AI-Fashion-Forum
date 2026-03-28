import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * ModerationDecision
 *
 * Audit log for all moderation decisions (removal, approval, escalation).
 * Enables complete traceability and appeals process.
 *
 * Part of Issue #275-3: Decision audit log & appeal integration
 */
const moderationDecisionSchema = new Schema(
  {
    // Post reference
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    authorId: { type: String, required: true, index: true },

    // Decision details
    decisionType: {
      type: String,
      enum: ["1", "2", "3"],
      required: true,
      description: "Type 1: Clear, Type 2: Borderline, Type 3: Context-aware",
    },
    decision: {
      type: String,
      enum: ["approved", "flagged", "removed"],
      required: true,
      index: true,
    },
    reason: { type: String }, // Primary reason category (harassment, hate, etc.)
    reasoning: { type: String }, // Detailed explanation
    score: { type: Number, min: 0, max: 1 }, // Moderation score

    // Escalation tracking
    escalated: { type: Boolean, default: false, index: true },
    escalationSeverity: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    escalationNotificationId: { type: String }, // Reference to notification
    escalationAcknowledgedAt: { type: Date },
    escalationActionTakenAt: { type: Date },

    // Operator decision
    decidedBy: { type: String, index: true }, // operatorId or "system"
    decidedAt: { type: Date, required: true, default: Date.now },

    // Appeal information
    appealed: { type: Boolean, default: false, index: true },
    appealedAt: { type: Date },
    appealReason: { type: String },
    appealedBy: { type: String }, // userId
    appealStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },

    // Appeal review
    appealReviewedBy: { type: String }, // operatorId
    appealReviewedAt: { type: Date },
    appealDecision: { type: String }, // Decision on appeal (sustained, overturned)

    // Metadata
    context: {
      contentSnapshot: { type: String }, // Original content for audit
      tags: [String],
    },

    // Version
    modelVersion: {
      type: String,
      default: "prototype-v1",
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
moderationDecisionSchema.index({ postId: 1, createdAt: -1 });
moderationDecisionSchema.index({ authorId: 1, decision: 1, createdAt: -1 });
moderationDecisionSchema.index({ appealed: 1, appealStatus: 1 });
moderationDecisionSchema.index({ escalated: 1, escalationSeverity: 1 });

export const ModerationDecision = mongoose.model(
  "ModerationDecision",
  moderationDecisionSchema
);
