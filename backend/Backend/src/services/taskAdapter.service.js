const Inspection = require("../models/Inspection");
const Asset = require("../models/Asset");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");
const Task = require("../models/Task");

const departmentMap = {
  Track: "Track",
  Bridge: "Track",
  "Level Crossing": "Track",
  OHE: "OHE",
  Signal: "Signalling",
  "Point Machine": "Signalling",
};

const createDefectTasks = async () => {
  const inspections = await Inspection.find({
    inspection_status: "Attention Required",
  }).lean();

  if (inspections.length === 0) {
    return {
      created: 0,
      message: "No pending defects found",
    };
  }

  const assetIds = [...new Set(inspections.map((item) => item.asset_id))];

  const assets = await Asset.find({
    asset_id: { $in: assetIds },
  }).lean();

  const assetMap = new Map(assets.map((asset) => [asset.asset_id, asset]));

  const tasks = inspections
    .map((inspection) => {
      const asset = assetMap.get(inspection.asset_id);

      if (!asset) {
        return null;
      }

      const department = departmentMap[asset.asset_type];

      if (!department) {
        return null;
      }

      return {
        taskId: `DEFECT-${inspection.inspection_id}`,
        department,
        sectionId: asset.station_code,
        assetId: asset.asset_id,
        taskType: "Defect",
        description: `${asset.asset_type} requires attention`,
        criticalityScore: 0,
        dueDate: inspection.inspection_date,
        status: "pending",
        source: "inspection_data",
      };
    })
    .filter(Boolean);

  if (tasks.length === 0) {
    return {
      created: 0,
      message: "No valid defect tasks found",
    };
  }

  const result = await Task.bulkWrite(
    tasks.map((task) => ({
      updateOne: {
        filter: { taskId: task.taskId },
        update: { $setOnInsert: task },
        upsert: true,
      },
    })),
  );

  return {
    created: result.upsertedCount || 0,
    matched: result.matchedCount || 0,
  };
};

const createOverdueMaintenanceTasks = async () => {
  const now = new Date();

  const schedules = await MaintenanceSchedule.find({
    next_scheduled_date: { $lt: now },
  }).lean();

  if (schedules.length === 0) {
    return {
      created: 0,
      message: "No overdue maintenance schedules found",
    };
  }

  const assetIds = [...new Set(schedules.map((item) => item.asset_id))];

  const assets = await Asset.find({
    asset_id: { $in: assetIds },
  }).lean();

  const assetMap = new Map(assets.map((asset) => [asset.asset_id, asset]));

  const tasks = schedules
    .map((schedule) => {
      const asset = assetMap.get(schedule.asset_id);

      if (!asset) {
        return null;
      }

      const department = departmentMap[asset.asset_type];

      if (!department) {
        return null;
      }

      return {
        taskId: `MAINT-${schedule.schedule_id}`,
        department,
        sectionId: asset.station_code,
        assetId: asset.asset_id,
        taskType: "Maintenance",
        description: `${asset.asset_type} maintenance is overdue`,
        criticalityScore: 0,
        dueDate: schedule.next_scheduled_date,
        status: "pending",
        source: "maintenance_schedule",
      };
    })
    .filter(Boolean);

  if (tasks.length === 0) {
    return {
      created: 0,
      message: "No valid overdue maintenance tasks found",
    };
  }

  const result = await Task.bulkWrite(
    tasks.map((task) => ({
      updateOne: {
        filter: { taskId: task.taskId },
        update: { $setOnInsert: task },
        upsert: true,
      },
    })),
  );

  return {
    created: result.upsertedCount || 0,
    matched: result.matchedCount || 0,
  };
};

module.exports = {
  createDefectTasks,
  createOverdueMaintenanceTasks,
};
