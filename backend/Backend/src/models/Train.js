const mongoose = require("mongoose");

const trainSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    name: String,

    type: String,

    type_label: String,

    runs_days: String,

    source_code: String,

    source: String,

    dest_code: String,

    destination: String,

    distance_km: Number,

    travel_time: String,

    num_stops: Number,
  },
  {
    timestamps: true,
    collection: "trains",
  },
);

module.exports = mongoose.model("Train", trainSchema);
