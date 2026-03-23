import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
  createContentRecord,
} from "@ai-fashion-forum/shared-types";

import { createMockNormalizedContentBundle } from "./content-pipeline.js";

export const CHROMA_COLLECTION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "forum-seed-posts",
    description: "Forum-native seed posts used for replay realism and community baseline retrieval.",
    source_types: ["forum_post"],
  }),
  Object.freeze({
    id: "external-signals",
    description: "Normalized external articles and social posts used to inject outside taste signals.",
    source_types: ["external_article", "social_post"],
  }),
  Object.freeze({
    id: "scene-descriptions",
    description: "Image-description and scene-caption records used for visual-context retrieval.",
    source_types: ["image_description"],
  }),
]);

function clampScore(value) {
  return Math.max(0, Math.min(1, value));
}

function getCollectionIdForRecord(record) {
  const collection = CHROMA_COLLECTION_DEFINITIONS.find((definition) =>
    definition.source_types.includes(record.source_type),
  );

  return collection?.id || "unassigned";
}

function createDerivedRecord(baseRecord, index) {
  const cycle = Math.floor(index / 23) + 1;
  const popularityScore = 0.35 + ((index % 11) * 0.05);
  const controversySignal =
    baseRecord.emotions.includes("frustration") || baseRecord.emotions.includes("anxiety")
      ? 0.6
      : 0.18 + ((index % 4) * 0.1);
  const noveltyBucket = ["steady", "fresh", "resurfacing"][index % 3];

  return createContentRecord({
    ...baseRecord,
    content_id: `IDX-${String(index + 1).padStart(3, "0")}`,
    created_tick: index,
    title: `${baseRecord.title} / corpus cycle ${cycle}`,
    body: `${baseRecord.body} Indexed exposure corpus variant ${index + 1}.`,
    source_metadata: {
      ...baseRecord.source_metadata,
      derived_from: baseRecord.content_id,
      corpus_cycle: cycle,
      chroma_collection: getCollectionIdForRecord(baseRecord),
      popularity_score: clampScore(popularityScore),
      controversy_signal: clampScore(controversySignal),
      novelty_bucket: noveltyBucket,
    },
  });
}

function scoreCandidateForAgent(agentState, contentRecord, socialProofByTopic, recentTopics) {
  const topicWeights = contentRecord.topics.map((topic) => agentState.interest_vector[topic] || 0);
  const affinity =
    topicWeights.length > 0
      ? topicWeights.reduce((sum, weight) => sum + weight, 0) / topicWeights.length
      : 0;

  const repeatedTopicCount = contentRecord.topics.filter((topic) => recentTopics.has(topic)).length;
  const novelty = clampScore(
    0.55 +
      (contentRecord.source_metadata.novelty_bucket === "fresh" ? 0.2 : 0) -
      repeatedTopicCount * 0.12 +
      agentState.openness * 0.15,
  );

  const socialProof =
    contentRecord.topics.reduce(
      (sum, topic) => sum + (socialProofByTopic.get(topic) || 0),
      0,
    ) /
      Math.max(contentRecord.topics.length, 1) *
      0.55 +
    (contentRecord.source_metadata.popularity_score || 0) * 0.45;

  const controversy =
    (contentRecord.source_metadata.controversy_signal || 0) * agentState.conflict_tolerance;
  const controversyPenalty =
    (contentRecord.source_metadata.controversy_signal || 0) * (1 - agentState.conflict_tolerance);
  const calmSignal = contentRecord.emotions.some((emotion) =>
    ["calm", "warmth", "amusement", "empathy", "relief"].includes(emotion),
  )
    ? 0.16
    : 0;
  const frictionTopicBoost = contentRecord.topics.some((topic) =>
    ["pricing", "trend_fatigue", "forum_drama", "fit"].includes(topic),
  )
    ? 0.18
    : 0;

  const archetypeAdjustments = {
    quiet_observer: affinity * 0.08 + calmSignal - controversyPenalty * 0.22,
    trend_seeker:
      novelty * 0.15 +
      (["external_article", "social_post"].includes(contentRecord.source_type) ? 0.08 : 0),
    community_regular:
      socialProof * 0.08 + (contentRecord.source_type === "forum_post" ? 0.05 : 0),
    brand_loyalist:
      affinity * 0.05 +
      (contentRecord.topics.some((topic) => ["outerwear", "designer_labels", "status_signal"].includes(topic))
        ? 0.09
        : 0),
    contrarian_commenter: controversy * 0.24 + frictionTopicBoost,
    empathetic_responder:
      calmSignal +
      (contentRecord.format === "empathy_post" ? 0.12 : contentRecord.emotions.includes("empathy") ? 0.08 : 0),
  };

  const total =
    affinity * 0.38 +
    novelty * 0.24 +
    socialProof * 0.22 +
    controversy * 0.16 +
    calmSignal * 0.08 -
    controversyPenalty * 0.14 +
    (archetypeAdjustments[agentState.archetype] || 0);

  return {
    total: Number(total.toFixed(4)),
    affinity: Number(affinity.toFixed(4)),
    novelty: Number(novelty.toFixed(4)),
    social_proof: Number(socialProof.toFixed(4)),
    controversy: Number(controversy.toFixed(4)),
  };
}

export async function createIndexableContentCorpus({ targetCount = 120 } = {}) {
  const providerBundle = await createMockNormalizedContentBundle({
    startTick: SAMPLE_CONTENT_RECORDS.length,
  });
  const baseCorpus = [...SAMPLE_CONTENT_RECORDS, ...providerBundle.normalizedRecords];

  return Array.from({ length: targetCount }, (_, index) =>
    createDerivedRecord(baseCorpus[index % baseCorpus.length], index),
  );
}

export function buildChromaContentIndex(records) {
  const collectionMap = new Map(
    CHROMA_COLLECTION_DEFINITIONS.map((definition) => [definition.id, []]),
  );

  records.forEach((record) => {
    const collectionId = getCollectionIdForRecord(record);
    if (!collectionMap.has(collectionId)) {
      collectionMap.set(collectionId, []);
    }

    collectionMap.get(collectionId).push(record);
  });

  return {
    totalIndexed: records.length,
    collections: CHROMA_COLLECTION_DEFINITIONS.map((definition) => ({
      ...definition,
      count: collectionMap.get(definition.id)?.length || 0,
    })),
    records,
    collectionMap,
  };
}

export function generateCandidatePool({
  index,
  agentState,
  poolSize = 20,
  exposureHistory = [],
} = {}) {
  const socialProofByTopic = new Map();
  const recentTopics = new Set(exposureHistory.flatMap((record) => record.topics || []));

  index.records.forEach((record) => {
    record.topics.forEach((topic) => {
      socialProofByTopic.set(
        topic,
        (socialProofByTopic.get(topic) || 0) + (record.source_metadata.popularity_score || 0.1),
      );
    });
  });

  socialProofByTopic.forEach((value, topic) => {
    socialProofByTopic.set(topic, clampScore(value / index.totalIndexed));
  });

  const scoredRecords = index.records.map((record) => ({
    content_id: record.content_id,
    title: record.title,
    source_type: record.source_type,
    format: record.format,
    topics: record.topics,
    emotions: record.emotions,
    source_metadata: record.source_metadata,
    score_breakdown: scoreCandidateForAgent(
      agentState,
      record,
      socialProofByTopic,
      recentTopics,
    ),
  }));

  return scoredRecords
    .sort((left, right) => right.score_breakdown.total - left.score_breakdown.total)
    .slice(0, poolSize);
}

export function selectBiasedExposure({
  index,
  agentState,
  poolSize = 20,
  exposureHistory = [],
} = {}) {
  const candidatePool = generateCandidatePool({
    index,
    agentState,
    poolSize,
    exposureHistory,
  });
  const selected = candidatePool.slice(0, 5);

  return {
    agent_id: agentState.agent_id,
    poolSize,
    candidatePool,
    selected,
    exposureLog: selected.map((record, order) => ({
      rank: order + 1,
      content_id: record.content_id,
      reason: `Selected for ${agentState.handle} because affinity=${record.score_breakdown.affinity}, novelty=${record.score_breakdown.novelty}, social_proof=${record.score_breakdown.social_proof}, controversy=${record.score_breakdown.controversy}.`,
      score_breakdown: record.score_breakdown,
    })),
  };
}

export async function createExposureSample({
  agentId = "A01",
  poolSize = 20,
  targetCount = 120,
} = {}) {
  const corpus = await createIndexableContentCorpus({ targetCount });
  const index = buildChromaContentIndex(corpus);
  const agentState =
    SAMPLE_AGENT_STATES.find((candidate) => candidate.agent_id === agentId) ||
    SAMPLE_AGENT_STATES[0];

  return {
    collections: index.collections,
    totalIndexed: index.totalIndexed,
    exposure: selectBiasedExposure({
      index,
      agentState,
      poolSize,
    }),
  };
}
