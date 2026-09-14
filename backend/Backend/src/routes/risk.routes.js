const express = require("express");

const {
  getRisks,
  getRiskByAsset,
  getRiskExplanation,
} = require("../controllers/risk.controller");

const router = express.Router();

router.get("/", getRisks);
router.get("/:assetId/explanation", getRiskExplanation);
router.get("/:assetId", getRiskByAsset);

module.exports = router;
