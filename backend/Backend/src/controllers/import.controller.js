const Asset = require("../models/Asset");
const Inspection = require("../models/Inspection");
const AssetUsage = require("../models/AssetUsage");
const FailureEvent = require("../models/FailureEvent");
const MaintenanceHistory = require("../models/MaintenanceHistory");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");

const importCSV = require("../services/csvImport.service");

const models = {
  assets: Asset,
  inspections: Inspection,
  asset_usage: AssetUsage,
  failure_events: FailureEvent,
  maintenance_history: MaintenanceHistory,
  maintenance_schedule: MaintenanceSchedule,
};

const importData = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const Model = models[req.params.dataset];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid dataset",
      });
    }

    const result = await importCSV(req.file.path, Model);

    res.status(200).json({
      success: true,
      dataset: req.params.dataset,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { importData };
