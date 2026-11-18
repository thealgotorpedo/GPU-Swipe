const mongoose = require("mongoose");

const meetupSuggestionSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },

    suggestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    placeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    status: {
      type: String,
      enum: ["proposed", "accepted", "declined", "withdrawn", "superseded"],
      default: "proposed"
    }
  },
  {
    collection: "meetupSuggestions",
    timestamps: true,
    autoIndex: false,
    autoCreate: false
  }
);

meetupSuggestionSchema.index({ conversationId: 1, createdAt: 1 });
meetupSuggestionSchema.index(
  { conversationId: 1 },
  { unique: true, partialFilterExpression: { status: "accepted" } }
);

module.exports = mongoose.model("MeetupSuggestion", meetupSuggestionSchema);
