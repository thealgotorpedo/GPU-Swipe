const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000
    }
  },
  {
    collection: "messages",
    timestamps: true,
    autoIndex: false,
    autoCreate: false
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });
messageSchema.index({ recipientId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
