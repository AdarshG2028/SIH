const Task = require("../models/Task");
const {
  createDefectTasks,
  createOverdueMaintenanceTasks,
} = require("../services/taskAdapter.service");
const AssetRiskScore = require("../models/AssetRiskScore");
const getTasks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      department,
      sectionId,
      taskType,
      minScore,
      maxScore,
      dueBefore,
      dueAfter,
      search,
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 100);

    const filter = {
      status: "pending",
    };

    if (department) {
      filter.department = department;
    }

    if (sectionId) {
      filter.sectionId = sectionId;
    }

    if (taskType) {
      filter.taskType = taskType;
    }

    if (minScore !== undefined || maxScore !== undefined) {
      filter.criticalityScore = {};

      if (minScore !== undefined) {
        filter.criticalityScore.$gte = Number(minScore);
      }

      if (maxScore !== undefined) {
        filter.criticalityScore.$lte = Number(maxScore);
      }
    }

    if (dueBefore || dueAfter) {
      filter.dueDate = {};

      if (dueAfter) {
        filter.dueDate.$gte = new Date(dueAfter);
      }

      if (dueBefore) {
        filter.dueDate.$lte = new Date(dueBefore);
      }
    }

    if (search) {
      filter.$or = [
        { taskId: { $regex: search, $options: "i" } },
        { assetId: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { taskType: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (currentPage - 1) * pageSize;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ criticalityScore: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Task.countDocuments(filter),
    ]);

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

    const enrichedTasks = tasks.map((task) => {
      const risk = riskMap.get(task.assetId);

      return {
        ...task,
        risk: risk
          ? {
              riskLevel: risk.risk_level,
              riskScore: risk.risk_score,
              predictedProbability: risk.predicted_probability,
              recommendedAction: risk.recommended_action,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: enrichedTasks,
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

const generateDefectTasks = async (req, res, next) => {
  try {
    const defectResult = await createDefectTasks();
    const maintenanceResult = await createOverdueMaintenanceTasks();

    res.json({
      success: true,
      defects: defectResult,
      overdueMaintenance: maintenanceResult,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  generateDefectTasks,
};
