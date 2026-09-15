const Asset = require("../models/Asset");
const Inspection = require("../models/Inspection");
const AssetUsage = require("../models/AssetUsage");
const FailureEvent = require("../models/FailureEvent");
const MaintenanceHistory = require("../models/MaintenanceHistory");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");
const AssetRiskScore = require("../models/AssetRiskScore");
const AssetExplanation = require("../models/AssetExplanation");

const getAssets = async (req, res, next) => {
  try {
    const { station, assetType, page, limit } = req.query;

    const filter = {};
    if (station) filter.station_code = station;
    if (assetType) filter.asset_type = assetType;

    // Pagination is opt-in: the assets register page relies on the
    // no-params call returning every asset for client-side filtering
    // (see assetsQuery's comment in frontend/src/lib/queries.ts), so that
    // behavior stays unless a caller actually asks for a page — which the
    // station dashboard's ?station= filter does.
    if (page === undefined && limit === undefined) {
      const assets = await Asset.find(filter).sort({ createdAt: -1 }).lean();

      return res.json({
        success: true,
        count: assets.length,
        data: assets,
      });
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (currentPage - 1) * pageSize;

    const [assets, total] = await Promise.all([
      Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Asset.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: assets.length,
      data: assets,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findOne({
      asset_id: req.params.assetId,
    }).lean();

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

const getAssetDetails = async (req, res, next) => {
  try {
    const { assetId } = req.params;

    const asset = await Asset.findOne({
      asset_id: assetId,
    }).lean();

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const [
      inspections,
      usage,
      failures,
      maintenance,
      schedule,
      riskHistory,
      explanation,
    ] = await Promise.all([
      Inspection.find({ asset_id: assetId })
        .sort({ inspection_date: -1 })
        .lean(),

      AssetUsage.find({ asset_id: assetId }).sort({ usage_month: -1 }).lean(),

      FailureEvent.find({ asset_id: assetId })
        .sort({ failure_date: -1 })
        .lean(),

      MaintenanceHistory.find({ asset_id: assetId })
        .sort({ maintenance_date: -1 })
        .lean(),

      MaintenanceSchedule.findOne({ asset_id: assetId }).lean(),

      // Every snapshot, not just the latest, so the frontend can show a
      // real trend over time instead of a single point-in-time score.
      AssetRiskScore.find({ asset_id: assetId })
        .sort({ snapshot_date: -1 })
        .lean(),

      AssetExplanation.findOne({ asset_id: assetId })
        .sort({ snapshot_date: -1 })
        .lean(),
    ]);

    // Same failure_type recurring more than once — a real signal from data
    // already being fetched, not a new query.
    const failureTypeCounts = new Map();
    for (const f of failures) {
      if (!f.failure_type) continue;
      failureTypeCounts.set(f.failure_type, (failureTypeCounts.get(f.failure_type) || 0) + 1);
    }
    const recurringFailureTypes = [...failureTypeCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([type, count]) => ({ type, count }));

    res.json({
      success: true,
      data: {
        asset,
        inspections,
        usage,
        failures,
        maintenance,
        schedule,
        risk: riskHistory[0] || null, // latest — unchanged shape for existing consumers
        riskHistory,
        recurringFailureTypes,
        explanation,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  getAssetDetails,
};
