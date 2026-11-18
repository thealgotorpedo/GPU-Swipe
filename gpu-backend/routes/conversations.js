const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Listing = require("../models/Listing");
const User = require("../models/User");
const Message = require("../models/Message");
const MeetupSuggestion = require("../models/MeetupSuggestion");

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

function presentMeetupSuggestion(suggestion) {
  return {
    id: idString(suggestion._id),
    conversationId: idString(suggestion.conversationId),
    suggestedBy: idString(suggestion.suggestedBy),
    acceptedBy: idString(suggestion.acceptedBy) ?? null,
    placeName: suggestion.placeName,
    address: suggestion.address,
    notes: suggestion.notes,
    status: suggestion.status,
    createdAt: suggestion.createdAt,
    updatedAt: suggestion.updatedAt
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
      .sort({ createdAt: -1, _id: -1 })
      .limit(200);
    res.json(messages.reverse().map(message => ({
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

  app.get("/api/conversations/:conversationId/meetups", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    const suggestions = await MeetupSuggestion.find({ conversationId: conversation._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(100);
    res.json(suggestions.map(presentMeetupSuggestion));
  });

  app.post("/api/conversations/:conversationId/meetups", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID." });
    }
    const placeName = typeof req.body?.placeName === "string" ? req.body.placeName.trim() : "";
    const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
    if (!placeName || placeName.length > 150 || !address || address.length > 500 || notes.length > 1000) {
      return res.status(400).json({ error: "Provide a place name (1-150 chars), address (1-500 chars), and notes up to 1000 chars." });
    }

    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.isClosed) return res.status(409).json({ error: "This conversation is closed." });

    await MeetupSuggestion.updateMany(
      { conversationId: conversation._id, status: { $in: ["proposed", "accepted"] } },
      { $set: { status: "superseded", acceptedBy: null } }
    );
    await Conversation.updateOne(
      { _id: conversation._id, isClosed: false },
      { $set: { locationSet: false, agreedMeetupSuggestionId: null, updatedAt: new Date() } }
    );
    const suggestion = await MeetupSuggestion.create({
      conversationId: conversation._id,
      suggestedBy: req.user._id,
      placeName,
      address,
      notes,
      status: "proposed"
    });
    res.status(201).json(presentMeetupSuggestion(suggestion));
  });

  app.post("/api/conversations/:conversationId/meetups/:suggestionId/accept", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId) || !mongoose.isValidObjectId(req.params.suggestionId)) {
      return res.status(400).json({ error: "Invalid conversation or meetup suggestion ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.isClosed) return res.status(409).json({ error: "This conversation is closed." });

    const suggestion = await MeetupSuggestion.findOne({
      _id: req.params.suggestionId,
      conversationId: conversation._id
    });
    if (!suggestion) return res.status(404).json({ error: "Meetup suggestion not found." });
    if (idString(suggestion.suggestedBy) === idString(req.user._id)) {
      return res.status(403).json({ error: "The proposer has already agreed; the other participant must accept." });
    }
    if (suggestion.status !== "proposed") {
      return res.status(409).json({ error: "This meetup suggestion is no longer pending." });
    }

    let accepted;
    try {
      accepted = await MeetupSuggestion.findOneAndUpdate(
        { _id: suggestion._id, conversationId: conversation._id, status: "proposed" },
        { $set: { status: "accepted", acceptedBy: req.user._id } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "Another meetup location has already been accepted." });
      throw error;
    }
    if (!accepted) return res.status(409).json({ error: "This meetup suggestion is no longer pending." });

    const updatedConversation = await Conversation.findOneAndUpdate(
      { _id: conversation._id, isClosed: false },
      { $set: { locationSet: true, agreedMeetupSuggestionId: accepted._id, updatedAt: new Date() } },
      { new: true }
    );
    if (!updatedConversation) {
      await MeetupSuggestion.updateOne(
        { _id: accepted._id, status: "accepted" },
        { $set: { status: "proposed", acceptedBy: null } }
      );
      return res.status(409).json({ error: "This conversation is closed." });
    }
    res.json({ suggestion: presentMeetupSuggestion(accepted), locationSet: true });
  });

  app.post("/api/conversations/:conversationId/meetups/:suggestionId/decline", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId) || !mongoose.isValidObjectId(req.params.suggestionId)) {
      return res.status(400).json({ error: "Invalid conversation or meetup suggestion ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.isClosed) return res.status(409).json({ error: "This conversation is closed." });

    const suggestion = await MeetupSuggestion.findOne({
      _id: req.params.suggestionId,
      conversationId: conversation._id
    });
    if (!suggestion) return res.status(404).json({ error: "Meetup suggestion not found." });
    if (idString(suggestion.suggestedBy) === idString(req.user._id)) {
      return res.status(403).json({ error: "The proposer cannot decline their own suggestion." });
    }
    const declined = await MeetupSuggestion.findOneAndUpdate(
      { _id: suggestion._id, conversationId: conversation._id, status: "proposed" },
      { $set: { status: "declined" } },
      { new: true, runValidators: true }
    );
    if (!declined) return res.status(409).json({ error: "This meetup suggestion is no longer pending." });
    res.json(presentMeetupSuggestion(declined));
  });

  app.delete("/api/conversations/:conversationId/meetups/:suggestionId", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.conversationId) || !mongoose.isValidObjectId(req.params.suggestionId)) {
      return res.status(400).json({ error: "Invalid conversation or meetup suggestion ID." });
    }
    const conversation = await findConversation(req.params.conversationId, req.user._id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (conversation.isClosed) return res.status(409).json({ error: "This conversation is closed." });
    const suggestion = await MeetupSuggestion.findOneAndUpdate(
      {
        _id: req.params.suggestionId,
        conversationId: conversation._id,
        suggestedBy: req.user._id,
        status: "proposed"
      },
      { $set: { status: "withdrawn" } },
      { new: true, runValidators: true }
    );
    if (!suggestion) return res.status(404).json({ error: "Pending meetup suggestion not found." });
    res.json(presentMeetupSuggestion(suggestion));
  });
};

module.exports.findConversation = findConversation;
module.exports.presentForUser = presentForUser;
