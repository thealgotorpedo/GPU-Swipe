const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    username: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    displayName: { type: String, trim: true, default: "", maxlength: 100 },
    bio: { type: String, default: "", maxlength: 1000 },
    contactEmail: { type: String, default: "", maxlength: 254 },
    contactPhone: { type: String, default: "", maxlength: 40 },

    sellerRating: {
      average: {
        type: Number,
        default: null
      },
      count: {
        type: Number,
        default: 0
      }
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    isDisabled: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: "users",
    timestamps: true,
    autoIndex: false,
    autoCreate: false
  }
);

module.exports = mongoose.model("User", userSchema);
