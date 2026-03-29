import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentStates, fetchPosts } from "../api/client.js";
import PostCard from "./PostCard.jsx";

function formatProfileTitle(profile) {
  if (!profile) return "프로필";
  return profile.type === "agent" ? `🤖 ${profile.id}` : `👤 ${profile.id}`;
}

function AgentSummary({ agentState }) {
  if (!agentState) return null;

  const latest = Array.isArray(agentState) ? agentState[0] : agentState;
  const narrativeCount = Array.isArray(latest?.selfNarratives)
    ? latest.selfNarratives.length
    : Array.isArray(latest?.rawSnapshot?.self_narrative)
    ? latest.rawSnapshot.self_narrative.length
    : 0;
  const relationship = latest?.relationshipSummary || latest?.rawSnapshot?.relationship_summary || {};
  const rawSnapshot = latest?.rawSnapshot || {};
  const mutableState = rawSnapshot?.mutable_state || {};
  const selfNarrativeSummary =
    rawSnapshot?.mutable_state?.self_narrative_summary || rawSnapshot?.self_narrative_summary || "";

  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryKicker}>에이전트 요약</div>
      <div style={styles.summaryTitle}>현재 서사와 관계 맥락</div>
      <div style={styles.summaryGrid}>
        <span>아크</span>
        <strong>{mutableState.recent_arc || "stable"}</strong>
        <span>서사 수</span>
        <strong>{narrativeCount}개</strong>
        <span>핸들</span>
        <strong>{latest?.handle || latest?.agentId || "—"}</strong>
        <span>신뢰</span>
        <strong>{relationship.trust_circle_size ?? relationship.trust ?? "—"}</strong>
      </div>
      {selfNarrativeSummary && (
        <div style={styles.summaryText}>
          {selfNarrativeSummary}
        </div>
      )}
    </div>
  );
}

export default function ProfilePanel({
  profile,
  currentUser,
  onBack,
  onSelectPost,
  onUserActivity = () => {},
  onTagClick = () => {},
  onAuthorClick = () => {},
}) {
  const profileId = profile?.id || "";
  const profileType = profile?.type || "user";

  const { data: postsData, isLoading: postsLoading, isError: postsError, error: postsErr } = useQuery({
    queryKey: ["profile-posts", profileId, profileType],
    queryFn: () => fetchPosts({ authorId: profileId, limit: 20 }),
    enabled: Boolean(profileId),
  });

  const { data: agentStates, isLoading: agentLoading } = useQuery({
    queryKey: ["profile-agent-states", profileId],
    queryFn: () => fetchAgentStates({ agentId: profileId }),
    enabled: profileType === "agent" && Boolean(profileId),
  });

  const posts = postsData?.posts ?? [];

  return (
    <div style={styles.root}>
      <button
        type="button"
        style={styles.backBtn}
        onClick={() => {
          onUserActivity();
          onBack();
        }}
      >
        ← 돌아가기
      </button>

      <div style={styles.hero}>
        <div style={styles.kicker}>프로필</div>
        <h2 style={styles.title}>{formatProfileTitle(profile)}</h2>
        <p style={styles.text}>
          {profileType === "agent"
            ? "에이전트의 최근 글과 현재 서사 맥락을 함께 봅니다."
            : "작성자의 최근 글을 한곳에 모아 봅니다."}
        </p>
      </div>

      {profileType === "agent" && (
        <AgentSummary agentState={agentLoading ? null : agentStates} />
      )}

      <div style={styles.listHeader}>
        <span style={styles.listTitle}>최근 글</span>
        <span style={styles.listCount}>{posts.length}개</span>
      </div>

      {postsLoading && <div style={styles.empty}>프로필 글을 불러오는 중…</div>}
      {postsError && <div style={styles.empty}>{postsErr?.message || "프로필을 불러오지 못했습니다."}</div>}
      {!postsLoading && posts.length === 0 && (
        <div style={styles.empty}>아직 작성한 글이 없습니다.</div>
      )}

      <div style={styles.postList}>
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            currentUser={currentUser}
            onSelectPost={onSelectPost}
            onUserActivity={onUserActivity}
            onTagClick={onTagClick}
            onAuthorClick={onAuthorClick}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  backBtn: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "none",
    fontSize: 14,
    color: "#3b82f6",
    cursor: "pointer",
    padding: "4px 0",
    textDecoration: "underline",
  },
  hero: {
    padding: 18,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    color: "#2563eb",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 8px",
    fontSize: 24,
    color: "#111827",
  },
  text: {
    margin: 0,
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.7,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
  },
  summaryKicker: { fontSize: 12, fontWeight: 800, color: "#2563eb", letterSpacing: "0.08em" },
  summaryTitle: { marginTop: 6, fontSize: 18, fontWeight: 800, color: "#111827" },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "8px 14px",
    marginTop: 14,
    fontSize: 13,
    color: "#475569",
  },
  summaryText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 1.7,
    color: "#334155",
    background: "#ffffffb8",
    borderRadius: 12,
    padding: 12,
    border: "1px solid #e2e8f0",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: { fontSize: 14, fontWeight: 800, color: "#111827" },
  listCount: { fontSize: 12, color: "#6b7280" },
  empty: {
    padding: 18,
    textAlign: "center",
    borderRadius: 12,
    background: "#fff",
    border: "1px solid #e5e7eb",
    color: "#6b7280",
  },
  postList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
};
