import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFeed, triggerAgentTick, fetchAgentLoopStatus } from "../api/client.js";
import PostCard from "./PostCard.jsx";
import IdentityLoopSummary from "./IdentityLoopSummary.jsx";

const FLAGS = ["baseline", "noveltyBoost", "trustBoost", "controversyDampen"];

export default function PersonalisedFeed({
  currentUser,
  timeSpeed = 1,
  onUserActivity = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
}) {
  const [flag, setFlag] = useState("baseline");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["feed", currentUser.id, flag],
    queryFn: () => fetchFeed({ userId: currentUser.id, experimentFlag: flag }),
  });

  const { data: agentStatus } = useQuery({
    queryKey: ["agent-loop-status"],
    queryFn: fetchAgentLoopStatus,
    refetchInterval: 10_000,
  });

  const tickMutation = useMutation({
    mutationFn: (ticks) => triggerAgentTick({ ticks, speed: timeSpeed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["agent-loop-status"] });
      queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["latest-report"] });
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
        subtitle="이 화면은 쓰기보다 먼저, 무엇을 보고 무엇을 선택했는지가 다음 추천과 관계를 바꾸도록 설계됩니다."
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
      )}

      {/* Experiment flag selector */}
      <div style={styles.flagRow}>
        <span style={styles.flagLabel}>피드 방식:</span>
        {FLAGS.map((f) => (
          <button
            key={f}
            style={{ ...styles.flagBtn, ...(flag === f ? styles.flagActive : {}) }}
            onClick={() => setFlag(f)}
          >
            {f}
          </button>
        ))}
        <button style={styles.refreshBtn} onClick={() => refetch()}>
          ↻
        </button>
      </div>

      {isLoading && <p style={styles.msg}>피드 계산 중…</p>}
      {isError && <p style={styles.err}>{error?.message || "피드 로딩 실패"}</p>}
      {!isLoading && feed.length === 0 && (
        <p style={styles.msg}>
          피드가 비어있습니다.{" "}
          <button
            style={styles.inlineBtn}
            onClick={() => {
              onUserActivity();
              tickMutation.mutate(5);
            }}
          >
            흐름 5회 진행 ({timeSpeed}x)
          </button>
          해서 글을 더 불러와보세요.
        </p>
      )}

      <div style={styles.list}>
        {feed.map((post) => (
          <div key={post._id} style={styles.feedItem}>
            {post._score !== undefined && (
              <div style={styles.score}>score: {post._score}</div>
            )}
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
  banner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#1f2937",
    color: "#e5e7eb",
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  bannerText: {},
  tickBtn: {
    background: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  flagRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  flagLabel: { fontSize: 12, color: "#6b7280", marginRight: 4 },
  flagBtn: {
    padding: "3px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 12,
    background: "#fff",
    cursor: "pointer",
    color: "#374151",
  },
  flagActive: { background: "#111827", color: "#fff", borderColor: "#111827" },
  refreshBtn: {
    padding: "3px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 14,
    background: "#f9fafb",
    cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  feedItem: {},
  score: { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  msg: { textAlign: "center", color: "#9ca3af", fontSize: 14, padding: "24px 0" },
  err: { textAlign: "center", color: "#dc2626", fontSize: 14 },
  inlineBtn: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
  },
};
