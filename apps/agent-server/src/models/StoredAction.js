import mongoose from "mongoose";

const { Schema } = mongoose;

const storedActionSchema = new Schema(
  {
    actionId: { type: String, required: true, unique: true, index: true },
    agentId: { type: String, required: true, index: true },
    round: { type: Number, required: true, index: true },
    tick: { type: Number, required: true },
    actionType: {
      type: String,
      enum: ["silence", "lurk", "react", "comment", "post"],
      required: true,
    },
    visibility: {
      type: String,
      enum: ["stored_only", "public_lightweight", "public_visible"],
      required: true,
    },
    executionStatus: {
      type: String,
      enum: ["success", "degraded", "blocked", "invalid", "failed"],
      required: true,
    },
    targetContentId: { type: String },
    artifactId: { type: String },
    artifactType: { type: String },
    persistence: { type: Schema.Types.Mixed },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

storedActionSchema.index({ agentId: 1, round: 1, tick: 1 });
storedActionSchema.index({ actionType: 1, createdAt: -1 });

export const StoredAction = mongoose.model("StoredAction", storedActionSchema);
