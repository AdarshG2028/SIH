const mongoose = require("mongoose");

const maintenanceScheduleSchema = new mongoose.Schema(
  {
    schedule_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    asset_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    last_maintenance_date: {
      type: Date,
    },

    maintenance_interval_days: {
      type: Number,
    },

    next_scheduled_date: {
      type: Date,
      index: true,
    },

    maintenance_priority: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "maintenance_schedules",
  }
);

module.exports = mongoose.model(
  "MaintenanceSchedule",
  maintenanceScheduleSchema
);