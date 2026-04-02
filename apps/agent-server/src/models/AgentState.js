import mongoose from "mongoose";

const { Schema } = mongoose;

// Stores per-round snapshots of each agent's taste identity.
// Mirrors the structure of SPRINT1_ROUND_SNAPSHOTS in shared-types.
const agentStateSchema = new Schema(
  {
    snapshotId: { type: String, index: true },
    agentId: { type: String, required: true, index: true },
    round: { type: Number, required: true },
    tick: { type: Number, required: true },
    sourceActionId: { type: String },
    characterContractId: { type: String, index: true },
    appliedCharacter: { type: Schema.Types.Mixed },
    executionStatus: { type: String, default: "success" },
    writebackIds: [{ type: String }],
    handle: { type: String },
    display_name: { type: String },
    avatar_url: { type: String },
    avatar_locale: { type: String },
    interest_vector: { type: Schema.Types.Mixed },
    belief_vector: { type: Schema.Types.Mixed },
    openness: { type: Number },
    conformity: { type: Number },
    conflict_tolerance: { type: Number },
    relationship_summary: { type: Schema.Types.Mixed },
    // seed axes (curiosity, status_drive, etc.)
    seedAxes: { type: Map, of: Number },
    // mutable axes (attention_bias, belief_shift, etc.)
    mutableAxes: { type: Map, of: Number },
    archetype: { type: String },
    // recent + durable memories snapshot
    recentMemories: [{ type: Schema.Types.Mixed }],
    durableMemories: [{ type: Schema.Types.Mixed }],
    selfNarratives: [{ type: Schema.Types.Mixed }],
    memoryWritebacks: [{ type: Schema.Types.Mixed }],
    // summary of this round's exposure
    exposureSummary: { type: Schema.Types.Mixed },
    // summary of reactions made this round
    reactionSummary: { type: Schema.Types.Mixed },
    // raw snapshot for replay
    rawSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

agentStateSchema.index({ agentId: 1, round: 1 }, { unique: true });

export const AgentState = mongoose.model("AgentState", agentStateSchema);
