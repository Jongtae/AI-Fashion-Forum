import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SAMPLE_STATE_SNAPSHOT } from "@ai-fashion-forum/shared-types";
import {
  loadAgentStartupStateMeta,
  loadAgentStartupStateSnapshot,
} from "./agent-startup-state.js";

test("falls back to the sample snapshot when the candidate file is missing", () => {
  const missingPath = path.join(os.tmpdir(), `missing-agent-state-${Date.now()}.json`);
  const snapshot = loadAgentStartupStateSnapshot({ candidatesFilePath: missingPath });

  assert.equal(snapshot.agents.length, SAMPLE_STATE_SNAPSHOT.agents.length);
  assert.equal(snapshot.contents.length, SAMPLE_STATE_SNAPSHOT.contents.length);
});

test("loads derived candidates when the candidate file exists", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-startup-"));
  const candidatePath = path.join(tempDir, "agent-state-candidates.json");

  fs.writeFileSync(
    candidatePath,
    JSON.stringify(
      {
        exportedAt: "2026-03-31T00:00:00.000Z",
        candidates: [
          {
            agent_id: "A99",
            handle: "seedvoice",
            display_name: "Seed Voice",
            archetype: "quiet_observer",
            openness: 0.71,
            conformity: 0.44,
            conflict_tolerance: 0.52,
            interest_vector: { office_style: 0.82, silhouettes: 0.64 },
            belief_vector: { "fit-before-brand": 0.74 },
            relationship_summary: { trust_circle_size: 2 },
            selfNarratives: ["Seed voice from derived candidate input."],
            rawSnapshot: {
              sourceProfile: {
                seedProfileId: "seed:A99",
                profileRole: "agent_seed",
                behaviorHints: {
                  primaryMode: "quiet_observer",
                  responseStyle: "selective_response",
                  memoryPriority: "topic_weighted",
                },
                topicalMemory: {
                  totalPosts: 4,
                  totalComments: 2,
                  dominantTopics: [{ key: "office_style", count: 3 }],
                },
                surfaceSignals: {
                  postVolume: 4,
                  avgComments: 0.5,
                  avgLikes: 1.25,
                  diversityScore: 0.5,
                },
              },
            },
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  const snapshot = loadAgentStartupStateSnapshot({ candidatesFilePath: candidatePath });
  const meta = loadAgentStartupStateMeta({ candidatesFilePath: candidatePath });

  assert.equal(snapshot.agents.length, 1);
  assert.equal(snapshot.agents[0].agent_id, "A99");
  assert.equal(snapshot.agents[0].handle, "seedvoice");
  assert.equal(snapshot.agents[0].display_name, "Seed Voice");
  assert.equal(snapshot.agents[0].seed_profile.seed_id, "seed:A99");
  assert.equal(meta.source, "agent-state-candidates");
  assert.equal(meta.agentCount, 1);
});

test("prefers the public candidate file when available", () => {
  const meta = loadAgentStartupStateMeta();

  assert.match(meta.filePath, /seed-corpus\/public\/recent-fashion-agent-state-candidates\.json$/);
  assert.equal(meta.source, "agent-state-candidates");
});
