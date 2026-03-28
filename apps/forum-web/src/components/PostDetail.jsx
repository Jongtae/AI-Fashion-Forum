import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPost, toggleLike, deletePost } from "../api/client.js";
import CommentSection from "./CommentSection.jsx";

const DEFAULT_USER = { id: "user-guest", type: "user" };

export default function PostDetail({ postId, currentUser = DEFAULT_USER, onBack }) {
  const queryClient = useQueryClient();

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => fetchPost(postId),
  });

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(postId, currentUser.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post", postId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      onBack();
    },
  });

  if (isLoading) {
    return <div style={styles.container}><p style={styles.msg}>포스트 불러오는 중…</p></div>;
  }

  if (isError) {
    return (
      <div style={styles.container}>
        <p style={styles.error}>{error?.message || "오류가 발생했습니다."}</p>
        <button onClick={onBack} style={styles.backBtn}>← 돌아가기</button>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={styles.container}>
        <p style={styles.msg}>포스트를 찾을 수 없습니다.</p>
        <button onClick={onBack} style={styles.backBtn}>← 돌아가기</button>
      </div>
    );
  }

  const isLiked = post.likedBy?.includes(currentUser.id);
  const canDelete = post.authorId === currentUser.id;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← 돌아가기</button>
      </div>

      <article style={styles.article}>
        <div style={styles.postHeader}>
          <div>
            <span style={styles.author}>
              {post.authorType === "agent" ? "🤖 " : "👤 "}
              {post.authorId}
            </span>
            <span style={styles.time}>
              {new Date(post.createdAt).toLocaleString("ko-KR")}
            </span>
          </div>
          {canDelete && (
            <button
              onClick={() => deleteMutation.mutate()}
              style={{ ...styles.deleteBtn, color: "#dc2626" }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "삭제 중…" : "삭제"}
            </button>
          )}
        </div>

        <div style={styles.content}>
          {post.content}
        </div>

        {post.tags?.length > 0 && (
          <div style={styles.tags}>
            {post.tags.map((t) => (
              <span key={t} style={styles.tag}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {post.moderationStatus && (
          <div style={styles.moderation}>
            <span style={styles.status}>
              {post.moderationStatus === "approved" ? "✓" : "⚠"}
            </span>
            <span style={styles.score}>
              신뢰도: {(post.moderationScore || 0).toFixed(2)}
            </span>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={() => likeMutation.mutate()}
            style={{
              ...styles.actionBtn,
              color: isLiked ? "#dc2626" : "#6b7280",
            }}
            disabled={likeMutation.isPending}
          >
            {isLiked ? "♥" : "♡"} {post.likes}
          </button>
        </div>
      </article>

      <section style={styles.commentsSection}>
        <h3 style={styles.commentsTitle}>댓글 ({post.commentCount || 0})</h3>
        <CommentSection postId={postId} currentUser={currentUser} />
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "24px 16px",
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    background: "transparent",
    border: "none",
    fontSize: 14,
    color: "#3b82f6",
    cursor: "pointer",
    padding: "4px 0",
    textDecoration: "underline",
  },
  article: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  },
  postHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  author: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    marginRight: 12,
  },
  time: {
    fontSize: 13,
    color: "#9ca3af",
  },
  deleteBtn: {
    fontSize: 13,
    background: "transparent",
    border: "1px solid #dc2626",
    borderRadius: 4,
    padding: "4px 10px",
    cursor: "pointer",
    color: "#dc2626",
  },
  content: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 1.8,
    marginBottom: 16,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  tags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tag: {
    fontSize: 13,
    color: "#6b7280",
    background: "#f3f4f6",
    padding: "4px 12px",
    borderRadius: 99,
  },
  moderation: {
    display: "flex",
    gap: 8,
    fontSize: 12,
    color: "#6b7280",
    padding: "8px 12px",
    background: "#f9fafb",
    borderRadius: 6,
    marginBottom: 16,
  },
  status: {
    fontWeight: 600,
  },
  score: {
    marginLeft: "auto",
  },
  actions: {
    display: "flex",
    gap: 12,
  },
  actionBtn: {
    background: "none",
    border: "none",
    fontSize: 14,
    color: "#6b7280",
    cursor: "pointer",
    padding: "4px 0",
  },
  commentsSection: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 24,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
  },
  msg: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    padding: "24px 0",
  },
  error: {
    textAlign: "center",
    color: "#dc2626",
    fontSize: 14,
    padding: "16px 0",
  },
};
