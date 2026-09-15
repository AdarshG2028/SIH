const {
  loadRiskEnrichedTasks,
  groupMultiDepartmentLocations,
} = require("../services/multiDepartmentGrouping.service");
const { buildOptimizedPlan, resolveBlockWindow } = require("../services/blockPlanBuilder.service");

const getDemoPlan = async (req, res, next) => {
  try {
    const { blocks, optimizedPlan } = await buildOptimizedPlan();

    res.json({
      success: true,
      data: blocks.slice(0, 10),
      optimizedPlan,
    });
  } catch (error) {
    next(error);
  }
};

const getPeriodPlan = async (req, res, next) => {
  try {
    const enrichedTasks = await loadRiskEnrichedTasks();
    const multiDepartmentGroups = groupMultiDepartmentLocations(enrichedTasks);

    const selectedGroups = multiDepartmentGroups.slice(0, 5);

    const monthlyJobs = [];
    const weeklyJobs = [];

    for (const group of selectedGroups) {
      const sortedTasks = [...group.tasks].sort(
        (a, b) => b.risk.risk_score - a.risk.risk_score,
      );

      // Take the strongest high-risk job
      // from each department.
      const departmentJobs = [];

      for (const department of group.departments) {
        const departmentTask = sortedTasks.find(
          (task) =>
            task.department === department && task.risk.risk_score >= 40,
        );

        if (departmentTask) {
          departmentJobs.push(departmentTask);
        }
      }

      monthlyJobs.push(...departmentJobs);

      // One resolved window per location, shared by every department's job
      // there — same model as getDemoPlan's blocks. Real when the location
      // is a section with seeded train data, an honestly-labeled estimate
      // otherwise (see resolveBlockWindow / #8 planning notes above).
      const window = await resolveBlockWindow(group.location);
      const slotLabel =
        `${window.serviceDay} ${window.windowStart}–${window.windowEnd}` +
        (window.windowSource === "estimated" ? " (est.)" : "");

      for (const job of departmentJobs) {
        weeklyJobs.push({ ...job, executionSlot: slotLabel });
      }
    }

    const monthlyDepartments = [
      ...new Set(monthlyJobs.map((task) => task.department)),
    ];

    const weeklyDepartments = [
      ...new Set(weeklyJobs.map((task) => task.department)),
    ];

    const formatJob = (task, executionSlot) => ({
      taskId: task.taskId,
      assetId: task.assetId,
      department: task.department,
      taskType: task.taskType,
      riskScore: task.risk.risk_score,
      riskLevel: task.risk.risk_level,
      ...(executionSlot ? { executionSlot } : {}),
    });

    const monthlyPlan = {
      period: "Current Month",

      objective: "Reserve capacity for high-risk major maintenance",

      reservedBlocks: selectedGroups.length,

      reservedJobs: monthlyJobs.length,

      departments: monthlyDepartments,

      jobs: monthlyJobs.map((task) => formatJob(task)),
    };

    const weeklyPlan = {
      period: "Current Week",

      objective: "Assign exact execution slots from reserved capacity",

      plannedBlocks: selectedGroups.length,

      plannedJobs: weeklyJobs.length,

      departments: weeklyDepartments,

      jobs: weeklyJobs.map((task) => formatJob(task, task.executionSlot)),
    };

    res.json({
      success: true,
      data: {
        monthlyPlan,
        weeklyPlan,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Real before/after numbers computed from the CURRENT plan (same one
 * getDemoPlan returns), not the static "7 blocks -> 3 blocks" constants in
 * ML/planning/evaluation_metrics.py — that endpoint (/api/ai/kpis) can't
 * compute anything real because the Python engine only ever sees its own
 * ~10-task JSON sample, never this repo's real Mongo data.
 *
 * "Before" = if these same tasks were NOT combined, each department's task
 * at a shared location would need its own separate block. That's a real,
 * direct reading of the plan's own grouping — not an invented number.
 * Conflicts-avoided and an "asset availability %" aren't included: neither
 * has a real basis to compute from this data (see the #8/B planning
 * notes) — no per-department real train-conflict data exists for most of
 * these (bare-station) locations, and Asset has no availability concept
 * at all. Fabricating them would be worse than omitting them.
 */
const getPlanKpis = async (req, res, next) => {
  try {
    const { optimizedPlan } = await buildOptimizedPlan();
    const blocks = optimizedPlan.blocks;

    const blocksAfter = blocks.length;
    const blocksBefore = blocks.reduce((sum, b) => sum + b.departments.length, 0);

    const hoursAfter = blocks.reduce((sum, b) => sum + b.durationMinutes / 60, 0);
    // Each block's `departments.length` separate single-department blocks
    // would need at least a similar duration at that same location.
    const hoursBefore = blocks.reduce(
      (sum, b) => sum + (b.durationMinutes / 60) * b.departments.length,
      0,
    );

    const realWindowBlocks = blocks.filter((b) => b.windowSource === "real_network_data").length;

    res.json({
      success: true,
      data: {
        basis: "This run's actual shadow-block plan (GET /planning/demo), not a fixed benchmark",
        blocksBefore,
        blocksAfter,
        blocksSaved: blocksBefore - blocksAfter,
        hoursBefore: Math.round(hoursBefore * 10) / 10,
        hoursAfter: Math.round(hoursAfter * 10) / 10,
        hoursSaved: Math.round((hoursBefore - hoursAfter) * 10) / 10,
        departmentsConsolidated: blocksBefore,
        realWindowBlocks,
        estimatedWindowBlocks: blocksAfter - realWindowBlocks,
        assumption:
          "'Before' assumes each department's task at a shared location would otherwise need its own separate block of similar duration. Excludes conflicts-avoided and availability% — no real per-department train-conflict data exists for most of these (single-station) locations, and Asset has no availability field to derive one from.",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDemoPlan,
  getPeriodPlan,
  getPlanKpis,
};
