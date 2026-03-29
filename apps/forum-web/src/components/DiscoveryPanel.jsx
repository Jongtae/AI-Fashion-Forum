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
          <p style={styles.kicker}>발견 허브</p>
          <h2 style={styles.title}>글, 태그, 작성자를 찾아보세요</h2>
          <p style={styles.description}>
            검색하거나 인기 글을 보고, 주제를 눌러 같은 흐름의 글을 이어서 볼 수 있습니다.
          </p>
        </div>

        <div style={styles.modeGrid}>
          {MODES.map((modeItem) => (
            <button
              key={modeItem.id}
              type="button"
              style={{
                ...styles.modeCard,
                ...(mode === modeItem.id ? styles.modeCardActive : {}),
              }}
              onClick={() => {
                onUserActivity();
                onModeChange(modeItem.id);
              }}
            >
              <div style={styles.modeLabel}>{modeItem.label}</div>
              <div style={styles.modeDescription}>{modeItem.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section style={styles.controls}>
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
        <div style={styles.sectionLabel}>주제 커뮤니티</div>
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
    gap: 16,
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 14px 40px rgba(15, 23, 42, 0.05)",
  },
  heroCopy: { display: "flex", flexDirection: "column", justifyContent: "center" },
  kicker: { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "#2563eb" },
  title: { margin: "8px 0 10px", fontSize: 32, lineHeight: 1.15, color: "#111827" },
  description: { margin: 0, color: "#4b5563", fontSize: 15, lineHeight: 1.7, maxWidth: 640 },
  modeGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  modeCard: {
    textAlign: "left",
    padding: 14,
    borderRadius: 16,
    border: "1px solid #dbe3f1",
    background: "#fff",
    cursor: "pointer",
  },
  modeCardActive: {
    borderColor: "#111827",
    boxShadow: "0 10px 20px rgba(17, 24, 39, 0.08)",
  },
  modeLabel: { fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 },
  modeDescription: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 12,
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
    gap: 10,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
  },
  sectionLabel: { fontSize: 13, fontWeight: 800, color: "#6b7280" },
  topicHint: { fontSize: 13, color: "#4b5563", lineHeight: 1.5 },
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
