require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const GraphicsCard = require("./models/GraphicsCard");
const Listing = require("./models/Listing");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "6mb" }));

const LISTING_CONDITIONS = new Set(["new", "used", "refurbished"]);

function signToken(userId, tokenVersion = 0) {
  return jwt.sign(
    { sub: userId.toString(), version: tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function requireAuth(req, res, next) {
  try {
    const header = req.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match || !process.env.JWT_SECRET) {
      return res.status(401).json({ error: "Authentication required." });
    }

    let payload;
    try {
      payload = jwt.verify(match[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    if (!payload || !mongoose.isValidObjectId(payload.sub)) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const user = await User.findById(payload.sub);

    if (!user || user.isDisabled || (payload.version ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(500).json({
      error: "An error occurred while checking authentication."
    });
  }
}

function readPositiveInt(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^[1-9]\d*$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed)) return parsed;
  }

  return null;
}

function readPriceCents(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed)) return parsed;
  }

  return null;
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "API is running"
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const { firstName, lastName, login, email, password } = req.body ?? {};

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof login !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !firstName.trim() ||
      !lastName.trim() ||
      !login.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "First name, last name, login, email, and password are required."
      });
    }

    // bcrypt only uses the first 72 bytes of a password.
    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        error: "Password must be no longer than 72 UTF-8 bytes."
      });
    }

    const cleanLogin = login.trim();
    const cleanEmail = email.trim();

    const existingUser = await User.findOne({
      $or: [
        { username: cleanLogin },
        { email: cleanEmail }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        error: "That username or email is already in use."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: cleanLogin,
      email: cleanEmail,
      passwordHash,
      sellerRating: {
        average: null,
        count: 0
      },
      isAdmin: false,
      isDisabled: false
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully."
    });
  } catch (error) {
    // MongoDB's unique indexes also protect against duplicate requests.
    if (error.code === 11000) {
      return res.status(409).json({
        error: "That username or email is already in use."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      error: "An error occurred while registering the user."
    });
  }
});


app.post("/api/login", async (req, res) => {
  try {
    const { login, password } = req.body ?? {};

    if (
      typeof login !== "string" ||
      typeof password !== "string" ||
      !login.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Login and password are required."
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(401).json({
        error: "Invalid login or password."
      });
    }

    const cleanLogin = login.trim();

    const user = await User.findOne({
      username: cleanLogin
    });

    if (!user || user.isDisabled || typeof user.passwordHash !== "string") {
      return res.status(401).json({
        error: "Invalid login or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid login or password."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({
        error: "An error occurred while logging in."
      });
    }

    return res.status(200).json({
      message: "Login successful.",
      token: signToken(user._id, user.tokenVersion),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        login: user.username
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      error: "An error occurred while logging in."
    });
  }
});

function presentListing(listing, graphicsCard) {
  return {
    _id: listing._id,
    sellerId: listing.sellerId,
    title: listing.title,
    priceCents: listing.priceCents,
    currency: listing.currency,
    status: listing.status,
    condition: listing.condition,
    imageUrls: listing.imageUrls ?? [],
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    graphicsCard: graphicsCard
      ? {
          _id: graphicsCard._id,
          modelName: graphicsCard.modelName,
          gpuManufacturer: graphicsCard.gpuManufacturer,
          boardPartner: graphicsCard.boardPartner ?? "",
          vramGB: graphicsCard.vramGB
        }
      : null
  };
}

app.post("/api/listings", requireAuth, async (req, res) => {
  let createdGraphicsCard = null;

  try {
    const body = req.body ?? {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const modelName = typeof body.modelName === "string" ? body.modelName.trim() : "";
    const gpuManufacturer = typeof body.gpuManufacturer === "string" ? body.gpuManufacturer.trim() : "";
    const boardPartner = typeof body.boardPartner === "string" ? body.boardPartner.trim() : "";
    const condition = typeof body.condition === "string" ? body.condition.trim().toLowerCase() : "";
    const priceCents = readPriceCents(body.priceCents);
    const vramGB = readPositiveInt(body.vramGB);
    const currency = typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : "USD";

    if (
      !title ||
      !modelName ||
      !gpuManufacturer ||
      !LISTING_CONDITIONS.has(condition) ||
      priceCents === null ||
      vramGB === null ||
      currency.length > 8
    ) {
      return res.status(400).json({
        error: "Title, priceCents, condition (new, used, or refurbished), modelName, gpuManufacturer, and vramGB are required."
      });
    }

    let imageUrls = [];
    if (body.imageUrls !== undefined) {
      if (!Array.isArray(body.imageUrls) || body.imageUrls.some((url) => typeof url !== "string")) {
        return res.status(400).json({
          error: "imageUrls must be an array of strings."
        });
      }
      imageUrls = body.imageUrls.map((url) => url.trim()).filter(Boolean);
      if (imageUrls.length > 4 || imageUrls.some(url => !require("./utils/images").validImage(url))) {
        return res.status(400).json({ error: "Use up to four JPEG, PNG, or WebP photos of at most 1 MB each, or HTTPS image URLs." });
      }
    }

    createdGraphicsCard = await GraphicsCard.create({
      modelName,
      gpuManufacturer,
      boardPartner,
      vramGB,
      msrpPriceCents: null,
      currency,
      userId: req.user._id,
      benchmarkInfo: {
        benchmarkName: null,
        benchmarkVersion: null,
        score: null,
        sourceUrl: null,
        testedAt: null
      }
    });

    const listing = await Listing.create({
      graphicsCardId: createdGraphicsCard._id,
      sellerId: req.user._id,
      title,
      priceCents,
      currency,
      status: "active",
      condition,
      imageUrls
    });

    return res.status(201).json(presentListing(listing, createdGraphicsCard));
  } catch (error) {
    if (createdGraphicsCard) {
      await GraphicsCard.deleteOne({ _id: createdGraphicsCard._id, userId: req.user._id });
    }

    console.error("Create listing error:", error.message);

    return res.status(500).json({
      error: "An error occurred while creating the listing."
    });
  }
});

app.get("/api/listings", requireAuth, async (req, res) => {
  try {
    const filter = req.query.mine === "true" ? { sellerId: req.user._id } : { status: "active" };
    if (req.query.model !== undefined) {
      if (typeof req.query.model !== "string" || req.query.model.length > 100) {
        return res.status(400).json({ error: "Model must be at most 100 characters." });
      }
      const escaped = req.query.model.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cards = await GraphicsCard.find({ modelName: { $regex: escaped, $options: "i" } }).select("_id");
      filter.graphicsCardId = { $in: cards.map(card => card._id) };
    }
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const listings = await Listing.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 24).limit(24);
    const graphicsCardIds = listings.map((listing) => listing.graphicsCardId);
    const graphicsCards = await GraphicsCard.find({ _id: { $in: graphicsCardIds } });
    const graphicsCardsById = new Map(
      graphicsCards.map((graphicsCard) => [graphicsCard._id.toString(), graphicsCard])
    );

    return res.status(200).json(
      listings.map((listing) => presentListing(
        listing,
        graphicsCardsById.get(listing.graphicsCardId?.toString()) ?? null
      ))
    );
  } catch (error) {
    console.error("List listings error:", error.message);

    return res.status(500).json({
      error: "An error occurred while loading listings."
    });
  }
});

require("./routes/profile")(app, requireAuth);
require("./routes/listingDetails")(app, requireAuth, presentListing);

require("./routes/ratings")(app, requireAuth);

require("./routes/passwordReset")(app);
app.use((error, req, res, next) => {
  console.error("API request failed:", error.message);
  if (res.headersSent) return next(error);
  const status = [400, 413].includes(error.status) ? error.status : 500;
  res.status(status).json({ error: status === 413 ? "Uploaded request is too large." : status === 400 ? "Invalid request body." : "An unexpected error occurred." });
});

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    await require("./models/Rating").createIndexes();
    console.log("Connected to MongoDB");

    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Server running at http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Could not start the server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) startServer();
module.exports = { app, startServer };
