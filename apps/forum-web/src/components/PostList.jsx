import React, { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPosts } from "../api/client.js";
import PostCard from "./PostCard.jsx";

const PAGE_SIZE = 20;

export default function PostList({
  currentUser,
  onSelectPost,
  onUserActivity = () => {},
  onTagClick = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  onCreateFirstPost = () => {},
  onEmptyStateAction = () => {},
  emptyStateActionLabel = "",
  emptyStateTitle = "",
  emptyStateText = "",
  isAuthenticated = false,
  activeTagFilter = "",
  onTagFilterChange = () => {},
  queryParams = {},
  requiresAuth = false,
  readOnly = false,
}) {
  const isCaptureMode = ["figma", "compact", "capture"].includes(
    new URLSearchParams(window.location.search).get("capture")
  );
  const [internalTagFilter, setInternalTagFilter] = useState("");
  const loadMoreRef = useRef(null);
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
  const visiblePosts = isCaptureMode ? posts.slice(0, 3) : posts;
  const isEmpty = !isLoading && posts.length === 0;
  const resolvedEmptyTitle =
    emptyStateTitle ||
    (isSavedView
      ? "아직 저장한 글이 없습니다."
      : queryParams?.q
      ? "검색 결과가 없습니다."
      : "아직 글이 없습니다.");
  const resolvedEmptyText =
    emptyStateText ||
    (isSavedView
      ? "마음에 드는 글을 저장하면 이곳에 모입니다."
      : queryParams?.q
      ? "검색어를 지우거나 다른 주제를 찾아보세요."
      : "첫 번째 글을 써서 대화를 시작해 보세요.");
  useEffect(() => {
    if (isCaptureMode || !hasNextPage || isFetchingNextPage || queryLocked) return undefined;

    const target = loadMoreRef.current;
    if (!target) return undefined;

    const triggerLoadMore = () => {
      const rect = target.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 240) {
        fetchNextPage();
      }
    };

    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", triggerLoadMore, { passive: true });
      window.addEventListener("resize", triggerLoadMore);
      triggerLoadMore();
      return () => {
        window.removeEventListener("scroll", triggerLoadMore);
        window.removeEventListener("resize", triggerLoadMore);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            fetchNextPage();
          }
        }
      },
      {
        root: null,
        rootMargin: "240px",
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, queryLocked, posts.length, isCaptureMode]);

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
      {isEmpty && (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateTitle}>{resolvedEmptyTitle}</p>
          <p style={styles.emptyStateText}>{resolvedEmptyText}</p>
          {!isSavedView && (
            <button
              type="button"
              style={styles.emptyStateBtn}
              onClick={queryParams?.q && onEmptyStateAction ? onEmptyStateAction : onCreateFirstPost}
            >
              {queryParams?.q ? (emptyStateActionLabel || "검색 지우기") : "글쓰기 열기"}
            </button>
          )}
          {isSavedView && onEmptyStateAction && (
            <button type="button" style={styles.emptyStateBtn} onClick={onEmptyStateAction}>
              {emptyStateActionLabel || "포럼으로 돌아가기"}
            </button>
          )}
        </div>
      )}

      <div style={styles.list}>
        {visiblePosts.map((post) => (
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
        {isFetchingNextPage && !isCaptureMode && <p style={styles.msg}>더 불러오는 중…</p>}
        {!hasNextPage && posts.length > 0 && !isCaptureMode && (
          <p style={styles.end}>모든 글을 불러왔습니다.</p>
        )}
        {!isCaptureMode && <div ref={loadMoreRef} style={styles.loadMoreSentinel} aria-hidden="true" />}
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
  },
  loadMoreSentinel: {
    height: 1,
  },
  msg: { textAlign: "center", color: "#9ca3af", fontSize: 14, padding: "24px 0" },
  error: { textAlign: "center", color: "#dc2626", fontSize: 14, padding: "16px 0" },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    border: "1px dashed #cbd5e1",
    background: "#f8fafc",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  emptyStateText: {
    margin: "8px 0 14px",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
  },
  emptyStateBtn: {
    border: "none",
    borderRadius: 999,
    padding: "8px 14px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
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
