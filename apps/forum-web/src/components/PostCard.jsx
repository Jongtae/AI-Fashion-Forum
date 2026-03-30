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

function formatPostedByLine(value) {
  if (!value) return "Posted by someone";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Posted by someone";

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPostDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.max(0, Math.round((startOfToday.getTime() - startOfPostDay.getTime()) / dayMs));
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  if (diffDays <= 0) return `Posted by ${time}`;
  if (diffDays === 1) return `Posted by yesterday at ${time}`;
  return `Posted by ${diffDays} days ago at ${time}`;
}

function getPostTitle(post) {
  const content = String(post?.content || "").trim();
  if (!content) return "Untitled post";
  const firstLine = content.split(/\r?\n/)[0].trim();
  if (firstLine.length <= 72) return firstLine;
  return `${firstLine.slice(0, 72).trim()}…`;
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
  const avatarSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="${fg}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#g)" />
      <circle cx="48" cy="48" r="39" fill="rgba(255,255,255,0.26)" />
      <text x="48" y="57" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `)}`;
  return (
    <img src={avatarSvg} alt={`${authorId || "user"} avatar`} style={styles.avatar} />
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
  const mediaUrl = Array.isArray(post.imageUrls) ? post.imageUrls[0] : post.imageUrls;
  const hasMedia = Boolean(mediaUrl);
  const postTitle = getPostTitle(post);
  const postedByLine = formatPostedByLine(post.createdAt);
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
  const contentLines = hasMedia ? 2 : 3;

  return (
    <div style={{ ...styles.card, ...(hasMedia ? styles.cardMedia : styles.cardText) }} data-post-card={post._id}>
      <div style={styles.header}>
        <button
          type="button"
          style={styles.authorBtn}
          onClick={() => { onUserActivity(); onAuthorClick({ id: post.authorId, type: post.authorType }); }}
        >
          <Avatar authorId={post.authorId} authorType={post.authorType} />
          <div style={styles.authorMeta}>
            <div style={styles.postTitleRow}>
              <span style={styles.postTitle}>{postTitle}</span>
              {post.authorType === "agent" && <span style={styles.authorBadge}>✓</span>}
            </div>
            <span style={styles.postedBy}>{postedByLine}</span>
          </div>
        </button>
      </div>

      <div style={styles.contentWrap}>
        <p
          style={{
            ...styles.content,
            ...(hasMedia ? styles.contentMedia : {}),
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

      {hasMedia && (
        <button
          type="button"
          style={styles.mediaButton}
          onClick={() => {
            if (readOnly) return;
            onUserActivity();
            onSelectPost?.(post._id);
          }}
        >
          <img
            src={mediaUrl}
            alt={post.content?.slice(0, 80) || "게시글 이미지"}
            style={styles.media}
            loading="lazy"
          />
        </button>
      )}

      {!hasMedia && post.tags?.length > 0 && (
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
    background: "linear-gradient(180deg, rgba(248,250,255,0.96) 0%, rgba(239,245,255,0.92) 100%)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
  },
  cardMedia: {
    background: "linear-gradient(180deg, rgba(247,249,255,0.98) 0%, rgba(235,243,255,0.96) 100%)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    padding: 18,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
  },
  cardText: {
    background: "linear-gradient(180deg, rgba(248,250,255,0.96) 0%, rgba(239,245,255,0.92) 100%)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    flexShrink: 0,
    objectFit: "cover",
  },
  authorMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    minWidth: 0,
    flex: 1,
  },
  postTitleRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    minWidth: 0,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
    minWidth: 0,
    flex: 1,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    wordBreak: "break-word",
  },
  authorBadge: {
    width: 17,
    height: 17,
    borderRadius: "999px",
    background: "#2563eb",
    color: "#fff",
    fontSize: 10,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    flexShrink: 0,
    marginTop: 2,
  },
  postedBy: {
    fontSize: 12.5,
    color: "#64748b",
    lineHeight: 1.2,
  },
  contentWrap: {
    marginBottom: 14,
  },
  content: {
    fontSize: 16,
    color: "#222a3a",
    margin: 0,
    lineHeight: 1.75,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  contentMedia: {
    fontSize: 16,
    lineHeight: 1.65,
    marginBottom: 14,
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
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    cursor: "pointer",
    display: "block",
  },
  mediaButton: {
    display: "block",
    width: "100%",
    padding: 0,
    margin: "0 0 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
  },
  media: {
    display: "block",
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: 24,
    background: "#f3f4f6",
  },
  tags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  tagBtn: {
    fontSize: 11,
    color: "#4b5563",
    background: "#f8fafc",
    padding: "5px 8px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    appearance: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2, alignItems: "center" },
  actionBtn: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    fontSize: 12,
    color: "#374151",
    cursor: "pointer",
    padding: "7px 10px",
    borderRadius: 999,
    fontFamily: "inherit",
    lineHeight: 1.2,
    minHeight: 30,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  actionBtnLiked: { color: "#dc2626", borderColor: "#fecaca", background: "#fff7f7" },
  actionBtnSaved: { color: "#0f766e", borderColor: "#99f6e4", background: "#f0fdfa" },
  actionBtnActive: { color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff" },
  actionBtnDelete: { color: "#dc2626", marginLeft: "auto" },
  shareState: { marginTop: 8, fontSize: 11, lineHeight: 1.4 },
  shareStateSuccess: { color: "#0f766e" },
  shareStateError: { color: "#dc2626" },
};
