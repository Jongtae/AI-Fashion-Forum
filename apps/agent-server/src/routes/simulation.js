import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import {
  runTicks,
  createBaselineWorldRules,
  createLivePostDraft,
  serializeTickState,
  evaluateRoundHeuristic,
  createBudgetTracker,
  selectExposure,
  applyExposureDrift,
  measureDrift,
} from "@ai-fashion-forum/agent-core";
import {
  createStateSnapshot,
} from "@ai-fashion-forum/shared-types";
import {
  createSpawnedAgentState,
} from "../lib/agent-state.js";
import { loadAgentStartupStateSnapshot } from "../lib/agent-startup-state.js";
import {
  buildPopulationGrowthPlan,
  DEFAULT_INITIAL_AGENT_COUNT,
} from "../lib/population-growth.js";
import { shouldWriteForumArtifacts } from "../lib/forum-writeback.js";
import { SimCheckpoint } from "../models/SimCheckpoint.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPLAY_DIR = path.resolve(__dirname, "../../../../data/replays");

const FORUM_SERVER_URL = process.env.FORUM_SERVER_URL || "http://localhost:4000";
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai";
const LLM_SIMULATION_ENABLED =
  process.env.LLM_SIMULATION_ENABLED === "true" ||
  process.env.OPENAI_SIMULATION_ENABLED === "true";
const SIMULATION_LLM_API_KEY = LLM_SIMULATION_ENABLED
  ? (LLM_PROVIDER === "claude"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY) || ""
  : "";

const FORUM_FETCH_TIMEOUT_MS = 10_000;

async function forumPost(urlPath, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORUM_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${FORUM_SERVER_URL}${urlPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(`forum-server ${urlPath} failed: ${err.error || res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function checkForumHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${FORUM_SERVER_URL}/health`, { signal: controller.signal });
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── POST /api/simulation/run ─────────────────────────────────────────────────
// Auto multi-round simulation with budget cap.
//
// Body:
//   maxRounds  (number, default 20)   — max rounds to run
//   ticksPerRound (number, default 3) — ticks per round
//   budgetCapUsd (number, default 2)  — hard cost cap
//   seed       (number, default 42)   — deterministic seed
//
// Stops when: budget exhausted, maxRounds reached, or evaluation score > 0.7

router.post("/run", async (req, res) => {
  const maxRounds = Math.min(50, Math.max(1, parseInt(req.body?.maxRounds) || 20));
  const ticksPerRound = Math.min(10, Math.max(1, parseInt(req.body?.ticksPerRound) || 3));
  const budgetCapUsd = Math.min(10, Math.max(0.1, parseFloat(req.body?.budgetCapUsd) || 2.0));
  const seed = parseInt(req.body?.seed) || 42;
  const maxAgents = Math.min(200, Math.max(1, parseInt(req.body?.maxAgents) || 36));

  // ── Preflight checks ──────────────────────────────────────────────────
  const warnings = [];

  if (LLM_SIMULATION_ENABLED && !SIMULATION_LLM_API_KEY) {
    warnings.push(`LLM_SIMULATION_ENABLED=true but ${LLM_PROVIDER === "claude" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} is not set — will use template fallback`);
    console.warn("[simulation] WARNING:", warnings[warnings.length - 1]);
  }

  const writeForumArtifacts = shouldWriteForumArtifacts();
  let forumAvailable = false;
  if (writeForumArtifacts) {
    forumAvailable = await checkForumHealth();
    if (!forumAvailable) {
      warnings.push("forum-server is not reachable — posts will not be persisted");
      console.warn("[simulation] WARNING:", warnings[warnings.length - 1]);
    }
  }

  const budget = createBudgetTracker({ budgetCapUsd });
  const rng = seededRandom(seed);

  // Load initial agent state, cap agent count
  const startupSnapshot = loadAgentStartupStateSnapshot();
  const clonedSnapshot = JSON.parse(JSON.stringify(startupSnapshot));
  if (clonedSnapshot.agents.length > maxAgents) {
    clonedSnapshot.agents = clonedSnapshot.agents.slice(0, maxAgents);
    console.log(`[simulation] capped agents from ${startupSnapshot.agents.length} to ${maxAgents}`);
  }
  let currentState = clonedSnapshot;

  const roundResults = [];
  const driftTimeline = []; // per-round drift measurements
  const agentSnapshots = new Map(); // agent_id → { round0: snapshot, roundN: snapshot }
  let allCreatedPosts = []; // cumulative post pool for cross-exposure
  let stopReason = null;

  // Snapshot initial state for drift measurement
  for (const agent of currentState.agents) {
    agentSnapshots.set(agent.agent_id, {
      initial: JSON.parse(JSON.stringify({
        interest_vector: agent.interest_vector,
        belief_vector: agent.belief_vector,
        openness: agent.openness,
        conformity: agent.conformity,
        conflict_tolerance: agent.conflict_tolerance,
      })),
    });
  }

  for (let round = 1; round <= maxRounds; round++) {
    // ── Budget check before round ─────────────────────────────────────────
    // Estimate LLM calls this round: ~40% of agents produce posts/comments
    const estimatedCallsThisRound = Math.ceil(currentState.agents.length * 0.4);
    if (!budget.canAfford(estimatedCallsThisRound)) {
      stopReason = "budget_exhausted";
      break;
    }

    // ── Step 1: Cross-agent exposure + identity drift ─────────────────────
    const roundDriftRecords = [];
    for (const agent of currentState.agents) {
      const { exposedPosts } = selectExposure({
        agent,
        recentPosts: allCreatedPosts.slice(-50), // last 50 posts
        maxExposure: 5,
        rng,
      });

      if (exposedPosts.length > 0) {
        const { driftRecord } = applyExposureDrift({ agent, exposedPosts });
        roundDriftRecords.push(driftRecord);
      }
    }

    // ── Step 2: Run tick engine ───────────────────────────────────────────
    const tickResult = runTicks({
      seed: seed + round,
      tickCount: ticksPerRound,
      initialState: currentState,
      worldRules: createBaselineWorldRules(),
      spawnAgent: ({ world, tick: currentTick }) => {
        const growthPlan = buildPopulationGrowthPlan({
          currentCount: world.state.agents.length,
          elapsedTicks: (round - 1) * ticksPerRound + currentTick,
          initialCount: DEFAULT_INITIAL_AGENT_COUNT,
        });
        if (!growthPlan.shouldSpawn) return null;
        return createSpawnedAgentState({
          existingAgents: world.state.agents,
          seed: seed + round,
          round,
          tick: currentTick,
          spawnIndex: world.state.agents.length - DEFAULT_INITIAL_AGENT_COUNT,
        });
      },
    });

    // ── Step 3: Generate posts via LLM (budget-gated) ─────────────────────
    const roundPosts = [];
    for (const entry of tickResult.entries) {
      if (entry.action !== "post" && entry.action !== "comment") continue;
      if (!budget.canAfford(1)) break; // stop generating if budget low

      const agent = tickResult.finalState.agents.find((a) => a.agent_id === entry.actor_id);
      if (!agent) continue;

      const interestTopics = Object.keys(agent.interest_vector || {}).slice(0, 3);
      const primaryTopic = interestTopics[0] || "스타일";

      if (SIMULATION_LLM_API_KEY) {
        try {
          const draft = await createLivePostDraft({
            agent,
            targetContent: {
              title: `${primaryTopic} 관련 메모`,
              body: entry.reason || "최근 흐름을 읽어봤다.",
              topics: interestTopics,
            },
            sourceSignal: entry.reason || "",
            styleProfile: agent?.seed_profile?.comment_style || null,
            emotionProfile: {
              ...(agent?.seed_profile?.emotional_bias || {}),
              ...(agent?.mutable_state?.affect_state?.emotional_bias || {}),
            },
            comparisonTexts: roundPosts.slice(-5).map((p) => p.body).filter(Boolean),
            variationSeed: seed + round + entry.tick,
            provider: LLM_PROVIDER,
            apiKey: SIMULATION_LLM_API_KEY,
          });

          budget.record();
          roundPosts.push({
            post_id: `sim-r${round}-${entry.action_id}`,
            agent_id: agent.agent_id,
            authorId: agent.agent_id,
            handle: agent.handle,
            display_name: agent.display_name,
            body: draft.content || entry.reason || "글을 남겼다.",
            title: draft.title || null,
            tags: interestTopics,
            meaning_frame: interestTopics[0] || null,
            stance_signal: null,
            round,
            tick: entry.tick,
            source: "llm",
          });
        } catch {
          // Fallback to template
          roundPosts.push({
            post_id: `sim-r${round}-${entry.action_id}`,
            agent_id: agent.agent_id,
            authorId: agent.agent_id,
            handle: agent.handle,
            display_name: agent.display_name,
            body: entry.reason || "글을 남겼다.",
            tags: interestTopics,
            meaning_frame: interestTopics[0] || null,
            stance_signal: null,
            round,
            tick: entry.tick,
            source: "fallback",
          });
        }
      } else {
        // No API key — template only, no budget impact
        roundPosts.push({
          post_id: `sim-r${round}-${entry.action_id}`,
          agent_id: agent.agent_id,
          authorId: agent.agent_id,
          handle: agent.handle,
          display_name: agent.display_name,
          body: entry.reason || "글을 남겼다.",
          tags: interestTopics,
          meaning_frame: interestTopics[0] || null,
          stance_signal: null,
          round,
          tick: entry.tick,
          source: "template",
        });
      }
    }

    // ── Step 4: Write to forum-server (if enabled and reachable) ────────
    if (writeForumArtifacts && forumAvailable) {
      for (const post of roundPosts) {
        try {
          await forumPost("/api/posts", {
            title: post.title || null,
            content: post.body,
            authorId: post.agent_id,
            authorType: "agent",
            authorDisplayName: post.display_name || post.handle,
            authorHandle: post.handle,
            tags: post.tags || [],
          });
        } catch (err) {
          if (err.status === 429) break; // rate limited, stop for this round
        }
      }
    }

    allCreatedPosts.push(...roundPosts);

    // ── Step 5: Drift measurement ─────────────────────────────────────────
    const roundDrifts = [];
    for (const agent of tickResult.finalState.agents) {
      const initial = agentSnapshots.get(agent.agent_id)?.initial;
      if (!initial) continue;
      const drift = measureDrift(initial, agent);
      roundDrifts.push({ agent_id: agent.agent_id, drift });
    }
    const avgDrift =
      roundDrifts.length > 0
        ? Math.round((roundDrifts.reduce((s, d) => s + d.drift, 0) / roundDrifts.length) * 1000) / 1000
        : 0;

    driftTimeline.push({
      round,
      avgDrift,
      maxDrift: roundDrifts.length > 0 ? Math.max(...roundDrifts.map((d) => d.drift)) : 0,
      agentDrifts: roundDrifts,
    });

    // ── Step 6: Evaluation ────────────────────────────────────────────────
    const evaluation = evaluateRoundHeuristic({
      agents: tickResult.finalState.agents,
      posts: roundPosts,
    });

    roundResults.push({
      round,
      ticks: tickResult.tickCount,
      postsGenerated: roundPosts.length,
      llmCallsThisRound: roundPosts.filter((p) => p.source === "llm").length,
      driftExposures: roundDriftRecords.length,
      avgDrift,
      evaluation: evaluation.scores,
      budget: budget.snapshot(),
    });

    // ── Update state for next round ───────────────────────────────────────
    currentState = tickResult.finalState;

    // ── Stop conditions ───────────────────────────────────────────────────
    if (budget.exhausted) {
      stopReason = "budget_exhausted";
      break;
    }
    if (evaluation.scores.overall >= 0.7 && round >= 5) {
      stopReason = "quality_target_reached";
      break;
    }
  }

  if (!stopReason) {
    stopReason = "max_rounds_reached";
  }

  // ── Save checkpoint of final state ──────────────────────────────────────
  const simulationId = `sim-${seed}-${Date.now()}`;
  const finalTickResult = {
    seed,
    tickCount: roundResults.length * ticksPerRound,
    finalTick: roundResults.length * ticksPerRound,
    finalState: currentState,
    entries: [],
  };

  let checkpointId = null;
  try {
    const serialized = serializeTickState(finalTickResult);
    checkpointId = `chk-${simulationId}-final`;
    await SimCheckpoint.create({
      checkpointId,
      simulationId,
      seed,
      tick: serialized.finalTick,
      tickCount: serialized.tickCount,
      finalTick: serialized.finalTick,
      stateSnapshot: serialized.finalState,
      entries: [],
      label: `simulation final: ${stopReason}`,
    });
  } catch {
    checkpointId = null;
  }

  // ── Save replay ─────────────────────────────────────────────────────────
  const replay = {
    simulation_id: simulationId,
    seed,
    maxRounds,
    ticksPerRound,
    completedRounds: roundResults.length,
    stopReason,
    budget: budget.snapshot(),
    driftTimeline,
    roundResults,
    totalPosts: allCreatedPosts.length,
    agents: currentState.agents.map((a) => ({
      agent_id: a.agent_id,
      handle: a.handle,
      archetype: a.archetype,
      interest_vector: a.interest_vector,
      belief_vector: a.belief_vector,
      conformity: a.conformity,
      conflict_tolerance: a.conflict_tolerance,
    })),
  };

  try {
    fs.mkdirSync(REPLAY_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(REPLAY_DIR, `${simulationId}.json`),
      JSON.stringify(replay, null, 2),
      "utf8"
    );
  } catch {}

  res.json({
    simulation_id: simulationId,
    seed,
    completedRounds: roundResults.length,
    stopReason,
    totalPosts: allCreatedPosts.length,
    agentCount: currentState.agents.length,
    warnings: warnings.length > 0 ? warnings : undefined,
    budget: budget.snapshot(),
    driftSummary: {
      finalAvgDrift: driftTimeline[driftTimeline.length - 1]?.avgDrift || 0,
      maxDriftObserved: Math.max(...driftTimeline.map((d) => d.maxDrift), 0),
      timeline: driftTimeline.map((d) => ({ round: d.round, avgDrift: d.avgDrift })),
    },
    lastEvaluation: roundResults[roundResults.length - 1]?.evaluation || null,
    checkpoint: checkpointId,
  });
});

export default router;
