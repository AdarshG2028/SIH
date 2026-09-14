const mongoose = require("mongoose");

const assetRiskScoreSchema = new mongoose.Schema(
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

    actual: {
      type: Number,
    },

    predicted_probability: {
      type: Number,
      required: true,
    },

    predicted_class: {
      type: Number,
    },

    risk_probability: {
      type: Number,
      required: true,
    },

    risk_level: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      index: true,
    },

    risk_score: {
      type: Number,
      required: true,
    },

    recommended_action: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

assetRiskScoreSchema.index({
  asset_id: 1,
  snapshot_date: -1,
});

assetRiskScoreSchema.index({
  risk_level: 1,
  risk_score: -1,
});

module.exports = mongoose.model("AssetRiskScore", assetRiskScoreSchema);
