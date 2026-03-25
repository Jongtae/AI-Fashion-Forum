import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PostForm from "./components/PostForm.jsx";
import PostList from "./components/PostList.jsx";
import PersonalisedFeed from "./components/PersonalisedFeed.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10_000 },
  },
});

// In a real app this would come from an auth context / session.
// For now we use a simple "guest user" that can be changed via the UI.
function useCurrentUser() {
  const [userId, setUserId] = useState(
    () => localStorage.getItem("forum_user_id") || "user-guest"
  );

  function changeUser(id) {
    const trimmed = id.trim() || "user-guest";
    localStorage.setItem("forum_user_id", trimmed);
    setUserId(trimmed);
  }

  return { id: userId, type: "user", changeUser };
}

export default function ForumApp() {
  const currentUser = useCurrentUser();
  const [editingUser, setEditingUser] = useState(false);
  const [draft, setDraft] = useState(currentUser.id);
  const [tab, setTab] = useState("forum"); // "forum" | "feed"

  return (
    <QueryClientProvider client={queryClient}>
      <div style={styles.root}>
        <header style={styles.header}>
          <span style={styles.logo}>✦ AI Fashion Forum</span>
          <div style={styles.userRow}>
            {editingUser ? (
              <>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  style={styles.userInput}
                />
                <button
                  style={styles.saveBtn}
                  onClick={() => {
                    currentUser.changeUser(draft);
                    setEditingUser(false);
                  }}
                >
                  저장
                </button>
              </>
            ) : (
              <>
                <span style={styles.userId}>👤 {currentUser.id}</span>
                <button style={styles.editBtn} onClick={() => { setDraft(currentUser.id); setEditingUser(true); }}>
                  변경
                </button>
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
        </nav>

        <main style={styles.main}>
          {tab === "forum" ? (
            <>
              <section style={styles.formSection}>
                <PostForm currentUser={currentUser} />
              </section>
              <section style={styles.feedSection}>
                <PostList currentUser={currentUser} />
              </section>
            </>
          ) : (
            <section>
              <PersonalisedFeed currentUser={currentUser} />
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
