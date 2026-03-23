import http from "node:http";

import {
  createExposureSample,
  createMockNormalizedContentBundle,
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

const server = http.createServer(async (request, response) => {
  const { method, url } = request;

  if (method === "GET" && url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "sim-server" }));
    return;
  }

  if (method === "GET" && url === "/api/demo-scenario") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(createSeedWorldBootstrap()));
    return;
  }

  if (method === "GET" && url === "/api/state-snapshot") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(SAMPLE_STATE_SNAPSHOT));
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

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(run));
    return;
  }

  if (method === "GET" && url === "/api/normalized-content-sample") {
    const normalizedBundle = await createMockNormalizedContentBundle({
      startTick: 20,
    });

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(normalizedBundle));
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

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(sample));
    return;
  }

  if (method === "GET" && url === "/") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        service: "sim-server",
        scenario: MVP_DEMO_SCENARIO.name,
        endpoints: [
          "/health",
          "/api/demo-scenario",
          "/api/state-snapshot",
          "/api/run-sample?seed=42&ticks=10",
          "/api/normalized-content-sample",
          "/api/exposure-sample?agent=A01&pool=20",
        ],
      }),
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false, error: "not_found" }));
});

server.listen(port, () => {
  console.log(`[sim-server] listening on http://localhost:${port}`);
});
