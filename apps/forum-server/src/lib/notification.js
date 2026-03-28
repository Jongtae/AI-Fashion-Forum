/**
 * notification.js
 *
 * Operator notification system for escalated content (self-harm, high-risk violations).
 *
 * Part of Issue #275-2: Self-harm escalation & operator notification
 */

/**
 * Notification severity levels
 */
export const ESCALATION_SEVERITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

/**
 * Notification types
 */
export const NOTIFICATION_TYPE = Object.freeze({
  SELF_HARM_ESCALATION: "self_harm_escalation",
  POLICY_VIOLATION: "policy_violation",
  APPEAL_RECEIVED: "appeal_received",
  EXPERIMENT_THRESHOLD: "experiment_threshold",
});

/**
 * In-memory notification queue (for local development)
 * In production, this should be replaced with a proper queue (Redis, RabbitMQ, etc.)
 */
const notificationQueue = [];

/**
 * Log operator escalation event to in-memory queue
 *
 * @param {Object} escalation - Escalation data
 * @returns {Object} Notification record with id, timestamp, status
 */
export function notifyOperatorEscalation(escalation = {}) {
  const {
    severity = ESCALATION_SEVERITY.MEDIUM,
    contentId,
    authorId,
    postId,
    reason,
    escalationReason,
    matchedTerms = [],
    score = 0,
  } = escalation;

  const notification = {
    id: `notif:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
    type: NOTIFICATION_TYPE.SELF_HARM_ESCALATION,
    severity,
    contentId,
    authorId,
    postId,
    reason,
    escalationReason,
    matchedTerms,
    score,
    createdAt: new Date(),
    status: "pending", // pending → acknowledged → resolved
    acknowledgedBy: null,
    acknowledgedAt: null,
    action: null, // "removed", "hidden", "approved_appeal"
    actionTakenAt: null,
  };

  // Add to queue
  notificationQueue.push(notification);

  // Log with appropriate urgency
  logNotification(notification);

  return notification;
}

/**
 * Internal logging based on severity
 */
function logNotification(notification) {
  const { severity, escalationReason, contentId } = notification;

  const timestamp = new Date().toISOString();

  if (severity === ESCALATION_SEVERITY.HIGH) {
    console.error(
      `[OPERATOR-URGENT] ${timestamp} - ${escalationReason} (post: ${contentId})`
    );
  } else if (severity === ESCALATION_SEVERITY.MEDIUM) {
    console.warn(
      `[OPERATOR-ALERT] ${timestamp} - ${escalationReason} (post: ${contentId})`
    );
  } else {
    console.log(
      `[OPERATOR-INFO] ${timestamp} - ${escalationReason} (post: ${contentId})`
    );
  }
}

/**
 * Get pending notifications for operator
 *
 * @param {Object} options - { severity, limit, status }
 * @returns {Array} Pending notifications
 */
export function getPendingNotifications(options = {}) {
  const { severity = null, limit = 50, status = "pending" } = options;

  let filtered = notificationQueue.filter((n) => n.status === status);

  if (severity) {
    filtered = filtered.filter((n) => n.severity === severity);
  }

  return filtered.slice(-limit).reverse(); // Most recent first
}

/**
 * Acknowledge notification (operator has seen it)
 *
 * @param {string} notificationId - Notification ID
 * @param {string} operatorId - Operator ID
 * @returns {Object} Updated notification
 */
export function acknowledgeNotification(notificationId, operatorId) {
  const notification = notificationQueue.find((n) => n.id === notificationId);

  if (!notification) {
    throw new Error(`Notification not found: ${notificationId}`);
  }

  notification.acknowledgedBy = operatorId;
  notification.acknowledgedAt = new Date();
  notification.status = "acknowledged";

  console.log(`[OPERATOR] ${operatorId} acknowledged escalation: ${notificationId}`);

  return notification;
}

/**
 * Record action taken on escalated content
 *
 * @param {string} notificationId - Notification ID
 * @param {string} action - "removed", "hidden", "approved_appeal"
 * @param {string} operatorId - Operator ID
 * @param {string} reason - Reason for action
 * @returns {Object} Updated notification
 */
export function recordEscalationAction(notificationId, action, operatorId, reason = "") {
  const notification = notificationQueue.find((n) => n.id === notificationId);

  if (!notification) {
    throw new Error(`Notification not found: ${notificationId}`);
  }

  notification.action = action;
  notification.actionTakenAt = new Date();
  notification.status = "resolved";
  notification.operatorId = operatorId;
  notification.actionReason = reason;

  console.log(
    `[OPERATOR] ${operatorId} took action on escalation: ${action} (${notificationId})`
  );

  return notification;
}

/**
 * Get escalation statistics for dashboard
 *
 * @returns {Object} Statistics: { total, byseverity, pendingCount, avgResolutionTime }
 */
export function getEscalationStatistics() {
  const total = notificationQueue.length;
  const bySeverity = {
    high: notificationQueue.filter((n) => n.severity === ESCALATION_SEVERITY.HIGH).length,
    medium: notificationQueue.filter((n) => n.severity === ESCALATION_SEVERITY.MEDIUM).length,
    low: notificationQueue.filter((n) => n.severity === ESCALATION_SEVERITY.LOW).length,
  };

  const pending = notificationQueue.filter((n) => n.status === "pending");
  const resolved = notificationQueue.filter((n) => n.status === "resolved");

  let avgResolutionTime = 0;
  if (resolved.length > 0) {
    const totalTime = resolved.reduce((sum, n) => {
      return sum + (n.actionTakenAt - n.createdAt);
    }, 0);
    avgResolutionTime = Math.round(totalTime / resolved.length / 1000 / 60); // minutes
  }

  return {
    total,
    byStatus: {
      pending: pending.length,
      acknowledged: notificationQueue.filter((n) => n.status === "acknowledged").length,
      resolved: resolved.length,
    },
    bySeverity,
    avgResolutionTimeMinutes: avgResolutionTime,
  };
}

/**
 * Clear old notifications (for testing and cleanup)
 *
 * @param {number} olderThanHours - Delete notifications older than N hours
 * @returns {number} Number of notifications deleted
 */
export function clearOldNotifications(olderThanHours = 24) {
  const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const originalLength = notificationQueue.length;

  notificationQueue.splice(
    0,
    notificationQueue.length,
    ...notificationQueue.filter((n) => n.createdAt > cutoffTime)
  );

  return originalLength - notificationQueue.length;
}

/**
 * Export for testing
 */
export function _getNotificationQueue() {
  return notificationQueue;
}

export function _clearNotificationQueue() {
  notificationQueue.length = 0;
}
