import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import agentLoopRouter from "./routes/agent-loop.js";
import tracesRouter from "./routes/traces.js";
import sprint1SamplesRouter from "./routes/sprint1-samples.js";

const PORT = Number(process.env.AGENT_SERVER_PORT || 4001);

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "agent-server" }));

app.use("/api/agent-loop", agentLoopRouter);
app.use("/api/traces", tracesRouter);
app.use("/api/events", tracesRouter);
app.use("/api", sprint1SamplesRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[agent-server]", err);
  res.status(500).json({ error: "internal_server_error" });
});

connectDB()
  .catch((err) => console.warn("[db] MongoDB unavailable:", err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[agent-server] listening on http://localhost:${PORT}`);
    });
  });
