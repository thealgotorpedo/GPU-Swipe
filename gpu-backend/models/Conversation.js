const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    locationSet: {
      type: Boolean,
      default: false
    },

    agreedMeetupSuggestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetupSuggestion",
      default: null
    },

    isClosed: {
      type: Boolean,
      default: false
    },

    closedAt: {
      type: Date,
      default: null
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    collection: "conversations",
    timestamps: true,
    autoIndex: false,
    autoCreate: false
  }
);

conversationSchema.index(
  { listingId: 1, buyerId: 1, sellerId: 1 },
  { unique: true }
);
conversationSchema.index({ buyerId: 1, updatedAt: -1 });
conversationSchema.index({ sellerId: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
