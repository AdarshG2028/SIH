// Shared by planning.controller.js's getDemoPlan and getPeriodPlan — both
// used to carry their own copy of this grouping logic. "Keep one planner"
// (see the feature plan's #8 notes) starts with not maintaining two copies
// of the same aggregation.
const Task = require("../models/Task");
const AssetRiskScore = require("../models/AssetRiskScore");

// Block building is in-memory: every pending task is grouped and joined against
// its risk score. On a full division (100k+ tasks) that takes minutes, so the
// planner works from the highest-criticality slice instead of the whole bank.
const PLANNING_TASK_LIMIT = Number(process.env.PLANNING_TASK_LIMIT) || 6000;

const DEPARTMENTS = ["Track", "OHE", "Signalling"];

/** Pending tasks (highest criticality first) joined with each asset's latest risk score. */
async function loadRiskEnrichedTasks() {
  const tasks = await Task.find({
    status: "pending",
    department: { $in: DEPARTMENTS },
  })
    .sort({ criticalityScore: -1 })
    .limit(PLANNING_TASK_LIMIT)
    .lean();

  const assetIds = [...new Set(tasks.map((task) => task.assetId).filter(Boolean))];

  const risks = await AssetRiskScore.find({ asset_id: { $in: assetIds } })
    .sort({ snapshot_date: -1 })
    .lean();

  const riskMap = new Map();
  for (const risk of risks) {
    if (!riskMap.has(risk.asset_id)) riskMap.set(risk.asset_id, risk);
  }

  return tasks.map((task) => ({ ...task, risk: riskMap.get(task.assetId) })).filter((t) => t.risk);
}

/**
 * Groups risk-enriched tasks by location (Task.sectionId — a station code
 * or a "FROM-TO" section id, see shared/sections.js), collapsing repeat
 * findings on the same asset into one entry, and keeps only locations
 * where >=2 different departments have pending work — the actual
 * multi-department combining opportunities.
 */
function groupMultiDepartmentLocations(enrichedTasks) {
  const grouped = new Map();

  for (const task of enrichedTasks) {
    const location = task.sectionId;

    if (!grouped.has(location)) grouped.set(location, new Map());

    const assetMap = grouped.get(location);
    const assetKey = task.assetId || task.taskId;

    if (!assetMap.has(assetKey)) {
      assetMap.set(assetKey, { ...task, findingCount: 1, taskIds: [task.taskId] });
    } else {
      const existing = assetMap.get(assetKey);
      existing.findingCount += 1;
      existing.taskIds.push(task.taskId);
      if (task.risk.risk_score > existing.risk.risk_score) existing.risk = task.risk;
    }
  }

  const multiDepartmentGroups = [];

  for (const [location, assetMap] of grouped) {
    const locationTasks = [...assetMap.values()];
    const locationDepartments = [...new Set(locationTasks.map((task) => task.department))];

    if (locationDepartments.length >= 2) {
      multiDepartmentGroups.push({ location, tasks: locationTasks, departments: locationDepartments });
    }
  }

  // Highest-risk locations first.
  multiDepartmentGroups.sort((a, b) => {
    const riskA = Math.max(...a.tasks.map((task) => task.risk.risk_score || 0));
    const riskB = Math.max(...b.tasks.map((task) => task.risk.risk_score || 0));
    return riskB - riskA;
  });

  return multiDepartmentGroups;
}

module.exports = { DEPARTMENTS, loadRiskEnrichedTasks, groupMultiDepartmentLocations };
