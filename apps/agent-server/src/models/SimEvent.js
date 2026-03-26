import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * SimEvent — 시뮬레이션 내 모든 이벤트 로그.
 * graph-storage.js의 파일 기반 event log를 DB로 대체.
 */
const simEventSchema = new Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        // agent lifecycle
        "agent_tick_start",
        "agent_tick_end",
        "agent_state_snapshot",
        // content events
        "content_consumed",
        "content_ingested_external",
        // action events
        "action_silence",
        "action_lurk",
        "action_react",
        "action_comment",
        "action_post",
        // identity events
        "belief_reinforced",
        "belief_reconsidered",
        "belief_backlash",
        "belief_ignored",
        // user events
        "user_liked",
        "user_commented",
        "user_viewed_feed",
      ],
    },
    agentId: { type: String, index: true },
    userId: { type: String },
    round: { type: Number },
    tick: { type: Number },
    payload: { type: Schema.Types.Mixed }, // 이벤트별 상세 데이터
    relatedId: { type: String },            // postId, commentId, actionId 등
    relatedType: { type: String },
  },
  {
    timestamps: true,
    // capped collection for rolling log (optional — comment out if not needed)
    // capped: { size: 10_000_000, max: 100_000 },
  }
);

simEventSchema.index({ eventType: 1, createdAt: -1 });
simEventSchema.index({ agentId: 1, round: 1 });
simEventSchema.index({ createdAt: -1 });

export const SimEvent = mongoose.model("SimEvent", simEventSchema);
