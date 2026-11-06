const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    graphicsCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GraphicsCard",
      required: true
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    priceCents: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      trim: true,
      default: "USD"
    },

    status: {
      type: String,
      trim: true,
      default: "active"
    },

    condition: {
      type: String,
      required: true,
      trim: true
    },

    imageUrls: {
      type: [String],
      default: []
    }
  },
  {
    collection: "listings",
    timestamps: true,
    autoIndex: false,
    autoCreate: false
  }
);

module.exports = mongoose.model("Listing", listingSchema);
