import { spawnSync } from "node:child_process";

const SERVICES = [
  { name: "ai-fashion-forum-mongo", composeService: "mongo" },
  { name: "ai-fashion-forum-redis", composeService: "redis" },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    const prettyArgs = [command, ...args].join(" ");
    throw new Error(`Command failed: ${prettyArgs}`);
  }
}

function inspectContainer(name) {
  const result = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", name], {
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    return { exists: false, running: false };
  }

  return {
    exists: true,
    running: String(result.stdout || "").trim() === "true",
  };
}

const containerStates = SERVICES.map((service) => ({
  ...service,
  ...inspectContainer(service.name),
}));

const missingServices = containerStates.filter((service) => !service.exists);
const stoppedServices = containerStates.filter((service) => service.exists && !service.running);

if (missingServices.length > 0) {
  console.log("[bootstrap] starting MongoDB/Redis via docker-compose");
  run("docker-compose", ["up", "-d", "--no-recreate", ...SERVICES.map((service) => service.composeService)]);
} else if (stoppedServices.length > 0) {
  console.log("[bootstrap] starting existing MongoDB/Redis containers");
  run("docker", ["start", ...stoppedServices.map((service) => service.name)]);
} else {
  console.log("[bootstrap] MongoDB/Redis already running");
}

console.log("[bootstrap] starting app services");
run("npm", ["run", "boot:local"]);
