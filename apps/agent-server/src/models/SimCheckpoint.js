import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * SimCheckpoint — simulation state checkpoint for save/restore.
 * Stores a full tick-engine state snapshot at a specific tick so
 * simulations can be paused and resumed.
 */
const simCheckpointSchema = new Schema(
  {
    checkpointId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    simulationId: {
      type: String,
      required: true,
      index: true,
    },
    seed: { type: Number, required: true },
    tick: { type: Number, required: true },
    tickCount: { type: Number, required: true },
    finalTick: { type: Number, required: true },
    stateSnapshot: { type: Schema.Types.Mixed, required: true },
    entries: [Schema.Types.Mixed],
    label: { type: String, default: "" },
    restoredFrom: { type: String, default: null },
  },
  { timestamps: true }
);

simCheckpointSchema.index({ simulationId: 1, tick: -1 });
simCheckpointSchema.index({ createdAt: -1 });

export const SimCheckpoint = mongoose.model("SimCheckpoint", simCheckpointSchema);
