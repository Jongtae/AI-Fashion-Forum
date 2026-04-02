#!/usr/bin/env node
/**
 * rebuild-simulation-world.mjs
 *
 * Backup the current generated world, reset the simulation collections,
 * seed initial agent states from the startup snapshot, run one controlled
 * simulation batch, and then regenerate the derived seed/agent-state files.
 *
 * Usage:
 *   node scripts/rebuild-simulation-world.mjs
 *   node scripts/rebuild-simulation-world.mjs --seed 42 --ticks 5
 */

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import mongoose from "mongoose";
import { spawnSync } from "node:child_process";

import { loadAgentStartupStateSnapshot } from "../apps/agent-server/src/lib/agent-startup-state.js";
import { buildAgentStateUpdate } from "../apps/agent-server/src/lib/agent-state.js";
import { AgentState } from "../apps/forum-server/src/models/AgentState.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || "http://localhost:4001";
const FORUM_SERVER_URL = process.env.FORUM_SERVER_URL || "http://localhost:4000";
const DEFAULT_COLLECTIONS = [
  "posts",
  "comments",
  "agentstates",
  "actiontraces",
  "feedbacks",
  "moderationdecisions",
  "reports",
  "simevents",
  "storedactions",
  "interactions",
];

function parseArgs(argv) {
  const args = { seed: 42, ticks: 5, speed: 1, backupOnly: false };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--seed" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed)) args.seed = parsed;
      index += 1;
      continue;
    }
    if (value === "--ticks" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed)) args.ticks = parsed;
      index += 1;
      continue;
    }
    if (value === "--speed" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed)) args.speed = parsed;
      index += 1;
      continue;
    }
    if (value === "--backup-only") {
      args.backupOnly = true;
    }
  }
  return args;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
  }
}

async function writeNdjson(collection, outputPath) {
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  const stream = createWriteStream(outputPath, { encoding: "utf8" });
  let count = 0;
  try {
    const cursor = collection.find({}).sort({ _id: 1 });
    for await (const doc of cursor) {
      stream.write(`${JSON.stringify(doc)}\n`);
      count += 1;
    }
  } finally {
    stream.end();
    await once(stream, "finish");
  }
  return count;
}

async function backupWorld(backupRoot) {
  await fsPromises.mkdir(backupRoot, { recursive: true });
  const db = mongoose.connection.db;
  const report = [];

  for (const name of DEFAULT_COLLECTIONS) {
    const collection = db.collection(name);
    const exists = await collection.estimatedDocumentCount().catch(() => 0);
    if (!exists) {
      report.push({ name, count: 0, backupPath: null });
      continue;
    }
    const backupPath = path.join(backupRoot, `${name}.ndjson`);
    const count = await writeNdjson(collection, backupPath);
    report.push({ name, count, backupPath });
  }

  const replayDir = path.resolve("data/replays");
  if (fs.existsSync(replayDir)) {
    const replayBackupDir = path.join(backupRoot, "replays");
    await fsPromises.mkdir(replayBackupDir, { recursive: true });
    const replayFiles = await fsPromises.readdir(replayDir);
    for (const file of replayFiles) {
      await fsPromises.copyFile(path.join(replayDir, file), path.join(replayBackupDir, file));
    }
    report.push({ name: "replays", count: replayFiles.length, backupPath: replayBackupDir });
  }

  await fsPromises.writeFile(path.join(backupRoot, "manifest.json"), `${JSON.stringify({ createdAt: new Date().toISOString(), collections: report }, null, 2)}\n`);
  return report;
}

async function resetCollections() {
  const db = mongoose.connection.db;
  for (const name of DEFAULT_COLLECTIONS) {
    await db.collection(name).deleteMany({});
  }
  const replayDir = path.resolve("data/replays");
  await fsPromises.rm(replayDir, { recursive: true, force: true });
}

async function seedAgentStatesFromStartupSnapshot() {
  const snapshot = loadAgentStartupStateSnapshot();
  const docs = (snapshot.agents || []).map((agent, index) => {
    const round = Number(agent.round ?? 0);
    const tick = Number(agent.joined_tick ?? 0);
    return {
      ...buildAgentStateUpdate(agent, { round, tick }),
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(Date.now() + index),
    };
  });

  if (docs.length === 0) {
    return { inserted: 0 };
  }

  await AgentState.insertMany(docs, { ordered: false });
  return { inserted: docs.length };
}

async function runSimulation({ seed, ticks, speed }) {
  const response = await fetch(`${AGENT_SERVER_URL}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed, ticks, speed }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(`Simulation run failed: ${response.status} ${payload.error || response.statusText}`);
  }

  return response.json();
}

async function runAgentLoop({ seed, ticks, speed }) {
  const response = await fetch(`${AGENT_SERVER_URL}/api/agent-loop/tick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed, ticks, speed }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(`Agent loop failed: ${response.status} ${payload.error || response.statusText}`);
  }

  return response.json();
}

async function main() {
  const args = parseArgs(process.argv);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.resolve("data/backups", `simulation-world-${timestamp}`);

  await mongoose.connect(MONGODB_URI);
  console.log(`[rebuild] Connected to ${MONGODB_URI}`);

  const backupReport = await backupWorld(backupRoot);
  console.log(`[rebuild] Backup written to ${backupRoot}`);
  for (const item of backupReport) {
    if (item.backupPath) {
      console.log(`[rebuild]   ${item.name}: ${item.count}`);
    }
  }

  if (args.backupOnly) {
    await mongoose.disconnect();
    console.log("[rebuild] Backup-only mode complete");
    return;
  }

  await resetCollections();
  console.log("[rebuild] Cleared generated world collections");

  const seedResult = await seedAgentStatesFromStartupSnapshot();
  console.log(`[rebuild] Seeded agentstates: ${seedResult.inserted}`);

  await mongoose.disconnect();

  console.log(`[rebuild] Running controlled simulation via ${AGENT_SERVER_URL}/api/run`);
  const runResult = await runSimulation({ seed: args.seed, ticks: args.ticks, speed: args.speed });
  console.log(`[rebuild] Simulation complete: posts=${runResult.posts_created} replay=${runResult.replay_file} report=${runResult.report_file}`);

  console.log(`[rebuild] Running agent loop via ${AGENT_SERVER_URL}/api/agent-loop/tick`);
  const loopResult = await runAgentLoop({ seed: args.seed, ticks: Math.max(1, Math.min(10, args.ticks)), speed: args.speed });
  console.log(`[rebuild] Agent loop complete: posts=${loopResult.postsCreated ?? 0} comments=${loopResult.commentsCreated ?? 0}`);

  runCommand("npm", ["run", "sync:agent-state-candidates"]);
  console.log("[rebuild] Regenerated seed profiles and agent-state candidates");

  runCommand("npm", ["run", "judge:content-quality", "--", "--output", "data/judgements/content-quality-latest.json"]);
  console.log("[rebuild] Generated content-quality judge report");

  console.log("[rebuild] Done");
}

main().catch((error) => {
  console.error("[rebuild] Failed:", error);
  process.exit(1);
});
