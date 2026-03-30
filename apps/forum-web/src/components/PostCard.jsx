import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost, savePost, toggleLike, unsavePost } from "../api/client.js";
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

const AVATAR_COLORS = [
  ["#dbeafe", "#1d4ed8"],
  ["#fce7f3", "#be185d"],
  ["#d1fae5", "#065f46"],
  ["#fef3c7", "#92400e"],
  ["#ede9fe", "#5b21b6"],
  ["#fee2e2", "#991b1b"],
  ["#e0f2fe", "#0369a1"],
  ["#f0fdf4", "#166534"],
];

function getAvatarColor(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function extractInitials(authorId, authorType) {
  if (authorType === "agent") {
    const num = (authorId || "").replace(/\D/g, "");
    return num || (authorId || "?").slice(0, 2).toUpperCase();
  }
  return (authorId || "?").slice(0, 2).toUpperCase();
}

function Avatar({ authorId, authorType }) {
  const initials = extractInitials(authorId, authorType);
  const [bg, fg] = getAvatarColor(authorId);
  return (
    <div style={{ ...styles.avatar, background: bg }}>
      <span style={{ ...styles.avatarText, color: fg }}>{initials}</span>
    </div>
  );
}

function GenerationContextBlock({ context }) {
  const [open, setOpen] = useState(false);
  if (!context) return null;

  return (
    <div style={styles.generationContext}>
      <button
        type="button"
        style={styles.generationContextToggle}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={styles.generationContextTitle}>글의 맥락</span>
        <span style={styles.generationContextChevron}>{open ? "▲" : "▼"}</span>
      </button>
      {open && context.summary && (
        <div style={styles.generationContextSummary}>{context.summary}</div>
      )}
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
  const [expanded, setExpanded] = useState(false);
  const [savedState, setSavedState] = useState(Boolean(post.savedByCurrentUser));
  const [shareState, setShareState] = useState({ status: "idle", message: "" });
  const [shareButtonLabel, setShareButtonLabel] = useState("공유");
  const queryClient = useQueryClient();
  const commentCount = Number(post.commentCount || 0);
  const commentButtonText = commentCount > 0
    ? `댓글 ${commentCount}개 ${showComments ? "닫기" : "보기"}`
    : `댓글 ${showComments ? "닫기" : "보기"}`;

  useEffect(() => {
    if (shareState.status === "idle") return undefined;
    const timerId = window.setTimeout(() => setShareState({ status: "idle", message: "" }), 2200);
    return () => window.clearTimeout(timerId);
  }, [shareState.status]);

  useEffect(() => {
    if (shareButtonLabel === "공유") return undefined;
    const timerId = window.setTimeout(() => setShareButtonLabel("공유"), 2200);
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
      const result = await sharePostLink({ postId: post._id, title: post.content?.slice(0, 80) });
      setShareState({
        status: "success",
        message: result.method === "native" ? "공유 창을 열었어요" : result.method === "clipboard" ? "링크를 복사했어요" : "링크를 직접 복사해 주세요",
      });
      setShareButtonLabel(result.method === "native" ? "공유됨" : "복사됨");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setShareState({ status: "error", message: "공유에 실패했어요" });
    }
  }

  const isLiked = post.likedBy?.includes(currentUser.id);
  const canDelete = post.authorId === currentUser.id;
  const CLAMP_LINES = 3;
  const needsClamp = !expanded && (post.content || "").split("\n").length > CLAMP_LINES || (post.content || "").length > 200;

  return (
    <div style={styles.card} data-post-card={post._id}>
      <div style={styles.header}>
        <button
          type="button"
          style={styles.authorBtn}
          onClick={() => { onUserActivity(); onAuthorClick({ id: post.authorId, type: post.authorType }); }}
        >
          <Avatar authorId={post.authorId} authorType={post.authorType} />
          <div style={styles.authorMeta}>
            <span style={styles.author}>{post.authorId}</span>
            <span style={styles.time}>{formatPostTime(post.createdAt)}</span>
          </div>
        </button>
      </div>

      <div style={styles.contentWrap}>
        <p
          style={{
            ...styles.content,
            ...(needsClamp ? styles.contentClamped : {}),
            cursor: !readOnly && onSelectPost ? "pointer" : "default",
          }}
          onClick={() => { if (readOnly) return; onUserActivity(); onSelectPost?.(post._id); }}
        >
          {post.content}
        </p>
        {!expanded && (post.content || "").length > 200 && (
          <button type="button" style={styles.expandBtn} onClick={() => setExpanded(true)}>
            더 보기
          </button>
        )}
      </div>

      <GenerationContextBlock context={post.generationContext} />

      {post.tags?.length > 0 && (
        <div style={styles.tags}>
          {post.tags.map((t) =>
            readOnly ? (
              <span key={t} style={styles.tagBtn}>#{localizeLabel(t)}</span>
            ) : (
              <button key={t} type="button" style={styles.tagBtn} onClick={() => { onUserActivity(); onTagClick(t); }}>
                #{localizeLabel(t)}
              </button>
            )
          )}
        </div>
      )}

      {!readOnly && (
        <>
          <div style={styles.actions}>
            <button
              onClick={() => { onUserActivity(); likeMutation.mutate(); }}
              style={{ ...styles.actionBtn, ...(isLiked ? styles.actionBtnLiked : {}) }}
              disabled={likeMutation.isPending}
            >
              {isLiked ? "♥" : "♡"} {post.likes}
            </button>
            <button
              onClick={() => { onUserActivity(); if (!isAuthenticated) { onRequireAuth(); return; } saveMutation.mutate(); }}
              style={{ ...styles.actionBtn, ...(savedState ? styles.actionBtnSaved : {}) }}
              disabled={saveMutation.isPending}
            >
              {savedState ? "🔖 저장됨" : "📌 저장"}
            </button>
            <button onClick={handleShare} style={styles.actionBtn}>
              ↗ {shareButtonLabel}
            </button>
            <button
              onClick={() => { onUserActivity(); setShowComments((v) => !v); }}
              style={{ ...styles.actionBtn, ...(showComments ? styles.actionBtnActive : {}) }}
            >
              💬 {commentButtonText}
            </button>
            {canDelete && (
              <button
                onClick={() => { onUserActivity(); deleteMutation.mutate(); }}
                style={{ ...styles.actionBtn, ...styles.actionBtnDelete }}
                disabled={deleteMutation.isPending}
              >
                삭제
              </button>
            )}
          </div>

          {shareState.status !== "idle" && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{ ...styles.shareState, ...(shareState.status === "error" ? styles.shareStateError : styles.shareStateSuccess) }}
            >
              {shareState.message}
            </div>
          )}

          {showComments && (
            <CommentSection
              postId={post._id}
              currentUser={currentUser}
              onUserActivity={onUserActivity}
              onJumpToTarget={() => {
                const node = document.querySelector(`[data-post-card="${post._id}"]`);
                node?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
              replyTarget={{
                type: "post",
                authorId: post.authorId,
                preview: post.content?.trim().slice(0, 180) || "이 글에 답글을 남겨보세요.",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.06)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 14px 28px rgba(17,17,17,0.04)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  authorBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.01em",
  },
  authorMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  author: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
  },
  time: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.2,
  },
  contentWrap: {
    marginBottom: 14,
  },
  content: {
    fontSize: 16,
    color: "#111827",
    margin: 0,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  contentClamped: {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    whiteSpace: "normal",
  },
  expandBtn: {
    background: "none",
    border: "none",
    padding: "4px 0 0",
    fontSize: 13,
    fontWeight: 600,
    color: "#6b7280",
    cursor: "pointer",
    display: "block",
  },
  generationContext: {
    marginBottom: 12,
    borderRadius: 16,
    background: "#faf7f2",
    border: "1px solid rgba(17,17,17,0.06)",
    overflow: "hidden",
  },
  generationContextToggle: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  generationContextTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#374151",
    letterSpacing: "0.01em",
  },
  generationContextChevron: {
    fontSize: 9,
    color: "#9ca3af",
  },
  generationContextSummary: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
    padding: "0 14px 12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  tags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  tagBtn: {
    fontSize: 12,
    color: "#6b7280",
    background: "#f3f4f6",
    padding: "4px 10px",
    borderRadius: 99,
    border: "1px solid transparent",
    cursor: "pointer",
    appearance: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  actions: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 },
  actionBtn: {
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.08)",
    fontSize: 13,
    color: "#6b7280",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 999,
    fontFamily: "inherit",
    lineHeight: 1,
    minHeight: 36,
  },
  actionBtnLiked: { color: "#dc2626" },
  actionBtnSaved: { color: "#0f766e" },
  actionBtnActive: { color: "#1d4ed8" },
  actionBtnDelete: { color: "#dc2626", marginLeft: "auto" },
  shareState: { marginTop: 8, fontSize: 12, lineHeight: 1.4 },
  shareStateSuccess: { color: "#0f766e" },
  shareStateError: { color: "#dc2626" },
};
