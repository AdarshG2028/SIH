const mongoose = require("mongoose");

const failureEventSchema = new mongoose.Schema(
  {
    failure_id: {
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

    failure_date: {
      type: Date,
      required: true,
      index: true,
    },

    failure_type: {
      type: String,
    },

    severity: {
      type: String,
    },

    downtime_hours: {
      type: Number,
    },

    resolved: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "failure_events",
  },
);

module.exports = mongoose.model("FailureEvent", failureEventSchema);
