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
import { MessageCircleMore } from "lucide-react";
import { chatTheme } from "./lib/chat-ui-theme.js";

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
      description: "최신 글을 보고, 선택하고, 반응하면서 캐릭터를 만듭니다.",
      buttonLabel: "포럼으로",
    },
    {
      id: "discover",
      title: "탐색하기",
      description: "인기 글, 검색, 태그로 무엇을 볼지 고릅니다.",
      buttonLabel: "탐색 열기",
    },
    {
      id: "feed",
      title: "맞춤 피드",
      description: "내가 본 것과 반응한 것이 다음 노출을 바꿉니다.",
      buttonLabel: "피드 보기",
    },
    {
      id: "saved",
      title: "저장글",
      description: "다시 보고 싶은 선택을 따로 모아둡니다.",
      buttonLabel: "저장글 열기",
    },
  ];

  return (
    <section style={styles.quickActions}>
      <div style={styles.quickActionsHeader}>
        <p style={styles.quickActionsKicker}>바로 시작</p>
        <h2 style={styles.quickActionsTitle}>이곳에서 할 수 있는 것</h2>
        <p style={styles.quickActionsText}>
          무엇을 볼지 고르고, 반응을 남기고, 다시 돌아올 선택을 저장할 수 있습니다.
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
  { id: "forum", label: "포럼", description: "글을 읽고 선택하고 반응합니다." },
  { id: "discover", label: "탐색", description: "태그, 검색, 인기글로 볼 글을 고릅니다." },
  { id: "feed", label: "맞춤 피드", description: "내 반응이 반영된 글을 봅니다." },
  { id: "saved", label: "저장글", description: "다시 보고 싶은 선택을 보관합니다." },
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
      <div style={styles.shell}>
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
      </div>
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
          <div style={styles.shell}>
            <header style={styles.header}>
              <div style={styles.brandBlock}>
                <div style={styles.brandAvatar} aria-label="AI Fashion Forum">
                  <MessageCircleMore size={24} strokeWidth={2.25} />
                </div>
                <div style={styles.brandCopy}>
                  <span style={styles.logo}>AI Fashion Forum</span>
                  <span style={styles.headerHint}>소비 · 선택 · 반응 · writeback</span>
                </div>
              </div>

              <div style={styles.avatarStrip} aria-hidden="true">
                {["A", "F", "C", "S"].map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    style={{
                      ...styles.avatarBubble,
                      background:
                        index === 0
                          ? "linear-gradient(135deg, #23a6f0 0%, #4dd5ff 100%)"
                          : index === 1
                          ? "linear-gradient(135deg, #b54cff 0%, #ff7ac6 100%)"
                          : index === 2
                          ? "linear-gradient(135deg, #ff9800 0%, #ffd166 100%)"
                          : "linear-gradient(135deg, #334155 0%, #475569 100%)",
                    }}
                  >
                    {item}
                  </span>
                ))}
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

            <div style={styles.pageStack}>
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
                      <p style={styles.composerTitle}>선택을 글로 남기기</p>
                      <p style={styles.composerHint}>
                        {hasForumActivity || authUser
                              ? "반응과 선택을 다시 밖으로 내보내는 compact 진입점입니다."
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
                          {composerOpen ? "입력 닫기" : "입력 열기"}
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
                    <h2 style={styles.savedTitle}>다시 돌아올 선택을 모아두는 공간</h2>
                    <p style={styles.savedText}>
                      마음에 든 글을 저장해 두고, 나중에 같은 선택 경로를 다시 열 수 있습니다.
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
            </div>
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: chatTheme.pageBg,
    color: chatTheme.text,
    fontFamily: "system-ui, sans-serif",
  },
  shell: {
    width: "min(100%, 920px)",
    margin: "0 auto",
    padding: "20px 16px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 18px",
    background: chatTheme.shellBg,
    color: chatTheme.text,
    position: "sticky",
    top: 16,
    zIndex: 10,
    border: `1px solid ${chatTheme.shellBorder}`,
    borderRadius: chatTheme.radiusXL,
    boxShadow: chatTheme.shadow,
    backdropFilter: "blur(18px)",
  },
  adminHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    padding: "18px 20px",
    background: chatTheme.shellBg,
    color: chatTheme.text,
    position: "sticky",
    top: 16,
    zIndex: 10,
    border: `1px solid ${chatTheme.shellBorder}`,
    borderRadius: chatTheme.radiusXL,
    boxShadow: chatTheme.shadow,
    backdropFilter: "blur(18px)",
  },
  brandBlock: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  brandAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #23a6f0 0%, #b54cff 100%)",
    color: "#fff",
    fontWeight: 900,
    boxShadow: "0 12px 24px rgba(35, 166, 240, 0.22)",
    flex: "0 0 auto",
  },
  brandCopy: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
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
    color: chatTheme.accent,
  },
  adminTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: chatTheme.text,
  },
  adminDescription: {
    margin: 0,
    maxWidth: 640,
    fontSize: 13,
    lineHeight: 1.6,
    color: chatTheme.textMuted,
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
    background: "rgba(35, 166, 240, 0.16)",
    color: "#a5dcff",
    fontSize: 12,
    fontWeight: 800,
  },
  adminBackBtn: {
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: "rgba(255,255,255,0.05)",
    color: chatTheme.text,
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  logo: { fontSize: 18, fontWeight: 800, letterSpacing: -0.4, color: chatTheme.text },
  headerHint: { fontSize: 12, color: chatTheme.textMuted, lineHeight: 1.3 },
  avatarStrip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    flexWrap: "wrap",
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    boxShadow: chatTheme.shadowSoft,
  },
  userRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  speedControl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: chatTheme.textMuted,
    fontSize: 12,
    marginRight: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: "rgba(255,255,255,0.04)",
  },
  speedLabel: { opacity: 0.85 },
  speedSelect: {
    background: "rgba(255,255,255,0.06)",
    color: chatTheme.text,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: 999,
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
    background: "linear-gradient(135deg, #22c55e 0%, #15b8a6 100%)",
    color: "#06281f",
  },
  autoBtnOff: {
    background: "rgba(255,255,255,0.05)",
    color: chatTheme.textMuted,
    borderColor: chatTheme.surfaceBorder,
  },
  userId: { fontSize: 13, color: chatTheme.textSoft },
  editBtn: {
    fontSize: 12,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    color: chatTheme.textSoft,
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
    maxWidth: 680,
    margin: "0 auto",
    padding: "0 0 8px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  adminMain: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0",
  },
  quickActions: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "0",
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
    color: chatTheme.accent,
  },
  quickActionsTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.2,
    color: chatTheme.text,
  },
  quickActionsText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: chatTheme.textMuted,
  },
  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  quickActionCard: {
    textAlign: "left",
    padding: 14,
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelBg,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 132,
    boxShadow: chatTheme.shadowSoft,
  },
  quickActionTitle: { fontSize: 16, fontWeight: 800, color: chatTheme.text },
  quickActionDescription: { fontSize: 13, lineHeight: 1.5, color: chatTheme.textMuted },
  quickActionButton: {
    alignSelf: "flex-start",
    marginTop: "auto",
    fontSize: 12,
    fontWeight: 800,
    color: "#a5dcff",
    background: "rgba(35, 166, 240, 0.14)",
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
    background: chatTheme.panelBg,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    borderRadius: chatTheme.radiusLG,
    boxShadow: chatTheme.shadowSoft,
  },
  composerTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: chatTheme.text,
  },
  composerHint: {
    margin: "4px 0 0",
    fontSize: 13,
    color: chatTheme.textMuted,
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
    background: "linear-gradient(135deg, #23a6f0 0%, #b54cff 100%)",
    color: "#fff",
  },
  composerBtnDisabled: {
    background: "rgba(255,255,255,0.06)",
    color: chatTheme.textMuted,
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
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelBg,
    boxShadow: chatTheme.shadowSoft,
  },
  savedKicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    color: chatTheme.accent,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  savedTitle: {
    margin: "8px 0 8px",
    fontSize: 20,
    color: chatTheme.text,
  },
  savedText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: chatTheme.textMuted,
  },
  nav: {
    background: chatTheme.shellBg,
    padding: "0 14px",
    display: "flex",
    gap: 4,
    alignItems: "stretch",
    border: `1px solid ${chatTheme.shellBorder}`,
    borderRadius: chatTheme.radiusXL,
    boxShadow: chatTheme.shadowSoft,
    overflowX: "auto",
  },
  contextSummary: {
    margin: 0,
    padding: "12px 14px",
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelBg,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: chatTheme.shadowSoft,
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
    color: chatTheme.textMuted,
    letterSpacing: "0.06em",
  },
  contextClearBtn: {
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: "rgba(255,255,255,0.06)",
    color: chatTheme.textSoft,
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
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${chatTheme.surfaceBorder}`,
    color: chatTheme.text,
    fontSize: 12,
  },
  placeholderCard: {
    marginTop: 8,
    padding: "18px 20px",
    borderRadius: chatTheme.radiusLG,
    border: `1px solid ${chatTheme.surfaceBorder}`,
    background: chatTheme.panelBg,
    boxShadow: chatTheme.shadowSoft,
  },
  placeholderTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: chatTheme.text,
  },
  placeholderText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: chatTheme.textMuted,
    lineHeight: 1.6,
  },
  tabBtn: {
    padding: "10px 16px 12px",
    background: "transparent",
    border: "none",
    color: chatTheme.textMuted,
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
    color: chatTheme.text,
    borderBottomColor: chatTheme.accent,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  tabDescription: {
    fontSize: 11,
    lineHeight: 1.35,
    color: chatTheme.textMuted,
    textAlign: "left",
  },
  tabDescriptionActive: {
    color: chatTheme.textSoft,
  },
  pageStack: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
};
