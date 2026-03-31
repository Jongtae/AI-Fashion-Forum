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

function getPostTitle(post) {
  const explicitTitle = String(post?.title || "").trim();
  if (explicitTitle) return explicitTitle;
  const content = String(post?.content || "").trim();
  if (!content) return "Untitled post";
  const firstLine = content.split(/\r?\n/)[0].trim();
  if (firstLine.length <= 90) return firstLine;
  return `${firstLine.slice(0, 90).trim()}…`;
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
  const [shareButtonLabel, setShareButtonLabel] = React.useState("↗ 공유");

  React.useEffect(() => {
    if (shareState.status === "idle") return undefined;

    const timerId = window.setTimeout(() => {
      setShareState({ status: "idle", message: "" });
    }, 2200);

    return () => window.clearTimeout(timerId);
  }, [shareState.status]);

  React.useEffect(() => {
    if (shareButtonLabel === "↗ 공유") return undefined;

    const timerId = window.setTimeout(() => {
      setShareButtonLabel("↗ 공유");
    }, 2200);

    return () => window.clearTimeout(timerId);
  }, [shareButtonLabel]);

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
      setShareButtonLabel(result.method === "native" ? "공유됨" : "복사됨");
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
  const postTitle = getPostTitle(post);

  return (
    <div style={styles.container} data-post-detail-root>
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
        <h1 style={styles.title}>{postTitle}</h1>

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

        <div style={styles.content}>{post.content}</div>

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
            {shareButtonLabel}
          </button>
          {canDelete && (
            <button
              onClick={() => {
                onUserActivity();
                deleteMutation.mutate();
              }}
              style={{ ...styles.actionBtn, ...styles.actionBtnDelete }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "지우는 중…" : "삭제"}
            </button>
          )}
        </div>

        {shareState.status !== "idle" && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
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
        <h3 style={styles.commentsTitle}>답변 {post.commentCount || 0}개</h3>
        <CommentSection
          postId={postId}
          currentUser={currentUser}
          onUserActivity={onUserActivity}
          onJumpToTarget={() => {
            const node = document.querySelector("[data-post-detail-root]");
            node?.scrollIntoView({ block: "start", behavior: "smooth" });
          }}
          replyTarget={{
            type: "post",
            authorId: post.authorId,
            authorDisplayName: post.authorDisplayName,
            authorHandle: post.authorHandle,
            preview: post.content?.trim().slice(0, 180) || "이 글에 답글을 남겨보세요.",
          }}
        />
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "12px 20px 36px",
  },
  header: {
    marginBottom: 18,
  },
  backBtn: {
    background: "transparent",
    border: "none",
    fontSize: 15,
    color: "#6d78dc",
    cursor: "pointer",
    padding: "4px 0",
  },
  article: {
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: "0 0 22px",
    marginBottom: 22,
    boxShadow: "none",
    borderBottom: "1px solid rgba(17,17,17,0.08)",
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.18,
    color: "#111827",
    letterSpacing: "-0.02em",
    fontWeight: 800,
  },
  deleteBtn: {
    fontSize: 13,
    background: "transparent",
    border: "1px solid #dc2626",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    color: "#dc2626",
  },
  content: {
    fontSize: 17,
    color: "#111827",
    lineHeight: 1.85,
    marginBottom: 22,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  tags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    margin: "16px 0 20px",
  },
  tagBtn: {
    fontSize: 13,
    color: "#4338ca",
    background: "#eef2ff",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #e0e7ff",
    cursor: "pointer",
    appearance: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.08)",
    fontSize: 14,
    color: "#6b7280",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 999,
  },
  shareState: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 1.4,
  },
  shareStateSuccess: { color: "#0f766e" },
  shareStateError: { color: "#dc2626" },
  commentsSection: {
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: "0 0 0",
    boxShadow: "none",
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 18px",
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
