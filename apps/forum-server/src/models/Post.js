import mongoose from "mongoose";

const { Schema } = mongoose;

const postSchema = new Schema(
  {
    title: { type: String },
    content: { type: String, required: true },
    authorId: { type: String, required: true }, // userId or agentId
    authorType: { type: String, enum: ["user", "agent"], required: true },
    authorDisplayName: { type: String },
    authorHandle: { type: String },
    authorAvatarUrl: { type: String },
    authorLocale: { type: String },
    tags: [{ type: String }],
    imageUrls: [{ type: String }],
    likes: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    likedBy: [{ type: String }], // list of userIds
    format: { type: String }, // CONTENT_FORMATS from shared-types
    generationContext: { type: Schema.Types.Mixed },
    // agent-generated post metadata
    agentRound: { type: Number },
    agentTick: { type: Number },
    // moderation
    moderationStatus: {
      type: String,
      enum: ["approved", "flagged", "removed"],
      default: "approved",
    },
    moderationLabel: {
      type: String,
      enum: ["safe", "review"],
      default: "safe",
    },
    moderationScore: { type: Number, default: 0 },
    moderationReasons: [{ type: String }],
    moderationCategories: [{ type: String }],
    moderationModelVersion: { type: String },
    moderationEvaluatedAt: { type: Date },
    // decision type classification (Type 1: clear, Type 2: borderline, Type 3: context-aware)
    moderationDecisionType: {
      type: String,
      enum: ["1", "2", "3"],
      default: "3",
    },
    // escalation flags
    escalated: { type: Boolean, default: false },
    escalationReason: { type: String },
    escalatedAt: { type: Date },
    escalatedBy: { type: String }, // operatorId
    // appeal process
    appealed: { type: Boolean, default: false },
    appealReason: { type: String },
    appealedAt: { type: Date },
    appealStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },
    // author feedback from moderation
    authorFeedback: {
      message: String,
      category: String, // "removal_reason", "review_pending"
      showPublicly: { type: Boolean, default: false },
      actionable: { type: Boolean, default: false },
      sentAt: { type: Date },
    },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ moderationStatus: 1 });
postSchema.index({ escalated: 1, escalatedAt: -1 });
postSchema.index({ appealed: 1, appealStatus: 1 });

export const Post = mongoose.model("Post", postSchema);
