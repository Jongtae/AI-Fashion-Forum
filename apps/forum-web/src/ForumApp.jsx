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
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path.startsWith("/operator")) {
    return "admin";
  }

  return ["forum", "discover", "feed", "saved"].includes(view) ? view : "forum";
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

function ServiceContextSummary({ tab, discoveryMode, activeTagFilter, discoverySearchText }) {
  const handleClearContext = () => {
    window.dispatchEvent(new CustomEvent("forum:clear-context"));
  };
  const chips = [];

  if (tab && tab !== "forum") {
    chips.push({ label: "탭", value: tab });
  }

  if (tab === "discover" && discoveryMode && discoveryMode !== "recent") {
    chips.push({ label: "모드", value: discoveryMode });
  }

  if (activeTagFilter) {
    chips.push({ label: "태그", value: `#${activeTagFilter}` });
  }

  if (tab === "discover" && discoverySearchText) {
    chips.push({ label: "검색", value: discoverySearchText });
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
          </span>
        ))}
      </div>
    </div>
  );
}

function ServiceQuickActions({ onActivateTab, onOpenSavedPosts }) {
  const actions = [
    {
      id: "forum",
      title: "포럼 읽기",
      description: "최신 글을 보고, 글쓰기와 댓글 흐름을 이어갑니다.",
      buttonLabel: "포럼으로",
    },
    {
      id: "discover",
      title: "탐색하기",
      description: "인기 글, 검색, 태그로 주제를 빠르게 찾습니다.",
      buttonLabel: "탐색 열기",
    },
    {
      id: "feed",
      title: "맞춤 피드",
      description: "내 반응에 맞춰 정렬된 글을 한 번에 봅니다.",
      buttonLabel: "피드 보기",
    },
    {
      id: "saved",
      title: "저장글",
      description: "나중에 다시 읽을 글을 모아둡니다.",
      buttonLabel: "저장글 열기",
    },
  ];

  return (
    <section style={styles.quickActions}>
      <div style={styles.quickActionsHeader}>
        <p style={styles.quickActionsKicker}>바로 시작</p>
        <h2 style={styles.quickActionsTitle}>이곳에서 할 수 있는 것</h2>
        <p style={styles.quickActionsText}>
          글을 읽고, 주제를 찾고, 반응을 남기고, 다시 볼 글을 저장할 수 있습니다.
        </p>
      </div>
      <div style={styles.quickActionsGrid}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            style={styles.quickActionCard}
            onClick={() => {
              if (action.id === "saved") {
                onOpenSavedPosts();
                return;
              }

              onActivateTab(action.id);
            }}
          >
            <div style={styles.quickActionTitle}>{action.title}</div>
            <div style={styles.quickActionDescription}>{action.description}</div>
            <span style={styles.quickActionButton}>{action.buttonLabel}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const SERVICE_TABS = [
  { id: "forum", label: "포럼", description: "글을 읽고 댓글을 남깁니다." },
  { id: "discover", label: "탐색", description: "태그, 검색, 인기글을 찾습니다." },
  { id: "feed", label: "맞춤 피드", description: "내 반응에 맞는 글을 봅니다." },
  { id: "saved", label: "저장글", description: "나중에 읽을 글을 보관합니다." },
];

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
  const params = new URLSearchParams(window.location.search);
  if (view) {
    params.set("view", view);
  } else {
    params.delete("view");
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
  const [activeTagFilter, setActiveTagFilter] = useState(getInitialActiveTagFilter);
  const [discoverySearchText, setDiscoverySearchText] = useState(getInitialDiscoveryQuery);
  const [discoveryMode, setDiscoveryMode] = useState(getInitialDiscoveryMode);
  const [composerOpen, setComposerOpen] = useState(false);
  const [hasForumActivity, setHasForumActivity] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const [pendingTab, setPendingTab] = useState(null);
  const autoTickInFlightRef = useRef(false);
  const prevSelectedPostIdRef = useRef(null);
  const previousServiceTabRef = useRef("forum");

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
      const view = params.get("view");
      setTab(["forum", "discover", "feed", "saved"].includes(view) ? view : "forum");
      setSelectedPostId(params.get("postId") || null);
      const profileId = params.get("profileId");
      setSelectedProfile(
        profileId
          ? { id: profileId, type: params.get("profileType") || "user" }
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
          <AdminDashboard timeSpeed={timeSpeed} />
        </main>
      </>
    );
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

        {tab === "admin" ? (
          renderAdminShell()
        ) : (
          <>
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
              {SERVICE_TABS.map((tabItem) => {
                const isActive = tab === tabItem.id;
                const handleClick = tabItem.id === "saved" ? openSavedPosts : () => activateTab(tabItem.id);

                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    style={{ ...styles.tabBtn, ...(isActive ? styles.tabActive : {}) }}
                    onClick={handleClick}
                  >
                    <span style={styles.tabLabel}>{tabItem.label}</span>
                    <span style={{ ...styles.tabDescription, ...(isActive ? styles.tabDescriptionActive : {}) }}>
                      {tabItem.description}
                    </span>
                  </button>
                );
              })}
            </nav>

            <ServiceQuickActions onActivateTab={activateTab} onOpenSavedPosts={openSavedPosts} />
            <ServiceContextSummary
              tab={tab}
              discoveryMode={discoveryMode}
              activeTagFilter={activeTagFilter}
              discoverySearchText={discoverySearchText}
            />

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
                      onTagFilterChange={(value) => {
                        setActiveTagFilter(value);
                        setTagUrl(value, { replace: false });
                      }}
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
  adminMain: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "24px 16px",
  },
  quickActions: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "0 16px 4px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  quickActionsHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  quickActionsKicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#2563eb",
  },
  quickActionsTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.2,
    color: "#111827",
  },
  quickActionsText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#4b5563",
  },
  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  quickActionCard: {
    textAlign: "left",
    padding: 14,
    borderRadius: 16,
    border: "1px solid #dbe3f1",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 132,
  },
  quickActionTitle: { fontSize: 16, fontWeight: 800, color: "#111827" },
  quickActionDescription: { fontSize: 13, lineHeight: 1.5, color: "#6b7280" },
  quickActionButton: {
    alignSelf: "flex-start",
    marginTop: "auto",
    fontSize: 12,
    fontWeight: 800,
    color: "#2563eb",
    background: "#eff6ff",
    borderRadius: 999,
    padding: "6px 10px",
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
    alignItems: "stretch",
  },
  contextSummary: {
    margin: "10px 24px 0",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  contextSummaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  contextSummaryLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#6b7280",
    letterSpacing: "0.06em",
  },
  contextClearBtn: {
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#374151",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  contextChipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  contextChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: 12,
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
    padding: "10px 16px 12px",
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    fontSize: 14,
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    minWidth: 132,
  },
  tabActive: {
    color: "#fff",
    borderBottomColor: "#3b82f6",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  tabDescription: {
    fontSize: 11,
    lineHeight: 1.35,
    color: "#9ca3af",
    textAlign: "left",
  },
  tabDescriptionActive: {
    color: "#d1d5db",
  },
};
