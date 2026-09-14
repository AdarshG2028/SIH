const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema(
  {
    inspection_id: {
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

    inspection_date: {
      type: Date,
      required: true,
      index: true,
    },

    condition_score: {
      type: Number,
    },

    wear_level: {
      type: Number,
    },

    defect_count: {
      type: Number,
    },

    inspector_id: {
      type: String,
    },

    inspection_status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Inspection", inspectionSchema);