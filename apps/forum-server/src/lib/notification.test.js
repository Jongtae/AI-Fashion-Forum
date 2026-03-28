import test from "node:test";
import assert from "node:assert/strict";
import {
  notifyOperatorEscalation,
  getPendingNotifications,
  acknowledgeNotification,
  recordEscalationAction,
  getEscalationStatistics,
  ESCALATION_SEVERITY,
  NOTIFICATION_TYPE,
  _clearNotificationQueue,
} from "./notification.js";

test("notifyOperatorEscalation creates escalation with high severity", () => {
  _clearNotificationQueue();

  const notification = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.HIGH,
    postId: "post123",
    authorId: "user456",
    reason: "Self-harm content detected",
    escalationReason: "High severity self-harm with 2+ mentions",
    score: 0.75,
  });

  assert.equal(notification.severity, ESCALATION_SEVERITY.HIGH);
  assert.equal(notification.type, NOTIFICATION_TYPE.SELF_HARM_ESCALATION);
  assert.equal(notification.status, "pending");
  assert.ok(notification.id.startsWith("notif:"));
  assert.equal(notification.postId, "post123");
});

test("getPendingNotifications returns pending escalations", () => {
  _clearNotificationQueue();

  const notif1 = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.HIGH,
    postId: "post1",
    authorId: "user1",
    reason: "Test 1",
  });

  const notif2 = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.MEDIUM,
    postId: "post2",
    authorId: "user2",
    reason: "Test 2",
  });

  const pending = getPendingNotifications({ status: "pending" });
  assert.equal(pending.length, 2);
  assert.equal(pending[0].id, notif2.id); // Most recent first
});

test("getPendingNotifications filters by severity", () => {
  _clearNotificationQueue();

  notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.HIGH,
    postId: "post1",
    authorId: "user1",
  });

  notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.MEDIUM,
    postId: "post2",
    authorId: "user2",
  });

  const highOnly = getPendingNotifications({
    severity: ESCALATION_SEVERITY.HIGH,
  });
  assert.equal(highOnly.length, 1);
  assert.equal(highOnly[0].severity, ESCALATION_SEVERITY.HIGH);
});

test("acknowledgeNotification updates status and operator", () => {
  _clearNotificationQueue();

  const notif = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.HIGH,
    postId: "post1",
    reason: "Test",
  });

  const ack = acknowledgeNotification(notif.id, "operator1");
  assert.equal(ack.status, "acknowledged");
  assert.equal(ack.acknowledgedBy, "operator1");
  assert.ok(ack.acknowledgedAt instanceof Date);
});

test("recordEscalationAction updates status to resolved", () => {
  _clearNotificationQueue();

  const notif = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.HIGH,
    postId: "post1",
    reason: "Test",
  });

  const action = recordEscalationAction(
    notif.id,
    "removed",
    "operator1",
    "Violated self-harm policy"
  );

  assert.equal(action.status, "resolved");
  assert.equal(action.action, "removed");
  assert.equal(action.operatorId, "operator1");
  assert.equal(action.actionReason, "Violated self-harm policy");
});

test("getEscalationStatistics returns correct counts", () => {
  _clearNotificationQueue();

  // Create 3 escalations
  const notif1 = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.HIGH,
    postId: "post1",
  });
  const notif2 = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.MEDIUM,
    postId: "post2",
  });
  const notif3 = notifyOperatorEscalation({
    severity: ESCALATION_SEVERITY.LOW,
    postId: "post3",
  });

  // Acknowledge one
  acknowledgeNotification(notif1.id, "op1");

  // Resolve one
  recordEscalationAction(notif2.id, "removed", "op1");

  const stats = getEscalationStatistics();

  assert.equal(stats.total, 3);
  assert.equal(stats.byStatus.pending, 1);
  assert.equal(stats.byStatus.acknowledged, 1);
  assert.equal(stats.byStatus.resolved, 1);
  assert.equal(stats.bySeverity.high, 1);
  assert.equal(stats.bySeverity.medium, 1);
  assert.equal(stats.bySeverity.low, 1);
});

test("getPendingNotifications respects limit", () => {
  _clearNotificationQueue();

  for (let i = 0; i < 10; i++) {
    notifyOperatorEscalation({
      severity: ESCALATION_SEVERITY.MEDIUM,
      postId: `post${i}`,
    });
  }

  const limited = getPendingNotifications({ limit: 3 });
  assert.equal(limited.length, 3);
});

test("recordEscalationAction throws error for non-existent notification", () => {
  _clearNotificationQueue();

  assert.throws(
    () => recordEscalationAction("invalid-id", "removed", "op1"),
    /Notification not found/
  );
});
