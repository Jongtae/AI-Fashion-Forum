import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost, savePost, toggleLike, unsavePost } from "../api/client.js";
import CommentSection from "./CommentSection.jsx";
import { localizeLabel } from "../lib/localized-labels.js";
import { sharePostLink } from "../lib/post-sharing.js";
import { chatTheme } from "../lib/chat-ui-theme.js";

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
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
  readOnly = false,
}) {
  const [showComments, setShowComments] = useState(false);
  const [savedState, setSavedState] = useState(Boolean(post.savedByCurrentUser));
  const [shareState, setShareState] = useState({ status: "idle", message: "" });
  const [shareButtonLabel, setShareButtonLabel] = useState("↗ 공유");
  const queryClient = useQueryClient();
  const commentCount = Number(post.commentCount || 0);
  const reactionSummary = [
    { label: "좋아요", value: post.likes ?? 0 },
    { label: "댓글", value: commentCount },
    { label: "저장", value: savedState ? "됨" : "안됨" },
    { label: "공유", value: "가능" },
  ];
  const commentButtonText = commentCount > 0
    ? `💬 댓글 ${commentCount}개 ${showComments ? "접기" : "열기"}`
    : `💬 댓글 ${showComments ? "접기" : "열기"}`;

  useEffect(() => {
    if (shareState.status === "idle") return undefined;

    const timerId = window.setTimeout(() => {
      setShareState({ status: "idle", message: "" });
    }, 2200);

    return () => window.clearTimeout(timerId);
  }, [shareState.status]);

  useEffect(() => {
    if (shareButtonLabel === "↗ 공유") return undefined;

    const timerId = window.setTimeout(() => {
      setShareButtonLabel("↗ 공유");
    }, 2200);

    return () => window.clearTimeout(timerId);
  }, [shareButtonLabel]);

  useEffect(() => {
    setSavedState(Boolean(post.savedByCurrentUser));
  }, [post._id, post.savedByCurrentUser]);

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post._id, currentUser.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => (savedState ? unsavePost(post._id) : savePost(post._id)),
    onSuccess: (result) => {
      setSavedState(Boolean(result?.saved));
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post._id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
    },
  });

  async function handleShare() {
    onUserActivity();
    try {
      const result = await sharePostLink({
        postId: post._id,
        title: post.content?.slice(0, 80),
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

  const isLiked = post.likedBy?.includes(currentUser.id);
  const canDelete = post.authorId === currentUser.id;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
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

      <div style={styles.reactionLedger}>
        <div style={styles.reactionLedgerTitle}>반응 레이어</div>
        <div style={styles.reactionLedgerGrid}>
          {reactionSummary.map((item) => (
            <div key={item.label} style={styles.reactionLedgerItem}>
              <span style={styles.reactionLedgerLabel}>{item.label}</span>
              <strong style={styles.reactionLedgerValue}>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <>
          <div style={styles.actions}>
            <button
              onClick={() => {
                onUserActivity();
                likeMutation.mutate();
              }}
              style={{ ...styles.actionBtn, ...(isLiked ? styles.actionBtnActiveLike : {}) }}
              disabled={likeMutation.isPending}
            >
              {isLiked ? "♥" : "♡"} 좋아요
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
                ...(savedState ? styles.actionBtnActiveSave : {}),
              }}
              disabled={saveMutation.isPending}
            >
              {savedState ? "🔖 저장됨" : "📌 저장"}
            </button>
            <button onClick={handleShare} style={styles.actionBtn}>
              {shareButtonLabel} 공유
            </button>
            <button
              onClick={() => {
                onUserActivity();
                setShowComments((v) => !v);
              }}
              style={styles.actionBtn}
            >
              {commentButtonText}
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
    background: "linear-gradient(180deg, rgba(49, 55, 75, 0.98) 0%, rgba(37, 43, 60, 0.98) 100%)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: chatTheme.radiusXL,
    padding: 16,
    boxShadow: chatTheme.shadowSoft,
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
    color: chatTheme.text,
  },
  authorBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },
  time: { fontSize: 12, color: chatTheme.textMuted },
  content: { fontSize: 15, color: chatTheme.text, margin: "0 0 10px", lineHeight: 1.6 },
  generationContext: {
    marginBottom: 10,
    padding: "10px 12px",
    borderRadius: chatTheme.radiusMD,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
  },
  generationContextTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: chatTheme.textMuted,
    letterSpacing: "0.01em",
    marginBottom: 4,
  },
  generationContextSummary: {
    fontSize: 13,
    color: chatTheme.textSoft,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  tags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  tagBtn: {
    fontSize: 12,
    color: chatTheme.textSoft,
    background: "rgba(255,255,255,0.06)",
    padding: "4px 10px",
    borderRadius: 99,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    cursor: "pointer",
    appearance: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  actionBtn: {
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    fontSize: 13,
    color: chatTheme.textSoft,
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 999,
  },
  actionBtnActiveLike: { color: chatTheme.accentWarm, fontWeight: 700, borderColor: "rgba(255, 152, 0, 0.35)" },
  actionBtnActiveSave: { color: "#7dd3fc", fontWeight: 700, borderColor: "rgba(34, 166, 240, 0.35)" },
  reactionLedger: {
    marginBottom: 10,
    padding: "10px 12px",
    borderRadius: chatTheme.radiusMD,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
  },
  reactionLedgerTitle: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: chatTheme.textMuted,
    marginBottom: 8,
  },
  reactionLedgerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
  },
  reactionLedgerItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "8px 10px",
    borderRadius: chatTheme.radiusMD,
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
  },
  reactionLedgerLabel: { fontSize: 11, color: chatTheme.textMuted, fontWeight: 700 },
  reactionLedgerValue: { fontSize: 14, color: chatTheme.text },
  shareState: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 1.4,
  },
  shareStateSuccess: { color: "#a7f3d0" },
  shareStateError: { color: "#fecaca" },
};
