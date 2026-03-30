import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentStates, fetchPosts } from "../api/client.js";
import PostCard from "./PostCard.jsx";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";
import { chatTheme } from "../lib/chat-ui-theme.js";

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
  const exposureSummary = latest?.exposureSummary || rawSnapshot?.exposureSummary || {};
  const reactionSummary = latest?.reactionSummary || rawSnapshot?.reactionSummary || {};
  const selectedContentId = exposureSummary?.target_content_id || exposureSummary?.content_id || null;

  const cards = [
    {
      label: "최근 아크",
      value: mutableState.recent_arc || "stable",
      description: "최근에 어떤 태도로 콘텐츠를 소화했는지 보여줍니다.",
    },
    {
      label: "서사 수",
      value: narrativeCount,
      description: "읽기, 반응, 관계 변화가 쌓인 이력입니다.",
    },
    {
      label: "관계 반경",
      value: relationship.trust_circle_size ?? "—",
      description: "누구와 지속적으로 연결되는지 보여줍니다.",
    },
    {
      label: "최근 선택",
      value: selectedContentId ? String(selectedContentId).split(":").slice(-1)[0] : "—",
      description: exposureSummary?.action_type ? `${exposureSummary.action_type} 후 남은 흔적` : "최근에 고른 콘텐츠",
    },
    {
      label: "최근 반응",
      value: reactionSummary?.lastReactionActionId ? "react" : exposureSummary?.action_type || "—",
      description: "무엇을 보고 어떤 반응을 남겼는지 나타냅니다.",
    },
  ];

  return (
    <IdentityLoopSummary
      kicker="identity ledger"
      title="이 캐릭터는 소비와 반응의 누적으로 만들어집니다"
      subtitle="프로필은 글의 목록이 아니라, 무엇을 보고 고르고 반응했는지가 관계와 성향으로 바뀐 기록이어야 합니다."
      cards={cards}
      notes={[
        `핸들: ${latest?.handle || latest?.agentId || "—"}`,
        selfNarrativeSummary || "아직 서사가 충분하지 않습니다.",
      ]}
    />
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
            ? "에이전트의 최근 글, 소비 이력, 반응, 관계 맥락을 함께 봅니다."
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
    color: chatTheme.accent,
    cursor: "pointer",
    padding: "4px 0",
    textDecoration: "underline",
  },
  hero: {
    padding: 18,
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelBg,
    boxShadow: chatTheme.shadowSoft,
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    color: chatTheme.accent,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 8px",
    fontSize: 24,
    color: chatTheme.text,
  },
  text: {
    margin: 0,
    fontSize: 14,
    color: chatTheme.textMuted,
    lineHeight: 1.7,
  },
  summaryCard: {
    padding: 18,
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelBg,
    boxShadow: chatTheme.shadowSoft,
  },
  summaryKicker: { fontSize: 12, fontWeight: 800, color: chatTheme.accent, letterSpacing: "0.08em" },
  summaryTitle: { marginTop: 6, fontSize: 18, fontWeight: 800, color: chatTheme.text },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "8px 14px",
    marginTop: 14,
    fontSize: 13,
    color: chatTheme.textSoft,
  },
  summaryText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 1.7,
    color: chatTheme.textSoft,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    border: `1px solid ${chatTheme.surfaceBorder}`,
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: { fontSize: 14, fontWeight: 800, color: chatTheme.text },
  listCount: { fontSize: 12, color: chatTheme.textMuted },
  empty: {
    padding: 18,
    textAlign: "center",
    borderRadius: chatTheme.radiusLG,
    background: chatTheme.panelBg,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    color: chatTheme.textMuted,
    boxShadow: chatTheme.shadowSoft,
  },
  postList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
};
