import React, { useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPosts } from "../api/client.js";
import PostCard from "./PostCard.jsx";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";

const PAGE_SIZE = 20;

export default function PostList({
  currentUser,
  onSelectPost,
  onUserActivity = () => {},
  onTagClick = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
  activeTagFilter = "",
  onTagFilterChange = () => {},
  queryParams = {},
  requiresAuth = false,
  readOnly = false,
}) {
  const [internalTagFilter, setInternalTagFilter] = useState("");
  const tagFilter = typeof activeTagFilter === "string" ? activeTagFilter : internalTagFilter;
  const setTagFilter =
    typeof onTagFilterChange === "function" ? onTagFilterChange : setInternalTagFilter;
  const viewerId = currentUser?.id || "guest";
  const queryLocked = requiresAuth && !isAuthenticated;
  const isSavedView = String(queryParams?.saved || "").toLowerCase() === "true";

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["posts", viewerId, tagFilter, queryParams],
    queryFn: ({ pageParam = 1 }) =>
      fetchPosts({
        page: pageParam,
        limit: PAGE_SIZE,
        ...(tagFilter ? { tag: tagFilter } : {}),
        ...queryParams,
      }),
    enabled: !queryLocked,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const summaryCards = [
    {
      label: "보기 상태",
      value: requiresAuth ? (isAuthenticated ? "auth" : "locked") : "open",
      description: requiresAuth && !isAuthenticated ? "저장한 글과 저장 상태를 여는 중입니다." : "지금 이 목록은 바로 선택 가능한 상태입니다.",
    },
    {
      label: "태그",
      value: tagFilter || "—",
      description: "무엇을 우선적으로 보게 되는지 나타냅니다.",
    },
    {
      label: "목록 글",
      value: posts.length,
      description: "현재 조건에서 눈에 들어오는 콘텐츠 수입니다.",
    },
    {
      label: "스크롤",
      value: hasNextPage ? "더 있음" : "끝",
      description: "더 깊은 선택이 가능한지 알려줍니다.",
    },
  ];
  const handleScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  if (queryLocked) {
    return (
      <div style={styles.lockedCard}>
        <p style={styles.lockedTitle}>저장한 글은 로그인 후 볼 수 있어요.</p>
        <p style={styles.lockedText}>저장한 글과 저장 상태를 이어 보려면 먼저 로그인해 주세요.</p>
        <button type="button" style={styles.lockedBtn} onClick={onRequireAuth}>
          로그인하기
        </button>
      </div>
    );
  }

  return (
    <div>
      <IdentityLoopSummary
        kicker="selection layer"
        title="목록은 읽기 목록이 아니라 선택의 경로입니다"
        subtitle="이 영역은 사용자가 어떤 글을 볼지 정하는 곳이며, 그 선택이 이후의 반응과 관계를 바꿉니다."
        cards={summaryCards}
        notes={[
          isSavedView
            ? "저장글은 나중에 다시 돌아올 선택을 모아두는 상태입니다."
            : "선택한 글이 댓글, 좋아요, 저장, 공유의 다음 행동으로 이어집니다.",
        ]}
      />

      <div style={styles.filterRow}>
        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="태그로 필터링…"
          style={styles.filterInput}
        />
        {tagFilter && (
          <button
            onClick={() => {
              setTagFilter("");
            }}
            style={styles.clearBtn}
          >
            ✕
          </button>
        )}
      </div>

      {isLoading && <p style={styles.msg}>글을 불러오는 중…</p>}
      {isError && <p style={styles.error}>{error?.message || "오류가 발생했습니다."}</p>}
      {!isLoading && posts.length === 0 && (
        <p style={styles.msg}>
          {isSavedView ? "아직 저장한 글이 없습니다. 마음에 드는 글을 저장해 보세요!" : "아직 글이 없습니다. 첫 번째 글을 써보세요!"}
        </p>
      )}

      <div style={styles.list} onScroll={handleScroll}>
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            currentUser={currentUser}
            onSelectPost={onSelectPost}
            onUserActivity={onUserActivity}
            onTagClick={onTagClick}
            onRequireAuth={onRequireAuth}
            onAuthorClick={onAuthorClick}
            isAuthenticated={isAuthenticated}
            readOnly={readOnly}
          />
        ))}
        {isFetchingNextPage && <p style={styles.msg}>더 불러오는 중…</p>}
        {!hasNextPage && posts.length > 0 && (
          <p style={styles.end}>모든 글을 불러왔습니다.</p>
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
  lockedCard: {
    padding: 20,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    textAlign: "center",
  },
  lockedTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" },
  lockedText: { margin: "8px 0 14px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 },
  lockedBtn: {
    border: "none",
    borderRadius: 999,
    padding: "8px 14px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
};
