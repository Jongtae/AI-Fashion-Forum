import { applyIdentityExposure } from "@ai-fashion-forum/agent-core";
import { loadAgentProfiles, buildAgentStateUpdate } from "../lib/agent-state.js";
import { subscribeToForumPostCreated } from "../lib/redis.js";
import { AgentState } from "../models/AgentState.js";
import { ActionTrace } from "../models/ActionTrace.js";
import { SimEvent } from "../models/SimEvent.js";

const MAX_EXPOSED_AGENTS = Number(process.env.POST_EXPOSURE_AGENT_LIMIT || 3);
const AFFINITY_THRESHOLD = Number(process.env.POST_EXPOSURE_MIN_AFFINITY || 0.2);

function computeTopicAffinity(agent, tags = []) {
  if (!tags.length) return 0;

  const total = tags.reduce(
    (sum, tag) => sum + Number(agent.interest_vector?.[tag] || 0),
    0
  );

  return Number((total / tags.length).toFixed(4));
}

function selectInterestedAgents(agents, post) {
  return agents
    .filter((agent) => agent.agent_id !== post.authorId)
    .map((agent) => ({
      agent,
      topicAffinity: computeTopicAffinity(agent, post.tags || []),
    }))
    .filter((entry) => entry.topicAffinity >= AFFINITY_THRESHOLD)
    .sort((a, b) => b.topicAffinity - a.topicAffinity)
    .slice(0, MAX_EXPOSED_AGENTS);
}

function buildExposure(post, topicAffinity) {
  const topics = post.tags?.length ? post.tags : ["general"];

  return {
    topics,
    emotions: ["curiosity"],
    intensity: Math.min(0.95, 0.45 + topicAffinity * 0.5),
    social_proof: Math.min(0.9, 0.3 + Math.min(post.likes || 0, 10) * 0.05),
    summary: `Observed forum post "${post.content.slice(0, 80)}"`,
    source_post_id: post._id,
  };
}

async function persistExposureResult({ post, agent, topicAffinity }) {
  const latest = await AgentState.findOne({ agentId: agent.agent_id })
    .sort({ round: -1, tick: -1, createdAt: -1 });
  const nextRound = (latest?.round || 0) + 1;
  const nextTick = (latest?.tick || 0) + 1;
  const exposure = buildExposure(post, topicAffinity);
  const update = applyIdentityExposure({
    agentState: agent,
    exposure,
    tick: nextTick,
  });

  await AgentState.create(
    buildAgentStateUpdate(update.agent, {
      round: nextRound,
      tick: nextTick,
      exposureSummary: {
        type: "forum_post_created",
        postId: post._id,
        topics: exposure.topics,
        topicAffinity,
        summary: exposure.summary,
      },
    })
  );

  const actionId = `EXP:${agent.agent_id}:${post._id}:${nextTick}`;
  await ActionTrace.create({
    actionId,
    agentId: agent.agent_id,
    tick: nextTick,
    round: nextRound,
    actionType: "exposure",
    visibility: "stored_only",
    targetContentId: post._id,
    sourceType: "forum_post",
    topicAffinity,
    contradictionPath: update.deltaLog.contradiction_path,
    payload: {
      postId: post._id,
      postAuthorId: post.authorId,
      postTags: post.tags || [],
      exposure,
      deltaLog: update.deltaLog,
    },
  });

  await SimEvent.insertMany([
    {
      eventType: "content_consumed",
      agentId: agent.agent_id,
      round: nextRound,
      tick: nextTick,
      relatedId: post._id,
      relatedType: "post",
      payload: {
        topicAffinity,
        tags: post.tags || [],
      },
    },
    {
      eventType: "agent_identity_updated",
      agentId: agent.agent_id,
      round: nextRound,
      tick: nextTick,
      relatedId: post._id,
      relatedType: "post",
      payload: update.deltaLog,
    },
  ]);

  return {
    agentId: agent.agent_id,
    round: nextRound,
    tick: nextTick,
    topicAffinity,
    contradictionPath: update.deltaLog.contradiction_path,
  };
}

async function handleForumPostCreated(rawMessage) {
  const event = JSON.parse(rawMessage);
  const post = event?.post;

  if (!post?._id) return;

  await SimEvent.create({
    eventType: "forum_post_created",
    relatedId: post._id,
    relatedType: "post",
    payload: {
      eventId: event.eventId,
      authorId: post.authorId,
      tags: post.tags || [],
      createdAt: post.createdAt,
    },
  });

  const agentProfiles = await loadAgentProfiles(AgentState);
  const selectedAgents = selectInterestedAgents(agentProfiles, post);

  if (!selectedAgents.length) return;

  for (const selected of selectedAgents) {
    await persistExposureResult({
      post,
      agent: selected.agent,
      topicAffinity: selected.topicAffinity,
    });
  }
}

export async function startForumEventSubscriber() {
  await subscribeToForumPostCreated(async (message) => {
    try {
      await handleForumPostCreated(message);
    } catch (err) {
      console.error("[agent-server][forum-events]", err);
    }
  });

  console.log("[agent-server] subscribed to forum post events");
}
