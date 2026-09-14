const AssetRiskScore = require("../models/AssetRiskScore");
const AssetExplanation = require("../models/AssetExplanation");

const getRisks = async (req, res, next) => {
  try {
    const {
      riskLevel,
      minScore,
      maxScore,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 100);

    const filter = {};

    if (riskLevel) {
      filter.risk_level = riskLevel;
    }

    if (minScore !== undefined || maxScore !== undefined) {
      filter.risk_score = {};

      if (minScore !== undefined) {
        filter.risk_score.$gte = Number(minScore);
      }

      if (maxScore !== undefined) {
        filter.risk_score.$lte = Number(maxScore);
      }
    }

    if (search) {
      filter.asset_id = {
        $regex: search,
        $options: "i",
      };
    }

    const skip = (currentPage - 1) * pageSize;

    const [risks, total] = await Promise.all([
      AssetRiskScore.find(filter)
        .sort({ risk_score: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      AssetRiskScore.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: risks,
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

const getRiskByAsset = async (req, res, next) => {
  try {
    const risk = await AssetRiskScore.findOne({
      asset_id: req.params.assetId,
    })
      .sort({ snapshot_date: -1 })
      .lean();

    if (!risk) {
      return res.status(404).json({
        success: false,
        message: "Risk data not found",
      });
    }

    res.json({
      success: true,
      data: risk,
    });
  } catch (error) {
    next(error);
  }
};

const getRiskExplanation = async (req, res, next) => {
  try {
    const explanation = await AssetExplanation.findOne({
      asset_id: req.params.assetId,
    })
      .sort({ snapshot_date: -1 })
      .lean();

    if (!explanation) {
      return res.status(404).json({
        success: false,
        message: "Risk explanation not found",
      });
    }

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRisks,
  getRiskByAsset,
  getRiskExplanation,
};
