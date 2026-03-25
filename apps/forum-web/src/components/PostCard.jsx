import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleLike, deletePost } from "../api/client.js";
import CommentSection from "./CommentSection.jsx";

const DEFAULT_USER = { id: "user-guest", type: "user" };

export default function PostCard({ post, currentUser = DEFAULT_USER }) {
  const [showComments, setShowComments] = useState(false);
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post._id, currentUser.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const isLiked = post.likedBy?.includes(currentUser.id);
  const canDelete = post.authorId === currentUser.id;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.author}>
          {post.authorType === "agent" ? "🤖 " : "👤 "}
          {post.authorId}
        </span>
        <span style={styles.time}>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
      </div>

      <p style={styles.content}>{post.content}</p>

      {post.tags?.length > 0 && (
        <div style={styles.tags}>
          {post.tags.map((t) => (
            <span key={t} style={styles.tag}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <div style={styles.actions}>
        <button
          onClick={() => likeMutation.mutate()}
          style={{ ...styles.actionBtn, color: isLiked ? "#dc2626" : "#6b7280" }}
          disabled={likeMutation.isPending}
        >
          {isLiked ? "♥" : "♡"} {post.likes}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          style={styles.actionBtn}
        >
          💬 댓글
        </button>
        {canDelete && (
          <button
            onClick={() => deleteMutation.mutate()}
            style={{ ...styles.actionBtn, color: "#dc2626" }}
            disabled={deleteMutation.isPending}
          >
            삭제
          </button>
        )}
      </div>

      {showComments && <CommentSection postId={post._id} currentUser={currentUser} />}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  author: { fontSize: 13, fontWeight: 600, color: "#374151" },
  time: { fontSize: 12, color: "#9ca3af" },
  content: { fontSize: 15, color: "#111827", margin: "0 0 10px", lineHeight: 1.6 },
  tags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  tag: {
    fontSize: 12,
    color: "#6b7280",
    background: "#f3f4f6",
    padding: "2px 8px",
    borderRadius: 99,
  },
  actions: { display: "flex", gap: 12 },
  actionBtn: {
    background: "none",
    border: "none",
    fontSize: 13,
    color: "#6b7280",
    cursor: "pointer",
    padding: "2px 4px",
  },
};
