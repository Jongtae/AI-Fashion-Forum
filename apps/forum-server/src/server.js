import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import postsRouter from "./routes/posts.js";
import authRouter from "./routes/auth.js";
import feedRouter from "./routes/feed.js";

const PORT = Number(process.env.FORUM_SERVER_PORT || 4000);

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "forum-server" }));

app.use("/api/posts", postsRouter);
app.use("/api/auth", authRouter);
app.use("/api/feed", feedRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[forum-server]", err);
  res.status(500).json({ error: "internal_server_error" });
});

connectDB()
  .catch((err) => console.warn("[db] MongoDB unavailable:", err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[forum-server] listening on http://localhost:${PORT}`);
    });
  });
