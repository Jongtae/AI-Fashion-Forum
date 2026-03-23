import http from "node:http";

import {
  createActionSample,
  createDebugConsoleSample,
  createEvaluationSample,
  createExposureSample,
  createForumGenerationSample,
  createSprint1ForumPostSample,
  createGraphStorageSample,
  createIdentityScenarioSuite,
  createMemoryBootstrapState,
  createMemorySample,
  createSprint1MemoryWritebackSample,
  createMetaPolicySample,
  createMockNormalizedContentBundle,
  createSprint1StarterPackBundle,
  createSprint1ExposureSample,
  createRankingSample,
  createBatchExperimentSample,
  createBaselineWorldRules,
  createSeedWorldBootstrap,
  runTicks,
} from "@ai-fashion-forum/agent-core";
import {
  MVP_DEMO_SCENARIO,
  SAMPLE_STATE_SNAPSHOT,
  SPRINT1_AGENT_STATES,
  SPRINT1_ROUND_SNAPSHOTS,
  SIM_SERVER_PORT,
  createSprint1EvaluationSnapshot,
} from "@ai-fashion-forum/shared-types";

const port = Number(process.env.SIM_SERVER_PORT || SIM_SERVER_PORT);
const durableMemoryStorePath = new URL("../data/memory-store.json", import.meta.url);
const eventLogStorePath = new URL("../data/event-log.json", import.meta.url);
const jobStore = new Map();
const MAX_TICK_GUARDRAIL = 120;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createJsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function serializeJob(job) {
  return {
    job_id: job.job_id,
    status: job.status,
    created_at: job.created_at,
    updated_at: job.updated_at,
    attempts: job.attempts,
    max_retries: job.max_retries,
    request: job.request,
    result: job.result,
    replay_length: job.result?.entries?.length || 0,
    cost_tracking: job.cost_tracking,
    error: job.error || null,
  };
}

function estimateRunCost(tickCount) {
  const estimatedPromptTokens = tickCount * 180;
  const estimatedCompletionTokens = tickCount * 90;
  const estimatedUsd = Number(((estimatedPromptTokens + estimatedCompletionTokens) * 0.0000025).toFixed(4));

  return {
    estimated_prompt_tokens: estimatedPromptTokens,
    estimated_completion_tokens: estimatedCompletionTokens,
    estimated_total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
    estimated_usd: estimatedUsd,
  };
}

function createSimulationJob({ seed = 42, tickCount = 10, label = "manual_run" } = {}) {
  const guardedTickCount = Math.min(Math.max(Number(tickCount) || 10, 0), MAX_TICK_GUARDRAIL);
  const job = {
    job_id: `job-${Date.now()}-${jobStore.size + 1}`,
    status: "queued",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    attempts: 0,
    max_retries: 2,
    request: {
      seed,
      tickCount: guardedTickCount,
      label,
    },
    cost_tracking: estimateRunCost(guardedTickCount),
    error: null,
    result: null,
  };

  jobStore.set(job.job_id, job);
  return job;
}

function runSimulationJob(job, additionalTicks = 0) {
  job.status = "running";
  job.attempts += 1;
  job.updated_at = new Date().toISOString();

  try {
    const tickCount = Math.min(Math.max(job.request.tickCount + additionalTicks, 0), MAX_TICK_GUARDRAIL);
    const result = runTicks({
      seed: job.request.seed,
      tickCount,
      worldRules: createBaselineWorldRules(),
    });

    job.request.tickCount = tickCount;
    job.cost_tracking = estimateRunCost(tickCount);
    job.result = result;
    job.error = null;
    job.status = "completed";
    job.updated_at = new Date().toISOString();
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "unknown_job_error";
    job.updated_at = new Date().toISOString();
  }

  return job;
}

function retrySimulationJob(job) {
  if (job.attempts >= job.max_retries) {
    job.status = "failed";
    job.updated_at = new Date().toISOString();
    return job;
  }

  return runSimulationJob(job);
}

function openApiContract() {
  return {
    openapi: "3.1.0",
    info: {
      title: "sim-server API",
      version: "0.1.0",
    },
    paths: {
      "/api/jobs/start": { post: { summary: "Queue and start a simulation job" } },
      "/api/jobs/{job_id}": { get: { summary: "Read job status and run state" } },
      "/api/jobs/{job_id}/tick": { post: { summary: "Advance a job by N ticks" } },
      "/api/jobs/{job_id}/replay": { get: { summary: "Read replay payload for a completed job" } },
      "/api/jobs/{job_id}/retry": { post: { summary: "Retry a job when attempts remain" } },
    },
  };
}

function buildDemoState() {
  const state = clone(SAMPLE_STATE_SNAPSHOT);
  const extraAgents = [
    {
      ...clone(state.agents[0]),
      agent_id: "A07",
      handle: "quietwardrobe",
      display_name: "Quiet Wardrobe",
    },
    {
      ...clone(state.agents[2]),
      agent_id: "A08",
      handle: "subwaysignal",
      display_name: "Subway Signal",
    },
  ];

  state.agents = [...state.agents, ...extraAgents];
  return state;
}

function createDemoRunPackage() {
  const initialState = buildDemoState();
  const run = runTicks({
    seed: 77,
    tickCount: 50,
    initialState,
    worldRules: createBaselineWorldRules(),
  });

  return {
    name: "mvp-v1-demo-run",
    staging_surface: "GitHub Pages + repository-local sim-server",
    agent_count: initialState.agents.length,
    tick_count: run.tickCount,
    guardrails: {
      max_tick_guardrail: MAX_TICK_GUARDRAIL,
      graceful_failure_mode: "job_status_failed_instead_of_process_crash",
    },
    cost_tracking: estimateRunCost(run.tickCount),
    run,
  };
}

const server = http.createServer(async (request, response) => {
  const { method, url } = request;

  if (method === "GET" && url === "/health") {
    createJsonResponse(response, 200, { ok: true, service: "sim-server" });
    return;
  }

  if (method === "GET" && url === "/api/demo-scenario") {
    createJsonResponse(response, 200, createSeedWorldBootstrap());
    return;
  }

  if (method === "GET" && url === "/api/state-snapshot") {
    createJsonResponse(response, 200, SAMPLE_STATE_SNAPSHOT);
    return;
  }

  if (method === "GET" && url === "/api/sprint1-agent-seed-sample") {
    createJsonResponse(response, 200, {
      sprint: "Sprint 1 - Identity Loop Vertical Slice",
      agent_count: SPRINT1_AGENT_STATES.length,
      agents: SPRINT1_AGENT_STATES,
      round_snapshots: SPRINT1_ROUND_SNAPSHOTS,
    });
    return;
  }

  if (method === "GET" && url?.startsWith("/api/run-sample")) {
    const requestUrl = new URL(url, `http://localhost:${port}`);
    const seed = Number(requestUrl.searchParams.get("seed") || 42);
    const tickCount = Number(requestUrl.searchParams.get("ticks") || 10);
    const run = runTicks({
      seed,
      tickCount,
      worldRules: createBaselineWorldRules(),
    });

    createJsonResponse(response, 200, run);
    return;
  }

  if (method === "GET" && url === "/api/normalized-content-sample") {
    const normalizedBundle = await createMockNormalizedContentBundle({
      startTick: 20,
    });

    createJsonResponse(response, 200, normalizedBundle);
    return;
  }

  if (method === "GET" && url === "/api/sprint1-content-starter-pack") {
    const starterPack = await createSprint1StarterPackBundle({
      startTick: 0,
    });

    createJsonResponse(response, 200, starterPack);
    return;
  }

  if (method === "GET" && url?.startsWith("/api/exposure-sample")) {
    const requestUrl = new URL(url, `http://localhost:${port}`);
    const agentId = requestUrl.searchParams.get("agent") || "A01";
    const poolSize = Number(requestUrl.searchParams.get("pool") || 20);
    const sample = await createExposureSample({
      agentId,
      poolSize,
    });

    createJsonResponse(response, 200, sample);
    return;
  }

  if (method === "GET" && url?.startsWith("/api/sprint1-exposure-sample")) {
    const requestUrl = new URL(url, `http://localhost:${port}`);
    const agentId = requestUrl.searchParams.get("agent") || "S01";
    const poolSize = Number(requestUrl.searchParams.get("pool") || 9);
    const sample = await createSprint1ExposureSample({
      agentId,
      poolSize,
    });

    createJsonResponse(response, 200, sample);
    return;
  }

  if (method === "GET" && url === "/api/memory-bootstrap") {
    createJsonResponse(response, 200, createMemoryBootstrapState());
    return;
  }

  if (method === "GET" && url?.startsWith("/api/sprint1-memory-writeback-sample")) {
    const requestUrl = new URL(url, `http://localhost:${port}`);
    const agentId = requestUrl.searchParams.get("agent") || "S01";
    const sample = await createSprint1MemoryWritebackSample({
      agentId,
    });

    createJsonResponse(response, 200, sample);
    return;
  }

  if (method === "GET" && url?.startsWith("/api/memory-sample")) {
    const requestUrl = new URL(url, `http://localhost:${port}`);
    const seed = Number(requestUrl.searchParams.get("seed") || 42);
    const tickCount = Number(requestUrl.searchParams.get("ticks") || 6);
    const agentId = requestUrl.searchParams.get("agent") || "A01";
    const sample = createMemorySample({
      seed,
      tickCount,
      agentId,
      storeFilePath: durableMemoryStorePath,
    });

    createJsonResponse(response, 200, sample);
    return;
  }

  if (method === "GET" && url === "/api/identity-scenarios") {
    createJsonResponse(response, 200, createIdentityScenarioSuite());
    return;
  }

  if (method === "GET" && url === "/api/action-space-sample") {
    createJsonResponse(response, 200, createActionSample());
    return;
  }

  if (method === "GET" && url === "/api/forum-generation-sample") {
    createJsonResponse(response, 200, createForumGenerationSample());
    return;
  }

  if (method === "GET" && url === "/api/sprint1-forum-post-sample") {
    const sample = await createSprint1ForumPostSample();
    createJsonResponse(response, 200, sample);
    return;
  }

  if (method === "GET" && url === "/api/sprint1-evaluation-sample") {
    createJsonResponse(response, 200, createSprint1EvaluationSnapshot());
    return;
  }

  if (method === "GET" && url === "/api/ranking-sample") {
    createJsonResponse(response, 200, createRankingSample());
    return;
  }

  if (method === "GET" && url === "/api/meta-policy-sample") {
    createJsonResponse(response, 200, createMetaPolicySample());
    return;
  }

  if (method === "GET" && url === "/api/graph-storage-sample") {
    createJsonResponse(response, 200, createGraphStorageSample({ eventLogPath: eventLogStorePath }));
    return;
  }

  if (method === "GET" && url === "/api/debug-console-sample") {
    createJsonResponse(response, 200, createDebugConsoleSample());
    return;
  }

  if (method === "GET" && url === "/api/evaluation-sample") {
    createJsonResponse(response, 200, createEvaluationSample());
    return;
  }

  if (method === "GET" && url === "/api/batch-experiment-sample") {
    createJsonResponse(response, 200, createBatchExperimentSample());
    return;
  }

  if (method === "GET" && url === "/api/openapi-sample") {
    createJsonResponse(response, 200, openApiContract());
    return;
  }

  if (method === "GET" && url === "/api/staging-status") {
    createJsonResponse(response, 200, {
      environment: "github-pages-staging-equivalent",
      shared_url: "https://jongtae.github.io/AI-Fashion-Forum/",
      sim_server_mode: "repository_local",
      guardrails: {
        max_tick_guardrail: MAX_TICK_GUARDRAIL,
        graceful_failures: true,
      },
    });
    return;
  }

  if (method === "GET" && url === "/api/demo-run-package") {
    createJsonResponse(response, 200, createDemoRunPackage());
    return;
  }

  if (method === "POST" && url === "/api/jobs/start") {
    try {
      const body = await readJsonBody(request);
      const job = createSimulationJob(body);
      runSimulationJob(job);
      createJsonResponse(response, 201, serializeJob(job));
      return;
    } catch (error) {
      createJsonResponse(response, 400, { ok: false, error: "invalid_json_body" });
      return;
    }
  }

  if (url?.startsWith("/api/jobs/")) {
    const requestUrl = new URL(url, `http://localhost:${port}`);
    const [, , , jobId, action] = requestUrl.pathname.split("/");
    const job = jobStore.get(jobId);

    if (!job) {
      createJsonResponse(response, 404, { ok: false, error: "job_not_found" });
      return;
    }

    if (method === "GET" && !action) {
      createJsonResponse(response, 200, serializeJob(job));
      return;
    }

    if (method === "POST" && action === "tick") {
      try {
        const body = await readJsonBody(request);
        const ticks = Number(body.ticks || 1);
        runSimulationJob(job, ticks);
        createJsonResponse(response, 200, serializeJob(job));
        return;
      } catch (error) {
        createJsonResponse(response, 400, { ok: false, error: "invalid_json_body" });
        return;
      }
    }

    if (method === "GET" && action === "replay") {
      createJsonResponse(response, 200, {
        job_id: job.job_id,
        replay: job.result,
      });
      return;
    }

    if (method === "POST" && action === "retry") {
      createJsonResponse(response, 200, serializeJob(retrySimulationJob(job)));
      return;
    }
  }

  if (method === "GET" && url === "/") {
    createJsonResponse(response, 200, {
      service: "sim-server",
      scenario: MVP_DEMO_SCENARIO.name,
      endpoints: [
        "/health",
        "/api/demo-scenario",
        "/api/state-snapshot",
        "/api/run-sample?seed=42&ticks=10",
        "/api/normalized-content-sample",
        "/api/exposure-sample?agent=A01&pool=20",
        "/api/memory-bootstrap",
        "/api/memory-sample?seed=42&ticks=6&agent=A01",
        "/api/identity-scenarios",
        "/api/action-space-sample",
        "/api/forum-generation-sample",
        "/api/ranking-sample",
        "/api/meta-policy-sample",
        "/api/graph-storage-sample",
        "/api/debug-console-sample",
        "/api/evaluation-sample",
        "/api/batch-experiment-sample",
        "/api/openapi-sample",
        "/api/staging-status",
        "/api/demo-run-package",
        "/api/jobs/start",
        "/api/jobs/{job_id}",
        "/api/jobs/{job_id}/tick",
        "/api/jobs/{job_id}/replay",
        "/api/jobs/{job_id}/retry",
      ],
    });
    return;
  }

  createJsonResponse(response, 404, { ok: false, error: "not_found" });
});

server.listen(port, () => {
  console.log(`[sim-server] listening on http://localhost:${port}`);
});
