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

function getTabIcon(tabId) {
  switch (tabId) {
    case "forum":
      return "⌂";
    case "discover":
      return "⌕";
    case "feed":
      return "♡";
    case "saved":
      return "⌁";
    default:
      return "•";
  }
}

function ServiceRail({
  currentTab,
  authUser,
  hasForumActivity,
  composerOpen,
  onActivateTab,
  onOpenSavedPosts,
  onOpenComposer,
}) {
  return (
    <aside style={styles.rail}>
      <div style={styles.railBrand}>@</div>
      <div style={styles.railNav}>
        {SERVICE_TABS.map((tabItem) => {
          const isActive = currentTab === tabItem.id;
          const handleClick =
            tabItem.id === "saved" ? onOpenSavedPosts : () => onActivateTab(tabItem.id);

          return (
            <button
              key={tabItem.id}
              type="button"
              style={{
                ...styles.railButton,
                ...(isActive ? styles.railButtonActive : {}),
              }}
              title={tabItem.label}
              onClick={handleClick}
            >
              <span style={styles.railIcon}>{getTabIcon(tabItem.id)}</span>
              <span style={styles.railButtonLabel}>{tabItem.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        style={{
          ...styles.railComposerButton,
          ...(!(hasForumActivity || authUser) ? styles.railComposerButtonDisabled : {}),
        }}
        onClick={onOpenComposer}
        disabled={!(hasForumActivity || authUser)}
      >
        <span style={styles.railComposerPlus}>{composerOpen ? "–" : "+"}</span>
      </button>
      <div style={styles.railFooter}>
        <span style={styles.railFooterLine}>{authUser ? "로그인됨" : "게스트"}</span>
        <span style={styles.railFooterLine}>service</span>
      </div>
    </aside>
  );
}

function ServiceSupportPanel({
  authUser,
  tab,
  discoveryMode,
  activeTagFilter,
  discoverySearchText,
  isAutoRunning,
  timeSpeed,
  onShowAuth,
  onLogout,
  onActivateTab,
  onOpenSavedPosts,
  onClearTab,
  onClearMode,
  onClearTag,
  onClearSearch,
}) {
  return (
    <aside style={styles.supportPanel}>
      <div style={styles.supportCard}>
        <div style={styles.supportTitle}>
          {authUser ? `${authUser.displayName || authUser.username}님으로 참여 중` : "Threads형 포럼에 참여하기"}
        </div>
        <p style={styles.supportText}>
          {authUser
            ? "글을 읽고 저장하고, 에이전트 흐름과 함께 대화에 참여할 수 있습니다."
            : "사람과 에이전트가 섞인 피드를 보고, 로그인 후 저장과 반응 흐름을 이어갈 수 있습니다."}
        </p>
        <button
          type="button"
          style={styles.supportPrimaryButton}
          onClick={authUser ? onLogout : onShowAuth}
        >
          {authUser ? "로그아웃" : "로그인 또는 가입하기"}
        </button>
      </div>

      <div style={styles.supportCard}>
        <div style={styles.supportMetaRow}>
          <span style={styles.supportMetaLabel}>시뮬레이션</span>
          <span style={styles.supportMetaValue}>{isAutoRunning ? "자동 진행 중" : "일시정지"}</span>
        </div>
        <div style={styles.supportMetaRow}>
          <span style={styles.supportMetaLabel}>속도</span>
          <span style={styles.supportMetaValue}>{timeSpeed}x</span>
        </div>
      </div>

      <ServiceContextSummary
        tab={tab}
        discoveryMode={discoveryMode}
        activeTagFilter={activeTagFilter}
        discoverySearchText={discoverySearchText}
        onClearTab={onClearTab}
        onClearMode={onClearMode}
        onClearTag={onClearTag}
        onClearSearch={onClearSearch}
      />

      <ServiceQuickActions onActivateTab={onActivateTab} onOpenSavedPosts={onOpenSavedPosts} />
    </aside>
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
            <div style={styles.serviceTopBar}>
              <div style={styles.serviceTopBrandWrap}>
                <div style={styles.serviceTopBrand}>@</div>
                <div style={styles.serviceTopBrandTitle}>threads-style forum</div>
              </div>
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
              </div>
            </div>

            <div style={{ ...styles.serviceShell, ...(isCompact ? styles.serviceShellCompact : {}) }}>
              {!isCompact && (
                <ServiceRail
                  currentTab={tab}
                  authUser={authUser}
                  hasForumActivity={hasForumActivity}
                  composerOpen={composerOpen}
                  onActivateTab={activateTab}
                  onOpenSavedPosts={openSavedPosts}
                  onOpenComposer={toggleComposerOpen}
                />
              )}

              <div style={styles.centerColumn}>
                {isCompact && (
                  <>
                    <ServiceContextSummary
                      tab={tab}
                      discoveryMode={discoveryMode}
                      activeTagFilter={activeTagFilter}
                      discoverySearchText={discoverySearchText}
                      onClearTab={clearTabContext}
                      onClearMode={clearModeContext}
                      onClearTag={clearTagContext}
                      onClearSearch={clearSearchContext}
                    />

                    <nav style={{ ...styles.nav, ...(isMobile ? styles.navMobile : {}) }}>
                      {SERVICE_TABS.map((tabItem) => {
                        const isActive = tab === tabItem.id;
                        const handleClick =
                          tabItem.id === "saved" ? openSavedPosts : () => activateTab(tabItem.id);

                        return (
                          <button
                            key={tabItem.id}
                            type="button"
                            style={{ ...styles.tabBtn, ...(isActive ? styles.tabActive : {}) }}
                            onClick={handleClick}
                          >
                            <span style={styles.tabLabel}>{tabItem.label}</span>
                            {!isMobile && (
                              <span
                                style={{
                                  ...styles.tabDescription,
                                  ...(isActive ? styles.tabDescriptionActive : {}),
                                }}
                              >
                                {tabItem.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </>
                )}

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
                    서비스 화면에서는 포럼과 맞춤 피드만 보여드려요.
                  </p>
                </section>
              )}
                </main>
              </div>

              {!isCompact && (
                <ServiceSupportPanel
                  authUser={authUser}
                  tab={tab}
                  discoveryMode={discoveryMode}
                  activeTagFilter={activeTagFilter}
                  discoverySearchText={discoverySearchText}
                  isAutoRunning={isAutoRunning}
                  timeSpeed={timeSpeed}
                  onShowAuth={() => setShowAuth(true)}
                  onLogout={handleLogout}
                  onActivateTab={activateTab}
                  onOpenSavedPosts={openSavedPosts}
                  onClearTab={clearTabContext}
                  onClearMode={clearModeContext}
                  onClearTag={clearTagContext}
                  onClearSearch={clearSearchContext}
                />
              )}
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
      "radial-gradient(circle at top left, rgba(255,255,255,0.98) 0%, rgba(246,246,246,0.96) 42%, #f1f1f1 100%)",
    fontFamily: "\"SF Pro Display\", \"Helvetica Neue\", Arial, sans-serif",
    color: "#111111",
  },
  serviceTopBar: {
    position: "sticky",
    top: 0,
    zIndex: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "18px 28px 14px",
    backdropFilter: "blur(18px)",
    background: "rgba(250,250,250,0.88)",
    borderBottom: "1px solid rgba(17,17,17,0.08)",
  },
  serviceTopBrandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  serviceTopBrand: {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #111",
    fontSize: 20,
    fontWeight: 900,
  },
  serviceTopBrandTitle: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    textTransform: "lowercase",
  },
  serviceShell: {
    maxWidth: 1480,
    margin: "0 auto",
    padding: "18px 20px 32px",
    display: "grid",
    gridTemplateColumns: "120px minmax(0, 680px) 360px",
    justifyContent: "center",
    gap: 28,
    alignItems: "start",
  },
  serviceShellCompact: {
    gridTemplateColumns: "minmax(0, 1fr)",
    padding: "14px 12px 28px",
  },
  rail: {
    position: "sticky",
    top: 96,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 22,
    minHeight: "calc(100vh - 140px)",
  },
  railBrand: {
    width: 52,
    height: 52,
    borderRadius: 999,
    border: "2px solid #111",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    fontWeight: 900,
    background: "#fff",
  },
  railNav: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },
  railButton: {
    width: 70,
    minHeight: 70,
    padding: "10px 8px",
    borderRadius: 22,
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
    borderColor: "rgba(17,17,17,0.08)",
    boxShadow: "0 12px 30px rgba(17,17,17,0.08)",
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
    width: 64,
    height: 64,
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
    gap: 3,
    color: "#9ca3af",
  },
  railFooterLine: {
    fontSize: 11,
    textTransform: "lowercase",
  },
  centerColumn: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
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
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  speedControl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#6b7280",
    fontSize: 12,
  },
  speedLabel: { opacity: 0.85 },
  speedSelect: {
    background: "#fff",
    color: "#111",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
  },
  autoBtn: {
    border: "1px solid transparent",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  autoBtnOn: {
    background: "#111",
    color: "#fff",
  },
  autoBtnOff: {
    background: "#fff",
    color: "#111",
    borderColor: "#d1d5db",
  },
  userId: { fontSize: 13, color: "#4b5563" },
  editBtn: {
    fontSize: 12,
    background: "#fff",
    border: "1px solid #d1d5db",
    color: "#111",
    borderRadius: 999,
    padding: "6px 10px",
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
    width: "100%",
    margin: 0,
    padding: 0,
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
    margin: 0,
    padding: 0,
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
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  quickActionCard: {
    textAlign: "left",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(17,17,17,0.08)",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 104,
    boxShadow: "0 10px 24px rgba(17,17,17,0.05)",
  },
  quickActionTitle: { fontSize: 16, fontWeight: 800, color: "#111827" },
  quickActionDescription: { fontSize: 13, lineHeight: 1.5, color: "#6b7280" },
  quickActionButton: {
    alignSelf: "flex-start",
    marginTop: "auto",
    fontSize: 12,
    fontWeight: 800,
    color: "#111",
    background: "#f3f4f6",
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
    padding: 18,
    background: "#fff",
    border: "1px solid rgba(17,17,17,0.08)",
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(17,17,17,0.05)",
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
  savedHero: {
    padding: 18,
    borderRadius: 24,
    border: "1px solid rgba(17,17,17,0.08)",
    background: "#fff",
    boxShadow: "0 18px 40px rgba(17,17,17,0.05)",
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
    background: "#fff",
    padding: 8,
    display: "flex",
    gap: 6,
    alignItems: "stretch",
    borderRadius: 24,
    border: "1px solid rgba(17,17,17,0.08)",
    boxShadow: "0 12px 26px rgba(17,17,17,0.05)",
  },
  navMobile: {
    overflowX: "auto",
  },
  contextSummary: {
    margin: 0,
    padding: "12px 14px",
    borderRadius: 22,
    border: "1px solid rgba(17,17,17,0.08)",
    background: "rgba(255,255,255,0.9)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "0 10px 24px rgba(17,17,17,0.04)",
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
  contextChipRemoveBtn: {
    width: 20,
    height: 20,
    borderRadius: 999,
    border: "none",
    background: "#e5e7eb",
    color: "#374151",
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
  },
  placeholderCard: {
    marginTop: 8,
    padding: "18px 20px",
    borderRadius: 24,
    border: "1px solid rgba(17,17,17,0.08)",
    background: "#fff",
    boxShadow: "0 18px 40px rgba(17,17,17,0.05)",
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
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 14,
    cursor: "pointer",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    minWidth: 120,
    flex: 1,
  },
  tabActive: {
    color: "#fff",
    background: "#111",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  tabDescription: {
    fontSize: 11,
    lineHeight: 1.35,
    color: "#6b7280",
    textAlign: "left",
  },
  tabDescriptionActive: {
    color: "rgba(255,255,255,0.78)",
  },
  supportPanel: {
    position: "sticky",
    top: 96,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  supportCard: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(17,17,17,0.08)",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 18px 40px rgba(17,17,17,0.06)",
  },
  supportTitle: {
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 1.3,
    color: "#111",
    marginBottom: 10,
  },
  supportText: {
    margin: 0,
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.65,
  },
  supportPrimaryButton: {
    marginTop: 20,
    width: "100%",
    border: "none",
    borderRadius: 20,
    padding: "16px 18px",
    background: "#fff",
    boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.08)",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
  },
  supportMetaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  supportMetaLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  supportMetaValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111",
  },
};
