// Shared by asset.controller.js's getAssetDetails AND the AI assistant's
// get_asset_details tool (see aiAssistant.service.js) — one implementation
// instead of the assistant re-querying Mongo its own way.
const Asset = require("../models/Asset");
const Inspection = require("../models/Inspection");
const AssetUsage = require("../models/AssetUsage");
const FailureEvent = require("../models/FailureEvent");
const MaintenanceHistory = require("../models/MaintenanceHistory");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");
const AssetRiskScore = require("../models/AssetRiskScore");
const AssetExplanation = require("../models/AssetExplanation");

/** Full asset record with every related history collection, or null if the asset doesn't exist. */
async function fetchAssetDetails(assetId) {
  const asset = await Asset.findOne({ asset_id: assetId }).lean();
  if (!asset) return null;

  const [inspections, usage, failures, maintenance, schedule, riskHistory, explanation] =
    await Promise.all([
      Inspection.find({ asset_id: assetId }).sort({ inspection_date: -1 }).lean(),
      AssetUsage.find({ asset_id: assetId }).sort({ usage_month: -1 }).lean(),
      FailureEvent.find({ asset_id: assetId }).sort({ failure_date: -1 }).lean(),
      MaintenanceHistory.find({ asset_id: assetId }).sort({ maintenance_date: -1 }).lean(),
      MaintenanceSchedule.findOne({ asset_id: assetId }).lean(),
      // Every snapshot, not just the latest — see docs/NETWORK_DATA.md-adjacent
      // note in asset.controller.js history: in practice this dataset has
      // exactly one snapshot per asset, but the query stays general.
      AssetRiskScore.find({ asset_id: assetId }).sort({ snapshot_date: -1 }).lean(),
      AssetExplanation.findOne({ asset_id: assetId }).sort({ snapshot_date: -1 }).lean(),
    ]);

  const failureTypeCounts = new Map();
  for (const f of failures) {
    if (!f.failure_type) continue;
    failureTypeCounts.set(f.failure_type, (failureTypeCounts.get(f.failure_type) || 0) + 1);
  }
  const recurringFailureTypes = [...failureTypeCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([type, count]) => ({ type, count }));

  return {
    asset,
    inspections,
    usage,
    failures,
    maintenance,
    schedule,
    risk: riskHistory[0] || null,
    riskHistory,
    recurringFailureTypes,
    explanation,
  };
}

module.exports = { fetchAssetDetails };
