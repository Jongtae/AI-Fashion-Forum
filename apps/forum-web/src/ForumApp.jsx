import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bookmark, Home, PenSquare, Search, UserRound } from "lucide-react";
import { triggerAgentTick } from "./api/client.js";
import PostForm from "./components/PostForm.jsx";
import PostList from "./components/PostList.jsx";
import PostDetail from "./components/PostDetail.jsx";
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

function getPathSegments() {
  return window.location.pathname.split("/").filter(Boolean);
}

function getInitialTab() {
  const [first] = getPathSegments();
  if (first === "admin" || first === "operator") {
    return "admin";
  }
  if (first === "discover") return "discover";
  if (first === "saved") return "saved";
  return "forum";
}

function getInitialSelectedPostId() {
  const [first, second] = getPathSegments();
  return first === "post" && second ? second : null;
}

function getInitialSelectedProfile() {
  const [first, second, third] = getPathSegments();
  const profileId = first === "profile" ? (third || second) : null;
  if (!profileId) return null;
  return {
    id: profileId,
    type: first === "profile" && third ? second : "user",
  };
}

function getInitialActiveTagFilter() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tag") || "";
}

function getInitialDiscoveryQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

function getInitialDiscoveryMode() {
  const params = new URLSearchParams(window.location.search);
  return ["recent", "popular", "search"].includes(params.get("mode")) ? params.get("mode") : "recent";
}

function ServiceContextSummary({
  tab,
  discoveryMode,
  activeTagFilter,
  discoverySearchText,
  onClearTab,
  onClearMode,
  onClearTag,
  onClearSearch,
}) {
  const handleClearContext = () => {
    window.dispatchEvent(new CustomEvent("forum:clear-context"));
  };
  const chips = [];

  if (tab && tab !== "forum") {
    chips.push({ label: "탭", value: tab, onClear: onClearTab });
  }

  if (tab === "discover" && discoveryMode && discoveryMode !== "recent") {
    chips.push({ label: "모드", value: discoveryMode, onClear: onClearMode });
  }

  if (activeTagFilter) {
    chips.push({ label: "태그", value: `#${activeTagFilter}`, onClear: onClearTag });
  }

  if (tab === "discover" && discoverySearchText) {
    chips.push({ label: "검색", value: discoverySearchText, onClear: onClearSearch });
  }

  if (chips.length === 0) return null;

  return (
    <div style={styles.contextSummary}>
      <div style={styles.contextSummaryHeader}>
        <div style={styles.contextSummaryLabel}>현재 보기</div>
        <button type="button" style={styles.contextClearBtn} onClick={handleClearContext}>
          초기화
        </button>
      </div>
      <div style={styles.contextChipRow}>
        {chips.map((chip) => (
          <span key={`${chip.label}-${chip.value}`} style={styles.contextChip}>
            <strong>{chip.label}</strong>
            <span>{chip.value}</span>
            <button
              type="button"
              style={styles.contextChipRemoveBtn}
              onClick={chip.onClear}
              aria-label={`${chip.label} 지우기`}
              title={`${chip.label} 지우기`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function ServiceSidebar({
  authUser,
  composerOpen,
  onToggleComposer,
  onShowAuth,
  onLogout,
}) {
  return (
    <aside style={styles.serviceRail}>
      <div style={styles.railPillStack}>
        <button
          type="button"
          style={styles.railIconBtn}
          onClick={authUser ? onToggleComposer : onShowAuth}
          aria-label={composerOpen ? "글쓰기 닫기" : "글쓰기 열기"}
          title={composerOpen ? "글쓰기 닫기" : "글쓰기 열기"}
        >
          <PenSquare size={18} strokeWidth={2.1} />
        </button>
        <button
          type="button"
          style={styles.railIconBtn}
          onClick={authUser ? onLogout : onShowAuth}
          aria-label={authUser ? "로그아웃" : "로그인"}
          title={authUser ? "로그아웃" : "로그인"}
        >
          <UserRound size={18} strokeWidth={2.1} />
        </button>
      </div>
    </aside>
  );
}


const SERVICE_TABS = [
  { id: "forum", label: "포럼" },
  { id: "discover", label: "탐색" },
  { id: "saved", label: "저장글" },
];

function buildNextUrl(pathname, { preserveSearch = true } = {}) {
  const search = preserveSearch ? window.location.search : "";
  return search ? `${pathname}${search}` : pathname;
}

function setPostUrl(postId, { replace = true } = {}) {
  const nextPath = postId ? `/post/${postId}` : "/forum";
  const nextUrl = buildNextUrl(nextPath);
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

function setProfileUrl(profile, { replace = true } = {}) {
  let nextPath = "/forum";
  if (profile?.id) {
    nextPath = `/profile/${profile.type || "user"}/${profile.id}`;
  }

  const nextUrl = buildNextUrl(nextPath);
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

function setTagUrl(tag, { replace = true } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (tag) {
    params.set("tag", tag);
  } else {
    params.delete("tag");
  }

  const search = params.toString();
  const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

function setDiscoveryQueryUrl(query, { replace = true } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (query) {
    params.set("q", query);
  } else {
    params.delete("q");
  }

  const search = params.toString();
  const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

function setDiscoveryModeUrl(mode, { replace = true } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (mode) {
    params.set("mode", mode);
  } else {
    params.delete("mode");
  }

  const search = params.toString();
  const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
}

function setViewUrl(view, { replace = true } = {}) {
  let nextPath = "/forum";
  if (view === "discover") nextPath = "/discover";
  if (view === "saved") nextPath = "/saved";
  if (view === "admin") nextPath = "/admin";
  const nextUrl = buildNextUrl(nextPath);
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
  const [activeTagFilter, setActiveTagFilter] = useState(getInitialActiveTagFilter);
  const [discoverySearchText, setDiscoverySearchText] = useState(getInitialDiscoveryQuery);
  const [discoveryMode, setDiscoveryMode] = useState(getInitialDiscoveryMode);
  const [composerOpen, setComposerOpen] = useState(false);
  const [hasForumActivity, setHasForumActivity] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === "undefined" ? 1280 : window.innerWidth
  );
  const autoTickInFlightRef = useRef(false);
  const prevSelectedPostIdRef = useRef(null);
  const previousServiceTabRef = useRef("forum");
  const isCompact = viewportWidth < 1024;
  const isMobile = viewportWidth < 768;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClearContext = () => {
      setTab("forum");
      setViewUrl("forum", { replace: false });
      setSelectedPostId(null);
      setPostUrl(null);
      setSelectedProfile(null);
      setProfileUrl(null);
      setActiveTagFilter("");
      setDiscoverySearchText("");
      setDiscoveryMode("recent");
      setTagUrl("", { replace: true });
      setDiscoveryQueryUrl("", { replace: true });
      setDiscoveryModeUrl("recent", { replace: true });
      restoreFeedScrollPosition();
    };

    window.addEventListener("forum:clear-context", handleClearContext);
    return () => window.removeEventListener("forum:clear-context", handleClearContext);
  }, []);

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
      setViewUrl(pendingTab, { replace: true });
      setPendingTab(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
    setPendingTab(null);
    setTab("forum");
    setViewUrl("forum");
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
      const [first, second, third] = getPathSegments();
      setTab(first === "admin" || first === "operator" ? "admin" : first === "discover" ? "discover" : first === "saved" ? "saved" : "forum");
      setSelectedPostId(first === "post" && second ? second : null);
      setSelectedProfile(
        first === "profile" && second
          ? { id: third || second, type: third ? second : "user" }
          : null
      );
      setActiveTagFilter(params.get("tag") || "");
      setDiscoverySearchText(params.get("q") || "");
      setDiscoveryMode(["recent", "popular", "search"].includes(params.get("mode")) ? params.get("mode") : "recent");
    };

    window.addEventListener("popstate", syncSelectedPostFromLocation);
    syncSelectedPostFromLocation();

    return () => window.removeEventListener("popstate", syncSelectedPostFromLocation);
  }, []);

  useEffect(() => {
    const prevSelectedPostId = prevSelectedPostIdRef.current;
    if (prevSelectedPostId && !selectedPostId) {
      const restoredTab = previousServiceTabRef.current || "forum";
      setTab(restoredTab);
      setViewUrl(restoredTab, { replace: true });
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
    setViewUrl("forum", { replace: false });
    setTagUrl(tag, { replace: false });
    setActiveTagFilter(tag);
  }

  function openPost(postId) {
    setSelectedProfile(null);
    setProfileUrl(null);
    previousServiceTabRef.current = tab;
    saveFeedScrollPosition();
    setSelectedPostId(postId);
    setTab("forum");
    setViewUrl("forum", { replace: false });
    setPostUrl(postId, { replace: false });
  }

  function closePost() {
    const restoredTab = previousServiceTabRef.current || "forum";
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(null);
    setProfileUrl(null);
    setTab(restoredTab);
    setViewUrl(restoredTab, { replace: true });
    restoreFeedScrollPosition();
  }

  function openProfile(profile) {
    if (!profile?.id) return;
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(profile);
    setProfileUrl(profile, { replace: false });
    setViewUrl(tab, { replace: false });
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
    setViewUrl("saved", { replace: false });
    setSelectedPostId(null);
  }

  function activateTab(nextTab) {
    setTab(nextTab);
    setViewUrl(nextTab, { replace: false });
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(null);
    setProfileUrl(null);
  }

  function handleDiscoverySearchChange(value) {
    setDiscoverySearchText(value);
    setDiscoveryQueryUrl(value, { replace: false });
  }

  function handleDiscoveryModeChange(value) {
    setDiscoveryMode(value);
    setDiscoveryModeUrl(value, { replace: false });
  }

  function clearTabContext() {
    setSelectedPostId(null);
    setPostUrl(null);
    setSelectedProfile(null);
    setProfileUrl(null);
    setTab("forum");
    setViewUrl("forum", { replace: false });
  }

  function clearModeContext() {
    setDiscoveryMode("recent");
    setDiscoveryModeUrl("recent", { replace: false });
  }

  function clearTagContext() {
    setActiveTagFilter("");
    setTagUrl("", { replace: false });
  }

  function clearSearchContext() {
    setDiscoverySearchText("");
    setDiscoveryQueryUrl("", { replace: false });
  }

  function renderAdminShell() {
    return (
      <>
        <header style={styles.adminHeader}>
          <div style={styles.adminHeaderCopy}>
            <p style={styles.adminKicker}>관리 전용</p>
            <h1 style={styles.adminTitle}>Admin</h1>
            <p style={styles.adminDescription}>
              서비스 화면과 분리된 운영자 공간입니다. 흐름, 기록, 리플레이를 확인하고 관리합니다.
            </p>
          </div>
          <div style={styles.adminHeaderAction}>
            <span style={styles.adminRouteBadge}>/admin</span>
            <button
              type="button"
              style={styles.adminBackBtn}
              onClick={() => {
                setTab("forum");
                setViewUrl("forum", { replace: false });
              }}
            >
              서비스로 돌아가기
            </button>
          </div>
        </header>

        <main style={styles.adminMain}>
          <AdminDashboard />
        </main>
      </>
    );
  }

  useEffect(() => {
    let cancelled = false;

    const runAutoTick = async () => {
      if (cancelled || autoTickInFlightRef.current) {
        return;
      }

      autoTickInFlightRef.current = true;

      try {
        await triggerAgentTick({ ticks: 1, speed: 1 });
        await queryClient.invalidateQueries({ queryKey: ["agent-loop-status"] });
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
  }, []);

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

        {tab === "admin" ? (
          renderAdminShell()
        ) : (
          <>
            <div style={{ ...styles.serviceShell, ...(isCompact ? styles.serviceShellCompact : {}) }}>
              <div style={{ ...styles.centerColumn, ...(isCompact ? styles.centerColumnCompact : {}) }}>
                <main style={styles.main}>
              {selectedProfile ? (
                <section>
                  <ProfilePanel
                    profile={selectedProfile}
                    currentUser={currentUser}
                    onBack={() => {
                      setSelectedProfile(null);
                      setProfileUrl(null);
                      setViewUrl(tab, { replace: true });
                    }}
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
                    {composerOpen && (
                      <section style={styles.formSection}>
                        <div style={styles.composerPanel}>
                          <PostForm currentUser={currentUser} />
                        </div>
                      </section>
                    )}
                    <section style={styles.feedSection}>
                      <PostList
                        currentUser={currentUser}
                        onUserActivity={markForumActivity}
                        activeTagFilter={activeTagFilter}
                        onTagFilterChange={(value) => {
                          setActiveTagFilter(value);
                          setTagUrl(value, { replace: false });
                        }}
                        onSelectPost={(postId) => {
                          markForumActivity();
                          openPost(postId);
                        }}
                        onTagClick={openTagFilter}
                        onRequireAuth={() => setShowAuth(true)}
                        isAuthenticated={Boolean(authUser)}
                        onAuthorClick={openProfile}
                        onCreateFirstPost={() => {
                          markForumActivity();
                          setComposerOpen(true);
                        }}
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
                    searchText={discoverySearchText}
                    onSearchTextChange={handleDiscoverySearchChange}
                    mode={discoveryMode}
                    onModeChange={handleDiscoveryModeChange}
                    onTagClick={(tag) => {
                      if (tag) setActiveTagFilter(tag);
                    }}
                    onRequireAuth={() => setShowAuth(true)}
                    isAuthenticated={Boolean(authUser)}
                    onAuthorClick={openProfile}
                  />
                </section>
              ) : tab === "saved" ? (
                <section style={styles.savedSection}>
                  <div style={styles.savedHeader}>저장글</div>
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
                    onTagFilterChange={(value) => {
                      setActiveTagFilter(value);
                      setTagUrl(value, { replace: false });
                    }}
                    queryParams={{ saved: "true" }}
                    requiresAuth
                    onAuthorClick={openProfile}
                    onEmptyStateAction={() => {
                      activateTab("forum");
                    }}
                    emptyStateActionLabel="포럼으로 돌아가기"
                  />
                </section>
              ) : (
                <section style={styles.placeholderCard}>
                  <p style={styles.placeholderTitle}>관리 화면은 `/admin` 경로에서 볼 수 있어요.</p>
                  <p style={styles.placeholderText}>
                    서비스 화면에서는 포럼, 탐색, 저장글만 보여드려요.
                  </p>
                </section>
              )}
                </main>
              </div>

            </div>
            <div style={styles.bottomPillDock}>
              <div style={styles.bottomPillBar}>
                {[
                  { key: "forum", label: "포럼", icon: Home, active: tab === "forum", onClick: openForum },
                  { key: "discover", label: "탐색", icon: Search, active: tab === "discover", onClick: openSearch },
                  { key: "saved", label: "저장글", icon: Bookmark, active: tab === "saved", onClick: openSavedPosts },
                  { key: "profile", label: "프로필", icon: UserRound, active: tab === "profile" || Boolean(selectedProfile), onClick: openProfileTab },
                ].map((pill) => {
                  const Icon = pill.icon;
                  return (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={pill.onClick}
                      aria-label={pill.label}
                      title={pill.label}
                      style={{
                        ...styles.bottomPillBtn,
                        ...(pill.active ? styles.bottomPillBtnActive : {}),
                      }}
                    >
                      <Icon size={18} strokeWidth={2.1} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </QueryClientProvider>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.98) 0%, rgba(248,246,242,0.95) 42%, #f3f0ea 100%)",
    fontFamily: "\"Apple SD Gothic Neo\", \"Noto Sans KR\", \"SF Pro Display\", \"Helvetica Neue\", Arial, sans-serif",
    color: "#111111",
  },
  serviceShell: {
    width: 1124,
    maxWidth: "none",
    margin: "0 auto",
    padding: "18px 20px 40px",
    display: "grid",
    gridTemplateColumns: "760px 304px",
    justifyContent: "center",
    gap: 20,
    alignItems: "start",
  },
  serviceShellCompact: {
    width: "100%",
    gridTemplateColumns: "minmax(0, 1fr)",
    padding: "12px 12px 28px",
  },
  serviceRail: {
    position: "sticky",
    top: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifySelf: "end",
    alignSelf: "start",
  },
  railPillStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 10,
    borderRadius: 28,
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(17,17,17,0.06)",
    boxShadow: "0 18px 40px rgba(17,17,17,0.06)",
  },
  railIconBtn: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "1px solid rgba(17,17,17,0.06)",
    background: "#fff",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 10px 26px rgba(17,17,17,0.06)",
  },
  rail: {
    position: "sticky",
    top: 88,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
    minHeight: "calc(100vh - 140px)",
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(17,17,17,0.06)",
    borderRadius: 26,
    padding: "14px 0",
    boxShadow: "0 14px 34px rgba(17,17,17,0.05)",
  },
  railBrand: {
    width: 52,
    height: 52,
    borderRadius: 999,
    border: "2px solid #111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#111",
    background: "#fff",
  },
  railNav: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },
  railButton: {
    width: 68,
    minHeight: 68,
    padding: "10px 8px",
    borderRadius: 18,
    border: "1px solid transparent",
    background: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    color: "#6b7280",
  },
  railButtonActive: {
    background: "#fff",
    color: "#111111",
    borderColor: "rgba(17,17,17,0.07)",
    boxShadow: "0 10px 22px rgba(17,17,17,0.06)",
  },
  railIcon: {
    fontSize: 28,
    lineHeight: 1,
  },
  railButtonLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  railComposerButton: {
    width: 62,
    height: 62,
    borderRadius: 18,
    border: "none",
    background: "#efefef",
    color: "#111",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  railComposerButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  railComposerPlus: {
    fontSize: 36,
    lineHeight: 1,
  },
  railFooter: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    color: "#9ca3af",
  },
  railFooterLine: {
    fontSize: 11,
    textTransform: "none",
  },
  railAuthButton: {
    border: "1px solid rgba(17,17,17,0.12)",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: "#111",
    background: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  centerColumn: {
    width: 760,
    minWidth: 760,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  centerColumnCompact: {
    width: "100%",
    minWidth: 0,
  },
  adminHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    padding: "18px 24px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  adminHeaderCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  adminKicker: {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#93c5fd",
  },
  adminTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#fff",
  },
  adminDescription: {
    margin: 0,
    maxWidth: 640,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#cbd5e1",
  },
  adminHeaderAction: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  adminRouteBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(59,130,246,0.16)",
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 800,
  },
  adminBackBtn: {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  main: {
    width: "100%",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  adminMain: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "24px 16px",
  },
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  composerGate: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.06)",
    borderRadius: 14,
    boxShadow: "0 8px 16px rgba(17,17,17,0.03)",
  },
  composerCopy: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  composerTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },
  composerState: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    background: "#f3f4f6",
    color: "#374151",
  },
  composerBtn: {
    border: "1px solid transparent",
    borderRadius: 12,
    padding: "7px 12px",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  composerBtnActive: {
    background: "#111",
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
  savedHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 2,
  },
  placeholderCard: {
    marginTop: 8,
    padding: "20px 22px",
    borderRadius: 12,
    border: "1px solid rgba(17,17,17,0.06)",
    background: "#fff",
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
  bottomPillDock: {
    position: "fixed",
    insetInline: 0,
    bottom: 16,
    zIndex: 30,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
  },
  bottomPillBar: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(17,17,17,0.06)",
    boxShadow: "0 18px 42px rgba(17,17,17,0.08)",
    backdropFilter: "blur(18px)",
    pointerEvents: "auto",
  },
  bottomPillBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "#eef1f6",
    color: "#5b6475",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  bottomPillBtnActive: {
    background: "linear-gradient(135deg, #d7e7ff 0%, #ebe7ff 48%, #d9effa 100%)",
    color: "#111827",
    boxShadow: "0 8px 18px rgba(76, 107, 255, 0.18)",
  },
};
