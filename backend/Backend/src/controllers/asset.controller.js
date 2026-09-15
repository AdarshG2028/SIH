const Asset = require("../models/Asset");
const { fetchAssetDetails } = require("../services/assetInfo.service");

const getAssets = async (req, res, next) => {
  try {
    const { station, assetType, page, limit } = req.query;

    const filter = {};
    if (station) filter.station_code = station;
    if (assetType) filter.asset_type = assetType;

    // Pagination is opt-in: the assets register page relies on the
    // no-params call returning every asset for client-side filtering
    // (see assetsQuery's comment in frontend/src/lib/queries.ts), so that
    // behavior stays unless a caller actually asks for a page — which the
    // station dashboard's ?station= filter does.
    if (page === undefined && limit === undefined) {
      const assets = await Asset.find(filter).sort({ createdAt: -1 }).lean();

      return res.json({
        success: true,
        count: assets.length,
        data: assets,
      });
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (currentPage - 1) * pageSize;

    const [assets, total] = await Promise.all([
      Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Asset.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: assets.length,
      data: assets,
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

const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findOne({
      asset_id: req.params.assetId,
    }).lean();

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

const getAssetDetails = async (req, res, next) => {
  try {
    const details = await fetchAssetDetails(req.params.assetId);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  getAssetDetails,
};
