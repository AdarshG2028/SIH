const mongoose = require("mongoose");

const blockWindowSchema = new mongoose.Schema(
  {
    sectionId: {
      type: String,
      required: true,
      index: true,
    },

    serviceDay: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      index: true,
    },

    windowStart: {
      type: String,
      required: true,
    },

    windowEnd: {
      type: String,
      required: true,
    },

    durationMinutes: {
      type: Number,
      required: true,
    },

    affectedTrains: [
      {
        trainNumber: String,
        delayMinutes: {
          type: Number,
          default: 0,
        },
        classWeight: {
          type: Number,
          default: 0,
        },
      },
    ],

    predictedDelayMinutes: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["available", "reserved", "used"],
      default: "available",
      index: true,
    },

    source: {
      type: String,
      default: "window_builder",
    },
  },
  { timestamps: true },
);

blockWindowSchema.index({
  sectionId: 1,
  serviceDay: 1,
  windowStart: 1,
});

module.exports = mongoose.model("BlockWindow", blockWindowSchema);
