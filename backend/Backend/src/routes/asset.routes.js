const express = require("express");

const {
  getAssets,
  getAssetById,
  getAssetDetails,
} = require("../controllers/asset.controller");

const router = express.Router();

router.get("/", getAssets);
router.get("/:assetId", getAssetById);
router.get("/:assetId/details", getAssetDetails);

module.exports = router;
