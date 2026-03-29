import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFeed } from "../api/client.js";
import PostCard from "./PostCard.jsx";

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

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.kicker}>맞춤 피드</div>
          <div style={styles.title}>내 반응에 맞춰 정렬된 글</div>
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
        <p style={styles.msg}>아직 보여줄 글이 없습니다. 다른 글을 읽고 반응하면 피드가 더 풍성해집니다.</p>
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
    gap: 12,
    marginBottom: 14,
  },
  kicker: { fontSize: 12, fontWeight: 800, color: "#6b7280", letterSpacing: "0.08em" },
  title: { marginTop: 4, fontSize: 20, fontWeight: 800, color: "#111827" },
  refreshBtn: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    fontSize: 12,
    background: "#fff",
    cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  feedItem: {},
  msg: { textAlign: "center", color: "#9ca3af", fontSize: 14, padding: "24px 0" },
  err: { textAlign: "center", color: "#dc2626", fontSize: 14 },
};
