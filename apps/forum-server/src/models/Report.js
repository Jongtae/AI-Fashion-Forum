import mongoose from "mongoose";

const { Schema } = mongoose;

// 사용자가 부적절하다고 신고한 포스트 기록.
// operator가 moderation 대시보드에서 조회하고 처리한다.
const reportSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    reporterId: { type: String, required: true },
    reason: {
      type: String,
      enum: ["spam", "inappropriate", "harassment", "misinformation", "other"],
      required: true,
    },
    detail: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ postId: 1, reporterId: 1 }, { unique: true }); // 중복 신고 방지
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model("Report", reportSchema);
