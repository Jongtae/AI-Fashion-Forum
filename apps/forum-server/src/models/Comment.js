import mongoose from "mongoose";

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    authorId: { type: String, required: true },
    authorType: { type: String, enum: ["user", "agent"], required: true },
    authorDisplayName: { type: String },
    authorHandle: { type: String },
    authorAvatarUrl: { type: String },
    authorLocale: { type: String },
    content: { type: String, required: true },
    replyToCommentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    replyTargetType: { type: String, enum: ["post", "comment"] },
    replyTargetId: { type: String },
    replyTargetAuthorId: { type: String },
    replyTargetPreview: { type: String },
    generationContext: { type: Schema.Types.Mixed },
    // agent-generated comment metadata
    agentRound: { type: Number },
    agentTick: { type: Number },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);
