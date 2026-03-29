import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "../api/client.js";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";

const DEFAULT_AUTHOR = { id: "user-guest", type: "user" };

export default function PostForm({ currentUser = DEFAULT_AUTHOR }) {
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setContent("");
      setTagInput("");
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    mutation.mutate({
      content: content.trim(),
      authorId: currentUser.id,
      authorType: currentUser.type,
      tags,
    });
  }

  return (
    <div style={styles.wrap}>
      <IdentityLoopSummary
        kicker="composition"
        title="입력은 소비와 반응을 다시 밖으로 내보내는 단계입니다"
        subtitle="이 입력창은 캐릭터를 시작하는 곳이 아니라, 무엇을 보고 어떤 반응을 겪었는지 다시 글로 남기는 곳입니다."
        cards={[
          {
            label: "현재 사용자",
            value: currentUser.id,
            description: "이 글의 반응 흔적을 남길 주체입니다.",
          },
          {
            label: "태그",
            value: tagInput || "—",
            description: "이 글이 어떤 맥락으로 읽힐지 예고합니다.",
          },
          {
            label: "입력 상태",
            value: content.trim() ? "작성 중" : "대기",
            description: "선택한 소비와 반응을 다시 글로 만들 준비 상태입니다.",
          },
        ]}
        notes={[
          "여기서 쓰는 글도 결국 피드와 댓글, 프로필, replay에 다시 돌아갑니다.",
        ]}
      />

      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="보고, 고르고, 반응한 내용을 글로 남겨보세요…"
          rows={3}
          style={styles.textarea}
          disabled={mutation.isPending}
        />
        <div style={styles.row}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="태그 (쉼표 구분)"
            style={styles.tagInput}
            disabled={mutation.isPending}
          />
          <button
            type="submit"
            disabled={mutation.isPending || !content.trim()}
            style={styles.submitBtn}
          >
            {mutation.isPending ? "등록 중…" : "선택을 기록하기"}
          </button>
        </div>
        {mutation.isError && (
          <p style={styles.error}>{mutation.error?.message || "오류가 발생했습니다."}</p>
        )}
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    color: "#111827",
    background: "#fff",
  },
  row: {
    display: "flex",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    color: "#111827",
    background: "#fff",
  },
  submitBtn: {
    padding: "8px 20px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    margin: 0,
  },
};
