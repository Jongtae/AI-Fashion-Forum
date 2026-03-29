#!/usr/bin/env node
/**
 * seed-mongo.js
 *
 * Migrates shared-types seed data into MongoDB.
 * Run: node scripts/seed-mongo.js
 *
 * Env: MONGODB_URI (default: mongodb://localhost:27017/ai-fashion-forum)
 */

import mongoose from "mongoose";
import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
} from "../packages/shared-types/index.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";

// ── Inline schema definitions (avoid circular imports from sim-server) ────────

const postSchema = new mongoose.Schema(
  {
    content: String,
    authorId: String,
    authorType: { type: String, enum: ["user", "agent"] },
    tags: [String],
    imageUrls: [String],
    likes: { type: Number, default: 0 },
    likedBy: [String],
    format: String,
    agentRound: Number,
    agentTick: Number,
  },
  { timestamps: true }
);

const agentStateSchema = new mongoose.Schema(
  {
    agentId: { type: String, index: true },
    round: Number,
    tick: Number,
    seedAxes: { type: Map, of: Number },
    mutableAxes: { type: Map, of: Number },
    archetype: String,
    recentMemories: [mongoose.Schema.Types.Mixed],
    durableMemories: [mongoose.Schema.Types.Mixed],
    selfNarratives: [mongoose.Schema.Types.Mixed],
    exposureSummary: mongoose.Schema.Types.Mixed,
    reactionSummary: mongoose.Schema.Types.Mixed,
    rawSnapshot: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
agentStateSchema.index({ agentId: 1, round: 1 }, { unique: true });

const Post = mongoose.model("Post", postSchema);
const AgentState = mongoose.model("AgentState", agentStateSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSeedAxes(agent) {
  return {
    curiosity: agent.curiosity ?? agent.openness ?? 0.5,
    status_drive: agent.status_drive ?? 0.5,
    care_drive: agent.care_drive ?? 0.5,
    novelty_drive: agent.novelty_drive ?? agent.activity_level ?? 0.5,
    skepticism: agent.skepticism ?? 0.5,
    belonging_drive: agent.belonging_drive ?? agent.conformity ?? 0.5,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[seed] Connected to ${MONGODB_URI}`);

  // Clear existing seed data
  await Post.deleteMany({ authorType: "agent" });
  await AgentState.deleteMany({});
  console.log("[seed] Cleared existing agent/post seed data");

  // 1. Seed SAMPLE_AGENT_STATES as round-0 snapshots
  const sampleAgentDocs = SAMPLE_AGENT_STATES.map((a, index) => ({
    agentId: a.agent_id,
    round: 0,
    tick: a.joined_tick ?? 0,
    seedAxes: buildSeedAxes(a),
    mutableAxes: {
      attention_bias: 0.5,
      belief_shift: 0,
      affect_intensity: 0.5,
      identity_confidence: 0.6,
      social_posture: 0.5,
    },
    archetype: a.archetype,
    selfNarratives: a.self_narrative ?? [],
    rawSnapshot: a,
    createdAt: new Date(Date.now() + index),
    updatedAt: new Date(Date.now() + index),
  }));
  await AgentState.insertMany(sampleAgentDocs, { ordered: false });
  console.log(`[seed] Inserted ${sampleAgentDocs.length} SAMPLE_AGENT_STATES`);

  // 2. Seed SAMPLE_CONTENT_RECORDS as initial agent posts
  const postDocs = [];
  for (const [index, content] of SAMPLE_CONTENT_RECORDS.entries()) {
    postDocs.push({
      content: content.body || content.title,
      authorId: content.author_id,
      authorType: "agent",
      tags: content.topics ?? [],
      imageUrls: [],
      format: content.format,
      agentRound: 0,
      agentTick: content.created_tick ?? index,
      likes: 0,
      likedBy: [],
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(Date.now() + index),
    });
  }
  if (postDocs.length > 0) {
    await Post.insertMany(postDocs);
    console.log(`[seed] Inserted ${postDocs.length} SAMPLE_CONTENT_RECORDS as posts`);
  } else {
    console.log("[seed] No sample content records found");
  }

  await mongoose.disconnect();
  console.log("[seed] Done.");
}

seed().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});
