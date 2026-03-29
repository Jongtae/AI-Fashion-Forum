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
import ProfilePanel from "./components/ProfilePanel.jsx";

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

function getInitialSelectedPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("postId") || null;
}

function getInitialSelectedProfile() {
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("profileId");
  if (!profileId) return null;
  return {
    id: profileId,
    type: params.get("profileType") || "user",
  };
}

function setPostUrl(postId, { replace = true } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (postId) {
    params.set("postId", postId);
  } else {
    params.delete("postId");
  }

  const search = params.toString();
  const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

function setProfileUrl(profile, { replace = true } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (profile?.id) {
    params.set("profileId", profile.id);
    params.set("profileType", profile.type || "user");
  } else {
    params.delete("profileId");
    params.delete("profileType");
  }

  const search = params.toString();
  const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

const FEED_SCROLL_KEY = "forum:last-feed-scroll-y";

function saveFeedScrollPosition() {
  try {
    window.sessionStorage.setItem(FEED_SCROLL_KEY, String(window.scrollY || 0));
  } catch {}
}

function restoreFeedScrollPosition() {
  try {
    const raw = window.sessionStorage.getItem(FEED_SCROLL_KEY);
    const scrollY = raw ? Number(raw) : 0;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Number.isFinite(scrollY) ? scrollY : 0, behavior: "auto" });
    });
  } catch {}
}

export default function ForumApp() {
  const [authUser, setAuthUser] = useState(loadStoredUser);
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState(getInitialTab);
  const [selectedPostId, setSelectedPostId] = useState(getInitialSelectedPostId);
  const [selectedProfile, setSelectedProfile] = useState(getInitialSelectedProfile);
  const [activeTagFilter, setActiveTagFilter] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [hasForumActivity, setHasForumActivity] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const [pendingTab, setPendingTab] = useState(null);
  const autoTickInFlightRef = useRef(false);
  const prevSelectedPostIdRef = useRef(null);

  // currentUser: 로그인 시 JWT 사용자, 미로그인 시 guest
  const currentUser = authUser
    ? { id: authUser.username, type: "user" }
    : { id: "user-guest", type: "user" };

  function handleAuthSuccess(user) {
    setAuthUser(user);
    setHasForumActivity(true);
    setShowAuth(false);
    if (pendingTab) {
      setTab(pendingTab);
      setPendingTab(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
    setPendingTab(null);
    setTab("forum");
    queryClient.clear();
  }

  useEffect(() => {
    if (window.location.pathname.startsWith("/operator")) {
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  useEffect(() => {
    const syncSelectedPostFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedPostId(params.get("postId") || null);
      const profileId = params.get("profileId");
      setSelectedProfile(
        profileId
          ? { id: profileId, type: params.get("profileType") || "user" }
          : null
      );
    };

    window.addEventListener("popstate", syncSelectedPostFromLocation);
    syncSelectedPostFromLocation();

    return () => window.removeEventListener("popstate", syncSelectedPostFromLocation);
  }, []);

  useEffect(() => {
    const prevSelectedPostId = prevSelectedPostIdRef.current;
    if (prevSelectedPostId && !selectedPostId) {
      restoreFeedScrollPosition();
    }
    prevSelectedPostIdRef.current = selectedPostId;
  }, [selectedPostId]);

  function toggleComposerOpen() {
    setComposerOpen((prev) => !prev);
  }

  function markForumActivity() {
    setHasForumActivity(true);
  }

  function openTagFilter(tag) {
    if (!tag) return;
    markForumActivity();
    setSelectedProfile(null);
    setProfileUrl(null);
    setSelectedPostId(null);
    setPostUrl(null);
    setTab("forum");
    setActiveTagFilter(tag);
  }

  function openPost(postId) {
    setSelectedProfile(null);
    setProfileUrl(null);
    saveFeedScrollPosition();
    setSelectedPostId(postId);
    setTab("forum");
    setPostUrl(postId, { replace: false });
  }

  function closePost() {
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(null);
    setProfileUrl(null);
    restoreFeedScrollPosition();
  }

  function openProfile(profile) {
    if (!profile?.id) return;
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(profile);
    setProfileUrl(profile, { replace: false });
  }

  function openSavedPosts() {
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(null);
    setProfileUrl(null);
    if (!authUser) {
      setPendingTab("saved");
      setShowAuth(true);
      return;
    }
    setTab("saved");
    setSelectedPostId(null);
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
          <AuthModal
            onSuccess={handleAuthSuccess}
            onClose={() => {
              setPendingTab(null);
              setShowAuth(false);
            }}
          />
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
              <button
                style={{ ...styles.tabBtn, ...(tab === "saved" ? styles.tabActive : {}) }}
                onClick={openSavedPosts}
              >
                저장글
              </button>
            </nav>

            <main style={styles.main}>
              {selectedProfile ? (
                <section>
                  <ProfilePanel
                    profile={selectedProfile}
                    currentUser={currentUser}
                    onBack={() => setSelectedProfile(null)}
                    onSelectPost={(postId) => {
                      markForumActivity();
                      openPost(postId);
                    }}
                    onUserActivity={markForumActivity}
                    onTagClick={openTagFilter}
                    onAuthorClick={openProfile}
                  />
                </section>
              ) : tab === "forum" ? (
                selectedPostId ? (
                  <PostDetail
                    postId={selectedPostId}
                    currentUser={currentUser}
                    onBack={closePost}
                    onUserActivity={markForumActivity}
                    onTagClick={openTagFilter}
                    onAuthorClick={openProfile}
                    onRequireAuth={() => setShowAuth(true)}
                    isAuthenticated={Boolean(authUser)}
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
                        onRequireAuth={() => setShowAuth(true)}
                        isAuthenticated={Boolean(authUser)}
                        onAuthorClick={openProfile}
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
                    onRequireAuth={() => setShowAuth(true)}
                    isAuthenticated={Boolean(authUser)}
                    onAuthorClick={openProfile}
                  />
                </section>
              ) : tab === "feed" ? (
                <section>
                  <PersonalisedFeed
                    currentUser={currentUser}
                    timeSpeed={timeSpeed}
                    onUserActivity={markForumActivity}
                    onRequireAuth={() => setShowAuth(true)}
                    isAuthenticated={Boolean(authUser)}
                    onAuthorClick={openProfile}
                  />
                </section>
              ) : tab === "saved" ? (
                <section style={styles.savedSection}>
                  <div style={styles.savedHero}>
                    <p style={styles.savedKicker}>저장한 글</p>
                    <h2 style={styles.savedTitle}>나중에 다시 볼 글을 모아두는 공간</h2>
                    <p style={styles.savedText}>
                      마음에 든 글을 저장해 두고, 다시 돌아와서 이어 읽을 수 있습니다.
                    </p>
                  </div>
                  <PostList
                    currentUser={currentUser}
                    onUserActivity={markForumActivity}
                    onSelectPost={(postId) => {
                      markForumActivity();
                      openPost(postId);
                    }}
                    onTagClick={openTagFilter}
                    onRequireAuth={() => setShowAuth(true)}
                    isAuthenticated={Boolean(authUser)}
                    activeTagFilter={activeTagFilter}
                    onTagFilterChange={setActiveTagFilter}
                    queryParams={{ saved: "true" }}
                    requiresAuth
                    onAuthorClick={openProfile}
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
  savedSection: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  savedHero: {
    padding: 18,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  },
  savedKicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    color: "#2563eb",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  savedTitle: {
    margin: "8px 0 8px",
    fontSize: 20,
    color: "#111827",
  },
  savedText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: "#6b7280",
  },
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
