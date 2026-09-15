const express = require("express");

const {
  getDemoPlan,
  getPeriodPlan,
  getPlanKpis,
} = require("../controllers/planning.controller");

const router = express.Router();

router.get("/demo", getDemoPlan);
router.get("/periods", getPeriodPlan);
router.get("/kpis", getPlanKpis);

module.exports = router;