const {
  searchStations,
  getStationDirectory,
  fetchStationSummary,
} = require("../services/stationDirectory.service");

const listStations = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const stations = await searchStations(req.query.search, limit);

    res.json({
      success: true,
      count: stations.length,
      data: stations,
    });
  } catch (error) {
    next(error);
  }
};

/** Every station with real geo coordinates — what the block map (#7) plots. */
const listStationsWithGeo = async (req, res, next) => {
  try {
    const directory = await getStationDirectory();
    const withGeo = directory.filter((s) => s.hasGeo);

    res.json({
      success: true,
      count: withGeo.length,
      data: withGeo,
    });
  } catch (error) {
    next(error);
  }
};

const getStationSummary = async (req, res, next) => {
  try {
    const summary = await fetchStationSummary(req.params.code);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: `Station ${req.params.code} not found in asset data`,
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listStations, listStationsWithGeo, getStationSummary };
