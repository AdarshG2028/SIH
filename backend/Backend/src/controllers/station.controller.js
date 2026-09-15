const Asset = require("../models/Asset");
const Task = require("../models/Task");
const AssetRiskScore = require("../models/AssetRiskScore");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");
const { searchStations, getStation, getStationDirectory } = require("../services/stationDirectory.service");

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

    res.json({
      success: true,
      count: directory.filter((s) => s.hasGeo).length,
      data: directory.filter((s) => s.hasGeo),
    });
  } catch (error) {
    next(error);
  }
};

const getStationSummary = async (req, res, next) => {
  try {
    const { code } = req.params;

    const station = await getStation(code);

    if (!station) {
      return res.status(404).json({
        success: false,
        message: `Station ${code} not found in asset data`,
      });
    }

    const assets = await Asset.find({ station_code: code }).lean();
    const assetIds = assets.map((a) => a.asset_id);

    const [risks, pendingTasks, schedules] = await Promise.all([
      AssetRiskScore.find({ asset_id: { $in: assetIds } })
        .sort({ snapshot_date: -1 })
        .lean(),

      Task.find({ sectionId: code, status: "pending" }).lean(),

      MaintenanceSchedule.find({ asset_id: { $in: assetIds } }).lean(),
    ]);

    // Latest risk score per asset — `risks` holds every snapshot.
    const latestRiskByAsset = new Map();
    for (const risk of risks) {
      if (!latestRiskByAsset.has(risk.asset_id)) latestRiskByAsset.set(risk.asset_id, risk);
    }

    const riskLevelCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const risk of latestRiskByAsset.values()) {
      if (risk.risk_level in riskLevelCounts) riskLevelCounts[risk.risk_level] += 1;
    }

    const tasksByDepartment = {};
    for (const task of pendingTasks) {
      tasksByDepartment[task.department] = (tasksByDepartment[task.department] || 0) + 1;
    }

    const now = new Date();
    const overdueCount = schedules.filter(
      (s) => s.next_scheduled_date && new Date(s.next_scheduled_date) < now,
    ).length;

    res.json({
      success: true,
      data: {
        code: station.code,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
        assetCount: assets.length,
        assetTypes: station.assetTypes,
        riskLevelCounts,
        pendingTaskCount: pendingTasks.length,
        tasksByDepartment,
        overdueMaintenanceCount: overdueCount,
        assets: assets.map((a) => ({
          assetId: a.asset_id,
          assetType: a.asset_type,
          riskLevel: latestRiskByAsset.get(a.asset_id)?.risk_level,
          riskScore: latestRiskByAsset.get(a.asset_id)?.risk_score,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listStations, listStationsWithGeo, getStationSummary };
