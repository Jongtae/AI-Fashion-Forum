import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";

import authRouter from "./routes/auth.js";
import postsRouter from "./routes/posts.js";
import { User } from "./models/User.js";
import { Post } from "./models/Post.js";
import { Comment } from "./models/Comment.js";
import { Interaction } from "./models/Interaction.js";
import { Report } from "./models/Report.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.use("/api/posts", postsRouter);
  return app;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function matchesPostQuery(post, filter = {}) {
  if (filter._id?.$in && !filter._id.$in.some((value) => String(value) === String(post._id))) {
    return false;
  }
  if (filter.tags && !post.tags?.includes(filter.tags)) {
    return false;
  }
  if (filter.authorId && post.authorId !== filter.authorId) {
    return false;
  }
  if (filter.authorType && post.authorType !== filter.authorType) {
    return false;
  }
  if (filter.$or?.length) {
    const haystack = [
      post.content,
      post.authorId,
      post.format,
      ...(post.tags || []),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    const matchesAny = filter.$or.some((clause) => {
      const [field, condition] = Object.entries(clause)[0] || [];
      if (!field || !condition?.$regex) return false;
      const regex = new RegExp(condition.$regex, condition.$options || "");
      if (field === "tags") {
        return (post.tags || []).some((tag) => regex.test(String(tag)));
      }
      const value = String(post[field] || "").toLowerCase();
      return regex.test(value) || haystack.some((entry) => regex.test(entry));
    });

    if (!matchesAny) {
      return false;
    }
  }

  return true;
}

function createServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

function patch(target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  return () => {
    target[key] = original;
  };
}

function createInMemoryForumStore() {
  return {
    users: [],
    posts: [],
    comments: [],
    reports: [],
    interactions: [],
  };
}

function makeUserDocument(store, input) {
  const doc = new User(input);
  doc._id = doc._id || new mongoose.Types.ObjectId();

  return doc;
}

function makePostDocument(store, input) {
  const doc = new Post(input);
  doc._id = doc._id || new mongoose.Types.ObjectId();
  doc.lean = async () => clone(doc.toObject({ depopulate: true }));
  return doc;
}

function makeCommentDocument(store, input) {
  const doc = new Comment(input);
  doc._id = doc._id || new mongoose.Types.ObjectId();
  return doc;
}

function installUserStorePatches(store, restorers) {
  function buildUserQuery(match) {
    const resolved = match ? clone(match) : null;
    return {
      select() {
        return {
          lean: async () => {
            if (!resolved) return null;
            const { passwordHash, ...safeUser } = resolved;
            return safeUser;
          },
        };
      },
      lean: async () => resolved,
      then(resolve, reject) {
        return Promise.resolve(resolved).then(resolve, reject);
      },
      catch(reject) {
        return Promise.resolve(resolved).catch(reject);
      },
    };
  }

  restorers.push(
    patch(User.prototype, "save", async function save() {
      const snapshot = clone(this.toObject({ depopulate: true }));
      const index = store.users.findIndex((user) => String(user._id) === String(snapshot._id));
      if (index >= 0) {
        store.users[index] = snapshot;
      } else {
        store.users.push(snapshot);
      }
      return this;
    }),
    patch(User, "findOne", (query) => {
      return buildUserQuery(store.users.find((user) => user.username === query.username) || null);
    }),
    patch(User, "findById", (id) => ({
      select() {
        return {
          lean: async () => {
            const user = store.users.find((entry) => String(entry._id) === String(id));
            if (!user) return null;
            const { passwordHash, ...safeUser } = user;
            return safeUser;
          },
        };
      },
    })),
  );
}

async function createAuthedForumUser(baseUrl, username = "forum-user") {
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username,
      displayName: "Forum User",
      password: "secret123",
    }),
  });
  assert.equal(registerRes.status, 201);

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username,
      password: "secret123",
    }),
  });
  const loginBody = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.ok(loginBody.token);

  return {
    username,
    token: loginBody.token,
  };
}

test("auth register/login/me round-trip persists user identity", async (t) => {
  const store = createInMemoryForumStore();
  const restorers = [];

  installUserStorePatches(store, restorers);

  const app = createApp();
  const { server, baseUrl } = await createServer(app);
  t.after(() => {
    server.close();
    restorers.reverse().forEach((restore) => restore());
  });

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "forum-user",
      displayName: "Forum User",
      password: "secret123",
    }),
  });
  const registerBody = await registerRes.json();

  assert.equal(registerRes.status, 201);
  assert.equal(registerBody.user.username, "forum-user");
  assert.equal(store.users.length, 1);

  const duplicateRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "forum-user",
      displayName: "Forum User",
      password: "secret123",
    }),
  });
  assert.equal(duplicateRes.status, 409);

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "forum-user",
      password: "secret123",
    }),
  });
  const loginBody = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.ok(loginBody.token);

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      authorization: `Bearer ${loginBody.token}`,
    },
  });
  const meBody = await meRes.json();
  assert.equal(meRes.status, 200);
  assert.equal(meBody.user.username, "forum-user");
  assert.equal(meBody.user.displayName, "Forum User");
});

test("posts comments likes and reports persist through the CRUD routes", async (t) => {
  const store = createInMemoryForumStore();
  const restorers = [];
  installUserStorePatches(store, restorers);

  restorers.push(
    patch(Post.prototype, "save", async function save() {
      const snapshot = clone(this.toObject({ depopulate: true }));
      const index = store.posts.findIndex((post) => String(post._id) === String(snapshot._id));
      if (index >= 0) {
        store.posts[index] = snapshot;
      } else {
        store.posts.push(snapshot);
      }
      return this;
    }),
    patch(Post, "find", (filter = {}) => {
      const matches = store.posts.filter((post) => matchesPostQuery(post, filter));

      return {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return this;
        },
        lean: async () => clone(matches),
      };
    }),
    patch(Post, "countDocuments", async (filter = {}) => {
      return store.posts.filter((post) => matchesPostQuery(post, filter)).length;
    }),
    patch(Post, "findById", (id) => {
      const post = store.posts.find((entry) => String(entry._id) === String(id));
      return post ? makePostDocument(store, post) : null;
    }),
    patch(Post, "findByIdAndDelete", async (id) => {
      const index = store.posts.findIndex((entry) => String(entry._id) === String(id));
      if (index < 0) return null;
      const [removed] = store.posts.splice(index, 1);
      return makePostDocument(store, removed);
    }),
    patch(Comment.prototype, "save", async function save() {
      const snapshot = clone(this.toObject({ depopulate: true }));
      const index = store.comments.findIndex((comment) => String(comment._id) === String(snapshot._id));
      if (index >= 0) {
        store.comments[index] = snapshot;
      } else {
        store.comments.push(snapshot);
      }
      return this;
    }),
    patch(Comment, "find", (filter = {}) => {
      const matches = store.comments.filter((comment) => {
        if (filter.postId) {
          return String(comment.postId) === String(filter.postId);
        }
        return true;
      });

      return {
        sort() {
          return this;
        },
        lean: async () => clone(matches),
      };
    }),
    patch(Comment, "findOne", (query = {}) => {
      const match = store.comments.find((comment) => {
        if (query.postId && String(comment.postId) !== String(query.postId)) {
          return false;
        }
        if (query._id && String(comment._id) !== String(query._id)) {
          return false;
        }
        return true;
      });

      return {
        lean: async () => (match ? clone(match) : null),
      };
    }),
    patch(Comment, "deleteMany", async (filter = {}) => {
      store.comments = store.comments.filter((comment) => {
        if (filter.postId) {
          return String(comment.postId) !== String(filter.postId);
        }
        return false;
      });
      return { acknowledged: true };
    }),
    patch(Comment, "findOneAndDelete", async (query) => {
      const index = store.comments.findIndex(
        (comment) =>
          String(comment._id) === String(query._id) &&
          String(comment.postId) === String(query.postId),
      );
      if (index < 0) return null;
      const [removed] = store.comments.splice(index, 1);
      return makeCommentDocument(store, removed);
    }),
    patch(Interaction.prototype, "save", async function save() {
      const snapshot = clone(this.toObject({ depopulate: true }));
      store.interactions.push(snapshot);
      return this;
    }),
    patch(Interaction, "create", async (payload) => {
      const snapshot = clone(payload);
      store.interactions.push(snapshot);
      return snapshot;
    }),
    patch(Report, "findOne", async (query) => {
      return store.reports.find(
        (report) =>
          String(report.postId) === String(query.postId) &&
          String(report.reporterId) === String(query.reporterId),
      ) || null;
    }),
    patch(Report, "create", async (payload) => {
      const snapshot = clone(payload);
      store.reports.push(snapshot);
      return snapshot;
    }),
  );

  const app = createApp();
  const { server, baseUrl } = await createServer(app);
  t.after(() => {
    server.close();
    restorers.reverse().forEach((restore) => restore());
  });

  const forumUserSession = await createAuthedForumUser(baseUrl, "forum-user");

  const postRes = await fetch(`${baseUrl}/api/posts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      content: "Weekend outfit check for a weekday office look.",
      authorId: forumUserSession.username,
      authorType: "user",
      tags: ["office_style", "fit"],
      imageUrls: ["https://example.com/post.jpg"],
    }),
  });
  const createdPost = await postRes.json();
  assert.equal(postRes.status, 201);
  assert.equal(store.posts.length, 1);

  const listRes = await fetch(`${baseUrl}/api/posts?limit=10`);
  const listBody = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.equal(listBody.posts.length, 1);

  const getRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}`);
  const getBody = await getRes.json();
  assert.equal(getRes.status, 200);
  assert.equal(getBody.content, "Weekend outfit check for a weekday office look.");

  const updateRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      content: "Updated outfit check with a softer jacket.",
      tags: ["office_style", "jacket"],
    }),
  });
  const updatedPost = await updateRes.json();
  assert.equal(updateRes.status, 200);
  assert.equal(updatedPost.tags.includes("jacket"), true);

  const likeRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/like`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({ userId: "u-2" }),
  });
  const likeBody = await likeRes.json();
  assert.equal(likeRes.status, 200);
  assert.equal(likeBody.liked, true);
  assert.equal(store.interactions.some((entry) => entry.eventType === "like"), true);

  const commentRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      content: "The jacket balance looks good here.",
      authorId: forumUserSession.username,
      authorType: "user",
    }),
  });
  const createdComment = await commentRes.json();
  assert.equal(commentRes.status, 201);
  assert.equal(store.comments.length, 1);
  assert.equal(createdComment.replyTargetType, "post");
  assert.equal(createdComment.replyTargetAuthorId, forumUserSession.username);

  const replyRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/comments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      content: "Agreeing with the comment above.",
      authorId: forumUserSession.username,
      authorType: "user",
      replyToCommentId: createdComment._id,
    }),
  });
  const repliedComment = await replyRes.json();
  assert.equal(replyRes.status, 201);
  assert.equal(repliedComment.replyTargetType, "comment");
  assert.equal(repliedComment.replyTargetAuthorId, forumUserSession.username);
  assert.equal(repliedComment.replyToCommentId, createdComment._id);

  const commentListRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/comments`);
  const commentListBody = await commentListRes.json();
  assert.equal(commentListRes.status, 200);
  assert.equal(commentListBody.length, 2);

  const deleteCommentRes = await fetch(
    `${baseUrl}/api/posts/${createdPost._id}/comments/${createdComment._id}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${forumUserSession.token}`,
      },
    },
  );
  assert.equal(deleteCommentRes.status, 200);
  assert.equal(store.comments.length, 1);
  assert.equal(store.comments[0].replyTargetType, "comment");

  const reportRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/report`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      reporterId: forumUserSession.username,
      reason: "inappropriate",
      detail: "Needs review",
    }),
  });
  const reportBody = await reportRes.json();
  assert.equal(reportRes.status, 201);
  assert.equal(reportBody.reported, true);

  const deletePostRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${forumUserSession.token}`,
    },
  });
  const deletePostBody = await deletePostRes.json();
  assert.equal(deletePostRes.status, 200);
  assert.equal(deletePostBody.deleted, true);
  assert.equal(store.posts.length, 0);
});

test("discovery search popular saved and profile routes surface Threads/Reddit-style browsing", async (t) => {
  const store = createInMemoryForumStore();
  const restorers = [];
  installUserStorePatches(store, restorers);

  restorers.push(
    patch(Post.prototype, "save", async function save() {
      const snapshot = clone(this.toObject({ depopulate: true }));
      const index = store.posts.findIndex((post) => String(post._id) === String(snapshot._id));
      if (index >= 0) {
        store.posts[index] = snapshot;
      } else {
        store.posts.push(snapshot);
      }
      return this;
    }),
    patch(Post, "find", (filter = {}) => ({
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => clone(store.posts.filter((post) => matchesPostQuery(post, filter))),
    })),
    patch(Post, "countDocuments", async (filter = {}) => store.posts.filter((post) => matchesPostQuery(post, filter)).length),
    patch(Post, "findById", (id) => {
      const post = store.posts.find((entry) => String(entry._id) === String(id));
      return post ? makePostDocument(store, post) : null;
    }),
    patch(Interaction.prototype, "save", async function save() {
      const snapshot = clone(this.toObject({ depopulate: true }));
      store.interactions.push(snapshot);
      return this;
    }),
    patch(Interaction, "create", async (payload) => {
      const snapshot = clone(payload);
      store.interactions.push(snapshot);
      return snapshot;
    }),
    patch(Interaction, "find", (filter = {}) => ({
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () =>
        clone(
          store.interactions.filter((interaction) => {
            if (filter.actorId && interaction.actorId !== filter.actorId) return false;
            if (filter.eventType && interaction.eventType !== filter.eventType) return false;
            if (filter.targetType && interaction.targetType !== filter.targetType) return false;
            if (filter.targetId && String(interaction.targetId) !== String(filter.targetId)) return false;
            return true;
          }),
        ),
    })),
  );

  const app = createApp();
  const { server, baseUrl } = await createServer(app);
  t.after(() => {
    server.close();
    restorers.reverse().forEach((restore) => restore());
  });

  const forumUserSession = await createAuthedForumUser(baseUrl, "discover-user");

  const officePostRes = await fetch(`${baseUrl}/api/posts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      content: "Office search baseline for saved posts.",
      authorId: forumUserSession.username,
      authorType: "user",
      tags: ["office_style", "saved_worthy"],
    }),
  });
  const officePost = await officePostRes.json();
  assert.equal(officePostRes.status, 201);

  const otherPostRes = await fetch(`${baseUrl}/api/posts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forumUserSession.token}`,
    },
    body: JSON.stringify({
      content: "Later post about a jacket balance update.",
      authorId: forumUserSession.username,
      authorType: "user",
      tags: ["jacket", "fit"],
    }),
  });
  const otherPost = await otherPostRes.json();
  assert.equal(otherPostRes.status, 201);

  const searchRes = await fetch(`${baseUrl}/api/posts?q=office`);
  const searchBody = await searchRes.json();
  assert.equal(searchRes.status, 200);
  assert.equal(searchBody.posts[0]._id, officePost._id);

  const tagRes = await fetch(`${baseUrl}/api/posts?tag=office_style`);
  const tagBody = await tagRes.json();
  assert.equal(tagRes.status, 200);
  assert.equal(tagBody.posts[0]._id, officePost._id);

  const authorRes = await fetch(`${baseUrl}/api/posts?q=${forumUserSession.username}`);
  const authorBody = await authorRes.json();
  assert.equal(authorRes.status, 200);
  assert.equal(authorBody.posts.some((post) => post._id === otherPost._id), true);
});

test("agent writes are rate-limited to about three per hour across posts and comments", async (t) => {
  const store = createInMemoryForumStore();
  const restorers = [];
  const fixedNow = new Date("2026-03-29T12:00:00.000Z");

  function normalizeTimestamp(value) {
    if (value instanceof Date) return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fixedNow : date;
  }

  function matchesWriteFilter(entry, filter = {}) {
    if (filter.authorId && entry.authorId !== filter.authorId) {
      return false;
    }
    if (filter.authorType && entry.authorType !== filter.authorType) {
      return false;
    }
    if (filter.createdAt?.$gte) {
      return normalizeTimestamp(entry.createdAt).getTime() >= filter.createdAt.$gte.getTime();
    }
    return true;
  }

  restorers.push(
    patch(Post.prototype, "save", async function save() {
      if (!this.createdAt) this.createdAt = fixedNow;
      if (!this.updatedAt) this.updatedAt = fixedNow;
      const snapshot = clone(this.toObject({ depopulate: true }));
      const index = store.posts.findIndex((post) => String(post._id) === String(snapshot._id));
      if (index >= 0) {
        store.posts[index] = snapshot;
      } else {
        store.posts.push(snapshot);
      }
      return this;
    }),
    patch(Post, "countDocuments", async (filter = {}) => store.posts.filter((post) => matchesWriteFilter(post, filter)).length),
    patch(Post, "find", (filter = {}) => ({
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => clone(store.posts.filter((post) => {
        if (filter.tags) {
          return post.tags?.includes(filter.tags);
        }
        return true;
      })),
    })),
    patch(Post, "findById", (id) => {
      const post = store.posts.find((entry) => String(entry._id) === String(id));
      return post ? makePostDocument(store, post) : null;
    }),
    patch(Comment.prototype, "save", async function save() {
      if (!this.createdAt) this.createdAt = fixedNow;
      if (!this.updatedAt) this.updatedAt = fixedNow;
      const snapshot = clone(this.toObject({ depopulate: true }));
      const index = store.comments.findIndex((comment) => String(comment._id) === String(snapshot._id));
      if (index >= 0) {
        store.comments[index] = snapshot;
      } else {
        store.comments.push(snapshot);
      }
      return this;
    }),
    patch(Comment, "countDocuments", async (filter = {}) => store.comments.filter((comment) => matchesWriteFilter(comment, filter)).length),
    patch(Comment, "findOne", (query = {}) => {
      const match = store.comments.find((comment) => {
        if (query.postId && String(comment.postId) !== String(query.postId)) {
          return false;
        }
        if (query._id && String(comment._id) !== String(query._id)) {
          return false;
        }
        return true;
      });

      return {
        lean: async () => (match ? clone(match) : null),
      };
    }),
  );

  const app = createApp();
  const { server, baseUrl } = await createServer(app);
  t.after(() => {
    server.close();
    restorers.reverse().forEach((restore) => restore());
  });

  const createAgentPost = async (content) => {
    const res = await fetch(`${baseUrl}/api/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content,
        authorId: "A01",
        authorType: "agent",
        tags: ["office_style"],
      }),
    });
    return res;
  };

  const firstPostRes = await createAgentPost("First agent post");
  const secondPostRes = await createAgentPost("Second agent post");
  assert.equal(firstPostRes.status, 201);
  assert.equal(secondPostRes.status, 201);

  const firstPost = await firstPostRes.json();

  const commentRes = await fetch(`${baseUrl}/api/posts/${firstPost._id}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: "Agent comment one",
      authorId: "A01",
      authorType: "agent",
      replyTargetType: "post",
      replyTargetId: firstPost._id,
    }),
  });
  assert.equal(commentRes.status, 201);

  const blockedPostRes = await createAgentPost("Third agent post should be blocked");
  const blockedPostBody = await blockedPostRes.json();
  assert.equal(blockedPostRes.status, 429);
  assert.equal(blockedPostBody.error, "agent_write_rate_limited");
  assert.equal(blockedPostBody.current_count, 3);

  const blockedCommentRes = await fetch(`${baseUrl}/api/posts/${firstPost._id}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: "Agent comment two should be blocked",
      authorId: "A01",
      authorType: "agent",
      replyTargetType: "post",
      replyTargetId: firstPost._id,
    }),
  });
  const blockedCommentBody = await blockedCommentRes.json();
  assert.equal(blockedCommentRes.status, 429);
  assert.equal(blockedCommentBody.error, "agent_write_rate_limited");
  assert.equal(store.posts.length, 2);
  assert.equal(store.comments.length, 1);
});
