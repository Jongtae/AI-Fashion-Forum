import mongoose from "mongoose";

const { Schema } = mongoose;

const postSchema = new Schema(
  {
    content: { type: String, required: true },
    authorId: { type: String, required: true }, // userId or agentId
    authorType: { type: String, enum: ["user", "agent"], required: true },
    tags: [{ type: String }],
    imageUrls: [{ type: String }],
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }], // list of userIds
    format: { type: String }, // CONTENT_FORMATS from shared-types
    // agent-generated post metadata
    agentRound: { type: Number },
    agentTick: { type: Number },
  },
  { timestamps: true }
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);
