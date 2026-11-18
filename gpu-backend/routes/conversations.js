const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Listing = require("../models/Listing");
const User = require("../models/User");
const Message = require("../models/Message");

function idString(value) {
  return value?._id ? value._id.toString() : value?.toString();
}

function conversationFilter(conversationId, userId) {
  return {
    _id: conversationId,
    $or: [{ buyerId: userId }, { sellerId: userId }]
  };
}

async function findConversation(conversationId, userId) {
  return Conversation.findOne(conversationFilter(conversationId, userId));
}

function presentConversation(conversation, listing, otherUser, lastMessage = null) {
  return {
    id: idString(conversation._id),
    listingId: idString(conversation.listingId),
    buyerId: idString(conversation.buyerId),
    sellerId: idString(conversation.sellerId),
    locationSet: conversation.locationSet,
    agreedMeetupSuggestionId: idString(conversation.agreedMeetupSuggestionId) ?? null,
    isClosed: conversation.isClosed,
    closedAt: conversation.closedAt,
    closedBy: idString(conversation.closedBy) ?? null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    listing: listing ? {
      id: idString(listing._id),
      title: listing.title,
      priceCents: listing.priceCents,
      currency: listing.currency
    } : null,
    otherParticipant: otherUser ? {
      id: idString(otherUser._id),
      displayName: otherUser.displayName || otherUser.username || "Marketplace user"
    } : null,
    lastMessage: lastMessage ? {
      body: lastMessage.body,
      senderId: idString(lastMessage.senderId),
      createdAt: lastMessage.createdAt
    } : null
  };
}

async function presentForUser(conversation, userId, includeLastMessage = false) {
  const otherId = idString(conversation.buyerId) === idString(userId)
    ? conversation.sellerId
    : conversation.buyerId;
  const [listing, otherUser, lastMessage] = await Promise.all([
    Listing.findById(conversation.listingId),
    User.findById(otherId),
    includeLastMessage
      ? Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1, _id: -1 })
      : Promise.resolve(null)
  ]);
  return presentConversation(conversation, listing, otherUser, lastMessage);
}

module.exports = (app, requireAuth) => {
  app.get("/api/conversations", requireAuth, async (req, res) => {
    const conversations = await Conversation.find({
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }]
    }).sort({ updatedAt: -1, _id: -1 }).limit(100);

    const results = await Promise.all(
      conversations.map(conversation => presentForUser(conversation, req.user._id, true))
    );
    res.json(results);
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    const listingId = req.body?.listingId;
    if (typeof listingId !== "string" || !mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ error: "A valid listingId is required." });
    }

    const listing = await Listing.findById(listingId);
    if (!listing || listing.status !== "active") {
      return res.status(404).json({ error: "Active listing not found." });
    }
    if (idString(listing.sellerId) === idString(req.user._id)) {
      return res.status(403).json({ error: "You cannot message yourself about your listing." });
    }

    const filter = { listingId: listing._id, buyerId: req.user._id, sellerId: listing.sellerId };
    let conversation = await Conversation.findOne(filter);
    let created = false;
    if (!conversation) {
      try {
        conversation = await Conversation.create(filter);
        created = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        conversation = await Conversation.findOne(filter);
      }
    }

    const response = await presentForUser(conversation, req.user._id);
    res.status(created ? 201 : 200).json(response);
  });

  app.get("/api/conversations/:conversationId", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    res.json(await presentForUser(conversation, req.user._id));
  });

  app.get("/api/conversations/:conversationId/messages", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1, _id: 1 })
      .limit(200);
    res.json(messages.map(message => ({
      id: idString(message._id),
      conversationId: idString(message.conversationId),
      senderId: idString(message.senderId),
      recipientId: idString(message.recipientId),
      body: message.body,
      createdAt: message.createdAt
    })));
  });

  app.post("/api/conversations/:conversationId/messages", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body || body.length > 4000) {
      return res.status(400).json({ error: "Message body must contain 1 to 4000 characters." });
    }

    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.isClosed) return res.status(409).json({ error: "This conversation is closed." });

    const senderIsBuyer = idString(conversation.buyerId) === idString(req.user._id);
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      recipientId: senderIsBuyer ? conversation.sellerId : conversation.buyerId,
      body
    });
    await Conversation.updateOne({ _id: conversation._id }, { $set: { updatedAt: new Date() } });

    res.status(201).json({
      id: idString(message._id),
      conversationId: idString(message.conversationId),
      senderId: idString(message.senderId),
      recipientId: idString(message.recipientId),
      body: message.body,
      createdAt: message.createdAt
    });
  });

  app.patch("/api/conversations/:conversationId/close", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (!conversation.isClosed) {
      await Conversation.updateOne(
        { _id: conversation._id, isClosed: false },
        { $set: { isClosed: true, closedAt: new Date(), closedBy: req.user._id } }
      );
    }
    const updated = await findConversation(req.params.conversationId, req.user._id);
    res.json({ isClosed: updated.isClosed, closedAt: updated.closedAt, closedBy: idString(updated.closedBy) ?? null });
  });
};

module.exports.findConversation = findConversation;
module.exports.presentForUser = presentForUser;
