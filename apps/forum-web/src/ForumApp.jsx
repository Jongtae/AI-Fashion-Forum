import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { triggerAgentTick } from "./api/client.js";
import PostForm from "./components/PostForm.jsx";
import PostList from "./components/PostList.jsx";
import PostDetail from "./components/PostDetail.jsx";
import PersonalisedFeed from "./components/PersonalisedFeed.jsx";
import DiscoveryPanel from "./components/DiscoveryPanel.jsx";
import AuthModal from "./components/AuthModal.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";

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

function getInitialTab() {
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path.startsWith("/operator")) {
    return "admin";
  }

  return "forum";
}

export default function ForumApp() {
  const [authUser, setAuthUser] = useState(loadStoredUser);
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState(getInitialTab);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [activeTagFilter, setActiveTagFilter] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [hasForumActivity, setHasForumActivity] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const autoTickInFlightRef = useRef(false);

  // currentUser: 로그인 시 JWT 사용자, 미로그인 시 guest
  const currentUser = authUser
    ? { id: authUser.username, type: "user" }
    : { id: "user-guest", type: "user" };

  function handleAuthSuccess(user) {
    setAuthUser(user);
    setHasForumActivity(true);
    setShowAuth(false);
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
    queryClient.clear();
  }

  useEffect(() => {
    if (window.location.pathname.startsWith("/operator")) {
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  function toggleComposerOpen() {
    setComposerOpen((prev) => !prev);
  }

  function markForumActivity() {
    setHasForumActivity(true);
  }

  function openTagFilter(tag) {
    if (!tag) return;
    markForumActivity();
    setTab("forum");
    setSelectedPostId(null);
    setActiveTagFilter(tag);
  }

  function openPost(postId) {
    setSelectedPostId(postId);
    setTab("forum");
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
        await queryClient.invalidateQueries({ queryKey: ["operator-dashboard"] });
        await queryClient.invalidateQueries({ queryKey: ["latest-report"] });
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

        {tab === "admin" ? (
          <main style={styles.main}>
            <section>
              <AdminDashboard timeSpeed={timeSpeed} />
            </section>
          </main>
        ) : (
          <>
            <nav style={styles.nav}>
              <button
                style={{ ...styles.tabBtn, ...(tab === "forum" ? styles.tabActive : {}) }}
                onClick={() => setTab("forum")}
              >
                포럼
              </button>
              <button
                style={{ ...styles.tabBtn, ...(tab === "discover" ? styles.tabActive : {}) }}
                onClick={() => setTab("discover")}
              >
                탐색
              </button>
              <button
                style={{ ...styles.tabBtn, ...(tab === "feed" ? styles.tabActive : {}) }}
                onClick={() => setTab("feed")}
              >
                맞춤 피드
              </button>
            </nav>

            <main style={styles.main}>
              {tab === "forum" ? (
                selectedPostId ? (
                  <PostDetail
                    postId={selectedPostId}
                    currentUser={currentUser}
                    onBack={() => setSelectedPostId(null)}
                    onUserActivity={markForumActivity}
                    onTagClick={openTagFilter}
                  />
                ) : (
                  <>
                    <section style={styles.formSection}>
                      <div style={styles.composerGate}>
                        <div>
                          <p style={styles.composerTitle}>글쓰기</p>
                          <p style={styles.composerHint}>
                            {hasForumActivity || authUser
                              ? "포럼 상호작용 이후 열리는 compact 진입점입니다."
                              : "댓글·반응·로그인 이후에 활성화됩니다."}
                          </p>
                        </div>
                        <button
                          style={{
                            ...styles.composerBtn,
                            ...(hasForumActivity || authUser ? styles.composerBtnActive : styles.composerBtnDisabled),
                          }}
                          onClick={toggleComposerOpen}
                          disabled={!(hasForumActivity || authUser)}
                        >
                          {composerOpen ? "글쓰기 닫기" : "글쓰기 열기"}
                        </button>
                      </div>
                      {composerOpen && (
                        <div style={styles.composerPanel}>
                          <PostForm currentUser={currentUser} />
                        </div>
                      )}
                    </section>
                    <section style={styles.feedSection}>
                          <PostList
                          currentUser={currentUser}
                          onUserActivity={markForumActivity}
                          activeTagFilter={activeTagFilter}
                          onTagFilterChange={setActiveTagFilter}
                          onSelectPost={(postId) => {
                            markForumActivity();
                            openPost(postId);
                          }}
                          onTagClick={openTagFilter}
                        />
                    </section>
                  </>
                )
              ) : tab === "discover" ? (
                <section>
                  <DiscoveryPanel
                    currentUser={currentUser}
                    onSelectPost={openPost}
                    onUserActivity={markForumActivity}
                    onTagClick={(tag) => {
                      if (tag) setActiveTagFilter(tag);
                    }}
                  />
                </section>
              ) : tab === "feed" ? (
                <section>
                  <PersonalisedFeed
                    currentUser={currentUser}
                    timeSpeed={timeSpeed}
                    onUserActivity={markForumActivity}
                  />
                </section>
              ) : (
                <section style={styles.placeholderCard}>
                  <p style={styles.placeholderTitle}>관리 화면은 `/admin` 경로에서 볼 수 있어요.</p>
                  <p style={styles.placeholderText}>
                    서비스 화면에서는 포럼과 맞춤 피드만 보여드려요.
                  </p>
                </section>
              )}
            </main>
          </>
        )}
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
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  composerGate: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
  },
  composerTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },
  composerHint: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  composerBtn: {
    border: "1px solid transparent",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  composerBtnActive: {
    background: "#111827",
    color: "#fff",
  },
  composerBtnDisabled: {
    background: "#e5e7eb",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  composerPanel: {
    marginTop: 2,
  },
  feedSection: {},
  nav: {
    background: "#1f2937",
    padding: "0 24px",
    display: "flex",
    gap: 4,
  },
  placeholderCard: {
    marginTop: 8,
    padding: "18px 20px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  },
  placeholderTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  placeholderText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
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
