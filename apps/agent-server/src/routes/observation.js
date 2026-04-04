import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPLAY_DIR = path.resolve(__dirname, "../../../../data/replays");

function readLatestFile(dir, filter) {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter(filter)
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(dir, files[0].name), "utf8"));
}

// ── GET /api/observation/summary ─────────────────────────────────────────────
// Aggregates latest replay + report into a compact observation summary.

router.get("/summary", (_req, res) => {
  const report = readLatestFile(REPLAY_DIR, f => f.endsWith("-report.json"));
  const replay = readLatestFile(REPLAY_DIR, f => f.endsWith(".json") && !f.endsWith("-report.json"));

  if (!report && !replay) {
    return res.json({ available: false, message: "No simulation data found. Run a simulation first." });
  }

  const agents = replay?.agents || [];
  const posts = replay?.posts || [];

  const summary = {
    available: true,
    runId: replay?.run_id || report?.run_id || null,
    seed: replay?.seed || report?.seed || null,
    ticks: replay?.ticks || report?.ticks || null,
    createdAt: replay?.created_at || report?.created_at || null,
    agentCount: agents.length,
    postCount: posts.length,
    postsCreated: posts.filter(p => !p.postError && !p.writeSkipped).length,
    postsFailed: posts.filter(p => p.postError).length,
    metrics: report?.metrics || null,
    sprint1Verdicts: report?.sprint1_verdicts || null,
    agentGrowth: report?.agent_growth || replay?.agent_growth || null,
    archetypeDistribution: agents.reduce((acc, a) => {
      acc[a.archetype] = (acc[a.archetype] || 0) + 1;
      return acc;
    }, {}),
    meaningFrameDistribution: posts.reduce((acc, p) => {
      if (p.meaning_frame) acc[p.meaning_frame] = (acc[p.meaning_frame] || 0) + 1;
      return acc;
    }, {}),
  };

  res.json(summary);
});

// ── GET /api/observation/agents ──────────────────────────────────────────────
// Returns agent state comparison data from the latest replay.

router.get("/agents", (_req, res) => {
  const replay = readLatestFile(REPLAY_DIR, f => f.endsWith(".json") && !f.endsWith("-report.json"));

  if (!replay?.agents) {
    return res.json({ available: false, agents: [] });
  }

  const agents = replay.agents.map(a => ({
    agent_id: a.agent_id,
    handle: a.handle,
    display_name: a.display_name,
    archetype: a.archetype,
    avatar_url: a.avatar_url || null,
    selfNarrativeCount: (a.self_narrative || []).length,
    lastNarrative: (a.self_narrative || []).slice(-1)[0] || null,
    mutableState: a.mutable_state ? {
      recentArc: a.mutable_state.recent_arc || null,
      selfNarrativeSummary: a.mutable_state.self_narrative_summary || null,
    } : null,
  }));

  const posts = replay.posts || [];
  const agentsWithPosts = agents.map(a => ({
    ...a,
    postCount: posts.filter(p => p.agent_id === a.agent_id).length,
    meaningFrames: [...new Set(posts.filter(p => p.agent_id === a.agent_id).map(p => p.meaning_frame).filter(Boolean))],
  }));

  res.json({ available: true, runId: replay.run_id, agents: agentsWithPosts });
});

// ── GET /api/observation/timeline ────────────────────────────────────────────
// Returns tick-level metrics timeline from the latest report.

router.get("/timeline", (_req, res) => {
  const report = readLatestFile(REPLAY_DIR, f => f.endsWith("-report.json"));

  if (!report?.tick_timeline) {
    return res.json({ available: false, timeline: [] });
  }

  res.json({
    available: true,
    runId: report.run_id,
    timeline: report.tick_timeline,
  });
});

export default router;
