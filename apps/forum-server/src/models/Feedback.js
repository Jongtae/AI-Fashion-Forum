import mongoose from "mongoose";

const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: [
        "bug",
        "suggestion",
        "moderation",
        "moderation_appeal",
        "satisfaction",
        "other",
      ],
      required: true,
      index: true,
    },
    targetId: { type: String },
    targetType: {
      type: String,
      enum: ["post", "comment", "agent", "feed", "system"],
      default: "system",
    },
    rating: { type: Number, min: 1, max: 5 },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "dismissed"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1, category: 1 });
feedbackSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
