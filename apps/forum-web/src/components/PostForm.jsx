import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "../api/client.js";

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
    <form onSubmit={handleSubmit} style={styles.form}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="글 내용을 입력하세요…"
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
          {mutation.isPending ? "등록 중…" : "글 올리기"}
        </button>
      </div>
      {mutation.isError && (
        <p style={styles.error}>{mutation.error?.message || "오류가 발생했습니다."}</p>
      )}
    </form>
  );
}

const styles = {
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
