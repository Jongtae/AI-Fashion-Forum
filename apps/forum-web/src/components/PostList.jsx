import React, { useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPosts } from "../api/client.js";
import PostCard from "./PostCard.jsx";

const PAGE_SIZE = 20;

export default function PostList({ currentUser }) {
  const [tagFilter, setTagFilter] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["posts", tagFilter],
    queryFn: ({ pageParam = 1 }) =>
      fetchPosts({ page: pageParam, limit: PAGE_SIZE, ...(tagFilter ? { tag: tagFilter } : {}) }),
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  const handleScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  return (
    <div>
      <div style={styles.filterRow}>
        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="태그로 필터링…"
          style={styles.filterInput}
        />
        {tagFilter && (
          <button onClick={() => setTagFilter("")} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      {isLoading && <p style={styles.msg}>포스트 불러오는 중…</p>}
      {isError && <p style={styles.error}>{error?.message || "오류가 발생했습니다."}</p>}
      {!isLoading && posts.length === 0 && (
        <p style={styles.msg}>아직 포스트가 없습니다. 첫 번째 포스트를 작성해보세요!</p>
      )}

      <div style={styles.list} onScroll={handleScroll}>
        {posts.map((post) => (
          <PostCard key={post._id} post={post} currentUser={currentUser} />
        ))}
        {isFetchingNextPage && <p style={styles.msg}>더 불러오는 중…</p>}
        {!hasNextPage && posts.length > 0 && (
          <p style={styles.end}>모든 포스트를 불러왔습니다.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  filterRow: { display: "flex", gap: 8, marginBottom: 12 },
  filterInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    color: "#111827",
    background: "#fff",
  },
  clearBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    color: "#6b7280",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: "70vh",
    overflowY: "auto",
  },
  msg: { textAlign: "center", color: "#9ca3af", fontSize: 14, padding: "24px 0" },
  error: { textAlign: "center", color: "#dc2626", fontSize: 14, padding: "16px 0" },
  end: { textAlign: "center", color: "#d1d5db", fontSize: 12, padding: "12px 0" },
};
