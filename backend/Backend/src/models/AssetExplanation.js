const mongoose = require("mongoose");

const assetExplanationSchema = new mongoose.Schema(
  {
    asset_id: {
      type: String,
      required: true,
      index: true,
    },

    snapshot_date: {
      type: Date,
      required: true,
      index: true,
    },

    ensemble_probability: {
      type: Number,
      required: true,
    },

    risk_level: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      index: true,
    },

    top_reason_1: {
      type: String,
    },

    top_reason_2: {
      type: String,
    },

    top_reason_3: {
      type: String,
    },

    top_reason_4: {
      type: String,
    },

    top_reason_5: {
      type: String,
    },

    protective_factor_1: {
      type: String,
    },

    protective_factor_2: {
      type: String,
    },

    protective_factor_3: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

assetExplanationSchema.index({
  asset_id: 1,
  snapshot_date: -1,
});

module.exports = mongoose.model("AssetExplanation", assetExplanationSchema);
