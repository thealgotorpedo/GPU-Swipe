const Rating = require("../models/Rating");
const Listing = require("../models/Listing");
async function sellerRating(sellerId) {
  const [result] = await Rating.aggregate([
    { $match: { sellerId } },
    { $group: { _id: null, average: { $avg: "$score" }, count: { $sum: 1 } } }
  ]);
  return { average: result?.average ?? null, count: result?.count ?? 0 };
}
module.exports = (app, requireAuth) => {
  app.get("/api/listings/:listingId/rating", requireAuth, async (req, res) => {
    const rating = await Rating.findOne({ listingId: req.params.listingId, reviewerId: req.user._id });
    res.json({ score: rating?.score ?? null });
  });
  app.post("/api/listings/:listingId/rating", requireAuth, async (req, res) => {
    const score = req.body?.score;
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: "Rating must be a whole number from 1 to 5." });
    }
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (listing.sellerId.equals(req.user._id)) return res.status(403).json({ error: "You cannot rate yourself." });
    try {
      await Rating.create({ listingId: listing._id, reviewerId: req.user._id, sellerId: listing.sellerId, score });
      res.status(201).json({ score, sellerRating: await sellerRating(listing.sellerId) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "You already rated this listing." });
      throw error;
    }
  });
};
module.exports.sellerRating = sellerRating;
