const User = require("../models/User");
function publicProfile(user) {
  return {
    id: user._id, login: user.username,
    displayName: user.displayName || user.username,
    bio: user.bio || "", contactEmail: user.contactEmail || "",
    contactPhone: user.contactPhone || "",
    sellerRating: user.sellerRating
  };
}
module.exports = (app, requireAuth) => {
  app.get("/api/profile", requireAuth, async (req, res) => {
    res.json(publicProfile(req.user));
  });
  app.patch("/api/profile", requireAuth, async (req, res) => {
    const limits = { displayName: 100, bio: 1000, contactEmail: 254, contactPhone: 40 };
    const changes = {};
    for (const [field, max] of Object.entries(limits)) {
      if (req.body?.[field] === undefined) continue;
      if (typeof req.body[field] !== "string" || req.body[field].trim().length > max) {
        return res.status(400).json({ error: `${field} must be text of at most ${max} characters.` });
      }
      changes[field] = req.body[field].trim();
    }
    if (changes.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.contactEmail)) {
      return res.status(400).json({ error: "Enter a valid public contact email." });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: changes }, { new: true, runValidators: true });
    res.json(publicProfile(user));
  });
};
module.exports.publicProfile = publicProfile;
