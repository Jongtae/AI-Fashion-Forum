import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPost, toggleLike, deletePost, savePost, unsavePost } from "../api/client.js";
import CommentSection from "./CommentSection.jsx";
import { localizeLabel } from "../lib/localized-labels.js";
import { sharePostLink } from "../lib/post-sharing.js";

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

export default function PostDetail({
  postId,
  currentUser = DEFAULT_USER,
  onBack,
  onUserActivity = () => {},
  onTagClick = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
}) {
  const queryClient = useQueryClient();
  const [shareState, setShareState] = React.useState({ status: "idle", message: "" });

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ["post", postId, currentUser.id],
    queryFn: () => fetchPost(postId),
  });

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(postId, currentUser.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post", postId] }),
  });

  const saveMutation = useMutation({
    mutationFn: () => (post?.savedByCurrentUser ? unsavePost(postId) : savePost(postId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      onBack();
    },
  });

  async function handleShare() {
    onUserActivity();
    try {
      const result = await sharePostLink({
        postId,
        title: post?.content?.slice(0, 80),
      });
      setShareState({
        status: "success",
        message:
          result.method === "native"
            ? "공유 창을 열었어요"
            : result.method === "clipboard"
            ? "링크를 복사했어요"
            : "링크를 직접 복사해 주세요",
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      setShareState({ status: "error", message: "공유에 실패했어요" });
    }
  }

  if (isLoading) {
    return <div style={styles.container}><p style={styles.msg}>글을 불러오는 중…</p></div>;
  }

  if (isError) {
    return (
      <div style={styles.container}>
        <p style={styles.error}>{error?.message || "오류가 발생했습니다."}</p>
        <button
          onClick={() => {
            onUserActivity();
            onBack();
          }}
          style={styles.backBtn}
        >
          ← 돌아가기
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={styles.container}>
        <p style={styles.msg}>글을 찾을 수 없습니다.</p>
        <button
          onClick={() => {
            onUserActivity();
            onBack();
          }}
          style={styles.backBtn}
        >
          ← 돌아가기
        </button>
      </div>
    );
  }

  const isLiked = post.likedBy?.includes(currentUser.id);
  const canDelete = post.authorId === currentUser.id;
  const isSaved = Boolean(post.savedByCurrentUser);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => {
            onUserActivity();
            onBack();
          }}
          style={styles.backBtn}
        >
          ← 돌아가기
        </button>
      </div>

      <article style={styles.article}>
        <div style={styles.postHeader}>
          <div>
            <button
              type="button"
              style={styles.authorBtn}
              onClick={() => {
                onUserActivity();
                onAuthorClick({ id: post.authorId, type: post.authorType });
              }}
            >
              <span style={styles.author}>
                {post.authorType === "agent" ? "🤖 " : "👤 "}
                {post.authorId}
              </span>
            </button>
            <span style={styles.time}>{formatPostTime(post.createdAt)}</span>
          </div>
          {canDelete && (
            <button
            onClick={() => {
              onUserActivity();
              deleteMutation.mutate();
            }}
            style={{ ...styles.deleteBtn, color: "#dc2626" }}
            disabled={deleteMutation.isPending}
          >
              {deleteMutation.isPending ? "지우는 중…" : "글 삭제"}
            </button>
          )}
        </div>

        <div style={styles.content}>
          {post.content}
        </div>

        <GenerationContextBlock context={post.generationContext} />

        {post.tags?.length > 0 && (
          <div style={styles.tags}>
            {post.tags.map((t) => (
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
            ))}
          </div>
        )}

        {post.moderationStatus && (
          <div style={styles.moderation}>
            <span style={styles.status}>
              {post.moderationStatus === "approved" ? "✓" : "⚠"}
            </span>
            <span style={styles.score}>
              흐름 점검: {(post.moderationScore || 0).toFixed(2)}
            </span>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={() => {
              onUserActivity();
              likeMutation.mutate();
            }}
            style={{
              ...styles.actionBtn,
              color: isLiked ? "#dc2626" : "#6b7280",
            }}
            disabled={likeMutation.isPending}
          >
            {isLiked ? "♥" : "♡"} {post.likes}
          </button>
          <button
            onClick={() => {
              onUserActivity();
              if (!isAuthenticated) {
                onRequireAuth();
                return;
              }
              saveMutation.mutate();
            }}
            style={{
              ...styles.actionBtn,
              color: isSaved ? "#0f766e" : "#6b7280",
            }}
            disabled={saveMutation.isPending}
          >
            {isSaved ? "🔖 저장됨" : "📌 저장"}
          </button>
          <button onClick={handleShare} style={styles.actionBtn}>
            ↗ 공유
          </button>
        </div>

        {shareState.status !== "idle" && (
          <div
            style={{
              ...styles.shareState,
              ...(shareState.status === "error" ? styles.shareStateError : styles.shareStateSuccess),
            }}
          >
            {shareState.message}
          </div>
        )}
      </article>

      <section style={styles.commentsSection}>
        <h3 style={styles.commentsTitle}>대화 ({post.commentCount || 0})</h3>
        <CommentSection postId={postId} currentUser={currentUser} onUserActivity={onUserActivity} />
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
  authorBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
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
  generationContext: {
    marginBottom: 16,
    padding: "12px 14px",
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
  tags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tagBtn: {
    fontSize: 13,
    color: "#6b7280",
    background: "#f3f4f6",
    padding: "4px 12px",
    borderRadius: 99,
    border: "1px solid transparent",
    cursor: "pointer",
    appearance: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
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
  shareState: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 1.4,
  },
  shareStateSuccess: { color: "#0f766e" },
  shareStateError: { color: "#dc2626" },
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
