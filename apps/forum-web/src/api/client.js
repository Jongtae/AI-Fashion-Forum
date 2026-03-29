const FORUM_SERVER_BASE = import.meta.env.VITE_FORUM_SERVER_URL || "http://localhost:4000";
const AGENT_SERVER_BASE = import.meta.env.VITE_AGENT_SERVER_URL || "http://localhost:4001";

function getToken() {
  return localStorage.getItem("auth_token");
}

async function _request(base, path, options = {}) {
  const token = getToken();
  const res = await fetch(`${base}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || "request_failed"), { status: res.status });
  }

  return res.json();
}

const forumRequest = (path, options = {}) => _request(FORUM_SERVER_BASE, path, options);
const agentRequest = (path, options = {}) => _request(AGENT_SERVER_BASE, path, options);

// ── Posts (forum-server) ──────────────────────────────────────────────────────
export const fetchPosts = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return forumRequest(`/api/posts${q ? `?${q}` : ""}`);
};
export const fetchPost = (postId) => forumRequest(`/api/posts/${postId}`);
export const createPost = (data) => forumRequest("/api/posts", { method: "POST", body: data });
export const updatePost = (postId, data) =>
  forumRequest(`/api/posts/${postId}`, { method: "PUT", body: data });
export const deletePost = (postId) => forumRequest(`/api/posts/${postId}`, { method: "DELETE" });
export const toggleLike = (postId, userId) =>
  forumRequest(`/api/posts/${postId}/like`, { method: "POST", body: { userId } });
export const savePost = (postId) => forumRequest(`/api/posts/${postId}/save`, { method: "POST" });
export const unsavePost = (postId) => forumRequest(`/api/posts/${postId}/save`, { method: "DELETE" });

// ── Comments (forum-server) ───────────────────────────────────────────────────
export const fetchComments = (postId) => forumRequest(`/api/posts/${postId}/comments`);
export const createComment = (postId, data) =>
  forumRequest(`/api/posts/${postId}/comments`, { method: "POST", body: data });
export const deleteComment = (postId, commentId) =>
  forumRequest(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });

// ── Auth (forum-server) ───────────────────────────────────────────────────────
export const register = (data) => forumRequest("/api/auth/register", { method: "POST", body: data });
export const login = (data) => forumRequest("/api/auth/login", { method: "POST", body: data });
export const getMe = () => forumRequest("/api/auth/me");

// ── Feed (forum-server) ───────────────────────────────────────────────────────
export const fetchFeed = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return forumRequest(`/api/feed${q ? `?${q}` : ""}`);
};

// ── Agent loop (agent-server) ─────────────────────────────────────────────────
export const triggerAgentTick = (params = {}) =>
  agentRequest("/api/agent-loop/tick", { method: "POST", body: params });
export const fetchAgentLoopStatus = () => agentRequest("/api/agent-loop/status");
export const fetchAgentStates = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return agentRequest(`/api/agent-loop/states${q ? `?${q}` : ""}`);
};

// ── Sprint 1 samples (agent-server) ──────────────────────────────────────────
export const fetchSprint1AgentSeeds = () => agentRequest("/api/sprint1-agent-seed-sample");
export const fetchSprint1ExposureSample = (agentId = "A01") =>
  agentRequest(`/api/sprint1-exposure-sample?agent=${agentId}`);
export const fetchSprint1MemoryWriteback = (agentId = "A01") =>
  agentRequest(`/api/sprint1-memory-writeback-sample?agent=${agentId}`);
export const fetchSprint1ForumPosts = () => agentRequest("/api/sprint1-forum-post-sample");
export const fetchSprint1Evaluation = () => agentRequest("/api/sprint1-evaluation-sample");

// ── End-to-end run (agent-server) ─────────────────────────────────────────────
export const triggerRun = (params = {}) =>
  agentRequest("/api/run", { method: "POST", body: params });
export const fetchLatestReplay = () => agentRequest("/api/run/replay/latest");
export const fetchReplay = (runId) => agentRequest(`/api/run/replay/${runId}`);
export const fetchLatestReport = () => agentRequest("/api/run/report/latest");

// ── Operator dashboard (forum-server) ─────────────────────────────────────────
export const fetchOperatorDashboard = () => forumRequest("/api/operator/dashboard");
export const reviewModerationItem = (postId, data) =>
  forumRequest(`/api/operator/moderation/review/${postId}`, { method: "PATCH", body: data });
export const submitFeedback = (data) => forumRequest("/api/engagement/feedback", { method: "POST", body: data });

// ── User actions & content filtering (forum-server) ────────────────────────────
export const submitUserAction = (data) =>
  forumRequest("/api/user/action", { method: "POST", body: data });
export const filterContent = (data) =>
  forumRequest("/api/moderation/filter", { method: "POST", body: data });
