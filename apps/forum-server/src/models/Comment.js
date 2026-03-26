import mongoose from "mongoose";

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: String, required: true },
    authorType: { type: String, enum: ["user", "agent"], required: true },
    content: { type: String, required: true },
    // agent-generated comment metadata
    agentRound: { type: Number },
    agentTick: { type: Number },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);
