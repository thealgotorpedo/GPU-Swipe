const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const GraphicsCard = require("../models/GraphicsCard");
const User = require("../models/User");
const { publicProfile } = require("./profile");
module.exports = (app, requireAuth, presentListing) => {
  app.param("listingId", (req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid listing ID." });
    next();
  });
  app.get("/api/listings/:listingId", requireAuth, async (req, res) => {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found." });
    const [card, seller] = await Promise.all([
      GraphicsCard.findById(listing.graphicsCardId), User.findById(listing.sellerId)
    ]);
    if (seller) seller.sellerRating = await require("./ratings").sellerRating(seller._id);
    res.json({ ...presentListing(listing, card), seller: seller && !seller.isDisabled ? publicProfile(seller) : null });
  });
  app.patch("/api/listings/:listingId/status", requireAuth, async (req, res) => {
    if (!["active", "sold"].includes(req.body?.status)) {
      return res.status(400).json({ error: "Status must be active or sold." });
    }
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.listingId, sellerId: req.user._id },
      { $set: { status: req.body.status } }, { new: true, runValidators: true }
    );
    if (!listing) return res.status(404).json({ error: "Listing not found or not owned by you." });
    res.json({ status: listing.status });
  });
};
