import http from "node:http";

import {
  createActionSample,
  createDebugConsoleSample,
  createEvaluationSample,
  createExposureSample,
  createForumGenerationSample,
  createGraphStorageSample,
  createIdentityScenarioSuite,
  createMemoryBootstrapState,
  createMemorySample,
  createMetaPolicySample,
  createMockNormalizedContentBundle,
  createRankingSample,
  createBatchExperimentSample,
  createBaselineWorldRules,
  createSeedWorldBootstrap,
  runTicks,
} from "@ai-fashion-forum/agent-core";
import {
  MVP_DEMO_SCENARIO,
  SAMPLE_STATE_SNAPSHOT,
  SIM_SERVER_PORT,
} from "@ai-fashion-forum/shared-types";

const port = Number(process.env.SIM_SERVER_PORT || SIM_SERVER_PORT);
const durableMemoryStorePath = new URL("../data/memory-store.json", import.meta.url);
const eventLogStorePath = new URL("../data/event-log.json", import.meta.url);
const jobStore = new Map();

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
  };
}

function createSimulationJob({ seed = 42, tickCount = 10, label = "manual_run" } = {}) {
  const job = {
    job_id: `job-${Date.now()}-${jobStore.size + 1}`,
    status: "queued",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    attempts: 0,
    max_retries: 2,
    request: {
      seed,
      tickCount,
      label,
    },
    result: null,
  };

  jobStore.set(job.job_id, job);
  return job;
}

function runSimulationJob(job, additionalTicks = 0) {
  job.status = "running";
  job.attempts += 1;
  job.updated_at = new Date().toISOString();

  const tickCount = Math.max(job.request.tickCount + additionalTicks, 0);
  const result = runTicks({
    seed: job.request.seed,
    tickCount,
    worldRules: createBaselineWorldRules(),
  });

  job.request.tickCount = tickCount;
  job.result = result;
  job.status = "completed";
  job.updated_at = new Date().toISOString();

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

  if (method === "GET" && url === "/api/memory-bootstrap") {
    createJsonResponse(response, 200, createMemoryBootstrapState());
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
