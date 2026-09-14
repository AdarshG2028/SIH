const express = require("express");

const {
  getDemoPlan,
  getPeriodPlan,
} = require("../controllers/planning.controller");

const router = express.Router();

router.get("/demo", getDemoPlan);
router.get("/periods", getPeriodPlan);

module.exports = router;