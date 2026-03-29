import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFeed } from "../api/client.js";
import PostCard from "./PostCard.jsx";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";
import { chatTheme } from "../lib/chat-ui-theme.js";

export default function PersonalisedFeed({
  currentUser,
  onUserActivity = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["feed", currentUser.id],
    queryFn: () => fetchFeed({ userId: currentUser.id }),
  });

  const tickMutation = useMutation({
    mutationFn: () => refetch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const feed = data?.feed ?? [];
  const loopCards = [
    {
      label: "현재 라운드",
      value: agentStatus?.currentRound ?? "—",
      description: "지금의 노출과 반응이 다음 라운드의 캐릭터를 바꿉니다.",
    },
    {
      label: "참여자",
      value: agentStatus?.agentCount ?? 0,
      description: "사람과 agent가 같은 공간에서 같이 소비합니다.",
    },
    {
      label: "피드 방식",
      value: flag,
      description: "선택한 랭킹 규칙이 노출과 선택을 다르게 만듭니다.",
    },
    {
      label: "글",
      value: agentStatus?.db?.agentPostCount ?? 0,
      description: "반응의 누적 결과로 글이 이어집니다.",
    },
  ];

  return (
    <div>
      <IdentityLoopSummary
        kicker="consumption first"
        title="보는 것과 반응하는 것이 캐릭터를 만듭니다"
        subtitle="이 화면은 작성보다 먼저, 무엇을 보고 무엇을 선택했는지가 다음 추천과 관계를 바꾸도록 설계됩니다."
        cards={loopCards}
        notes={[
          "좋아요, 싫어요, 저장, 댓글은 별도 이벤트가 아니라 캐릭터의 누적 신호입니다.",
          "외부 콘텐츠와 내부 포럼 콘텐츠는 같은 소비 모델로 읽혀야 합니다.",
        ]}
      />

      {/* Agent status banner */}
      {agentStatus && (
        <div style={styles.banner}>
          <span style={styles.bannerText}>
            현재 흐름 {agentStatus.currentRound}회 &nbsp;|&nbsp;
            참여자 {agentStatus.agentCount ?? 0}명 &nbsp;|&nbsp;
            글 {agentStatus.db?.agentPostCount ?? 0}개
            {agentStatus.growth?.ticksUntilNextSpawn != null && (
              <>
                &nbsp;|&nbsp;다음 합류까지 {agentStatus.growth.ticksUntilNextSpawn}틱
              </>
            )}
          </span>
          <button
            style={styles.tickBtn}
            onClick={() => {
              onUserActivity();
              tickMutation.mutate(3);
            }}
            disabled={tickMutation.isPending}
          >
            {tickMutation.isPending ? "진행 중…" : `+ 흐름 3회 진행 (${timeSpeed}x)`}
          </button>
        </div>
        <button
          style={styles.refreshBtn}
          onClick={() => {
            onUserActivity();
            tickMutation.mutate();
          }}
          disabled={tickMutation.isPending}
        >
          {tickMutation.isPending ? "갱신 중…" : "↻ 새로고침"}
        </button>
      </div>

      {isLoading && <p style={styles.msg}>피드 계산 중…</p>}
      {isError && <p style={styles.err}>{error?.message || "피드 로딩 실패"}</p>}
      {!isLoading && feed.length === 0 && (
        <p style={styles.msg}>아직 글이 없습니다.</p>
      )}

      <div style={styles.list}>
        {feed.map((post) => (
          <div key={post._id} style={styles.feedItem}>
            <PostCard
              post={post}
              currentUser={currentUser}
              onUserActivity={onUserActivity}
              onRequireAuth={onRequireAuth}
              onAuthorClick={onAuthorClick}
              isAuthenticated={isAuthenticated}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    alignItems: "center",
    background: chatTheme.panelBg,
    color: chatTheme.text,
    padding: "12px 14px",
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    boxShadow: chatTheme.shadowSoft,
    marginBottom: 12,
    fontSize: 13,
    gap: 12,
    flexWrap: "wrap",
  },
  bannerText: {},
  tickBtn: {
    background: "linear-gradient(135deg, #23a6f0 0%, #b54cff 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  flagRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginBottom: 14,
  },
  flagLabel: { fontSize: 12, color: "#6b7280", marginRight: 4 },
  flagBtn: {
    padding: "3px 10px",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: 999,
    fontSize: 12,
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    color: chatTheme.textSoft,
  },
  flagActive: { background: "rgba(35, 166, 240, 0.18)", color: chatTheme.text, borderColor: chatTheme.accent },
  refreshBtn: {
    padding: "3px 8px",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: 999,
    fontSize: 14,
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    color: chatTheme.textSoft,
  },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  feedItem: {},
  score: { fontSize: 11, color: chatTheme.textMuted, marginBottom: 2 },
  msg: { textAlign: "center", color: chatTheme.textMuted, fontSize: 14, padding: "24px 0" },
  err: { textAlign: "center", color: "#fecaca", fontSize: 14 },
  inlineBtn: {
    background: "none",
    border: "none",
    color: chatTheme.accent,
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
  },
};
