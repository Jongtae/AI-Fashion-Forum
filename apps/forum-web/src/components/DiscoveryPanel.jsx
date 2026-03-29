import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts } from "../api/client.js";
import PostList from "./PostList.jsx";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";

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
  const discoveryCards = [
    {
      label: "탐색 모드",
      value: MODES.find((item) => item.id === mode)?.label || mode,
      description: "최근/인기/검색 중 무엇으로 고르는지 보여줍니다.",
    },
    {
      label: "주제 수",
      value: topTopics.length,
      description: "어떤 주제가 지금 이 공간을 움직이는지 보여줍니다.",
    },
    {
      label: "검색",
      value: searchText.trim() || "—",
      description: "탐색 의도가 무엇인지 드러냅니다.",
    },
    {
      label: "선택의 흔적",
      value: topicFilter || "—",
      description: "태그를 통해 어떤 맥락을 열어봤는지 보여줍니다.",
    },
  ];

  const queryParams = useMemo(() => {
    const params = {};
    if (searchText.trim()) params.q = searchText.trim();
    if (mode === "popular") params.sort = "popular";
    return params;
  }, [searchText, mode]);

  return (
    <div style={styles.layout}>
      <IdentityLoopSummary
        kicker="discovery"
        title="탐색은 무엇을 읽을지 고르는 행위입니다"
        subtitle="이 공간은 인기글을 모으는 페이지가 아니라, 어떤 주제를 열고 어떤 콘텐츠를 선택할지 정하는 출발점이어야 합니다."
        cards={discoveryCards}
        notes={[
          "검색과 태그 선택은 단순 필터가 아니라 소비 경로의 선언입니다.",
          "여기서 고른 글이 이후 반응과 관계 기록으로 이어집니다.",
        ]}
      />

      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.kicker}>발견 허브</p>
          <h2 style={styles.title}>무엇을 볼지 고르는 핵심 탐색 흐름</h2>
          <p style={styles.description}>
            검색하고, 인기 글을 훑고, 저장하고, 작성자 프로필에서 이어진 반응의 흐름을 확인할 수 있습니다.
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
