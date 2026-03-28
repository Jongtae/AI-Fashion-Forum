import { Router } from "express";
import { scoreModerationText } from "../lib/moderation.js";

const router = Router();

// ── POST /api/moderation/filter ──────────────────────────────────────────────
// Real-time content filtering API.
// Input: { content, tags } → Output: { allowed, score, label, reasons, categories }

router.post("/filter", async (req, res) => {
  const { content, tags } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "content (string) is required" });
  }

  if (content.trim().length === 0) {
    return res.status(400).json({ error: "content cannot be empty" });
  }

  const evaluation = scoreModerationText({
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
  });

  res.json({
    allowed: !evaluation.shouldFlag,
    score: evaluation.score,
    label: evaluation.label,
    reasons: evaluation.reasons,
    categories: evaluation.dominantCategories,
    modelVersion: "prototype-v1",
  });
});

export default router;
