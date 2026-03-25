const SIM_SERVER_BASE = import.meta.env.VITE_SIM_SERVER_URL || "http://localhost:4318";

async function request(path, options = {}) {
  const res = await fetch(`${SIM_SERVER_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || "request_failed"), { status: res.status });
  }

  return res.json();
}

// Posts
export const fetchPosts = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/api/posts${q ? `?${q}` : ""}`);
};
export const fetchPost = (postId) => request(`/api/posts/${postId}`);
export const createPost = (data) => request("/api/posts", { method: "POST", body: data });
export const updatePost = (postId, data) =>
  request(`/api/posts/${postId}`, { method: "PUT", body: data });
export const deletePost = (postId) => request(`/api/posts/${postId}`, { method: "DELETE" });
export const toggleLike = (postId, userId) =>
  request(`/api/posts/${postId}/like`, { method: "POST", body: { userId } });

// Comments
export const fetchComments = (postId) => request(`/api/posts/${postId}/comments`);
export const createComment = (postId, data) =>
  request(`/api/posts/${postId}/comments`, { method: "POST", body: data });
export const deleteComment = (postId, commentId) =>
  request(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
