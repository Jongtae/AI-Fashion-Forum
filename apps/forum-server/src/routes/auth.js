import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  const { username, displayName, password } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ error: "username, displayName, password are required" });
  }
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: "username must be 3–30 characters" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: "username_taken" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await new User({ username, displayName, passwordHash }).save();

  const token = signToken({ userId: user._id.toString(), username: user.username });

  res.status(201).json({
    token,
    user: { id: user._id, username: user.username, displayName: user.displayName },
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = await User.findOne({ username });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = signToken({ userId: user._id.toString(), username: user.username });

  res.json({
    token,
    user: { id: user._id, username: user.username, displayName: user.displayName },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  let decoded;
  try {
    const { verifyToken } = await import("../middleware/auth.js");
    decoded = verifyToken(header.slice(7));
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }

  const user = await User.findById(decoded.userId).select("-passwordHash").lean();
  if (!user) return res.status(404).json({ error: "user_not_found" });

  res.json({ user });
});

export default router;
