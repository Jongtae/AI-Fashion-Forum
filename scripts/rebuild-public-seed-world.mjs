#!/usr/bin/env node
/**
 * rebuild-public-seed-world.mjs
 *
 * Crawl a recent public fashion/community corpus and derive 1000 seed profiles
 * plus agent-state candidates from it.
 *
 * Usage:
 *   node scripts/rebuild-public-seed-world.mjs
 *   node scripts/rebuild-public-seed-world.mjs --limit 100 --seed-limit 1000
 *   node scripts/rebuild-public-seed-world.mjs --crawl-output data/... --profiles-output data/... --candidates-output data/...
 */

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CRAWL_OUTPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-corpus.json");
const DEFAULT_PROFILES_OUTPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-seed-profiles.json");
const DEFAULT_CANDIDATES_OUTPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-agent-state-candidates.json");
const DEFAULT_LIMIT = 100;
const DEFAULT_SEED_LIMIT = 1000;

function parseArgs(argv) {
  const args = {
    crawlOutput: DEFAULT_CRAWL_OUTPUT,
    profilesOutput: DEFAULT_PROFILES_OUTPUT,
    candidatesOutput: DEFAULT_CANDIDATES_OUTPUT,
    limit: DEFAULT_LIMIT,
    seedLimit: DEFAULT_SEED_LIMIT,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--crawl-output" && next) {
      args.crawlOutput = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (value === "--profiles-output" && next) {
      args.profilesOutput = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (value === "--candidates-output" && next) {
      args.candidatesOutput = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (value === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.limit = parsed;
      }
      index += 1;
      continue;
    }
    if (value === "--seed-limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.seedLimit = parsed;
      }
      index += 1;
    }
  }

  return args;
}

function runNodeScript(script, args = []) {
  const result = spawnSync("node", [script, ...args], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: node ${[script, ...args].join(" ")}`);
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv);
  const crawlScript = path.resolve(__dirname, "./crawl-public-seed-corpus.mjs");
  const deriveScript = path.resolve(__dirname, "./derive-public-seed-profiles.mjs");
  const initScript = path.resolve(__dirname, "./init-agent-states-from-seed-profiles.mjs");

  runNodeScript(crawlScript, ["--output", args.crawlOutput, "--limit", String(args.limit)]);
  runNodeScript(deriveScript, [
    "--input",
    args.crawlOutput,
    "--output",
    args.profilesOutput,
    "--limit",
    String(args.seedLimit),
  ]);
  runNodeScript(initScript, [
    "--input",
    args.profilesOutput,
    "--output",
    args.candidatesOutput,
  ]);

  const corpus = await readJson(args.crawlOutput);
  const profiles = await readJson(args.profilesOutput);
  const candidates = await readJson(args.candidatesOutput);

  console.log(`[public-seed-world] Corpus records=${corpus.records?.length || 0}`);
  console.log(`[public-seed-world] Seed profiles=${profiles.profiles?.length || 0}`);
  console.log(`[public-seed-world] Agent-state candidates=${candidates.candidates?.length || 0}`);
}

main().catch((error) => {
  console.error("[public-seed-world] Failed:", error);
  process.exit(1);
});
