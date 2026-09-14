const Task = require("../models/Task");
const AssetRiskScore = require("../models/AssetRiskScore");

const getDemoPlan = async (req, res, next) => {
  try {
    const departments = ["Track", "OHE", "Signalling"];

    const tasks = await Task.find({
      status: "pending",
      department: { $in: departments },
    })
      .sort({ criticalityScore: -1 })
      .lean();

    const assetIds = [
      ...new Set(tasks.map((task) => task.assetId).filter(Boolean)),
    ];

    const risks = await AssetRiskScore.find({
      asset_id: { $in: assetIds },
    })
      .sort({ snapshot_date: -1 })
      .lean();

    const riskMap = new Map();

    for (const risk of risks) {
      if (!riskMap.has(risk.asset_id)) {
        riskMap.set(risk.asset_id, risk);
      }
    }

    const enrichedTasks = tasks
      .map((task) => ({
        ...task,
        risk: riskMap.get(task.assetId),
      }))
      .filter((task) => task.risk);

    // Group tasks by location and asset.
    const grouped = new Map();

    for (const task of enrichedTasks) {
      const location = task.sectionId;

      if (!grouped.has(location)) {
        grouped.set(location, new Map());
      }

      const assetMap = grouped.get(location);
      const assetKey = task.assetId || task.taskId;

      if (!assetMap.has(assetKey)) {
        assetMap.set(assetKey, {
          ...task,
          findingCount: 1,
          taskIds: [task.taskId],
        });
      } else {
        const existing = assetMap.get(assetKey);

        existing.findingCount += 1;
        existing.taskIds.push(task.taskId);

        if (task.risk.risk_score > existing.risk.risk_score) {
          existing.risk = task.risk;
        }
      }
    }

    // Keep only locations containing multiple departments.
    const multiDepartmentGroups = [];

    for (const [location, assetMap] of grouped) {
      const sectionTasks = [...assetMap.values()];

      const locationDepartments = [
        ...new Set(sectionTasks.map((task) => task.department)),
      ];

      if (locationDepartments.length >= 2) {
        multiDepartmentGroups.push({
          location,
          tasks: sectionTasks,
          departments: locationDepartments,
        });
      }
    }

    // Highest-risk locations first.
    multiDepartmentGroups.sort((a, b) => {
      const riskA = Math.max(
        ...a.tasks.map((task) => task.risk.risk_score || 0),
      );

      const riskB = Math.max(
        ...b.tasks.map((task) => task.risk.risk_score || 0),
      );

      return riskB - riskA;
    });

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

      blocks.push({
        blockId: `BLOCK-${blocks.length + 1}`,

        sectionId: group.location,

        serviceDay: "Friday",
        windowStart: "10:00",
        windowEnd: "12:00",
        durationMinutes: 120,

        tasks: selectedTasks.map((task) => ({
          taskId: task.taskId,
          assetId: task.assetId,
          department: task.department,
          taskType: task.taskType,
          riskScore: task.risk.risk_score,
          riskLevel: task.risk.risk_level,
          findingCount: task.findingCount,
        })),

        departments: [...new Set(selectedTasks.map((task) => task.department))],

        averageRiskScore:
          selectedTasks.reduce((sum, task) => sum + task.risk.risk_score, 0) /
          selectedTasks.length,

        highestRiskScore: highestRisk,

        affectedTrains: 2,

        predictedDelayMinutes: Math.round(selectedTasks.length * 4),

        estimatedPrice: 10000 + selectedTasks.length * 5000,

        recommendation: highestRisk >= 60 ? "Recommended" : "Consider",

        // F7: Why was this block selected?
        whyThis: {
          highestRisk,
          departmentsCombined: [
            ...new Set(selectedTasks.map((task) => task.department)),
          ],
          jobsIncluded: selectedTasks.length,

          reason:
            highestRisk >= 60
              ? "Selected because it contains high-risk maintenance work and combines work across departments at the same location."
              : "Selected because it combines maintenance work across multiple departments at the same location.",

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
    const departments = ["Track", "OHE", "Signalling"];

    const tasks = await Task.find({
      status: "pending",
      department: { $in: departments },
    })
      .sort({ criticalityScore: -1 })
      .lean();

    const assetIds = [
      ...new Set(tasks.map((task) => task.assetId).filter(Boolean)),
    ];

    const risks = await AssetRiskScore.find({
      asset_id: { $in: assetIds },
    })
      .sort({ snapshot_date: -1 })
      .lean();

    const riskMap = new Map();

    for (const risk of risks) {
      if (!riskMap.has(risk.asset_id)) {
        riskMap.set(risk.asset_id, risk);
      }
    }

    const enrichedTasks = tasks
      .map((task) => ({
        ...task,
        risk: riskMap.get(task.assetId),
      }))
      .filter((task) => task.risk);

    // Group by location and asset.
    const grouped = new Map();

    for (const task of enrichedTasks) {
      const location = task.sectionId;

      if (!grouped.has(location)) {
        grouped.set(location, new Map());
      }

      const assetMap = grouped.get(location);
      const assetKey = task.assetId || task.taskId;

      if (!assetMap.has(assetKey)) {
        assetMap.set(assetKey, {
          ...task,
          findingCount: 1,
          taskIds: [task.taskId],
        });
      } else {
        const existing = assetMap.get(assetKey);

        existing.findingCount += 1;
        existing.taskIds.push(task.taskId);

        if (task.risk.risk_score > existing.risk.risk_score) {
          existing.risk = task.risk;
        }
      }
    }

    // Keep only locations with multiple departments.
    const multiDepartmentGroups = [];

    for (const [location, assetMap] of grouped) {
      const locationTasks = [...assetMap.values()];

      const locationDepartments = [
        ...new Set(locationTasks.map((task) => task.department)),
      ];

      if (locationDepartments.length >= 2) {
        multiDepartmentGroups.push({
          location,
          tasks: locationTasks,
          departments: locationDepartments,
        });
      }
    }

    // Rank locations by highest-risk maintenance job.
    multiDepartmentGroups.sort((a, b) => {
      const riskA = Math.max(
        ...a.tasks.map((task) => task.risk.risk_score || 0),
      );

      const riskB = Math.max(
        ...b.tasks.map((task) => task.risk.risk_score || 0),
      );

      return riskB - riskA;
    });

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
