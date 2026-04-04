import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  classifyDifferentiationTrend,
  createBaselineWorldRules,
  createDifferentiationTimeline,
  selectExposure,
  applyExposureDrift,
  runTicks,
} from "@ai-fashion-forum/agent-core";

import { loadAgentStartupStateMeta, loadAgentStartupStateSnapshot } from "../apps/agent-server/src/lib/agent-startup-state.js";

function parseArgs(argv) {
  const args = {
    rounds: 20,
    ticksPerRound: 6,
    seed: 42,
    output: "data/judgements/agent-differentiation-latest.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--rounds" && next) {
      args.rounds = Number(next);
      index += 1;
      continue;
    }

    if (token === "--ticks-per-round" && next) {
      args.ticksPerRound = Number(next);
      index += 1;
      continue;
    }

    if (token === "--seed" && next) {
      args.seed = Number(next);
      index += 1;
      continue;
    }

    if (token === "--output" && next) {
      args.output = next;
      index += 1;
    }
  }

  return args;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clampRounds(value, fallback) {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.floor(value)));
}

function buildRoundRuns({ initialState, rounds, ticksPerRound, seed }) {
  const runResults = [];
  let currentState = initialState;

  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    const runSeed = seed + roundIndex;
    const roundRng = seededRandom(runSeed * 997 + 17);
    const exposurePool = buildExposurePool(currentState);
    const driftRecords = [];

    for (const agent of currentState.agents || []) {
      const { exposedPosts, scores } = selectExposure({
        agent,
        recentPosts: exposurePool,
        maxExposure: 5,
        rng: roundRng,
      });

      if (exposedPosts.length === 0) {
        driftRecords.push({
          agent_id: agent.agent_id,
          exposureCount: 0,
          interest_deltas: {},
          belief_deltas: {},
          trait_deltas: {},
          scores,
        });
        continue;
      }

      const { driftRecord } = applyExposureDrift({
        agent,
        exposedPosts,
        rng: roundRng,
      });
      driftRecords.push({
        ...driftRecord,
        scores,
      });
    }

    const result = runTicks({
      seed: runSeed,
      tickCount: ticksPerRound,
      initialState: currentState,
      worldRules: createBaselineWorldRules(),
    });

    runResults.push({
      ...result,
      exposurePoolCount: exposurePool.length,
      driftRecords,
    });
    currentState = result.finalState;
  }

  return runResults;
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

function buildExposurePool(state = {}) {
  const contents = Array.isArray(state?.contents) ? state.contents : [];
  return contents.map((content, index) => ({
    post_id: content.content_id || `content-${index + 1}`,
    agent_id: content.author_id || `seed-author-${index + 1}`,
    body: content.body || content.title || "",
    tags: Array.isArray(content.topics) ? content.topics : [],
    meaning_frame: Array.isArray(content.topics) && content.topics.length ? content.topics[0] : null,
    stance_signal: deriveStanceSignal(content),
  }));
}

function deriveStanceSignal(content = {}) {
  const emotions = Array.isArray(content?.emotions) ? content.emotions.map((value) => String(value).toLowerCase()) : [];
  if (emotions.some((value) => ["anger", "irritation", "frustration"].includes(value))) {
    return "critical";
  }
  if (emotions.some((value) => ["delight", "joy", "excitement"].includes(value))) {
    return "enthusiastic";
  }
  if (emotions.some((value) => ["curiosity", "surprise"].includes(value))) {
    return "supportive";
  }
  return null;
}

function summarizeTrend(timeline) {
  if (timeline.length === 0) {
    return {
      initial_average_distance: 0,
      final_average_distance: 0,
      peak_average_distance: 0,
      lowest_average_distance: 0,
    };
  }

  const averages = timeline.map((entry) => entry.average_distance);
  return {
    initial_average_distance: averages[0],
    final_average_distance: averages[averages.length - 1],
    peak_average_distance: Math.max(...averages),
    lowest_average_distance: Math.min(...averages),
  };
}

const options = parseArgs(process.argv.slice(2));
const rounds = clampRounds(options.rounds, 20);
const ticksPerRound = clampRounds(options.ticksPerRound, 6);
const outputPath = path.resolve(process.cwd(), options.output);

const startupMeta = loadAgentStartupStateMeta();
const startupSnapshot = loadAgentStartupStateSnapshot();
const runResults = buildRoundRuns({
  initialState: startupSnapshot,
  rounds,
  ticksPerRound,
  seed: Number.isFinite(options.seed) ? options.seed : 42,
});
const timeline = createDifferentiationTimeline(runResults);
const interpretation = classifyDifferentiationTrend(timeline);
const report = {
  created_at: new Date().toISOString(),
  source: {
    startup_source: startupMeta.source,
    startup_agent_count: startupMeta.agentCount,
    startup_file_path: startupMeta.filePath || null,
  },
  config: {
    rounds,
    ticks_per_round: ticksPerRound,
    seed: Number.isFinite(options.seed) ? options.seed : 42,
    llm_mode: "offline_template",
  },
  summary: {
    ...summarizeTrend(timeline),
    interpretation,
  },
  rounds: timeline,
  drift: {
    rounds_with_exposure: runResults.filter((result) => (result.exposurePoolCount || 0) > 0).length,
    average_exposure_pool: runResults.length
      ? Number((runResults.reduce((sum, result) => sum + (result.exposurePoolCount || 0), 0) / runResults.length).toFixed(2))
      : 0,
  },
};

ensureDir(outputPath);
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

console.log(
  `[offline-differentiation] verdict=${interpretation.verdict} rounds=${rounds} initial=${report.summary.initial_average_distance.toFixed(4)} final=${report.summary.final_average_distance.toFixed(4)}`,
);
console.log(`[offline-differentiation] wrote ${path.relative(process.cwd(), outputPath)}`);
