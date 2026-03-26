import mongoose from "mongoose";

const { Schema } = mongoose;

// Records every user-agent or user-content interaction event.
// Used by ranking-core and identity-update-rules for personalisation.
const interactionSchema = new Schema(
  {
    actorId: { type: String, required: true }, // userId or agentId
    actorType: { type: String, enum: ["user", "agent"], required: true },
    targetId: { type: String, required: true }, // postId, agentId, etc.
    targetType: {
      type: String,
      enum: ["post", "comment", "agent", "feed_slot"],
      required: true,
    },
    eventType: {
      type: String,
      enum: ["view", "like", "comment", "share", "click", "scroll_past"],
      required: true,
    },
    // optional context
    feedPosition: { type: Number }, // position in feed when interaction occurred
    durationMs: { type: Number },   // time spent on content
    agentId: { type: String },      // if the target was agent-generated
    round: { type: Number },
  },
  { timestamps: true }
);

interactionSchema.index({ actorId: 1, createdAt: -1 });
interactionSchema.index({ targetId: 1, eventType: 1 });
interactionSchema.index({ agentId: 1, round: 1 });

export const Interaction = mongoose.model("Interaction", interactionSchema);
