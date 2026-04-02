import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, createComment, deleteComment } from "../api/client.js";
import AvatarImage from "./AvatarImage.jsx";

const DEFAULT_USER = { id: "user-guest", type: "user" };

export default function CommentSection({
  postId,
  currentUser = DEFAULT_USER,
  onUserActivity = () => {},
  replyTarget = null,
  onJumpToTarget = () => {},
}) {
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
      {replyTarget?.preview && (
        <div style={styles.replyTargetStrip}>
          답글 대상 · {replyTarget.type === "comment" ? "댓글" : "글"} ·{" "}
          {replyTarget.authorDisplayName || replyTarget.authorHandle || replyTarget.authorId || (replyTarget.type === "comment" ? "comment" : "post")}
        </div>
      )}
      {!isLoading && comments.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateTitle}>댓글이 아직 없습니다.</div>
        </div>
      )}
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
          {addMutation.isPending ? "…" : replyTarget?.preview ? "답글 등록" : "등록"}
        </button>
      </form>
      <div style={styles.commentList}>
        {comments.map((c) => (
          <div
            key={c._id}
            data-comment-id={c._id}
            style={{
              ...styles.commentCard,
              ...(c.replyTargetType ? styles.commentCardReply : {}),
            }}
          >
            <div style={styles.commentHeader}>
              <div style={styles.commentAuthorRow}>
                <AvatarImage
                  authorId={c.authorId}
                  authorType={c.authorType}
                  displayName={c.authorDisplayName}
                  avatarUrl={c.authorAvatarUrl}
                  avatarLocale={c.authorLocale}
                  handle={c.authorHandle}
                  size={28}
                />
                <div style={styles.author}>
                  {c.authorDisplayName || c.authorHandle || c.authorId}
                </div>
              </div>
              {c.replyTargetType && (
                <button
                  type="button"
                  style={styles.replyMetaBtn}
                  onClick={() => {
                    onUserActivity();
                    if (c.replyTargetType === "comment") {
                      const target = document.querySelector(`[data-comment-id="${c.replyToCommentId}"]`);
                      target?.scrollIntoView({ block: "center", behavior: "smooth" });
                      return;
                    }

                    onJumpToTarget("post");
                  }}
                >
                  ↪ {c.replyTargetType === "comment" ? `@${c.replyTargetAuthorId || "comment"}` : "글 본문"}
                </button>
              )}
            </div>
            <p style={styles.text}>{c.content}</p>
            <div style={styles.commentFooter}>
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
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { paddingTop: 12 },
  loading: { fontSize: 13, color: "#9ca3af" },
  emptyState: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "#faf7f2",
    border: "1px solid rgba(17,17,17,0.06)",
  },
  emptyStateTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
    marginBottom: 0,
  },
  replyTargetStrip: {
    marginBottom: 10,
    padding: "8px 12px",
    borderRadius: 12,
    background: "#f3f4f6",
    color: "#374151",
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  replyMetaBtn: {
    marginTop: 4,
    padding: 0,
    border: "none",
    background: "none",
    fontSize: 11,
    color: "#2563eb",
    cursor: "pointer",
    textAlign: "left",
  },
  commentList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    marginTop: 14,
  },
  commentCard: {
    padding: "12px 0 6px",
    borderRadius: 0,
    border: "none",
    background: "transparent",
  },
  commentCardReply: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeft: "1px solid rgba(17,17,17,0.08)",
    background: "transparent",
  },
  commentHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  commentAuthorRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  author: { fontSize: 13, fontWeight: 700, color: "#111827" },
  replyMeta: { marginTop: 4, fontSize: 11, color: "#9ca3af" },
  text: { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.65 },
  commentFooter: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 6,
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
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 14,
    fontSize: 13,
    color: "#111827",
    background: "#fff",
  },
  btn: {
    padding: "10px 16px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    fontSize: 13,
    cursor: "pointer",
  },
};
