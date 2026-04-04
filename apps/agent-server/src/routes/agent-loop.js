import { Router } from "express";
import {
  runTicks,
  createBaselineWorldRules,
  createLivePostDraft,
  createLiveCommentDraft,
  serializeTickState,
  evaluateRoundHeuristic,
} from "@ai-fashion-forum/agent-core";
import {
  applyCharacterOverridesToState,
  createActionExecutionResult,
  createIngestionEnvelope,
  createPersistedAgentSnapshot,
  ensureStateCharacterContracts,
  getActionVisibility,
  resolveAuthorIdentity,
} from "@ai-fashion-forum/shared-types";
import {
  agentToMutableAxes,
  agentToSeedAxes,
  createSpawnedAgentState,
} from "../lib/agent-state.js";
import { loadAgentStartupStateSnapshot } from "../lib/agent-startup-state.js";
import {
  buildPopulationGrowthPlan,
  DEFAULT_INITIAL_AGENT_COUNT,
} from "../lib/population-growth.js";
import { getForumWritebackMode, shouldWriteForumArtifacts } from "../lib/forum-writeback.js";
import { AgentState } from "../models/AgentState.js";
import { ActionTrace } from "../models/ActionTrace.js";
import { SimEvent } from "../models/SimEvent.js";
import { StoredAction } from "../models/StoredAction.js";
import { SimCheckpoint } from "../models/SimCheckpoint.js";

const router = Router();

const FORUM_SERVER_URL = process.env.FORUM_SERVER_URL || "http://localhost:4000";
// LLM provider config — Claude by default, OpenAI backward compat preserved
const LLM_PROVIDER = process.env.LLM_PROVIDER || "claude";
const LLM_SIMULATION_ENABLED =
  process.env.LLM_SIMULATION_ENABLED === "true" ||
  process.env.OPENAI_SIMULATION_ENABLED === "true";
const SIMULATION_LLM_API_KEY = LLM_SIMULATION_ENABLED
  ? (LLM_PROVIDER === "claude"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY) || ""
  : "";

const CHECKPOINT_INTERVAL = Math.max(1, Number(process.env.CHECKPOINT_INTERVAL) || 5);

const KO_TOPIC_LABELS = {
  style: "스타일",
  fashion: "패션",
  fit: "핏",
  brand: "브랜드",
  color: "색감",
  outerwear: "아우터",
  layering: "레이어링",
  office: "오피스",
  commute: "출퇴근",
  pricing: "가격",
  trend_fatigue: "트렌드 피로",
  forum_drama: "포럼 이슈",
  status_signal: "상태 신호",
  designer_labels: "디자이너 라벨",
};

function localizeTopicLabel(value) {
  if (!value) {
    return "일반";
  }

  return KO_TOPIC_LABELS[value] || value.replace(/_/g, " ");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function hasFinalConsonant(word = "") {
  const text = normalizeText(word);
  if (!text) {
    return false;
  }

  const lastChar = text[text.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    return false;
  }

  return (code - 0xac00) % 28 !== 0;
}

function normalizeKoreanParticlePairs(text = "") {
  return normalizeText(text).replace(
    /([A-Za-z0-9가-힣]+)(은\(는\)|는\(은\)|이\(가\)|가\(이\)|을\(를\)|를\(을\)|과\(와\)|와\(과\)|으로\(로\)|로\(으로\))/g,
    (_, word, pair) => {
      const hasBatchim = hasFinalConsonant(word);
      const resolved = {
        "은(는)": hasBatchim ? "은" : "는",
        "는(은)": hasBatchim ? "은" : "는",
        "이(가)": hasBatchim ? "이" : "가",
        "가(이)": hasBatchim ? "이" : "가",
        "을(를)": hasBatchim ? "을" : "를",
        "를(을)": hasBatchim ? "을" : "를",
        "과(와)": hasBatchim ? "과" : "와",
        "와(과)": hasBatchim ? "과" : "와",
        "으로(로)": hasBatchim ? "으로" : "로",
        "로(으로)": hasBatchim ? "으로" : "로",
      }[pair];
      return `${word}${resolved || ""}`;
    }
  );
}

function sanitizeAgentText(value) {
  return normalizeKoreanParticlePairs(value)
    .replace(/이 에이전트가/g, "")
    .replace(/현재 주제 흐름/g, "")
    .replace(/\b이 사람이\b/g, "저는")
    .replace(/\b이 사람은\b/g, "저는")
    .replace(/\s+/g, " ")
    .trim();
}

function buildKoreanTargetContent({ agent, entry }) {
  const interestTopics = agent?.interest_vector ? Object.keys(agent.interest_vector).slice(0, 3) : [];
  const localizedTopics = interestTopics.length
    ? [...new Set(interestTopics.map(localizeTopicLabel))]
    : ["스타일", "코디"];
  const reasonText = sanitizeAgentText(entry?.reason) || "이번 신호를 다시 읽어봤다.";
  const primaryTopic = localizedTopics[0] || "스타일";
  const secondaryTopic = localizedTopics[1] || localizedTopics[0] || "코디";
  const tertiaryTopic = localizedTopics[2] || secondaryTopic;
  const titleVariants = [
    `${primaryTopic} 흐름을 다시 읽는 중`,
    `${primaryTopic}와 ${secondaryTopic}를 같이 본 메모`,
    `${primaryTopic}를 읽고 남긴 짧은 메모`,
    `오늘의 ${primaryTopic} 관찰`,
    `${primaryTopic}와 ${tertiaryTopic} 사이에서 보인 차이`,
  ];
  const bodyVariants = [
    reasonText || `${primaryTopic}와 ${secondaryTopic}를 함께 놓고 다시 봤다.`,
    `${primaryTopic}를 먼저 보고 나서 ${secondaryTopic}까지 이어서 읽어봤다.`,
    `${secondaryTopic} 쪽 신호도 같이 보니까 판단이 조금 달라졌다.`,
    `${primaryTopic}만 볼 때와 ${primaryTopic} + ${tertiaryTopic}를 같이 볼 때의 느낌이 다르다.`,
    `${reasonText} ${primaryTopic} 중심으로 다시 정리해둔다.`,
  ];
  const titleSeed = stringSeed(agent?.agent_id, entry?.action_id, entry?.reason, "title");
  const bodySeed = stringSeed(agent?.agent_id, entry?.action_id, entry?.reason, "body");

  return {
    title: titleVariants[Math.abs(titleSeed) % titleVariants.length],
    body: bodyVariants[Math.abs(bodySeed) % bodyVariants.length],
    topics: localizedTopics,
    emotions: ["호기심"],
  };
}

function stringSeed(...parts) {
  return parts
    .filter(Boolean)
    .join(":")
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

// ── Forum server HTTP client ──────────────────────────────────────────────────

async function forumPost(path, body) {
  const res = await fetch(`${FORUM_SERVER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(`forum-server ${path} failed: ${err.error || res.status}`);
    error.status = res.status;
    error.payload = err;
    throw error;
  }
  return res.json();
}

async function forumGet(path) {
  const res = await fetch(`${FORUM_SERVER_URL}${path}`);
  if (!res.ok) return null;
  return res.json();
}

// ── In-memory world state between ticks ──────────────────────────────────────

let currentWorld = null;
let currentRound = 0;
const recentDraftTexts = [];

function buildInitialState() {
  const startupSnapshot = loadAgentStartupStateSnapshot();
  return {
    ...ensureStateCharacterContracts(JSON.parse(JSON.stringify(startupSnapshot))),
    simulationTick: 0,
  };
}

// ── POST /api/agent-loop/tick ─────────────────────────────────────────────────
// Run N agent ticks. Posts/comments are created via forum-server API.

router.post("/tick", async (req, res) => {
  const requestedTicks = Math.min(20, Math.max(1, parseInt(req.body?.ticks) || 1));
  const speed = Math.min(10, Math.max(1, parseInt(req.body?.speed) || 1));
  const ticks = Math.min(50, requestedTicks * speed);
  const seed = parseInt(req.body?.seed) || Date.now() % 100000;
  const characterOverrides = req.body?.character_overrides || [];

  if (!currentWorld) {
    currentWorld = buildInitialState();
  }

  const round = currentRound + 1;
  const simulationTickBase = currentWorld?.simulationTick || 0;
  const seededWorld = ensureStateCharacterContracts(JSON.parse(JSON.stringify(currentWorld)));
  const { state: worldWithCharacters, appliedOverrides } = applyCharacterOverridesToState(
    seededWorld,
    characterOverrides
  );

  const result = runTicks({
    seed,
    tickCount: ticks,
    initialState: worldWithCharacters,
    worldRules: createBaselineWorldRules(),
    spawnAgent: ({ world, tick: currentTick }) => {
      const growthPlan = buildPopulationGrowthPlan({
        currentCount: world.state.agents.length,
        elapsedTicks: simulationTickBase + currentTick,
        initialCount: DEFAULT_INITIAL_AGENT_COUNT,
      });

      if (!growthPlan.shouldSpawn) {
        return null;
      }

      return createSpawnedAgentState({
        existingAgents: world.state.agents,
        seed,
        round,
        tick: simulationTickBase + currentTick,
        spawnIndex: world.state.agents.length - DEFAULT_INITIAL_AGENT_COUNT,
      });
    },
  });

  currentRound = round;
  const latestEntryByAgent = new Map();
  const agentById = new Map(
    (result.finalState?.agents || worldWithCharacters.agents || []).map((agent) => [
      agent.agent_id,
      agent,
    ])
  );
  const characterByAgent = new Map(
    (result.finalState?.agents || worldWithCharacters.agents || []).map((agent) => [
      agent.agent_id,
      agent.character_contract || null,
    ])
  );

  // ── Create posts and comments via forum-server API ────────────────────────
  const createdPosts = [];
  const createdComments = [];
  const artifactResults = new Map();
  const ingestionByActionId = new Map();
  const writebackMode = getForumWritebackMode();
  const writeForumArtifacts = shouldWriteForumArtifacts();

  for (const entry of result.entries) {
    const ingestionEnvelope = createIngestionEnvelope({
      ingestion_id: `ING:${entry.actor_id}:${round}:${entry.tick}:${entry.action}`,
      source_family: "internal_forum",
      source_type: "forum_post",
      content_id: entry.target_content_id || `simulated:${entry.action_id}`,
      title: entry.reason || `${entry.action} action`,
      body: entry.reason || "",
      topics: ["simulated_action"],
      emotions: entry.action === "react" ? ["curiosity"] : [],
      created_tick: entry.tick,
      metadata: {
        simulated: true,
        action_type: entry.action,
      },
    });
    ingestionByActionId.set(entry.action_id, ingestionEnvelope);

    latestEntryByAgent.set(entry.actor_id, entry);
    const agent =
      (result.finalState?.agents || worldWithCharacters.agents || []).find(
        (a) => a.agent_id === entry.actor_id
      ) || resolveAuthorIdentity({ authorId: entry.actor_id, authorType: "agent" });

    if (entry.action === "post") {
      let content;
      try {
        const targetContent = buildKoreanTargetContent({ agent, entry });
          const draft = await createLivePostDraft({
            agent,
            targetContent,
            sourceSignal: sanitizeAgentText(entry.reason || `${entry.action} at tick ${entry.tick}`),
            styleProfile: agent?.seed_profile?.comment_style || null,
            emotionProfile: {
              ...((agent?.seed_profile?.emotional_bias || agent?.seed_profile?.emotion_bias || {})),
              ...(agent?.mutable_state?.affect_state?.emotional_bias || {}),
              dominantEmotion:
                agent?.mutable_state?.affect_state?.emotion_signature?.dominantEmotion ||
                agent?.seed_profile?.emotion_signature?.dominantEmotion ||
                entry?.dominant_feeling ||
                targetContent?.emotions?.[0] ||
                null,
              secondaryEmotion:
                agent?.mutable_state?.affect_state?.emotion_signature?.secondaryEmotion ||
                agent?.seed_profile?.emotion_signature?.secondaryEmotion ||
                entry?.stance_signal ||
                null,
            },
            comparisonTexts: [
              ...recentDraftTexts.slice(-8),
              targetContent?.title || "",
            targetContent?.body || "",
            ...(targetContent?.topics || []),
            entry.reason || "",
          ].filter(Boolean),
          variationSeed: seed + round + entry.tick,
          provider: LLM_PROVIDER,
          apiKey: SIMULATION_LLM_API_KEY,
        });
        content = draft.content || entry.reason || "새 글을 올렸다.";
        if (content) {
          recentDraftTexts.push(content);
        }
        artifactResults.set(entry.action_id, {
          artifactId: null,
          artifactType: "post",
          generationContext: draft.generationContext,
        });
      } catch {
        content = entry.reason || "새 글을 올렸다.";
      }

      if (!writeForumArtifacts) {
        artifactResults.set(entry.action_id, {
          executionStatus: "blocked",
          blockReason: "forum_writeback_disabled",
          artifactType: "post",
          generationContext: artifactResults.get(entry.action_id)?.generationContext ?? null,
        });
        continue;
      }

      try {
        const post = await forumPost("/api/posts", {
          title: draft.title || null,
          content,
          authorId: entry.actor_id,
          authorType: "agent",
          authorDisplayName: agent.display_name || agent.displayName || agent.handle || entry.actor_id,
          authorHandle: agent.handle || agent.display_name || entry.actor_id,
          authorAvatarUrl: agent.avatar_url || agent.avatarUrl || "",
          authorLocale: agent.avatar_locale || agent.avatarLocale || "",
          tags: agent.interest_vector ? Object.keys(agent.interest_vector).slice(0, 3) : [],
          agentRound: round,
          agentTick: entry.tick,
          generationContext: artifactResults.get(entry.action_id)?.generationContext ?? null,
        });
        createdPosts.push(post);
        artifactResults.set(entry.action_id, {
          artifactId: post._id.toString(),
          artifactType: "post",
          generationContext: artifactResults.get(entry.action_id)?.generationContext ?? null,
        });
      } catch (err) {
        if (err.status === 429) {
          artifactResults.set(entry.action_id, {
            executionStatus: "blocked",
            blockReason: "agent_write_rate_limited",
          });
          continue;
        }

        console.warn("[agent-loop] post creation failed:", err.message);
        artifactResults.set(entry.action_id, {
          errorClass: "forum_post_failed",
          executionStatus: "failed",
        });
      }
    } else if (entry.action === "comment") {
      // Find a recent agent post to comment on via forum-server
      try {
        const feedResult = await forumGet("/api/posts?limit=5&authorType=agent");
        const recentPosts = Array.isArray(feedResult?.posts) ? feedResult.posts : [];
        const recentPost = recentPosts.length
          ? recentPosts[(seed + round + entry.tick) % recentPosts.length]
          : null;
        if (recentPost) {
          const recentComments = await forumGet(`/api/posts/${recentPost._id}/comments`);
          const eligibleComments = (Array.isArray(recentComments) ? recentComments : []).filter(
            (comment) => comment.authorId !== entry.actor_id
          );
          const comparisonTexts = [
            ...recentDraftTexts.slice(-8),
            ...recentPosts.flatMap((post) => [post.title || "", post.content || ""]),
            ...eligibleComments.map((comment) => comment.content || ""),
            recentPost.title || "",
            recentPost.content || "",
          ].filter(Boolean);
          const replyTargetComment =
            eligibleComments.length > 0
              ? eligibleComments[(seed + round + entry.tick) % eligibleComments.length]
              : null;
          const draft = await createLiveCommentDraft({
            agent,
            targetContent: {
              title: recentPost.title || "최근 글",
              body: recentPost.content || "",
              topics: (recentPost.tags || []).map(localizeTopicLabel),
            },
            targetComment: replyTargetComment,
            sourceSignal: sanitizeAgentText(entry.reason || `${entry.action} at tick ${entry.tick}`),
            styleProfile: agent?.seed_profile?.comment_style || null,
            emotionProfile: {
              ...((agent?.seed_profile?.emotional_bias || agent?.seed_profile?.emotion_bias || {})),
              ...(agent?.mutable_state?.affect_state?.emotional_bias || {}),
              dominantEmotion:
                agent?.mutable_state?.affect_state?.emotion_signature?.dominantEmotion ||
                agent?.seed_profile?.emotion_signature?.dominantEmotion ||
                entry?.dominant_feeling ||
                replyTargetComment?.emotions?.[0] ||
                null,
              secondaryEmotion:
                agent?.mutable_state?.affect_state?.emotion_signature?.secondaryEmotion ||
                agent?.seed_profile?.emotion_signature?.secondaryEmotion ||
                entry?.stance_signal ||
                null,
            },
            comparisonTexts,
            variationSeed:
              seed +
              round +
              entry.tick +
              stringSeed(entry.actor_id, recentPost._id, replyTargetComment?._id || "post"),
            provider: LLM_PROVIDER,
          apiKey: SIMULATION_LLM_API_KEY,
          });
          const replyPayload = {
            content:
              draft.content || entry.reason || "짧게 답을 남겼다.",
            authorId: entry.actor_id,
            authorType: "agent",
            authorDisplayName: agent.display_name || agent.displayName || agent.handle || entry.actor_id,
            authorHandle: agent.handle || agent.display_name || entry.actor_id,
            authorAvatarUrl: agent.avatar_url || agent.avatarUrl || "",
            authorLocale: agent.avatar_locale || agent.avatarLocale || "",
            agentRound: round,
            agentTick: entry.tick,
            generationContext: draft.generationContext ?? null,
          };

          if (replyTargetComment) {
            replyPayload.replyToCommentId = replyTargetComment._id.toString();
            replyPayload.replyTargetType = "comment";
            replyPayload.replyTargetId = replyTargetComment._id.toString();
            replyPayload.replyTargetAuthorId = replyTargetComment.authorId;
            replyPayload.replyTargetPreview = replyTargetComment.content?.slice(0, 180) || "";
          } else {
            replyPayload.replyTargetType = "post";
            replyPayload.replyTargetId = recentPost._id.toString();
            replyPayload.replyTargetAuthorId = recentPost.authorId;
            replyPayload.replyTargetPreview = recentPost.content?.slice(0, 180) || "";
          }

          if (draft.content) {
            recentDraftTexts.push(draft.content);
          }
          if (!writeForumArtifacts) {
            artifactResults.set(entry.action_id, {
              executionStatus: "blocked",
              blockReason: "forum_writeback_disabled",
              artifactType: "comment",
            });
            continue;
          }

          const comment = await forumPost(`/api/posts/${recentPost._id}/comments`, replyPayload);
          createdComments.push(comment);
          artifactResults.set(entry.action_id, {
            artifactId: comment._id.toString(),
            artifactType: "comment",
          });
        } else {
          artifactResults.set(entry.action_id, {
            executionStatus: "degraded",
            blockReason: "missing_target_post",
          });
        }
      } catch (err) {
        if (err.status === 429) {
          artifactResults.set(entry.action_id, {
            executionStatus: "blocked",
            blockReason: "agent_write_rate_limited",
          });
          continue;
        }

        console.warn("[agent-loop] comment creation failed:", err.message);
        artifactResults.set(entry.action_id, {
          errorClass: "forum_comment_failed",
          executionStatus: "failed",
        });
      }
    }
  }

  // ── Persist ActionTrace records ───────────────────────────────────────────
  const traceDocs = result.entries.map((entry, i) => {
    const artifactResult = artifactResults.get(entry.action_id) || {};
    const execution = createActionExecutionResult({
      action_id: entry.action_id || `ACT:${entry.actor_id}:${entry.tick}:${entry.action}:${i}`,
      agent_id: entry.actor_id,
      tick: entry.tick,
      round,
      action_type: entry.action,
      visibility: entry.visibility || getActionVisibility(entry.action),
      target_content_id: entry.target_content_id ?? null,
      execution_status: artifactResult.executionStatus || "success",
      block_reason: artifactResult.blockReason || null,
      error_class: artifactResult.errorClass || null,
      artifact_refs: {
        artifact_id: artifactResult.artifactId || null,
        artifact_type: artifactResult.artifactType || null,
      },
      persistence: {
        trace_written: true,
        event_written: true,
        artifact_written: Boolean(artifactResult.artifactId),
        snapshot_written: false,
      },
      payload: entry,
    });

    return {
      actionId: execution.action_id,
      agentId: execution.agent_id,
      tick: execution.tick,
      round: execution.round,
      actionType: execution.action_type,
      visibility: execution.visibility,
      characterContractId:
        characterByAgent.get(execution.agent_id)?.character_contract_id || null,
      appliedCharacter: characterByAgent.get(execution.agent_id)?.summary || null,
      ingestionId: ingestionByActionId.get(execution.action_id)?.ingestion_id || null,
      sourceFamily: ingestionByActionId.get(execution.action_id)?.source_family || null,
      sourceType: ingestionByActionId.get(execution.action_id)?.source_type || null,
      executionStatus: execution.execution_status,
      blockReason: execution.block_reason,
      errorClass: execution.error_class,
      targetContentId: execution.target_content_id,
      payload: execution.payload,
      persistence: execution.persistence,
      artifactId: execution.artifact_refs.artifact_id,
      artifactType: execution.artifact_refs.artifact_type,
    };
  });

  const storedActionDocs = traceDocs.map((traceDoc) => ({
    actionId: traceDoc.actionId,
    agentId: traceDoc.agentId,
    round: traceDoc.round,
    tick: traceDoc.tick,
    actionType: traceDoc.actionType,
    visibility: traceDoc.visibility,
    executionStatus: traceDoc.executionStatus,
    characterContractId: traceDoc.characterContractId,
    appliedCharacter: traceDoc.appliedCharacter,
    ingestionId: traceDoc.ingestionId,
    sourceFamily: traceDoc.sourceFamily,
    sourceType: traceDoc.sourceType,
    targetContentId: traceDoc.targetContentId,
    artifactId: traceDoc.artifactId,
    artifactType: traceDoc.artifactType,
    persistence: traceDoc.persistence,
    payload: traceDoc.payload,
  }));

  if (traceDocs.length > 0) {
    await ActionTrace.insertMany(traceDocs, { ordered: false }).catch(() => {});
    await StoredAction.insertMany(storedActionDocs, { ordered: false }).catch(() => {});
  }

  // ── Emit SimEvents ────────────────────────────────────────────────────────
  const simEvents = [
    {
      eventType: "agent_tick_start",
      round,
      tick: 0,
      payload: {
        seed,
        ticks,
        characterOverridesApplied: appliedOverrides,
      },
    },
    { eventType: "agent_tick_end", round, tick: result.tickCount, payload: { postsCreated: createdPosts.length } },
    ...result.entries.map((entry) => ({
      eventType: `action_${entry.action}`,
      agentId: entry.actor_id,
      round,
      tick: entry.tick,
      actionId: entry.action_id,
      executionStatus: traceDocs.find((traceDoc) => traceDoc.actionId === entry.action_id)?.executionStatus || "success",
      ingestionId: ingestionByActionId.get(entry.action_id)?.ingestion_id || null,
      payload: entry,
      relatedId:
        traceDocs.find((traceDoc) => traceDoc.actionId === entry.action_id)?.artifactId ||
        entry.action_id,
      relatedType:
        traceDocs.find((traceDoc) => traceDoc.actionId === entry.action_id)?.artifactType ||
        "action",
    })),
  ];
  await SimEvent.insertMany(simEvents).catch(() => {});

  // ── Persist AgentState snapshots ──────────────────────────────────────────
  const finalSnapshot = result.snapshots[result.snapshots.length - 1];
  if (finalSnapshot?.agents) {
    for (const agent of finalSnapshot.agents) {
      const latestEntry = latestEntryByAgent.get(agent.agent_id) || null;
      const persistedSnapshot = createPersistedAgentSnapshot({
        snapshot_id: `SNAP:${agent.agent_id}:${round}:${result.tickCount}`,
        agent_id: agent.agent_id,
        round,
        tick: result.tickCount,
        source_action_id: latestEntry?.action_id || null,
        execution_status: "success",
        writeback_ids: [],
        exposure_summary: latestEntry
          ? {
              action_type: latestEntry.action,
              reason: latestEntry.reason,
              target_content_id: latestEntry.target_content_id || null,
              ingestion_id: ingestionByActionId.get(latestEntry.action_id)?.ingestion_id || null,
            }
          : {},
        reaction_summary: latestEntry?.action === "react" ? { lastReactionActionId: latestEntry.action_id } : {},
        memory_writebacks: [],
        raw_snapshot: agent,
      });

      await AgentState.findOneAndUpdate(
        { agentId: agent.agent_id, round },
        {
          $set: {
            snapshotId: persistedSnapshot.snapshot_id,
            agentId: agent.agent_id,
            round,
            tick: result.tickCount,
            sourceActionId: persistedSnapshot.source_action_id,
            characterContractId: agent.character_contract?.character_contract_id || null,
            appliedCharacter: agent.character_contract?.summary || null,
            executionStatus: persistedSnapshot.execution_status,
            writebackIds: persistedSnapshot.writeback_ids,
            seedAxes: agentToSeedAxes(agent),
            mutableAxes: agentToMutableAxes(agent),
            archetype: agent.archetype,
            selfNarratives: agent.self_narrative ?? [],
            exposureSummary: persistedSnapshot.exposure_summary,
            reactionSummary: persistedSnapshot.reaction_summary,
            memoryWritebacks: persistedSnapshot.memory_writebacks,
            rawSnapshot: persistedSnapshot.raw_snapshot,
          },
        },
        { upsert: true }
      );
    }
  }

  currentWorld = {
    ...(finalSnapshot || {}),
    simulationTick: simulationTickBase + result.tickCount,
  };

  const growthPlan = buildPopulationGrowthPlan({
    currentCount: currentWorld?.agents?.length ?? 0,
    elapsedTicks: currentWorld?.simulationTick ?? 0,
    initialCount: DEFAULT_INITIAL_AGENT_COUNT,
  });

  // ── Auto-checkpoint every N rounds ──────────────────────────────────────
  let checkpointId = null;
  if (round % CHECKPOINT_INTERVAL === 0) {
    try {
      const serialized = serializeTickState(result);
      checkpointId = `chk-loop-r${round}-t${serialized.finalTick}-${Date.now()}`;
      await SimCheckpoint.create({
        checkpointId,
        simulationId: `agent-loop`,
        seed,
        tick: serialized.finalTick,
        tickCount: serialized.tickCount,
        finalTick: serialized.finalTick,
        stateSnapshot: serialized.finalState,
        entries: serialized.entries,
        label: `auto-checkpoint round ${round}`,
      });
    } catch (err) {
      console.warn("[agent-loop] checkpoint save failed:", err.message);
      checkpointId = null;
    }
  }

  // ── Heuristic evaluation ────────────────────────────────────────────────
  const evaluation = evaluateRoundHeuristic({
    agents: currentWorld?.agents || [],
    posts: createdPosts.map(p => ({
      agent_id: p.authorId,
      body: p.content,
      meaning_frame: p.tags?.[0] || null,
      stance_signal: p.tags?.[1] || null,
    })),
  });

  res.json({
    round,
    ticks: result.tickCount,
    requestedTicks,
    speed,
    postsCreated: createdPosts.length,
    commentsCreated: createdComments.length,
    characterOverridesApplied: appliedOverrides,
    agentGrowth: growthPlan,
    writebackMode,
    writebackDisabled: !writeForumArtifacts,
    checkpoint: checkpointId,
    evaluation: evaluation.scores,
    evaluationRecommendations: evaluation.recommendations,
    entries: result.entries.map((e) => ({ tick: e.tick, actor: e.actor_id, action: e.action })),
  });
});

// ── GET /api/agent-loop/status ────────────────────────────────────────────────

router.get("/status", async (req, res) => {
  const [totalAgentStates, latestState] = await Promise.all([
    AgentState.countDocuments(),
    AgentState.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    currentRound,
    worldInitialized: !!currentWorld,
    agentCount: currentWorld?.agents?.length ?? 0,
    growth: buildPopulationGrowthPlan({
      currentCount: currentWorld?.agents?.length ?? 0,
      elapsedTicks: currentWorld?.simulationTick ?? 0,
      initialCount: DEFAULT_INITIAL_AGENT_COUNT,
    }),
    db: {
      agentStateSnapshots: totalAgentStates,
      latestRound: latestState?.round ?? 0,
    },
  });
});

// ── GET /api/agent-loop/states ────────────────────────────────────────────────

router.get("/states", async (req, res) => {
  const agentId = req.query.agentId;
  const filter = agentId ? { agentId } : {};
  const states = await AgentState.find(filter)
    .sort({ agentId: 1, round: -1 })
    .limit(50)
    .lean();
  res.json(states);
});

export default router;
