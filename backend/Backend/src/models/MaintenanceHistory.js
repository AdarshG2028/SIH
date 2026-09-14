const mongoose = require("mongoose");

const maintenanceHistorySchema = new mongoose.Schema(
  {
    maintenance_id: {
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

    maintenance_date: {
      type: Date,
      index: true,
    },

    maintenance_type: {
      type: String,
    },

    maintenance_reason: {
      type: String,
    },

    downtime_hours: {
      type: Number,
    },

    cost_inr: {
      type: Number,
    },

    technician_team: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "maintenance_history",
  },
);

module.exports = mongoose.model("MaintenanceHistory", maintenanceHistorySchema);
