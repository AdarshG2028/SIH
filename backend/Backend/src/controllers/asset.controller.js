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
    const assets = await Asset.find().sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: assets.length,
      data: assets,
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
      risk,
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

      AssetRiskScore.findOne({ asset_id: assetId })
        .sort({ snapshot_date: -1 })
        .lean(),

      AssetExplanation.findOne({ asset_id: assetId })
        .sort({ snapshot_date: -1 })
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        asset,
        inspections,
        usage,
        failures,
        maintenance,
        schedule,
        risk,
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
