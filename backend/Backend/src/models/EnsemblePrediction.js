const mongoose = require("mongoose");

const ensemblePredictionSchema = new mongoose.Schema(
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

    actual_maintenance: {
      type: Number,
    },

    lgb_probability: {
      type: Number,
    },

    cnn_probability: {
      type: Number,
    },

    rf_probability: {
      type: Number,
    },

    ensemble_probability: {
      type: Number,
      required: true,
    },

    predicted_maintenance: {
      type: Number,
    },

    threshold: {
      type: Number,
    },

    risk_level: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

ensemblePredictionSchema.index({
  asset_id: 1,
  snapshot_date: -1,
});

module.exports = mongoose.model("EnsemblePrediction", ensemblePredictionSchema);
