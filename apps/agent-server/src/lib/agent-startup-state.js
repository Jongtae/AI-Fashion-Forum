import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SAMPLE_STATE_SNAPSHOT,
  createAgentMutableState,
  createAgentState,
  createStateSnapshot,
} from "@ai-fashion-forum/shared-types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CANDIDATES_FILE = path.resolve(
  __dirname,
  "../../../../data/agent-state-candidates.json",
);

const startupCache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveCandidatesFilePath(explicitPath) {
  if (explicitPath) {
    return path.resolve(process.cwd(), explicitPath);
  }

  const envPath = process.env.AGENT_STATE_CANDIDATES_FILE;
  if (envPath) {
    return path.resolve(process.cwd(), envPath);
  }

  return DEFAULT_CANDIDATES_FILE;
}

function readCandidateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const candidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];

    if (candidates.length === 0) {
      return null;
    }

    return {
      filePath,
      exportedAt: parsed.exportedAt || null,
      candidates,
    };
  } catch (error) {
    return {
      filePath,
      error,
      candidates: null,
    };
  }
}

function deriveTopicInterestVector(candidate = {}, sourceProfile = {}) {
  const profileTopics = Array.isArray(sourceProfile.topicalMemory?.dominantTopics)
    ? sourceProfile.topicalMemory.dominantTopics
    : [];

  const profileVector = profileTopics.reduce((acc, topic) => {
    if (!topic?.key) {
      return acc;
    }

    const totalPosts = Math.max(1, Number(sourceProfile.topicalMemory?.totalPosts) || 1);
    acc[topic.key] = Math.round(((Number(topic.count) || 0) / totalPosts) * 100) / 100;
    return acc;
  }, {});

  return Object.keys(candidate.interest_vector || {}).length > 0
    ? { ...candidate.interest_vector }
    : profileVector;
}

function normalizeAgentArchetype(candidate = {}, sourceProfile = {}) {
  const archetype = String(candidate.archetype || sourceProfile.behaviorHints?.primaryMode || "quiet_observer")
    .trim()
    .toLowerCase();

  const mapping = {
    quiet_observer: "quiet_observer",
    trend_seeker: "trend_seeker",
    trend_setter: "trend_seeker",
    community_regular: "community_regular",
    social_participant: "community_regular",
    thread_participant: "community_regular",
    brand_loyalist: "brand_loyalist",
    contrarian_commenter: "contrarian_commenter",
    contrarian_observer: "contrarian_commenter",
    contrarian: "contrarian_commenter",
    empathetic_responder: "empathetic_responder",
  };

  return mapping[archetype] || "quiet_observer";
}

function deriveSeedProfile(candidate = {}, sourceProfile = {}) {
  const seedId = sourceProfile.seedProfileId || candidate.source_seed_profile_id || `seed:${candidate.agent_id}`;
  const behaviorHints = sourceProfile.behaviorHints || {};
  const topicalMemory = sourceProfile.topicalMemory || {};

  return {
    seed_id: seedId,
    archetype_hint:
      normalizeAgentArchetype(candidate, sourceProfile) ||
      behaviorHints.primaryMode ||
      sourceProfile.profileRole ||
      "quiet_observer",
    baseline_traits: {
      source_author_type: candidate.source_author_type || sourceProfile.sourceAuthorType || "agent",
      profile_role: sourceProfile.profileRole || null,
      dominant_mood: sourceProfile.dominantMood || null,
      total_posts: topicalMemory.totalPosts || candidate.exposureSummary?.source_post_count || 0,
      total_comments: topicalMemory.totalComments || candidate.exposureSummary?.source_comment_count || 0,
    },
    interest_seeds: deriveTopicInterestVector(candidate, sourceProfile),
    value_seeds: {
      ...(candidate.belief_vector || {}),
      primary_mode: behaviorHints.primaryMode || candidate.reactionSummary?.primaryMode || "quiet_observer",
      response_style:
        behaviorHints.responseStyle || candidate.reactionSummary?.responseStyle || "selective_response",
      memory_priority:
        behaviorHints.memoryPriority || candidate.reactionSummary?.memoryPriority || "topic_weighted",
    },
    emotional_bias: {
      curiosity: sourceProfile.seedAxes?.curiosity ?? candidate.openness ?? 0.5,
      skepticism:
        sourceProfile.seedAxes?.skepticism ?? Math.max(0, 1 - (candidate.conformity ?? 0.5)),
      belonging:
        sourceProfile.seedAxes?.belonging_drive ??
        (candidate.relationship_summary?.trust_circle_size ? 0.6 : 0.4),
      care_drive: sourceProfile.seedAxes?.care_drive ?? 0.5,
    },
    voice_notes: Array.isArray(sourceProfile.memoryPromptHints)
      ? [...sourceProfile.memoryPromptHints]
      : Array.isArray(candidate.selfNarratives)
        ? [...candidate.selfNarratives]
        : [],
  };
}

function buildMutableState(candidate = {}, sourceProfile = {}) {
  return createAgentMutableState({
    current_traits: {
      openness: candidate.openness ?? 0.5,
      conformity: candidate.conformity ?? 0.5,
      conflict_tolerance: candidate.conflict_tolerance ?? 0.5,
      activity_level:
        sourceProfile.surfaceSignals?.postVolume != null
          ? Math.min(1, Math.max(0, Number(sourceProfile.surfaceSignals.postVolume) / 20))
          : candidate.activity_level ?? 0.5,
    },
    current_interests: candidate.interest_vector || {},
    current_beliefs: candidate.belief_vector || {},
    attention_bias: candidate.mutable_axes || {
      topic_weight: sourceProfile.surfaceSignals?.diversityScore ?? 0.5,
      reply_weight: sourceProfile.surfaceSignals?.avgComments ?? 0.5,
      novelty_weight: sourceProfile.surfaceSignals?.avgLikes ?? 0.5,
    },
    affect_state: {
      social_temperature: sourceProfile.surfaceSignals?.avgComments ?? 0.5,
      novelty_pressure: sourceProfile.surfaceSignals?.diversityScore ?? 0.5,
      confidence: candidate.openness ?? 0.5,
    },
    self_narrative_summary: Array.isArray(candidate.selfNarratives)
      ? candidate.selfNarratives.join(" ")
      : "",
    recent_arc: candidate.reactionSummary?.primaryMode || sourceProfile.behaviorHints?.primaryMode || "stable",
    stance_markers: [
      candidate.reactionSummary?.responseStyle || sourceProfile.behaviorHints?.responseStyle || "selective_response",
      candidate.reactionSummary?.memoryPriority || sourceProfile.behaviorHints?.memoryPriority || "topic_weighted",
    ],
    drift_log: [
      {
        kind: "seed_profile",
        text: `Loaded from ${seedIdFor(candidate, sourceProfile)}`,
      },
    ],
  });
}

function seedIdFor(candidate = {}, sourceProfile = {}) {
  return sourceProfile.seedProfileId || candidate.source_seed_profile_id || candidate.agent_id || "seed";
}

function candidateToAgentState(candidate = {}, index = 0) {
  const sourceProfile = candidate?.rawSnapshot?.sourceProfile || {};
  const seedProfile = deriveSeedProfile(candidate, sourceProfile);
  const mutableState = buildMutableState(candidate, sourceProfile);
  const interestVector = deriveTopicInterestVector(candidate, sourceProfile);
  const beliefVector = {
    ...(candidate.belief_vector || {}),
  };

  return createAgentState({
    agent_id:
      candidate.agent_id ||
      candidate.source_author_id ||
      candidate.sourceAuthorId ||
      `A${String(index + 1).padStart(2, "0")}`,
    handle:
      candidate.handle ||
      candidate.displayLabel ||
      candidate.display_label ||
      candidate.source_author_id ||
      candidate.sourceAuthorId ||
      `agent_${index + 1}`,
    display_name:
      candidate.display_name ||
      candidate.displayLabel ||
      candidate.display_label ||
      candidate.source_author_id ||
      candidate.sourceAuthorId ||
      candidate.agent_id ||
      `Agent ${index + 1}`,
    archetype: normalizeAgentArchetype(candidate, sourceProfile),
    joined_tick: candidate.tick ?? candidate.round ?? 0,
    activity_level:
      candidate.activity_level ??
      Math.min(0.95, Math.max(0.2, (Number(sourceProfile.surfaceSignals?.postVolume) || 0) / 20 || 0.5)),
    openness: candidate.openness ?? candidate.seed_axes?.curiosity ?? sourceProfile.seedAxes?.curiosity ?? 0.5,
    conformity:
      candidate.conformity ?? candidate.seed_axes?.belonging_drive ?? sourceProfile.seedAxes?.belonging_drive ?? 0.5,
    conflict_tolerance:
      candidate.conflict_tolerance ?? sourceProfile.seedAxes?.skepticism ?? 0.5,
    memory_window: candidate.memory_window ?? 12,
    interest_vector: interestVector,
    belief_vector: beliefVector,
    relationship_summary: candidate.relationship_summary || {
      trust_circle_size:
        sourceProfile.topicalMemory?.totalComments > 0
          ? Math.max(1, Math.round((sourceProfile.topicalMemory.totalComments || 0) / 2))
          : 1,
    },
    self_narrative: Array.isArray(candidate.selfNarratives)
      ? [...candidate.selfNarratives]
      : Array.isArray(sourceProfile.memoryPromptHints)
        ? [...sourceProfile.memoryPromptHints]
        : [],
    seed_profile: seedProfile,
    mutable_state: mutableState,
  });
}

function buildSnapshotFromCandidates(candidates = []) {
  const agents = candidates.map((candidate, index) => candidateToAgentState(candidate, index));
  return createStateSnapshot({
    agents,
    contents: clone(SAMPLE_STATE_SNAPSHOT.contents || []),
    nodes: clone(SAMPLE_STATE_SNAPSHOT.graph?.nodes || []),
    relations: clone(SAMPLE_STATE_SNAPSHOT.graph?.relations || []),
  });
}

function loadStartupRecord(options = {}) {
  const filePath = resolveCandidatesFilePath(options.candidatesFilePath);
  if (startupCache.has(filePath)) {
    return startupCache.get(filePath);
  }

  const fileRecord = readCandidateFile(filePath);
  if (fileRecord?.candidates?.length) {
    const snapshot = buildSnapshotFromCandidates(fileRecord.candidates);
    const record = {
      source: "agent-state-candidates",
      filePath,
      exportedAt: fileRecord.exportedAt,
      snapshot,
    };
    startupCache.set(filePath, record);
    return record;
  }

  const fallbackRecord = {
    source: "sample-snapshot",
    filePath,
    exportedAt: null,
    snapshot: clone(SAMPLE_STATE_SNAPSHOT),
  };
  startupCache.set(filePath, fallbackRecord);
  return fallbackRecord;
}

export function loadAgentStartupStateSnapshot(options = {}) {
  return loadStartupRecord(options).snapshot;
}

export function loadAgentStartupStateMeta(options = {}) {
  const record = loadStartupRecord(options);
  return {
    source: record.source,
    filePath: record.filePath,
    exportedAt: record.exportedAt,
    agentCount: record.snapshot.agents.length,
  };
}

export function getAgentStartupTemplates(options = {}) {
  const snapshot = loadAgentStartupStateSnapshot(options);
  return snapshot.agents || [];
}
