const mongoose = require("mongoose");

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },

    at: {
      type: Date,
      default: Date.now,
    },

    by: {
      type: String,
      default: "system",
    },

    note: String,
  },
  { _id: false },
);

const blockRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    sectionId: {
      type: String,
      required: true,
      index: true,
    },

    department: {
      type: String,
      required: true,
    },

    maintenanceType: String,
    fromKm: Number,
    toKm: Number,
    preferredDate: String,

    // Raw form submitted by the frontend.
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Full decision JSON returned by the ML engine, stored unchanged.
    decision: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["recommended", "needs_review", "accepted", "rejected"],
      default: "recommended",
      index: true,
    },

    selectedWindow: mongoose.Schema.Types.Mixed,

    // Latest imported ML risk score for the form's assetId (if provided).
    assetRisk: mongoose.Schema.Types.Mixed,

    auditTrail: [auditEntrySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("BlockRequest", blockRequestSchema);
