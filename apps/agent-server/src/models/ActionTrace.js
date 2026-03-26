import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * ActionTrace — agent가 수행한 모든 행동의 전체 추적 기록.
 * Interaction 모델이 사용자 관점이라면, ActionTrace는 agent 관점의 행동 로그.
 */
const actionTraceSchema = new Schema(
  {
    actionId: { type: String, required: true, unique: true }, // "ACT:{agentId}:{tick}:{type}"
    agentId: { type: String, required: true, index: true },
    tick: { type: Number, required: true },
    round: { type: Number },
    actionType: {
      type: String,
      enum: ["silence", "lurk", "react", "comment", "post"],
      required: true,
    },
    visibility: {
      type: String,
      enum: ["stored_only", "public_lightweight", "public_visible"],
    },
    executionStatus: {
      type: String,
      enum: ["success", "degraded", "blocked", "invalid", "failed"],
      default: "success",
    },
    blockReason: { type: String },
    errorClass: { type: String },
    targetContentId: { type: String }, // postId or contentRecord id
    sourceType: { type: String },       // "forum_post" | "external_article" | etc.
    topicAffinity: { type: Number },
    contradictionPath: {
      type: String,
      enum: ["reinforce", "reconsideration", "backlash", "ignore"],
    },
    payload: { type: Schema.Types.Mixed },
    persistence: { type: Schema.Types.Mixed },
    // resulting artifact (if post/comment was created)
    artifactId: { type: String },       // Post._id or Comment._id
    artifactType: { type: String },     // "post" | "comment"
  },
  { timestamps: true }
);

actionTraceSchema.index({ agentId: 1, tick: 1 });
actionTraceSchema.index({ actionType: 1, createdAt: -1 });
actionTraceSchema.index({ round: 1, agentId: 1 });

export const ActionTrace = mongoose.model("ActionTrace", actionTraceSchema);
