const {
  loadRiskEnrichedTasks,
  groupMultiDepartmentLocations,
} = require("../services/multiDepartmentGrouping.service");
const { describeDepartmentSynergy } = require("../shared/departmentSynergy");
const { parseSectionId } = require("../shared/sections");
const { hasSectionData, listFreeWindows } = require("../services/impact.service");

/**
 * A real conflict-free window when the location happens to be a section
 * with seeded train data (rare for these locations in practice — most
 * multi-department overlaps are at a single station, e.g. Signal/OHE
 * equipment installed there, not a between-station section — see the #8
 * planning notes), and an honestly-labeled placeholder otherwise. Either
 * way the caller gets a real `windowSource` to show, rather than presenting
 * a guess as if it were computed.
 */
async function resolveBlockWindow(location) {
  const parsed = parseSectionId(location);

  if (parsed.isSection && (await hasSectionData(location))) {
    const windows = await listFreeWindows(location);
    const best = [...windows].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];

    if (best) {
      return {
        serviceDay: best.serviceDay,
        windowStart: best.windowStart,
        windowEnd: best.windowEnd,
        durationMinutes: best.durationMinutes,
        affectedTrains: 0, // buildSectionWindows only returns genuinely conflict-free gaps
        windowSource: "real_network_data",
      };
    }
  }

  // No real train/section data for this location (a bare station code, or
  // a section outside the seeded dataset) — Task/Asset don't carry km,
  // crew or equipment fields to estimate this more precisely from real
  // data, so this is a clearly-labeled placeholder, not a computed figure.
  return {
    serviceDay: "Friday",
    windowStart: "10:00",
    windowEnd: "12:00",
    durationMinutes: 120,
    affectedTrains: 2,
    windowSource: "estimated",
  };
}

const getDemoPlan = async (req, res, next) => {
  try {
    const enrichedTasks = await loadRiskEnrichedTasks();
    const multiDepartmentGroups = groupMultiDepartmentLocations(enrichedTasks);

    const blocks = [];

    for (const group of multiDepartmentGroups) {
      const sortedTasks = [...group.tasks]
        .filter((task) => task.risk.risk_score >= 40)
        .sort((a, b) => b.risk.risk_score - a.risk.risk_score);

      const selectedTasks = [];

      // Select the strongest job from each department.
      for (const department of group.departments) {
        const departmentTask = sortedTasks.find(
          (task) => task.department === department,
        );

        if (departmentTask) {
          selectedTasks.push(departmentTask);
        }
      }

      // Fill remaining block capacity with highest-risk jobs.
      for (const task of sortedTasks) {
        if (selectedTasks.length >= 5) {
          break;
        }

        if (!selectedTasks.includes(task)) {
          selectedTasks.push(task);
        }
      }

      if (!selectedTasks.length) {
        continue;
      }

      const highestRisk = selectedTasks[0].risk.risk_score;

      // Jobs considered but not selected.
      const pushedAsideTasks = sortedTasks
        .filter((task) => !selectedTasks.includes(task))
        .slice(0, 3);

      const departmentsCombined = [...new Set(selectedTasks.map((task) => task.department))];
      const window = await resolveBlockWindow(group.location);

      blocks.push({
        blockId: `BLOCK-${blocks.length + 1}`,

        sectionId: group.location,

        serviceDay: window.serviceDay,
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        durationMinutes: window.durationMinutes,
        windowSource: window.windowSource,

        tasks: selectedTasks.map((task) => ({
          taskId: task.taskId,
          assetId: task.assetId,
          department: task.department,
          taskType: task.taskType,
          riskScore: task.risk.risk_score,
          riskLevel: task.risk.risk_level,
          findingCount: task.findingCount,
        })),

        departments: departmentsCombined,

        averageRiskScore:
          selectedTasks.reduce((sum, task) => sum + task.risk.risk_score, 0) /
          selectedTasks.length,

        highestRiskScore: highestRisk,

        affectedTrains: window.affectedTrains,

        // Real when the window itself is real (genuinely 0 conflicts by
        // construction); an estimate otherwise — Task/Asset carry no
        // crew/equipment data to compute a real figure from. See #8
        // planning notes in backend/docs/NETWORK_DATA.md-adjacent context.
        predictedDelayMinutes:
          window.windowSource === "real_network_data" ? 0 : Math.round(selectedTasks.length * 4),

        // Always an estimate — Task/Asset have no cost fields at all.
        estimatedPrice: 10000 + selectedTasks.length * 5000,

        recommendation: highestRisk >= 60 ? "Recommended" : "Consider",

        // F7: Why was this block selected?
        whyThis: {
          highestRisk,
          departmentsCombined,
          jobsIncluded: selectedTasks.length,

          reason:
            (highestRisk >= 60
              ? "Selected because it contains high-risk maintenance work and combines work across departments at the same location. "
              : "Selected because it combines maintenance work across multiple departments at the same location. ") +
            describeDepartmentSynergy(departmentsCombined),

          pushedAside: pushedAsideTasks.map((task) => ({
            taskId: task.taskId,
            assetId: task.assetId,
            department: task.department,
            riskScore: task.risk.risk_score,
            riskLevel: task.risk.risk_level,
          })),
        },
      });
    }

    // Prototype optimization.
    const optimizedBlocks = [...blocks]
      .map((block) => ({
        ...block,
        optimizationScore:
          block.averageRiskScore +
          block.departments.length * 10 +
          block.tasks.length * 5,
      }))
      .sort((a, b) => b.optimizationScore - a.optimizationScore)
      .slice(0, 5);

    const optimizedPlan = {
      totalBlocks: optimizedBlocks.length,

      totalJobs: optimizedBlocks.reduce(
        (sum, block) => sum + block.tasks.length,
        0,
      ),

      departments: [
        ...new Set(optimizedBlocks.flatMap((block) => block.departments)),
      ],

      totalPredictedDelayMinutes: optimizedBlocks.reduce(
        (sum, block) => sum + block.predictedDelayMinutes,
        0,
      ),

      estimatedTotalPrice: optimizedBlocks.reduce(
        (sum, block) => sum + block.estimatedPrice,
        0,
      ),

      blocks: optimizedBlocks,
    };

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

      weeklyJobs.push(...departmentJobs);
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

      jobs: weeklyJobs.map((task, index) =>
        formatJob(task, `Block-${Math.floor(index / 3) + 1}`),
      ),
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

module.exports = {
  getDemoPlan,
  getPeriodPlan,
};
