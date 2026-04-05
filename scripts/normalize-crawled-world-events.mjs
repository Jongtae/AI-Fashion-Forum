#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { summarizeWorldEventRecords, transformToWorldEventRecord } from "./world-event-signal-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT = path.resolve(__dirname, "../data/seed-corpus/public/recent-fashion-corpus.json");
const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/crawled-documents/world-event-signals.json");

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--input" && next) {
      args.input = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (value === "--output" && next) {
      args.output = path.resolve(process.cwd(), next);
      index += 1;
    }
  }
  return args;
}

async function main() {
  const { input, output } = parseArgs(process.argv);
  const raw = await fs.readFile(input, "utf8");
  const parsed = JSON.parse(raw);
  const sourceRecords = Array.isArray(parsed.records) ? parsed.records : [];

  if (sourceRecords.length === 0) {
    throw new Error(`No source records found in ${input}`);
  }

  const records = sourceRecords.map((record, index) => transformToWorldEventRecord(record, index));

  const result = {
    exportedAt: new Date().toISOString(),
    schemaVersion: "world-event-signal/v1",
    source: {
      inputFile: input,
      sourceTopic: parsed.topic || "public-crawled-documents",
      selectionLimit: parsed.selectionLimit || sourceRecords.length,
      recordCount: sourceRecords.length,
      sourceSummary: parsed.sourceSummary || null,
    },
    summary: summarizeWorldEventRecords(records),
    records,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[world-event-signals] Wrote ${records.length} records to ${output}`);
  console.log(
    `[world-event-signals] Categories=${result.summary.categoryCounts.map((item) => `${item.key}:${item.count}`).join(", ")}`,
  );
}

main().catch((error) => {
  console.error("[world-event-signals] Failed:", error);
  process.exit(1);
});
