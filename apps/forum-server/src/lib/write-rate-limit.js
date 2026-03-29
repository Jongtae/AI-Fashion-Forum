const DEFAULT_AGENT_WRITE_LIMIT_PER_HOUR = Number(process.env.AGENT_WRITE_LIMIT_PER_HOUR || 3);
const DEFAULT_AGENT_WRITE_WINDOW_MS = Number(
  process.env.AGENT_WRITE_WINDOW_MS || 60 * 60 * 1000,
);

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getAgentWriteWindowStart(now = new Date(), windowMs = DEFAULT_AGENT_WRITE_WINDOW_MS) {
  const current = normalizeDate(now) || new Date();
  return new Date(current.getTime() - windowMs);
}

export async function countAgentWritesInWindow({
  authorId,
  since,
  PostModel,
  CommentModel,
}) {
  const filter = {
    authorId,
    authorType: "agent",
    createdAt: { $gte: since },
  };

  const [postCount, commentCount] = await Promise.all([
    PostModel.countDocuments(filter),
    CommentModel.countDocuments(filter),
  ]);

  return {
    postCount,
    commentCount,
    totalCount: postCount + commentCount,
  };
}

export async function checkAgentWriteRateLimit({
  authorId,
  authorType,
  now = new Date(),
  limit = DEFAULT_AGENT_WRITE_LIMIT_PER_HOUR,
  windowMs = DEFAULT_AGENT_WRITE_WINDOW_MS,
  PostModel,
  CommentModel,
} = {}) {
  if (authorType !== "agent") {
    return {
      allowed: true,
      limit,
      windowMs,
      currentCount: 0,
      remaining: Number.POSITIVE_INFINITY,
      since: getAgentWriteWindowStart(now, windowMs),
    };
  }

  const since = getAgentWriteWindowStart(now, windowMs);
  const { postCount, commentCount, totalCount } = await countAgentWritesInWindow({
    authorId,
    since,
    PostModel,
    CommentModel,
  });

  return {
    allowed: totalCount < limit,
    limit,
    windowMs,
    since,
    postCount,
    commentCount,
    currentCount: totalCount,
    remaining: Math.max(0, limit - totalCount),
  };
}
