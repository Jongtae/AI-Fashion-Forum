import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
  createContentRecord,
} from "@ai-fashion-forum/shared-types";

import {
  createMockNormalizedContentBundle,
  createSprint1StarterPackBundle,
} from "./content-pipeline.js";

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

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
      reason: `${agentState.handle}에게 ${record.content_id}를 선택했다. affinity=${record.score_breakdown.affinity}, novelty=${record.score_breakdown.novelty}, social_proof=${record.score_breakdown.social_proof}, controversy=${record.score_breakdown.controversy}.`,
      score_breakdown: record.score_breakdown,
    })),
  };
}

function getSprint1MutableState(agentState) {
  return agentState.mutable_state || {
    current_interests: agentState.interest_vector || {},
    current_beliefs: agentState.belief_vector || {},
    attention_bias: {},
    affect_state: {},
    stance_markers: [],
  };
}

function getSprint1SeedProfile(agentState) {
  return agentState.seed_profile || {
    emotional_bias: {},
    value_seeds: {},
    voice_notes: [],
  };
}

function resolveValueSeed(agentState, key) {
  const mutableState = getSprint1MutableState(agentState);
  const seedProfile = getSprint1SeedProfile(agentState);
  const aliases = {
    care: ["care-over-performance"],
    soft_routine: ["daily-utility"],
    community: ["gentle-feedback-works"],
    practicality: ["daily-utility", "fit-before-brand"],
    repeatability: ["daily-utility"],
    fairness: ["hype-obscures-tradeoffs"],
    skepticism: ["hype-obscures-tradeoffs"],
    novelty: ["novelty-has-value", "signal-before-consensus"],
    signal: ["signal-before-consensus", "novelty-has-value"],
    warmth: ["care-over-performance"],
    home_life: ["care-over-performance"],
    companionship: ["care-over-performance"],
    comfort: ["texture-matters", "daily-utility"],
    quality: ["texture-matters"],
  };
  const candidates = [key, ...(aliases[key] || [])];

  for (const candidate of candidates) {
    const value =
      mutableState.current_beliefs?.[candidate] ??
      seedProfile.value_seeds?.[candidate];

    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
}

function scoreTagAlignment(agentState, record) {
  const mutableState = getSprint1MutableState(agentState);
  const seedProfile = getSprint1SeedProfile(agentState);
  const tags = record.source_metadata?.exposure_tags || {};

  const interestPull = average(
    record.topics.map((topic) => mutableState.current_interests?.[topic] || agentState.interest_vector?.[topic] || 0),
  );

  const valuePull = average(
    (tags.value_axes || []).map((key) => resolveValueSeed(agentState, key)),
  );

  const audiencePull = average(
    (tags.audience_lenses || []).map((key) => mutableState.attention_bias?.[key] || 0),
  );

  const emotionalPull = average(
    record.emotions.map((emotion) => seedProfile.emotional_bias?.[emotion] || mutableState.affect_state?.[emotion] || 0),
  );

  const tensionPull = average(
    (tags.tension_axes || []).map((axis) => {
      if (axis.includes("price") || axis.includes("tradeoff")) {
        return mutableState.current_beliefs?.["hype-obscures-tradeoffs"] || 0;
      }

      if (axis.includes("care")) {
        return mutableState.current_beliefs?.["care-over-performance"] || 0;
      }

      if (axis.includes("novelty") || axis.includes("freshness")) {
        return mutableState.current_beliefs?.["novelty-has-value"] || 0;
      }

      return 0;
    }),
  );

  return {
    interest_pull: Number(interestPull.toFixed(4)),
    value_pull: Number(valuePull.toFixed(4)),
    audience_pull: Number(audiencePull.toFixed(4)),
    emotional_pull: Number(emotionalPull.toFixed(4)),
    tension_pull: Number(tensionPull.toFixed(4)),
  };
}

function scoreSprint1CandidateForAgent(agentState, contentRecord) {
  const base = scoreCandidateForAgent(agentState, contentRecord, new Map(), new Set());
  const tagAlignment = scoreTagAlignment(agentState, contentRecord);

  const total = clampScore(
    base.total * 0.52 +
      tagAlignment.interest_pull * 0.18 +
      tagAlignment.value_pull * 0.12 +
      tagAlignment.audience_pull * 0.08 +
      tagAlignment.emotional_pull * 0.05 +
      tagAlignment.tension_pull * 0.05,
  );

  return {
    total: Number(total.toFixed(4)),
    base,
    tag_alignment: tagAlignment,
  };
}

function deriveDominantFeeling(agentState, record, sprintScore) {
  const emotions = new Set(record.emotions || []);
  const mutableState = getSprint1MutableState(agentState);

  if (emotions.has("warmth") || emotions.has("amusement")) {
    return "softened_interest";
  }

  if (emotions.has("frustration") || sprintScore.tag_alignment.tension_pull > 0.65) {
    return "irritated_attention";
  }

  if ((mutableState.current_traits?.novelty_drive || 0) > 0.7) {
    return "novelty_activation";
  }

  if (emotions.has("curiosity") || emotions.has("interest")) {
    return "curious_attention";
  }

  return "measured_interest";
}

function deriveMeaningFrame(agentState, record) {
  const mutableState = getSprint1MutableState(agentState);
  const traits = mutableState.current_traits || {};
  const topics = record.topics || [];
  const tags = record.source_metadata?.exposure_tags || {};
  const hasPricing = topics.includes("pricing");
  const hasCare = topics.some((topic) => ["care", "cats", "dogs", "daily_life", "pet_episode"].includes(topic));
  const hasUtility = topics.some((topic) => ["office_style", "utility", "daily_utility", "mirror", "entryway", "repeat_wear"].includes(topic));
  const noveltyAllowed =
    tags.novelty_level === "high" ||
    tags.novelty_level === "medium" ||
    topics.some((topic) => ["novelty", "signal", "trend_shift", "brand_signal"].includes(topic));

  if (hasPricing && (traits.skepticism || 0) >= Math.max(traits.care_drive || 0, traits.novelty_drive || 0)) {
    return "tradeoff_filter";
  }

  if (hasCare && (traits.care_drive || 0) >= Math.max(traits.novelty_drive || 0, traits.skepticism || 0)) {
    return "care_context";
  }

  if ((mutableState.current_traits?.novelty_drive || 0) > 0.7 && noveltyAllowed) {
    return "signal_filter";
  }

  if (hasUtility) {
    return "practicality_filter";
  }

  return "context_filter";
}

function deriveStanceSignal(agentState, record, meaningFrame) {
  if (meaningFrame === "tradeoff_filter") {
    return "skeptical";
  }

  if (meaningFrame === "care_context") {
    return "empathetic";
  }

  if (meaningFrame === "signal_filter") {
    return "amplify";
  }

  if ((record.topics || []).includes("mirror") || (record.topics || []).includes("entryway")) {
    return "practical";
  }

  return agentState.archetype === "quiet_observer" ? "reserved" : "observant";
}

export function createSprint1ReactionRecord({
  agentState,
  contentRecord,
  sprintScore,
  rank,
} = {}) {
  const dominantFeeling = deriveDominantFeeling(agentState, contentRecord, sprintScore);
  const meaningFrame = deriveMeaningFrame(agentState, contentRecord);
  const stanceSignal = deriveStanceSignal(agentState, contentRecord, meaningFrame);
  const resonanceScore = clampScore(
    sprintScore.total * 0.7 +
      sprintScore.tag_alignment.emotional_pull * 0.15 +
      sprintScore.tag_alignment.value_pull * 0.15,
  );
  const shouldWrite = resonanceScore >= 0.25;

  return {
    reaction_id: `react:${agentState.agent_id}:${contentRecord.content_id}`,
    agent_id: agentState.agent_id,
    content_id: contentRecord.content_id,
    rank,
    dominant_feeling: dominantFeeling,
    meaning_frame: meaningFrame,
    stance_signal: stanceSignal,
    resonance_score: Number(resonanceScore.toFixed(4)),
    memory_write_hint: {
      should_write: shouldWrite,
      salience: resonanceScore >= 0.7 ? "high" : resonanceScore >= 0.25 ? "medium" : "low",
      narrative_hint:
        meaningFrame === "care_context"
          ? "이 반응은 돌봄과 일상 문맥이 포럼에서 중요하다는 신호로 읽혔다."
          : meaningFrame === "tradeoff_filter"
            ? "같은 세계를 트레이드오프 중심으로 읽게 만드는 반응이었다."
            : meaningFrame === "signal_filter"
              ? "새로움이 사람들 사이의 차이를 더 또렷하게 만든다는 감각을 강화했다."
              : "같은 세계를 다시 실용적으로 읽게 하는 또 하나의 계기였다.",
    },
    explanation: `rank=${rank} because total=${sprintScore.total}, feeling=${dominantFeeling}, frame=${meaningFrame}, stance=${stanceSignal}.`,
    score_breakdown: sprintScore,
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

export async function createSprint1ExposureSample({
  agentId = "S01",
  poolSize = 9,
} = {}) {
  const starterPack = await createSprint1StarterPackBundle({
    startTick: 0,
  });
  const index = buildChromaContentIndex(starterPack.normalizedRecords);
  const agentState =
    SAMPLE_AGENT_STATES.find((candidate) => candidate.agent_id === agentId) ||
    SAMPLE_AGENT_STATES[0];

  const candidatePool = starterPack.normalizedRecords
    .map((record) => ({
      content_id: record.content_id,
      title: record.title,
      source_type: record.source_type,
      format: record.format,
      topics: record.topics,
      emotions: record.emotions,
      source_metadata: record.source_metadata,
      score_breakdown: scoreSprint1CandidateForAgent(agentState, record),
    }))
    .sort((left, right) => right.score_breakdown.total - left.score_breakdown.total)
    .slice(0, poolSize);

  const selected = candidatePool.slice(0, Math.min(4, candidatePool.length));
  const reaction_records = selected.map((record, index) =>
    createSprint1ReactionRecord({
      agentState,
      contentRecord: record,
      sprintScore: record.score_breakdown,
      rank: index + 1,
    }),
  );

  return {
    provider_id: starterPack.provider_id,
    raw_count: starterPack.raw_count,
    normalized_count: starterPack.normalized_count,
    collections: index.collections,
    exposure: {
      agent_id: agentState.agent_id,
      poolSize,
      candidatePool,
      selected,
      exposureLog: selected.map((record, order) => ({
        rank: order + 1,
        content_id: record.content_id,
        reason: `Sprint 1 노출 후보로 선택했다. total=${record.score_breakdown.total}, interest_pull=${record.score_breakdown.tag_alignment.interest_pull}, value_pull=${record.score_breakdown.tag_alignment.value_pull}, audience_pull=${record.score_breakdown.tag_alignment.audience_pull}.`,
        score_breakdown: record.score_breakdown,
      })),
    },
    reaction_records,
  };
}

export async function createSprint1SharedStimulusSample({
  contentId = "normalized:sprint1-curated-pack:social-argument-001",
  agentIds = ["S01", "S02", "S03"],
} = {}) {
  const starterPack = await createSprint1StarterPackBundle({
    startTick: 0,
  });
  const contentRecord =
    starterPack.normalizedRecords.find((record) => record.content_id === contentId) ||
    starterPack.normalizedRecords[0];
  const agents = SAMPLE_AGENT_STATES.filter((agent) => agentIds.includes(agent.agent_id));

  return {
    content: contentRecord,
    reactions: agents.map((agentState, index) => {
      const score = scoreSprint1CandidateForAgent(agentState, contentRecord);
      return createSprint1ReactionRecord({
        agentState,
        contentRecord,
        sprintScore: score,
        rank: index + 1,
      });
    }),
  };
}
