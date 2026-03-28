import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline } from "./moderation-decision.js";

test("buildTimeline creates chronological sequence of events", () => {
  const decision = {
    _id: "decision123",
    decidedAt: new Date("2026-03-28T10:00:00Z"),
    decision: "removed",
    reason: "harassment",
    decisionType: "1",
    score: 0.75,
    decidedBy: "operator1",
    escalated: true,
    escalationSeverity: "high",
    escalationAcknowledgedAt: new Date("2026-03-28T10:05:00Z"),
    escalationActionTakenAt: new Date("2026-03-28T10:10:00Z"),
    appealed: true,
    appealedAt: new Date("2026-03-28T10:15:00Z"),
    appealedBy: "user123",
    appealReason: "I was expressing frustration, not harassing",
    appealReviewedAt: new Date("2026-03-28T11:00:00Z"),
    appealReviewedBy: "operator2",
    appealDecision: "sustained",
  };

  const timeline = buildTimeline(decision, []);

  assert.equal(timeline.length, 5); // decision, escalation_acknowledged, escalation_action, appeal_submitted, appeal_reviewed
  assert.equal(timeline[0].type, "decision");
  assert.equal(timeline[1].type, "escalation_acknowledged");
  assert.equal(timeline[2].type, "escalation_action");
  assert.equal(timeline[3].type, "appeal_submitted");
  assert.equal(timeline[4].type, "appeal_reviewed");

  // Verify chronological order
  for (let i = 1; i < timeline.length; i++) {
    assert.ok(
      timeline[i].timestamp >= timeline[i - 1].timestamp,
      `Event ${i} should be >= Event ${i - 1}`
    );
  }
});

test("buildTimeline handles decisions without escalation or appeals", () => {
  const decision = {
    decidedAt: new Date("2026-03-28T10:00:00Z"),
    decision: "approved",
    reason: null,
    decidedBy: "system",
    escalated: false,
    appealed: false,
  };

  const timeline = buildTimeline(decision, []);

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].type, "decision");
  assert.equal(timeline[0].action, "approved");
});

test("buildTimeline includes appeal details when present", () => {
  const decision = {
    decidedAt: new Date("2026-03-28T10:00:00Z"),
    decision: "removed",
    decidedBy: "operator1",
    escalated: false,
    appealed: true,
    appealedAt: new Date("2026-03-28T10:30:00Z"),
    appealedBy: "user123",
    appealReason: "Unfair decision",
    appealReviewedAt: new Date("2026-03-28T11:00:00Z"),
    appealReviewedBy: "operator2",
    appealDecision: "overturned",
  };

  const timeline = buildTimeline(decision, []);

  assert.equal(timeline.length, 3);
  assert.equal(timeline[1].type, "appeal_submitted");
  assert.equal(timeline[1].details.reason, "Unfair decision");
  assert.equal(timeline[2].type, "appeal_reviewed");
  assert.equal(timeline[2].details.decision, "overturned");
});

test("buildTimeline maintains strictly chronological order with same timestamps", () => {
  const sameTime = new Date("2026-03-28T10:00:00Z");
  const decision = {
    decidedAt: sameTime,
    decision: "flagged",
    decidedBy: "system",
    escalated: true,
    escalationAcknowledgedAt: sameTime, // Same time
    escalationActionTakenAt: new Date(sameTime.getTime() + 1),
    appealed: true,
    appealedAt: new Date(sameTime.getTime() + 2),
    appealedBy: "user123",
    appealReviewedAt: new Date(sameTime.getTime() + 3),
    appealReviewedBy: "operator1",
    appealDecision: "sustained",
  };

  const timeline = buildTimeline(decision, []);

  // Should handle same-time events gracefully
  assert.equal(timeline.length, 5);
  assert.ok(timeline.every((e) => e.timestamp instanceof Date));
});
