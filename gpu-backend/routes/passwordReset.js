const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const digest = token => crypto.createHash("sha256").update(token).digest("hex");
const genericMessage = "If that email belongs to an account, a password reset link will be sent.";
module.exports = (app) => {
  // Bound each address to 10 reset requests per 15 minutes without retaining unbounded state.
  const attempts = new Map();
  function limit(req, res, next) {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= 10 || attempts.size >= 10000 && !attempts.has(key)) {
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }
    entry.count++; attempts.set(key, entry); next();
  }
  app.post("/api/password/forgot", limit, async (req, res) => {
    if (typeof req.body?.email !== "string" || req.body.email.length > 254) {
      return res.status(400).json({ error: "Enter your account email." });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESET_EMAIL_FROM || !process.env.FRONTEND_URL) {
      return res.status(503).json({ error: "Password reset email is not configured. Contact the site administrator." });
    }
    const user = await User.findOne({ email: req.body.email.trim(), isDisabled: { $ne: true } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = digest(token);
      await User.updateOne({ _id: user._id }, { $set: {
        resetTokenHash: tokenHash, resetTokenExpires: new Date(Date.now() + 30 * 60 * 1000)
      } });
      const url = new URL("/reset-password", process.env.FRONTEND_URL);
      url.searchParams.set("token", token);
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: process.env.RESET_EMAIL_FROM, to: [user.email],
            subject: "Reset your GPU Marketplace password",
            text: `Set a new password using this link (expires in 30 minutes):\n${url}\nIf you did not request this, ignore this email.` })
        });
        if (!response.ok) throw new Error("Email delivery rejected");
      } catch {
        await User.updateOne({ _id: user._id, resetTokenHash: tokenHash }, { $unset: { resetTokenHash: 1, resetTokenExpires: 1 } });
        console.error("Password reset email delivery failed");
      }
    }
    res.json({ message: genericMessage });
  });
  app.post("/api/password/reset", limit, async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) ||
        typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: "Use a valid reset link and a password of at least 8 characters and at most 72 UTF-8 bytes." });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.findOneAndUpdate({ resetTokenHash: digest(token), resetTokenExpires: { $gt: new Date() }, isDisabled: { $ne: true } }, {
      $set: { passwordHash }, $unset: { resetTokenHash: 1, resetTokenExpires: 1 }, $inc: { tokenVersion: 1 }
    });
    if (!user) return res.status(400).json({ error: "This reset link is invalid or expired. Request a new link." });
    res.json({ message: "Password updated. Please log in with your new password." });
  });
};
