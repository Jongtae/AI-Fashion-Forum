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

test("auth register/login/me round-trip persists user identity", async (t) => {
  const store = createInMemoryForumStore();
  const restorers = [];

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
    patch(User, "findOne", async (query) => {
      return store.users.find((user) => user.username === query.username) || null;
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
      const matches = store.posts.filter((post) => {
        if (filter.tags) {
          return post.tags?.includes(filter.tags);
        }
        return true;
      });

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
      return store.posts.filter((post) => {
        if (filter.tags) {
          return post.tags?.includes(filter.tags);
        }
        return true;
      }).length;
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

  const postRes = await fetch(`${baseUrl}/api/posts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: "Weekend outfit check for a weekday office look.",
      authorId: "u-1",
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
    headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "u-2" }),
  });
  const likeBody = await likeRes.json();
  assert.equal(likeRes.status, 200);
  assert.equal(likeBody.liked, true);
  assert.equal(store.interactions.some((entry) => entry.eventType === "like"), true);

  const commentRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: "The jacket balance looks good here.",
      authorId: "u-3",
      authorType: "user",
    }),
  });
  const createdComment = await commentRes.json();
  assert.equal(commentRes.status, 201);
  assert.equal(store.comments.length, 1);

  const commentListRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/comments`);
  const commentListBody = await commentListRes.json();
  assert.equal(commentListRes.status, 200);
  assert.equal(commentListBody.length, 1);

  const deleteCommentRes = await fetch(
    `${baseUrl}/api/posts/${createdPost._id}/comments/${createdComment._id}`,
    {
      method: "DELETE",
    },
  );
  assert.equal(deleteCommentRes.status, 200);
  assert.equal(store.comments.length, 0);

  const reportRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reporterId: "u-4",
      reason: "inappropriate",
      detail: "Needs review",
    }),
  });
  const reportBody = await reportRes.json();
  assert.equal(reportRes.status, 201);
  assert.equal(reportBody.reported, true);

  const deletePostRes = await fetch(`${baseUrl}/api/posts/${createdPost._id}`, {
    method: "DELETE",
  });
  const deletePostBody = await deletePostRes.json();
  assert.equal(deletePostRes.status, 200);
  assert.equal(deletePostBody.deleted, true);
  assert.equal(store.posts.length, 0);
});
