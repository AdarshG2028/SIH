const mongoose = require("mongoose");

const assetUsageSchema = new mongoose.Schema(
  {
    usage_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    asset_id: {
      type: String,
      required: true,
      index: true,
    },

    usage_month: {
      type: Date,
      required: true,
      index: true,
    },

    train_passages: {
      type: Number,
    },

    usage_index: {
      type: Number,
    },

    cumulative_usage: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: "asset_usage",
  },
);

module.exports = mongoose.model("AssetUsage", assetUsageSchema);
