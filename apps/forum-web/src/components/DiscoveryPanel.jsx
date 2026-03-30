import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts } from "../api/client.js";
import PostList from "./PostList.jsx";

const MODES = [
  { id: "recent", label: "최신", description: "방금 올라온 글" },
  { id: "popular", label: "인기", description: "반응이 많은 글" },
  { id: "search", label: "검색", description: "글, 태그, 작성자" },
];

function deriveTopTopics(posts) {
  const counts = new Map();
  for (const post of posts || []) {
    for (const tag of post.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));
}

export default function DiscoveryPanel({
  currentUser,
  onSelectPost = () => {},
  onUserActivity = () => {},
  searchText = "",
  onSearchTextChange = () => {},
  mode = "recent",
  onModeChange = () => {},
  onTagClick = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
}) {
  const [topicFilter, setTopicFilter] = useState("");

  const { data: recentPostsData } = useQuery({
    queryKey: ["discovery-topics"],
    queryFn: () => fetchPosts({ limit: 50 }),
  });

  const topTopics = useMemo(
    () => deriveTopTopics(recentPostsData?.posts ?? []),
    [recentPostsData]
  );

  const queryParams = useMemo(() => {
    const params = {};
    if (searchText.trim()) params.q = searchText.trim();
    if (mode === "popular") params.sort = "popular";
    return params;
  }, [searchText, mode]);

  return (
    <div style={styles.layout}>
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.kicker}>탐색</p>
          <h2 style={styles.title}>읽을 글을 찾아보세요</h2>
          <p style={styles.description}>
            최신 글, 인기 글, 태그 검색을 한 화면에서 볼 수 있습니다.
          </p>
        </div>
        <div style={styles.modeRow}>
          {MODES.map((modeItem) => (
            <button
              key={modeItem.id}
              type="button"
              style={{
                ...styles.modePill,
                ...(mode === modeItem.id ? styles.modePillActive : {}),
              }}
              onClick={() => {
                onUserActivity();
                onModeChange(modeItem.id);
              }}
            >
              <span style={styles.modeLabel}>{modeItem.label}</span>
              <span style={styles.modeDescription}>{modeItem.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={styles.searchBar}>
        <input
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          placeholder="글, 태그, 작성자 이름으로 검색"
          style={styles.searchInput}
        />
        {searchText && (
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => onSearchTextChange("")}
          >
            ✕
          </button>
        )}
      </section>

      <section style={styles.topicBar}>
        <div style={styles.sectionLabel}>주제</div>
        <div style={styles.topicHint}>
          태그를 눌러 같은 주제의 글만 모아 볼 수 있습니다.
        </div>
        <div style={styles.topicChips}>
          {topTopics.map((topic) => (
            <button
              key={topic.tag}
              type="button"
              style={{ ...styles.topicChip, ...(topicFilter === topic.tag ? styles.topicChipActive : {}) }}
              onClick={() => {
                onUserActivity();
                setTopicFilter(topic.tag);
                onTagClick(topic.tag);
              }}
            >
              #{topic.tag.replace(/_/g, " ")}
              <span style={styles.topicCount}>{topic.count}</span>
            </button>
          ))}
          {topicFilter && (
            <button
              type="button"
              style={styles.clearTopic}
              onClick={() => {
                onUserActivity();
                setTopicFilter("");
                onTagClick("");
              }}
            >
              필터 해제
            </button>
          )}
        </div>
      </section>

      <PostList
        currentUser={currentUser}
        onSelectPost={onSelectPost}
        onUserActivity={onUserActivity}
        onTagClick={(tag) => {
          setTopicFilter(tag);
          onTagClick(tag);
        }}
        onRequireAuth={onRequireAuth}
        onAuthorClick={onAuthorClick}
        isAuthenticated={isAuthenticated}
        activeTagFilter={topicFilter}
        onTagFilterChange={(value) => setTopicFilter(value)}
        queryParams={queryParams}
        emptyStateActionLabel="검색 지우기"
        onEmptyStateAction={() => onSearchTextChange("")}
        emptyStateTitle={searchText.trim() ? "검색 결과가 없습니다." : ""}
        emptyStateText={searchText.trim() ? "검색어를 지우거나 다른 주제를 찾아보세요." : ""}
      />
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.06)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 12px 24px rgba(17,17,17,0.04)",
  },
  heroCopy: { display: "flex", flexDirection: "column", justifyContent: "center" },
  kicker: { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "#2563eb" },
  title: { margin: "8px 0 8px", fontSize: 28, lineHeight: 1.12, color: "#111827" },
  description: { margin: 0, color: "#4b5563", fontSize: 14, lineHeight: 1.7, maxWidth: 640 },
  modeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  modePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    cursor: "pointer",
  },
  modePillActive: {
    borderColor: "#111827",
    background: "#111827",
    boxShadow: "0 10px 20px rgba(17, 24, 39, 0.12)",
  },
  modeLabel: { fontSize: 14, fontWeight: 800, color: "inherit" },
  modeDescription: { fontSize: 12, color: "inherit", opacity: 0.72 },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.06)",
    borderRadius: 20,
    padding: 14,
    boxShadow: "0 10px 20px rgba(17,17,17,0.03)",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 15,
    color: "#111827",
    background: "transparent",
  },
  clearBtn: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: 999,
    width: 32,
    height: 32,
    cursor: "pointer",
  },
  topicBar: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.06)",
    borderRadius: 20,
    padding: 16,
    boxShadow: "0 10px 20px rgba(17,17,17,0.03)",
  },
  sectionLabel: { fontSize: 12, fontWeight: 800, color: "#6b7280" },
  topicHint: { fontSize: 12, color: "#4b5563", lineHeight: 1.5 },
  topicChips: { display: "flex", flexWrap: "wrap", gap: 8 },
  topicChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f3f4f6",
    border: "1px solid transparent",
    color: "#374151",
    cursor: "pointer",
  },
  topicChipActive: {
    background: "#e0f2fe",
    borderColor: "#38bdf8",
    color: "#0f172a",
  },
  topicCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    borderRadius: 999,
    background: "#fff",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
  },
  clearTopic: {
    background: "none",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    padding: 0,
    fontSize: 13,
    fontWeight: 700,
  },
};
