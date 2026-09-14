const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
    },

    lat: {
      type: Number,
    },

    lon: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: "stations",
  },
);

module.exports = mongoose.model("Station", stationSchema);
