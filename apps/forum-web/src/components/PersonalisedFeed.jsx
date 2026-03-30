import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFeed, triggerAgentTick, fetchAgentLoopStatus } from "../api/client.js";
import PostCard from "./PostCard.jsx";

const FLAGS = ["baseline", "noveltyBoost", "trustBoost", "controversyDampen"];

export default function PersonalisedFeed({
  currentUser,
  timeSpeed = 1,
  onUserActivity = () => {},
  onRequireAuth = () => {},
  onAuthorClick = () => {},
  isAuthenticated = false,
}) {
  const isCaptureMode = ["figma", "compact", "capture"].includes(
    new URLSearchParams(window.location.search).get("capture")
  );
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

  const feed = (data?.feed ?? []).slice(0, isCaptureMode ? 3 : undefined);

  return (
    <div>
      {/* Agent status banner */}
      {agentStatus && (
        <div style={styles.banner}>
          <div style={styles.bannerCopy}>
            <span style={styles.bannerKicker}>맞춤 피드</span>
            <span style={styles.bannerText}>
              현재 흐름 {agentStatus.currentRound}회 · 참여자 {agentStatus.agentCount ?? 0}명 · 글 {agentStatus.db?.agentPostCount ?? 0}개
            </span>
            {agentStatus.growth?.ticksUntilNextSpawn != null && (
              <span style={styles.bannerSubtext}>
                다음 합류까지 {agentStatus.growth.ticksUntilNextSpawn}틱
              </span>
            )}
          </div>
          <button
            style={styles.tickBtn}
            onClick={() => {
              onUserActivity();
              tickMutation.mutate(3);
            }}
            disabled={tickMutation.isPending}
          >
            {tickMutation.isPending ? "진행 중…" : `+ 3틱 (${timeSpeed}x)`}
          </button>
        </div>
      )}

      {/* Experiment flag selector */}
      <div style={styles.flagRow}>
        <span style={styles.flagLabel}>피드 방식</span>
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
    gap: 16,
    background: "#111827",
    color: "#e5e7eb",
    padding: "14px 16px",
    borderRadius: 16,
    marginBottom: 12,
  },
  bannerCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  bannerKicker: {
    fontSize: 12,
    fontWeight: 800,
    color: "#93c5fd",
    letterSpacing: "0.08em",
  },
  bannerText: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.4,
    color: "#f3f4f6",
  },
  bannerSubtext: {
    fontSize: 12,
    lineHeight: 1.4,
    color: "#cbd5e1",
  },
  tickBtn: {
    background: "#1f2937",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: "8px 14px",
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
  flagLabel: { fontSize: 12, color: "#6b7280", marginRight: 4, fontWeight: 700 },
  flagBtn: {
    padding: "5px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    fontSize: 12,
    background: "#fff",
    cursor: "pointer",
    color: "#374151",
  },
  flagActive: { background: "#111827", color: "#fff", borderColor: "#111827" },
  refreshBtn: {
    padding: "5px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 999,
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
