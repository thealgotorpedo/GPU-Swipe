const mongoose = require("mongoose");

const graphicsCardSchema = new mongoose.Schema(
  {
    modelName: {
      type: String,
      required: true,
      trim: true
    },

    gpuManufacturer: {
      type: String,
      required: true,
      trim: true
    },

    boardPartner: {
      type: String,
      trim: true,
      default: ""
    },

    vramGB: {
      type: Number,
      required: true
    },

    msrpPriceCents: {
      type: Number,
      default: null
    },

    currency: {
      type: String,
      trim: true,
      default: "USD"
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    benchmarkInfo: {
      benchmarkName: {
        type: String,
        default: null
      },
      benchmarkVersion: {
        type: String,
        default: null
      },
      score: {
        type: Number,
        default: null
      },
      sourceUrl: {
        type: String,
        default: null
      },
      testedAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    collection: "graphicsCards",
    timestamps: true,
    autoIndex: false,
    autoCreate: false
  }
);

module.exports = mongoose.model("GraphicsCard", graphicsCardSchema);
