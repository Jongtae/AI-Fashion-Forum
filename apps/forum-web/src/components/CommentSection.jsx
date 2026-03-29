import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, createComment, deleteComment } from "../api/client.js";

const DEFAULT_USER = { id: "user-guest", type: "user" };

export default function CommentSection({ postId, currentUser = DEFAULT_USER, onUserActivity = () => {} }) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const addMutation = useMutation({
    mutationFn: (data) => createComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["latest-report"] });
      setText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["latest-report"] });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onUserActivity();
    addMutation.mutate({
      content: text.trim(),
      authorId: currentUser.id,
      authorType: currentUser.type,
    });
  }

  return (
    <div style={styles.container}>
      {isLoading && <p style={styles.loading}>댓글을 불러오는 중…</p>}
      {comments.map((c) => (
        <div key={c._id} style={styles.comment}>
          <span style={styles.author}>
            {c.authorType === "agent" ? "🤖 " : "👤 "}
            {c.authorId}
          </span>
          {c.replyTargetType && (
            <div style={styles.replyMeta}>
              ↪ {c.replyTargetType === "comment" ? `@${c.replyTargetAuthorId || "comment"}의 답글` : "글 본문"}
            </div>
          )}
          <p style={styles.text}>{c.content}</p>
          {c.generationContext?.summary && (
            <div style={styles.generationContext}>
              <div style={styles.generationContextTitle}>작성 배경</div>
              <div style={styles.generationContextSummary}>{c.generationContext.summary}</div>
            </div>
          )}
          {c.authorId === currentUser.id && (
          <button
              onClick={() => {
                onUserActivity();
                deleteMutation.mutate(c._id);
              }}
              style={styles.deleteBtn}
              disabled={deleteMutation.isPending}
          >
              지우기
            </button>
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit} style={styles.form}>
          <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="댓글을 남겨보세요…"
          style={styles.input}
          disabled={addMutation.isPending}
        />
        <button
          type="submit"
          style={styles.btn}
          disabled={addMutation.isPending || !text.trim()}
        >
          {addMutation.isPending ? "…" : "등록"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { paddingTop: 12 },
  loading: { fontSize: 13, color: "#9ca3af" },
  comment: { padding: "8px 0", borderTop: "1px solid #f3f4f6" },
  author: { fontSize: 12, fontWeight: 600, color: "#6b7280" },
  replyMeta: { marginTop: 4, fontSize: 11, color: "#9ca3af" },
  text: { margin: "4px 0 0", fontSize: 14, color: "#374151" },
  generationContext: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 6,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  generationContextTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 3,
  },
  generationContextSummary: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 1.5,
    marginBottom: 2,
  },
  deleteBtn: {
    fontSize: 11,
    color: "#ef4444",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  form: { display: "flex", gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    color: "#111827",
    background: "#fff",
  },
  btn: {
    padding: "7px 14px",
    background: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
  },
};
