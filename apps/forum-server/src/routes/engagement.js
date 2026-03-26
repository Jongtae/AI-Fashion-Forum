import { Router } from "express";
import { Interaction } from "../models/Interaction.js";
import { Feedback } from "../models/Feedback.js";
import {
  INTERACTION_TARGET_TYPES,
  buildFeedbackFilter,
  buildInteractionFilter,
  normalizeFeedbackPayload,
  normalizeInteractionPayload,
  validateFeedbackPayload,
  validateInteractionPayload,
} from "../lib/engagement.js";

const router = Router();

router.post("/interactions", async (req, res) => {
  const errors = validateInteractionPayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const interaction = await Interaction.create(normalizeInteractionPayload(req.body));
  res.status(201).json(interaction);
});

router.get("/interactions", async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
  const filter = buildInteractionFilter(req.query);

  const interactions = await Interaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ interactions, total: interactions.length });
});

router.post("/feedback", async (req, res) => {
  const errors = validateFeedbackPayload(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const feedback = await Feedback.create(normalizeFeedbackPayload(req.body));

  await Interaction.create(
    normalizeInteractionPayload({
      actorId: req.body.userId,
      actorType: "user",
      targetId: req.body.targetId || "feedback",
      targetType: INTERACTION_TARGET_TYPES.includes(req.body.targetType) ? req.body.targetType : "system",
      eventType: "feedback_submit",
      metadata: { category: req.body.category, feedbackId: feedback._id.toString() },
      source: "feedback_api",
    })
  );

  res.status(201).json(feedback);
});

router.get("/feedback", async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const filter = buildFeedbackFilter(req.query);

  const feedback = await Feedback.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ feedback, total: feedback.length });
});

router.patch("/feedback/:feedbackId", async (req, res) => {
  const { status, reviewedBy } = req.body;
  if (!["reviewed", "accepted", "dismissed"].includes(status)) {
    return res
      .status(400)
      .json({ error: "status must be 'reviewed', 'accepted', or 'dismissed'" });
  }

  const feedback = await Feedback.findByIdAndUpdate(
    req.params.feedbackId,
    { status, reviewedBy, reviewedAt: new Date() },
    { new: true }
  );

  if (!feedback) return res.status(404).json({ error: "Feedback not found" });
  res.json(feedback);
});

export default router;
