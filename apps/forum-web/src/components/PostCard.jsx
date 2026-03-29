import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost, toggleLike } from "../api/client.js";
import CommentSection from "./CommentSection.jsx";
import { localizeLabel } from "../lib/localized-labels.js";

const DEFAULT_USER = { id: "user-guest", type: "user" };

function formatPostTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function GenerationContextBlock({ context }) {
  if (!context) return null;

  return (
    <div style={styles.generationContext}>
      <div style={styles.generationContextTitle}>작성 배경</div>
      {context.summary && <div style={styles.generationContextSummary}>{context.summary}</div>}
    </div>
  );
}

export default function PostCard({
  post,
  currentUser = DEFAULT_USER,
  onSelectPost,
  onUserActivity = () => {},
  onTagClick = () => {},
  readOnly = false,
}) {
  const [showComments, setShowComments] = useState(false);
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post._id, currentUser.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
    },
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
        <span style={styles.time}>{formatPostTime(post.createdAt)}</span>
      </div>

      <p
        style={{
          ...styles.content,
          cursor: !readOnly && onSelectPost ? "pointer" : "default",
        }}
        onClick={() => {
          if (readOnly) return;
          onUserActivity();
          onSelectPost?.(post._id);
        }}
        >
        {post.content}
      </p>

      <GenerationContextBlock context={post.generationContext} />

      {post.tags?.length > 0 && (
        <div style={styles.tags}>
          {post.tags.map((t) => (
            readOnly ? (
              <span key={t} style={styles.tagBtn}>
                #{localizeLabel(t)}
              </span>
            ) : (
              <button
                key={t}
                type="button"
                style={styles.tagBtn}
                onClick={() => {
                  onUserActivity();
                  onTagClick(t);
                }}
              >
                #{localizeLabel(t)}
              </button>
            )
          ))}
        </div>
      )}

      {!readOnly && (
        <>
          <div style={styles.actions}>
            <button
              onClick={() => {
                onUserActivity();
                likeMutation.mutate();
              }}
              style={{ ...styles.actionBtn, color: isLiked ? "#dc2626" : "#6b7280" }}
              disabled={likeMutation.isPending}
            >
              {isLiked ? "♥" : "♡"} {post.likes}
            </button>
            <button
              onClick={() => {
                onUserActivity();
                setShowComments((v) => !v);
              }}
              style={styles.actionBtn}
            >
              💬 댓글 보기
            </button>
            {canDelete && (
              <button
                onClick={() => {
                  onUserActivity();
                  deleteMutation.mutate();
                }}
                style={{ ...styles.actionBtn, color: "#dc2626" }}
                disabled={deleteMutation.isPending}
              >
                글 삭제
              </button>
            )}
          </div>

          {showComments && (
            <CommentSection postId={post._id} currentUser={currentUser} onUserActivity={onUserActivity} />
          )}
        </>
      )}
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
  author: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  },
  time: { fontSize: 12, color: "#9ca3af" },
  content: { fontSize: 15, color: "#111827", margin: "0 0 10px", lineHeight: 1.6 },
  generationContext: {
    marginBottom: 10,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  generationContextTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    letterSpacing: "0.01em",
    marginBottom: 4,
  },
  generationContextSummary: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
    marginBottom: 2,
  },
  tags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  tagBtn: {
    fontSize: 12,
    color: "#6b7280",
    background: "#f3f4f6",
    padding: "2px 8px",
    borderRadius: 99,
    border: "1px solid transparent",
    cursor: "pointer",
    appearance: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
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
