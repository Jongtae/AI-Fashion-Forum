import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModerationState,
  scoreModerationText,
  classifyDecisionType,
  checkSelfHarmEscalation,
  generateAuthorFeedback,
} from "./moderation.js";

test("scoreModerationText keeps benign fashion content safe", () => {
  const result = scoreModerationText({
    content: "Looking for gentle feedback on this weekday office outfit and loafers pairing.",
    tags: ["office_style", "trousers"],
  });

  assert.equal(result.shouldFlag, false);
  assert.equal(result.label, "safe");
  assert.equal(result.reasons.length, 0);
  assert.ok(result.score < 0.45);
});

test("scoreModerationText flags abusive and scammy language", () => {
  const result = scoreModerationText({
    content: "You are stupid trash. Send money now for this crypto giveaway!!!",
    tags: ["harassment"],
  });

  assert.equal(result.shouldFlag, true);
  assert.equal(result.label, "review");
  assert.ok(result.score >= 0.45);
  assert.ok(result.reasons.includes("harassment:stupid"));
  assert.ok(result.reasons.includes("scam:crypto giveaway"));
});

test("buildModerationState preserves removed status while refreshing prediction fields", () => {
  const state = buildModerationState({
    content: "멍청아 꺼져",
    existingStatus: "removed",
  });

  assert.equal(state.moderationStatus, "removed");
  assert.equal(state.moderationLabel, "review");
  assert.equal(state.moderationModelVersion, "prototype-v1");
  assert.ok(state.moderationEvaluatedAt instanceof Date);
});

test("classifyDecisionType returns Type 1 (clear) for high confidence violations", () => {
  const evaluation = scoreModerationText({
    content: "You are STUPID TRASH!!! GO DIE NOW!!!",
  });

  const decision = classifyDecisionType(evaluation);
  assert.equal(decision.type, "1");
  assert.equal(decision.action, "auto_reject");
  assert.ok(decision.confidence >= 0.65);
});

test("classifyDecisionType returns Type 2 (borderline) for moderate violations", () => {
  const evaluation = scoreModerationText({
    content: "You're an idiot, this is stupid and you're trash for saying that!",
  });

  const decision = classifyDecisionType(evaluation);
  assert.equal(decision.type, "2");
  assert.equal(decision.action, "human_review");
});

test("classifyDecisionType returns Type 3 (context-aware) for benign content", () => {
  const evaluation = scoreModerationText({
    content: "This is a nice outfit!",
  });

  const decision = classifyDecisionType(evaluation);
  assert.equal(decision.type, "3");
  assert.equal(decision.action, "context_review");
});

test("checkSelfHarmEscalation detects self-harm content and escalates", () => {
  const evaluation = scoreModerationText({
    content: "I want to hurt myself I want to kill myself",
  });

  const escalation = checkSelfHarmEscalation(evaluation);
  assert.equal(escalation.shouldEscalate, true);
  assert.ok(["low", "medium", "high"].includes(escalation.severity));
  assert.ok(escalation.action.includes("immediate_notify_operator"));
});

test("checkSelfHarmEscalation does not escalate non-self-harm content", () => {
  const evaluation = scoreModerationText({
    content: "This is a nice day",
  });

  const escalation = checkSelfHarmEscalation(evaluation);
  assert.equal(escalation.shouldEscalate, false);
  assert.equal(escalation.severity, "none");
});

test("generateAuthorFeedback creates appropriate message for Type 1 decision", () => {
  const feedback = generateAuthorFeedback({
    type: "1",
    evaluation: {
      dominantCategories: ["harassment"],
    },
  });

  assert.ok(feedback.message.includes("removed"));
  assert.equal(feedback.category, "removal_reason");
  assert.equal(feedback.showPublicly, false);
  assert.equal(feedback.actionable, true);
});

test("generateAuthorFeedback creates appropriate message for Type 2 decision", () => {
  const feedback = generateAuthorFeedback({
    type: "2",
    evaluation: {},
  });

  assert.ok(feedback.message.includes("flagged for review"));
  assert.equal(feedback.category, "review_pending");
  assert.equal(feedback.actionable, false);
});

test("generateAuthorFeedback creates appropriate message for Type 3 decision", () => {
  const feedback = generateAuthorFeedback({
    type: "3",
    evaluation: {},
  });

  assert.ok(feedback.message.includes("being reviewed"));
  assert.equal(feedback.category, "review_pending");
});
