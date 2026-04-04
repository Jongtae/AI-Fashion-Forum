function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function stringSeed(...parts) {
  return parts
    .filter(Boolean)
    .join(":")
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function buildPostTopicSet(post = {}) {
  return new Set([
    ...(Array.isArray(post.tags) ? post.tags : []),
    ...(Array.isArray(post.generationContext?.sourceTopics) ? post.generationContext.sourceTopics : []),
    ...(Array.isArray(post.generationContext?.sourceContentTopics)
      ? post.generationContext.sourceContentTopics
      : []),
  ]);
}

function hasDiscussionHook(post = {}) {
  const surface = [
    post.title,
    post.body,
    post.content,
    post.generationContext?.sourceIntent,
    ...(Array.isArray(post.generationContext?.sourceAnchorTerms)
      ? post.generationContext.sourceAnchorTerms
      : []),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  return /\?|\b어떻게\b|\b왜\b|\b괜찮\b|\bvs\b|\b비교\b|\b갈리\b|\b논쟁\b/i.test(surface);
}

function parseCreatedAt(value) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSocialPriority(agent = {}) {
  const archetype = agent.archetype || "";
  const base = Number(agent.activity_level || 0.4);

  if (archetype === "empathetic_responder") return base + 0.35;
  if (archetype === "community_regular") return base + 0.28;
  if (archetype === "contrarian_commenter") return base + 0.22;
  if (archetype === "quiet_observer") return base - 0.08;
  return base + 0.1;
}

export function countTopicOverlap(agent = {}, post = {}) {
  const interestKeys = new Set(Object.keys(agent.interest_vector || {}));
  const postTopics = buildPostTopicSet(post);

  let matches = 0;
  for (const topic of postTopics) {
    if (interestKeys.has(topic)) {
      matches += 1;
    }
  }

  return matches;
}

export function computeCommentThreadStats(comments = []) {
  const byId = new Map();
  const childCounts = new Map();

  for (const comment of comments) {
    const commentId = comment?._id?.toString?.() || comment?._id || comment?.id || null;
    if (!commentId) {
      continue;
    }

    byId.set(commentId, {
      id: commentId,
      replyToCommentId: comment.replyToCommentId?.toString?.() || comment.replyToCommentId || null,
      authorId: comment.authorId || null,
      content: comment.content || "",
      createdAt: comment.createdAt || null,
      depth: 1,
      childCount: 0,
    });
  }

  for (const comment of byId.values()) {
    if (comment.replyToCommentId && byId.has(comment.replyToCommentId)) {
      childCounts.set(comment.replyToCommentId, (childCounts.get(comment.replyToCommentId) || 0) + 1);
    }
  }

  const depthCache = new Map();
  function resolveDepth(commentId, seen = new Set()) {
    if (depthCache.has(commentId)) {
      return depthCache.get(commentId);
    }
    const comment = byId.get(commentId);
    if (!comment) {
      return 1;
    }
    if (!comment.replyToCommentId || !byId.has(comment.replyToCommentId) || seen.has(commentId)) {
      depthCache.set(commentId, 1);
      return 1;
    }
    seen.add(commentId);
    const depth = resolveDepth(comment.replyToCommentId, seen) + 1;
    depthCache.set(commentId, depth);
    return depth;
  }

  let maxDepth = 0;
  let totalDepth = 0;
  for (const comment of byId.values()) {
    comment.depth = resolveDepth(comment.id);
    comment.childCount = childCounts.get(comment.id) || 0;
    maxDepth = Math.max(maxDepth, comment.depth);
    totalDepth += comment.depth;
  }

  const averageDepth = byId.size ? Number((totalDepth / byId.size).toFixed(3)) : 0;
  return {
    byCommentId: byId,
    maxDepth,
    averageDepth,
    totalComments: byId.size,
  };
}

export function rankTargetPosts({
  agent,
  posts,
  existingCommentCounts = new Map(),
  threadStatsByPostId = new Map(),
  seed = 0,
}) {
  return [...posts]
    .filter((post) => post.agent_id !== agent.agent_id && post.forumPostId)
    .map((post, index) => {
      const overlap = countTopicOverlap(agent, post);
      const commentCount = existingCommentCounts.get(post.forumPostId) || 0;
      const threadStats = threadStatsByPostId.get(post.forumPostId) || { maxDepth: 1, averageDepth: 1 };
      const questionBonus = hasDiscussionHook(post) ? 0.18 : 0;
      const socialBonus = Math.min(commentCount * 0.18, 0.54) + Math.min((threadStats.maxDepth - 1) * 0.2, 0.4);
      const recencyBonus = parseCreatedAt(post.createdAt) > 0 ? 0.06 : 0;
      const seededTieBreak = ((seed + index + stringSeed(agent.agent_id, post.forumPostId)) % 17) / 100;
      const score = overlap * 0.3 + questionBonus + socialBonus + recencyBonus + seededTieBreak;

      return { post, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.post);
}

export function rankReplyTargets({
  agent,
  post,
  comments = [],
  threadStats = computeCommentThreadStats(comments),
  seed = 0,
}) {
  const eligible = comments.filter((comment) => comment.authorId !== agent.agent_id);

  return eligible
    .map((comment, index) => {
      const commentId = comment?._id?.toString?.() || comment?._id || comment?.id || "";
      const stat = threadStats.byCommentId.get(commentId) || { depth: 1, childCount: 0 };
      const targetSurface = `${comment.content || ""} ${post?.title || ""} ${post?.body || post?.content || ""}`;
      const questionBonus = /\?|\b왜\b|\b어떻게\b|\b진짜\b|\b맞나\b/i.test(targetSurface) ? 0.14 : 0;
      const disagreementBonus = /\b아닌\b|\b반대\b|\b애매\b|\b갈리\b|\b근데\b/i.test(targetSurface) ? 0.12 : 0;
      const depthBonus = Math.min((stat.depth - 1) * 0.22, 0.44);
      const childBonus = Math.min(stat.childCount * 0.16, 0.32);
      const overlap = countTopicOverlap(agent, post);
      const seededTieBreak = ((seed + index + stringSeed(agent.agent_id, commentId, post?.forumPostId)) % 19) / 100;
      const score = overlap * 0.18 + questionBonus + disagreementBonus + depthBonus + childBonus + seededTieBreak;

      return { comment, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.comment);
}

export function buildThreadStatsByPostId(posts = [], comments = []) {
  const commentsByPostId = new Map();
  for (const comment of comments) {
    const postId = comment.forumPostId || comment.postId || comment.post_id || null;
    if (!postId) {
      continue;
    }
    const list = commentsByPostId.get(postId) || [];
    list.push(comment);
    commentsByPostId.set(postId, list);
  }

  const statsByPostId = new Map();
  for (const post of posts) {
    const postId = post.forumPostId || post._id?.toString?.() || post._id || post.id;
    const commentsForPost = commentsByPostId.get(postId) || [];
    statsByPostId.set(postId, computeCommentThreadStats(commentsForPost));
  }
  return statsByPostId;
}
