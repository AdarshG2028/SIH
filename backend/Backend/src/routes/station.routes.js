const express = require("express");

const { listStations, listStationsWithGeo, getStationSummary } = require("../controllers/station.controller");

const router = express.Router();

router.get("/", listStations);
router.get("/geo", listStationsWithGeo);
router.get("/:code/summary", getStationSummary);

module.exports = router;
