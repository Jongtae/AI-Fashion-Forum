import { applyIdentityExposure } from "@ai-fashion-forum/agent-core";
import { loadAgentProfiles, buildAgentStateUpdate } from "../lib/agent-state.js";
import { subscribeToForumPostCreated, subscribeToForumCommentCreated } from "../lib/redis.js";
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

function buildExposure(subject, topicAffinity, subjectType = "post") {
  const topics = subject.tags?.length ? subject.tags : ["general"];
  const snippet = typeof subject.content === "string" ? subject.content.slice(0, 80) : "forum content";

  return {
    topics,
    emotions: ["curiosity"],
    intensity: Math.min(0.95, 0.45 + topicAffinity * 0.5),
    social_proof: Math.min(0.9, 0.3 + Math.min(subject.likes || 0, 10) * 0.05),
    summary:
      subjectType === "comment"
        ? `Observed forum comment "${snippet}"`
        : `Observed forum post "${snippet}"`,
    source_post_id: subject.parentPostId || subject._id,
    ...(subjectType === "comment" ? { source_comment_id: subject._id } : {}),
  };
}

function buildCommentSubject(post, comment) {
  return {
    _id: comment._id,
    content: comment.content,
    authorId: comment.authorId,
    authorType: comment.authorType,
    tags: post.tags || [],
    parentPostId: post._id,
    parentPostAuthorId: post.authorId,
    parentPostPreview: post.content?.slice(0, 120) || "",
    replyTargetType: comment.replyTargetType,
    replyTargetId: comment.replyTargetId,
    replyTargetAuthorId: comment.replyTargetAuthorId,
    replyTargetPreview: comment.replyTargetPreview,
  };
}

async function persistExposureResult({ subject, subjectType, agent, topicAffinity }) {
  const latest = await AgentState.findOne({ agentId: agent.agent_id })
    .sort({ round: -1, tick: -1, createdAt: -1 });
  const nextRound = (latest?.round || 0) + 1;
  const nextTick = (latest?.tick || 0) + 1;
  const exposure = buildExposure(subject, topicAffinity, subjectType);
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
        type: subjectType === "comment" ? "forum_comment_created" : "forum_post_created",
        postId: subject.parentPostId || subject._id,
        commentId: subjectType === "comment" ? subject._id : null,
        topics: exposure.topics,
        topicAffinity,
        summary: exposure.summary,
      },
    })
  );

  const actionId = `EXP:${agent.agent_id}:${subject._id}:${nextTick}`;
  await ActionTrace.create({
    actionId,
    agentId: agent.agent_id,
    tick: nextTick,
    round: nextRound,
    actionType: "exposure",
    visibility: "stored_only",
    targetContentId: subject._id,
    sourceType: subjectType === "comment" ? "forum_comment" : "forum_post",
    topicAffinity,
    contradictionPath: update.deltaLog.contradiction_path,
    payload: {
      postId: subject.parentPostId || subject._id,
      postAuthorId: subject.parentPostAuthorId || subject.authorId,
      postTags: subject.tags || [],
      commentId: subjectType === "comment" ? subject._id : null,
      replyTargetType: subject.replyTargetType || null,
      replyTargetId: subject.replyTargetId || null,
      replyTargetAuthorId: subject.replyTargetAuthorId || null,
      exposure,
      deltaLog: update.deltaLog,
    },
  });

  await SimEvent.insertMany([
    {
      eventType: subjectType === "comment" ? "comment_consumed" : "content_consumed",
      agentId: agent.agent_id,
      round: nextRound,
      tick: nextTick,
      relatedId: subject._id,
      relatedType: subjectType,
      payload: {
        topicAffinity,
        tags: subject.tags || [],
      },
    },
    {
      eventType: "agent_identity_updated",
      agentId: agent.agent_id,
      round: nextRound,
      tick: nextTick,
      relatedId: subject._id,
      relatedType: subjectType,
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
      subject: post,
      subjectType: "post",
      agent: selected.agent,
      topicAffinity: selected.topicAffinity,
    });
  }
}

async function handleForumCommentCreated(rawMessage) {
  const event = JSON.parse(rawMessage);
  const post = event?.post;
  const comment = event?.comment;

  if (!post?._id || !comment?._id) return;

  await SimEvent.create({
    eventType: "forum_comment_created",
    relatedId: comment._id,
    relatedType: "comment",
    payload: {
      eventId: event.eventId,
      authorId: comment.authorId,
      postId: post._id,
      postTags: post.tags || [],
      replyTargetType: comment.replyTargetType || null,
      replyTargetId: comment.replyTargetId || null,
      replyTargetAuthorId: comment.replyTargetAuthorId || null,
      createdAt: comment.createdAt,
    },
  });

  const agentProfiles = await loadAgentProfiles(AgentState);
  const selectedAgents = selectInterestedAgents(agentProfiles, post);

  if (!selectedAgents.length) return;

  const subject = buildCommentSubject(post, comment);

  for (const selected of selectedAgents) {
    await persistExposureResult({
      subject,
      subjectType: "comment",
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

  await subscribeToForumCommentCreated(async (message) => {
    try {
      await handleForumCommentCreated(message);
    } catch (err) {
      console.error("[agent-server][forum-events]", err);
    }
  });

  console.log("[agent-server] subscribed to forum post events");
}
