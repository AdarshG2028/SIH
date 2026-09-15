const BlockRequest = require("../models/BlockRequest");
const AssetRiskScore = require("../models/AssetRiskScore");
const {
  getMlApiUrl,
  evaluateBlockRequest,
  checkMlHealth,
} = require("../services/mlClient.service");

const ML_STATUS_MAP = {
  APPROVED_RECOMMENDED: "recommended",
  NEEDS_OFFICER_REVIEW: "needs_review",
};

const isMissingNumber = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  Number.isNaN(Number(value));

const validateBlockRequest = (body) => {
  const errors = [];

  if (!body.sectionId) {
    errors.push("sectionId is required");
  }

  if (!body.department) {
    errors.push("department is required");
  }

  if (isMissingNumber(body.fromKm)) {
    errors.push("fromKm must be a number");
  }

  if (isMissingNumber(body.toKm)) {
    errors.push("toKm must be a number");
  }

  if (!errors.length && Number(body.toKm) < Number(body.fromKm)) {
    errors.push("toKm must be greater than or equal to fromKm");
  }

  const durationHours = Number(
    body.schedulingPreferences?.durationHours ?? body.durationHours,
  );

  if (!(durationHours > 0)) {
    errors.push("schedulingPreferences.durationHours must be greater than 0");
  }

  return errors;
};

const getLatestAssetRisk = async (assetId) => {
  const risk = await AssetRiskScore.findOne({ asset_id: assetId })
    .sort({ snapshot_date: -1 })
    .lean();

  if (!risk) {
    return null;
  }

  return {
    asset_id: risk.asset_id,
    snapshot_date: risk.snapshot_date,
    risk_probability: risk.risk_probability,
    risk_score: risk.risk_score,
    risk_level: risk.risk_level,
    recommended_action: risk.recommended_action,
  };
};

const createBlockRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateBlockRequest(body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid block request",
        errors,
      });
    }

    const submittedAt = new Date();
    const input = {
      ...body,
      requestId: body.requestId || `REQ-${submittedAt.getTime()}`,
    };

    const exists = await BlockRequest.exists({ requestId: input.requestId });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Block request ${input.requestId} already exists`,
      });
    }

    const decision = await evaluateBlockRequest(input);

    const assetRisk = input.assetId
      ? await getLatestAssetRisk(input.assetId)
      : null;

    const blockRequest = await BlockRequest.create({
      requestId: input.requestId,
      sectionId: decision.sectionId,
      department: decision.department,
      maintenanceType: decision.maintenanceType,
      fromKm: decision.fromKm,
      toKm: decision.toKm,
      preferredDate: decision.userPreferences?.preferredDate,
      input,
      decision,
      status: ML_STATUS_MAP[decision.status] || "needs_review",
      selectedWindow: decision.recommendedWindow,
      assetRisk,
      auditTrail: [
        {
          action: "submitted",
          at: submittedAt,
          by: body.submittedBy || "user",
        },
        {
          action: "ml_evaluated",
          by: "ml-engine",
          note: `ML status ${decision.status}, score ${decision.recommendedWindow?.overallScore}`,
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: {
        id: blockRequest._id,
        requestId: blockRequest.requestId,
        status: blockRequest.status,
        selectedWindow: blockRequest.selectedWindow,
        decision,
        assetRisk,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listBlockRequests = async (req, res, next) => {
  try {
    const { status, sectionId } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (sectionId) {
      filter.sectionId = sectionId;
    }

    const blockRequests = await BlockRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      count: blockRequests.length,
      data: blockRequests,
    });
  } catch (error) {
    next(error);
  }
};

const getBlockRequest = async (req, res, next) => {
  try {
    const blockRequest = await BlockRequest.findOne({
      requestId: req.params.requestId,
    }).lean();

    if (!blockRequest) {
      return res.status(404).json({
        success: false,
        message: `Block request ${req.params.requestId} not found`,
      });
    }

    res.json({
      success: true,
      data: blockRequest,
    });
  } catch (error) {
    next(error);
  }
};

const selectAlternative = async (req, res, next) => {
  try {
    const { optionId, by, note } = req.body || {};

    const blockRequest = await BlockRequest.findOne({
      requestId: req.params.requestId,
    });

    if (!blockRequest) {
      return res.status(404).json({
        success: false,
        message: `Block request ${req.params.requestId} not found`,
      });
    }

    const alternatives = blockRequest.decision?.alternativeOptions || [];

    const window =
      optionId === "RECOMMENDED"
        ? blockRequest.decision?.recommendedWindow
        : alternatives.find((option) => option.optionId === optionId);

    if (!window) {
      return res.status(400).json({
        success: false,
        message: `Unknown optionId: ${optionId}`,
        availableOptions: [
          "RECOMMENDED",
          ...alternatives.map((option) => option.optionId),
        ],
      });
    }

    blockRequest.selectedWindow = window;
    blockRequest.auditTrail.push({
      action: "window_selected",
      by: by || "user",
      note: note || `Selected ${optionId} (${window.startTime}-${window.endTime})`,
    });

    await blockRequest.save();

    res.json({
      success: true,
      data: blockRequest,
    });
  } catch (error) {
    next(error);
  }
};

const decideBlockRequest = async (req, res, next) => {
  try {
    const { decision, by, note } = req.body || {};

    if (!["accepted", "rejected"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'decision must be "accepted" or "rejected"',
      });
    }

    const blockRequest = await BlockRequest.findOne({
      requestId: req.params.requestId,
    });

    if (!blockRequest) {
      return res.status(404).json({
        success: false,
        message: `Block request ${req.params.requestId} not found`,
      });
    }

    blockRequest.status = decision;
    blockRequest.auditTrail.push({
      action: decision,
      by: by || "user",
      note,
    });

    await blockRequest.save();

    res.json({
      success: true,
      data: blockRequest,
    });
  } catch (error) {
    next(error);
  }
};

const mlHealth = async (req, res, next) => {
  try {
    const health = await checkMlHealth();

    res.json({
      success: true,
      data: {
        mlApiUrl: getMlApiUrl(),
        ...health,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBlockRequest,
  listBlockRequests,
  getBlockRequest,
  selectAlternative,
  decideBlockRequest,
  mlHealth,
};
