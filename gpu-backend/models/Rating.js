const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, min: 1, max: 5, required: true }
}, { timestamps: true, autoIndex: false });
schema.index({ listingId: 1, reviewerId: 1 }, { unique: true });
schema.index({ sellerId: 1 });
module.exports = mongoose.model("Rating", schema);
