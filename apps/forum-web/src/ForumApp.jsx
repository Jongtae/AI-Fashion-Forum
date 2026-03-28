import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { triggerAgentTick } from "./api/client.js";
import PostForm from "./components/PostForm.jsx";
import PostList from "./components/PostList.jsx";
import PostDetail from "./components/PostDetail.jsx";
import PersonalisedFeed from "./components/PersonalisedFeed.jsx";
import AuthModal from "./components/AuthModal.jsx";
import Sprint1ReplayPanel from "./components/Sprint1ReplayPanel.jsx";
import RunReplayViewer from "./components/RunReplayViewer.jsx";
import OperatorDashboard from "./components/OperatorDashboard.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    // 실시간 업데이트: 30초마다 자동 갱신
    queries: { retry: 1, staleTime: 10_000, refetchInterval: 30_000 },
  },
});

function loadStoredUser() {
  try {
    const stored = localStorage.getItem("auth_user");
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export default function ForumApp() {
  const [authUser, setAuthUser] = useState(loadStoredUser);
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState("forum");
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const autoTickInFlightRef = useRef(false);

  // currentUser: 로그인 시 JWT 사용자, 미로그인 시 guest
  const currentUser = authUser
    ? { id: authUser.username, type: "user" }
    : { id: "user-guest", type: "user" };

  function handleAuthSuccess(user) {
    setAuthUser(user);
    setShowAuth(false);
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
    queryClient.clear();
  }

  useEffect(() => {
    if (!isAutoRunning) {
      return undefined;
    }

    let cancelled = false;

    const runAutoTick = async () => {
      if (cancelled || autoTickInFlightRef.current) {
        return;
      }

      autoTickInFlightRef.current = true;

      try {
        await triggerAgentTick({ ticks: 1, speed: timeSpeed });
        await queryClient.invalidateQueries({ queryKey: ["agent-loop-status"] });
        await queryClient.invalidateQueries({ queryKey: ["feed"] });
        await queryClient.invalidateQueries({ queryKey: ["posts"] });
        await queryClient.invalidateQueries({ queryKey: ["agent-states"] });
      } catch (err) {
        console.warn("[forum-web] auto simulation tick failed:", err?.message || err);
      } finally {
        autoTickInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(runAutoTick, 1000);
    void runAutoTick();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isAutoRunning, timeSpeed]);

  return (
    <QueryClientProvider client={queryClient}>
      <div style={styles.root}>
        {showAuth && (
          <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />
        )}

        <header style={styles.header}>
          <span style={styles.logo}>✦ AI Fashion Forum</span>
          <div style={styles.userRow}>
            <label style={styles.speedControl}>
              <span style={styles.speedLabel}>속도</span>
              <select
                style={styles.speedSelect}
                value={timeSpeed}
                onChange={(e) => setTimeSpeed(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </label>
            <button
              style={{
                ...styles.autoBtn,
                ...(isAutoRunning ? styles.autoBtnOn : styles.autoBtnOff),
              }}
              onClick={() => setIsAutoRunning((prev) => !prev)}
            >
              {isAutoRunning ? "자동 진행 중" : "자동 일시정지"}
            </button>
            {authUser ? (
              <>
                <span style={styles.userId}>👤 {authUser.displayName || authUser.username}</span>
                <button style={styles.editBtn} onClick={handleLogout}>로그아웃</button>
              </>
            ) : (
              <>
                <span style={styles.userId}>🔒 게스트</span>
                <button style={styles.editBtn} onClick={() => setShowAuth(true)}>로그인</button>
              </>
            )}
          </div>
        </header>

        <nav style={styles.nav}>
          <button
            style={{ ...styles.tabBtn, ...(tab === "forum" ? styles.tabActive : {}) }}
            onClick={() => setTab("forum")}
          >
            포럼
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "feed" ? styles.tabActive : {}) }}
            onClick={() => setTab("feed")}
          >
            맞춤 피드
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "replay-viewer" ? styles.tabActive : {}) }}
            onClick={() => setTab("replay-viewer")}
          >
            Replay Viewer
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "replay" ? styles.tabActive : {}) }}
            onClick={() => setTab("replay")}
          >
            Sprint 1 (Legacy)
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "operator" ? styles.tabActive : {}) }}
            onClick={() => setTab("operator")}
          >
            Operator
          </button>
        </nav>

        <main style={styles.main}>
          {tab === "forum" ? (
            selectedPostId ? (
              <PostDetail
                postId={selectedPostId}
                currentUser={currentUser}
                onBack={() => setSelectedPostId(null)}
              />
            ) : (
              <>
                <section style={styles.formSection}>
                  <PostForm currentUser={currentUser} />
                </section>
                <section style={styles.feedSection}>
                  <PostList currentUser={currentUser} onSelectPost={setSelectedPostId} />
                </section>
              </>
            )
          ) : tab === "feed" ? (
            <section>
              <PersonalisedFeed currentUser={currentUser} timeSpeed={timeSpeed} />
            </section>
          ) : tab === "replay-viewer" ? (
            <section>
              <RunReplayViewer timeSpeed={timeSpeed} />
            </section>
          ) : tab === "operator" ? (
            <section>
              <OperatorDashboard />
            </section>
          ) : (
            <section>
              <Sprint1ReplayPanel />
            </section>
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    background: "#111827",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: { fontSize: 18, fontWeight: 700, letterSpacing: -0.5 },
  userRow: { display: "flex", alignItems: "center", gap: 8 },
  speedControl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#d1d5db",
    fontSize: 12,
    marginRight: 8,
  },
  speedLabel: { opacity: 0.85 },
  speedSelect: {
    background: "#1f2937",
    color: "#fff",
    border: "1px solid #4b5563",
    borderRadius: 4,
    padding: "3px 8px",
    fontSize: 12,
  },
  autoBtn: {
    border: "1px solid transparent",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  autoBtnOn: {
    background: "#10b981",
    color: "#06281f",
  },
  autoBtnOff: {
    background: "#374151",
    color: "#e5e7eb",
    borderColor: "#6b7280",
  },
  userId: { fontSize: 13, color: "#d1d5db" },
  editBtn: {
    fontSize: 12,
    background: "transparent",
    border: "1px solid #6b7280",
    color: "#d1d5db",
    borderRadius: 4,
    padding: "2px 8px",
    cursor: "pointer",
  },
  userInput: {
    padding: "4px 8px",
    fontSize: 13,
    borderRadius: 4,
    border: "1px solid #4b5563",
    background: "#1f2937",
    color: "#fff",
  },
  saveBtn: {
    fontSize: 12,
    background: "#3b82f6",
    border: "none",
    color: "#fff",
    borderRadius: 4,
    padding: "4px 10px",
    cursor: "pointer",
  },
  main: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formSection: {},
  feedSection: {},
  nav: {
    background: "#1f2937",
    padding: "0 24px",
    display: "flex",
    gap: 4,
  },
  tabBtn: {
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    fontSize: 14,
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  tabActive: {
    color: "#fff",
    borderBottomColor: "#3b82f6",
  },
};
