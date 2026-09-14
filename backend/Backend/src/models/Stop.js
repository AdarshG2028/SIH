const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    train_number: {
      type: Number,
      required: true,
      index: true,
    },

    seq: Number,

    station_code: {
      type: String,
      index: true,
    },

    station_name: String,

    day: Number,

    arrival: String,

    departure: String,

    halt_min: Number,

    distance_km: Number,
  },
  {
    timestamps: true,
    collection: "stops",
  },
);

module.exports = mongoose.model("Stop", stopSchema);
