export const INTERACTION_EVENT_TYPES = [
  "view",
  "like",
  "comment",
  "share",
  "click",
  "scroll_past",
  "bookmark",
  "report",
  "feedback_submit",
];

export const INTERACTION_TARGET_TYPES = ["post", "comment", "agent", "feed_slot", "feed", "system"];

export const FEEDBACK_CATEGORIES = ["bug", "suggestion", "moderation", "satisfaction", "other"];
export const FEEDBACK_TARGET_TYPES = ["post", "comment", "agent", "feed", "system"];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateInteractionPayload(body = {}) {
  const errors = [];
  const actorId = normalizeString(body.actorId);
  const actorType = body.actorType ?? "user";
  const targetId = normalizeString(body.targetId);
  const targetType = body.targetType;
  const eventType = body.eventType;

  if (!actorId) errors.push("actorId is required");
  if (!["user", "agent"].includes(actorType)) errors.push("actorType must be 'user' or 'agent'");
  if (!targetId) errors.push("targetId is required");
  if (!INTERACTION_TARGET_TYPES.includes(targetType)) {
    errors.push(`targetType must be one of: ${INTERACTION_TARGET_TYPES.join(", ")}`);
  }
  if (!INTERACTION_EVENT_TYPES.includes(eventType)) {
    errors.push(`eventType must be one of: ${INTERACTION_EVENT_TYPES.join(", ")}`);
  }

  return errors;
}

export function normalizeInteractionPayload(body = {}) {
  return {
    actorId: normalizeString(body.actorId),
    actorType: body.actorType ?? "user",
    targetId: normalizeString(body.targetId),
    targetType: body.targetType,
    eventType: body.eventType,
    feedPosition: Number.isInteger(body.feedPosition) ? body.feedPosition : undefined,
    durationMs:
      typeof body.durationMs === "number" && Number.isFinite(body.durationMs)
        ? Math.max(0, Math.round(body.durationMs))
        : undefined,
    agentId: normalizeString(body.agentId) || undefined,
    round: Number.isInteger(body.round) ? body.round : undefined,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    source: normalizeString(body.source) || "api",
  };
}

export function validateFeedbackPayload(body = {}) {
  const errors = [];
  const userId = normalizeString(body.userId);
  const category = body.category;
  const message = normalizeString(body.message);
  const targetType = body.targetType ?? "system";
  const rating = body.rating;

  if (!userId) errors.push("userId is required");
  if (!FEEDBACK_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${FEEDBACK_CATEGORIES.join(", ")}`);
  }
  if (!message) errors.push("message is required");
  if (!FEEDBACK_TARGET_TYPES.includes(targetType)) {
    errors.push(`targetType must be one of: ${FEEDBACK_TARGET_TYPES.join(", ")}`);
  }
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    errors.push("rating must be an integer between 1 and 5");
  }

  return errors;
}

export function normalizeFeedbackPayload(body = {}) {
  return {
    userId: normalizeString(body.userId),
    category: body.category,
    targetId: normalizeString(body.targetId) || undefined,
    targetType: body.targetType ?? "system",
    rating: Number.isInteger(body.rating) ? body.rating : undefined,
    message: normalizeString(body.message),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
  };
}

export function buildInteractionFilter(query = {}) {
  const filter = {};

  if (query.actorType) filter.actorType = query.actorType;
  if (query.eventType) filter.eventType = query.eventType;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.targetId) filter.targetId = query.targetId;
  if (query.since) filter.createdAt = { $gte: new Date(query.since) };

  return filter;
}

export function buildFeedbackFilter(query = {}) {
  const filter = {};

  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.userId) filter.userId = query.userId;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.targetId) filter.targetId = query.targetId;
  if (query.since) filter.createdAt = { $gte: new Date(query.since) };

  return filter;
}
