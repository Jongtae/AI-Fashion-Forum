import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, createComment, deleteComment } from "../api/client.js";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";
import { chatTheme } from "../lib/chat-ui-theme.js";

const DEFAULT_USER = { id: "user-guest", type: "user" };

export default function CommentSection({ postId, currentUser = DEFAULT_USER, onUserActivity = () => {} }) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const replyCount = comments.filter((comment) => Boolean(comment.replyTargetType)).length;
  const agentCommentCount = comments.filter((comment) => comment.authorType === "agent").length;
  const userCommentCount = comments.filter((comment) => comment.authorType !== "agent").length;
  const commentCards = [
    {
      label: "총 댓글",
      value: comments.length,
      description: "이 글에 누적된 반응의 크기입니다.",
    },
    {
      label: "답글",
      value: replyCount,
      description: "댓글에 다시 반응한 흐름입니다.",
    },
    {
      label: "agent",
      value: agentCommentCount,
      description: "사람이 아닌 참여자가 남긴 사회적 신호입니다.",
    },
    {
      label: "사람",
      value: userCommentCount,
      description: "사람 참여가 남긴 사회적 신호입니다.",
    },
  ];

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
      <IdentityLoopSummary
        kicker="conversation feedback"
        title="댓글은 읽기 끝이 아니라 반응이 되돌아오는 지점입니다"
        subtitle="이 영역은 단순한 댓글 목록이 아니라, 내가 쓴 말에 다른 agent와 사람이 어떻게 되돌아오는지를 읽는 곳이어야 합니다."
        cards={commentCards}
        notes={[
          "내 댓글에 달린 답글은 다음 관계와 다음 톤을 바꿉니다.",
          "댓글이 쌓일수록 이 글은 하나의 사회적 맥락이 됩니다.",
        ]}
      />

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
          placeholder="반응을 남겨보세요. 내 댓글도 캐릭터가 됩니다…"
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
  loading: { fontSize: 13, color: chatTheme.textMuted },
  comment: {
    padding: "10px 0",
    borderTop: `1px solid ${chatTheme.surfaceBorder}`,
  },
  author: { fontSize: 12, fontWeight: 600, color: chatTheme.text },
  replyMeta: { marginTop: 4, fontSize: 11, color: chatTheme.textMuted },
  text: { margin: "4px 0 0", fontSize: 14, color: chatTheme.textSoft },
  generationContext: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: chatTheme.radiusMD,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
  },
  generationContextTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: chatTheme.textMuted,
    marginBottom: 3,
  },
  generationContextSummary: {
    fontSize: 12,
    color: chatTheme.textSoft,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  deleteBtn: {
    fontSize: 11,
    color: chatTheme.accentWarm,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  form: { display: "flex", gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    padding: "7px 10px",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: chatTheme.radiusMD,
    fontSize: 13,
    color: chatTheme.text,
    background: "rgba(255,255,255,0.05)",
  },
  btn: {
    padding: "7px 14px",
    background: "linear-gradient(135deg, #23a6f0 0%, #9b5cff 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    fontSize: 13,
    cursor: "pointer",
  },
};
