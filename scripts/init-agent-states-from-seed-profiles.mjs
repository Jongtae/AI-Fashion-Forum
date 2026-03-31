#!/usr/bin/env node
/**
 * init-agent-states-from-seed-profiles.mjs
 *
 * Read-only initialization script that turns derived agent seed profiles into
 * agent-state candidates for the next simulation step.
 *
 * This script does not mutate MongoDB. It consumes the derived seed profile
 * export and emits a structure shaped like an initial AgentState snapshot so we
 * can inspect and iterate on the agent-centered initialization flow.
 *
 * Usage:
 *   node scripts/init-agent-states-from-seed-profiles.mjs
 *   node scripts/init-agent-states-from-seed-profiles.mjs --input tmp/agent-seed-profiles.json
 *   node scripts/init-agent-states-from-seed-profiles.mjs --output tmp/agent-state-candidates.json
 *
 * Env:
 *   INPUT_FILE  optional override for the seed profile JSON
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT = path.resolve(__dirname, "../tmp/agent-seed-profiles.full.json");
const DEFAULT_OUTPUT = path.resolve(__dirname, "../tmp/agent-state-candidates.json");

function parseArgs(argv) {
  const args = {
    input: process.env.INPUT_FILE || DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
  };

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
      continue;
    }
  }

  return args;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function stableString(value) {
  return String(value || "").trim();
}

function deriveArchetype(profile) {
  if (profile.behaviorHints?.primaryMode === "contrarian") return "contrarian_observer";
  if (profile.behaviorHints?.primaryMode === "thread_participant") return "social_participant";
  if (profile.behaviorHints?.primaryMode === "trend_setter") return "trend_setter";
  return "quiet_observer";
}

function deriveInterestVector(profile) {
  const topics = profile.topicalMemory?.dominantTopics || [];
  const topicMap = {};
  for (const topic of topics) {
    const score = clamp((topic.count || 0) / Math.max(1, profile.topicalMemory?.totalPosts || 1));
    topicMap[topic.key] = round(score);
  }
  return topicMap;
}

function deriveBeliefVector(profile) {
  const hints = profile.memoryPromptHints || [];
  return {
    "social-feedback-matters": profile.topicalMemory?.totalComments > 0 ? 0.82 : 0.54,
    "topic-diversity-matters": profile.surfaceSignals?.diversityScore > 0.5 ? 0.79 : 0.55,
    "sparse-response-is-valid": profile.behaviorHints?.responseStyle === "selective_response" ? 0.81 : 0.57,
    "conflict-can-reveal-truth": profile.behaviorHints?.memoryPriority === "conflict_sensitive" ? 0.77 : 0.51,
    "memory-should-track-recurrent-topics": hints.some((hint) => hint.includes("strongest recurring topics")) ? 0.85 : 0.63,
  };
}

function deriveRecentMemories(profile) {
  const topics = profile.topicalMemory?.dominantTopics || [];
  const references = profile.sourceReferences || [];
  return [
    {
      kind: "topic_summary",
      text: topics.length > 0 ? `Observed recurring topics: ${topics.map((topic) => topic.key).join(", ")}.` : "No recurring topics yet.",
    },
    {
      kind: "social_summary",
      text:
        profile.topicalMemory?.totalComments > 0
          ? `The profile has ${profile.topicalMemory.totalComments} observed comments and should remember reply depth.`
          : "The profile is mostly broadcast-oriented and should remain selective in replies.",
    },
    {
      kind: "source_anchor",
      text: references.length > 0 ? `Source sample post: ${references[0].title}` : "No source anchor found.",
    },
  ];
}

function deriveMutableAxes(profile) {
  const baseCuriosity = profile.seedAxes?.curiosity ?? 0.5;
  const baseStatus = profile.seedAxes?.status_drive ?? 0.5;
  const baseCare = profile.seedAxes?.care_drive ?? 0.5;
  const baseNovelty = profile.seedAxes?.novelty_drive ?? 0.5;
  const baseSkepticism = profile.seedAxes?.skepticism ?? 0.5;
  const baseBelonging = profile.seedAxes?.belonging_drive ?? 0.5;

  return {
    attention_bias: round(clamp(0.45 + (baseCuriosity - 0.5) * 0.35 + (profile.surfaceSignals?.diversityScore || 0) * 0.1)),
    belief_shift: round(clamp(0.35 + (baseSkepticism - 0.5) * 0.4)),
    affect_intensity: round(clamp(0.35 + (baseCare - 0.5) * 0.25 + (profile.surfaceSignals?.avgComments || 0) * 0.05)),
    identity_confidence: round(clamp(0.45 + (baseStatus - 0.5) * 0.25 + (profile.surfaceSignals?.postVolume || 0) * 0.02)),
    social_posture: round(clamp(0.4 + (baseBelonging - 0.5) * 0.35 + (profile.topicalMemory?.totalComments || 0) * 0.01)),
    novelty_openness: round(clamp(0.4 + (baseNovelty - 0.5) * 0.35)),
  };
}

async function main() {
  const { input, output } = parseArgs(process.argv);
  const raw = await fs.readFile(input, "utf8");
  const parsed = JSON.parse(raw);
  const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];

  const candidates = profiles.map((profile, index) => {
    const seedProfileId = stableString(profile.seedProfileId || profile.sourceAuthorId || `seed-${index + 1}`);
    const topicSummary = profile.topicalMemory?.dominantTopics?.map((topic) => topic.key) || [];

    return {
      snapshot_id: `init:${seedProfileId}`,
      agent_id: stableString(profile.sourceAuthorId || seedProfileId),
      round: 0,
      tick: 0,
      source_seed_profile_id: seedProfileId,
      source_author_type: stableString(profile.sourceAuthorType || "agent"),
      archetype: deriveArchetype(profile),
      handle: stableString(profile.displayLabel || profile.sourceAuthorId || seedProfileId),
      display_name: stableString(profile.displayLabel || profile.sourceAuthorId || seedProfileId),
      seed_axes: profile.seedAxes || {},
      mutable_axes: deriveMutableAxes(profile),
      interest_vector: deriveInterestVector(profile),
      belief_vector: deriveBeliefVector(profile),
      openness: round(profile.seedAxes?.curiosity ?? 0.5),
      conformity: round(clamp(1 - (profile.seedAxes?.skepticism ?? 0.5) * 0.5)),
      conflict_tolerance: round(clamp(profile.behaviorHints?.primaryMode === "contrarian" ? 0.78 : 0.46)),
      relationship_summary: {
        trust_circle_size: profile.topicalMemory?.totalComments > 0 ? Math.max(1, Math.round(profile.topicalMemory.totalComments / 2)) : 1,
        muted_topics: topicSummary.filter((topic) => topic.includes("pricing") || topic.includes("anti_hype")).length,
      },
      recentMemories: deriveRecentMemories(profile),
      durableMemories: [
        {
          kind: "seed_behavior",
          text: `Primary mode: ${profile.behaviorHints?.primaryMode || "quiet_observer"}`,
        },
        {
          kind: "topic_memory",
          text: topicSummary.length > 0 ? `Top topics: ${topicSummary.join(", ")}` : "No dominant topic memory yet.",
        },
      ],
      selfNarratives: profile.memoryPromptHints || [],
      memoryWritebacks: [],
      exposureSummary: {
        source_post_count: profile.topicalMemory?.totalPosts || 0,
        source_comment_count: profile.topicalMemory?.totalComments || 0,
        dominant_topics: topicSummary,
        engagement: profile.surfaceSignals || {},
      },
      reactionSummary: {
        primaryMode: profile.behaviorHints?.primaryMode || "quiet_observer",
        responseStyle: profile.behaviorHints?.responseStyle || "selective_response",
        memoryPriority: profile.behaviorHints?.memoryPriority || "topic_weighted",
      },
      rawSnapshot: {
        sourceProfile: profile,
        sourceReferences: profile.sourceReferences || [],
      },
    };
  });

  const result = {
    exportedAt: new Date().toISOString(),
    source: {
      inputFile: input,
      profileCount: profiles.length,
    },
    model: "agent-state-candidates",
    candidates,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[agent-state-candidates] Wrote ${candidates.length} candidates to ${output}`);
  console.log(`[agent-state-candidates] Input profiles=${profiles.length}`);
}

main().catch((error) => {
  console.error("[agent-state-candidates] Failed:", error);
  process.exit(1);
});
