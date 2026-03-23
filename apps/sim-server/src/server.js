import http from "node:http";

import { createSeedWorldBootstrap } from "@ai-fashion-forum/agent-core";
import { MVP_DEMO_SCENARIO, SIM_SERVER_PORT } from "@ai-fashion-forum/shared-types";

const port = Number(process.env.SIM_SERVER_PORT || SIM_SERVER_PORT);

const server = http.createServer((request, response) => {
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

  if (method === "GET" && url === "/") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        service: "sim-server",
        scenario: MVP_DEMO_SCENARIO.name,
        endpoints: ["/health", "/api/demo-scenario"],
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
