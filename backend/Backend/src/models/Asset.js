const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    asset_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    asset_type: {
      type: String,
      required: true,
    },

    station_code: {
      type: String,
    },

    station_name: {
      type: String,
    },

    installation_date: {
      type: Date,
    },

    asset_age_years: {
      type: Number,
    },

    expected_life_years: {
      type: Number,
    },

    initial_condition_score: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: "assets",
  },
);

module.exports = mongoose.model("Asset", assetSchema);
