const express = require("express");

const { whatIf, getFreeWindows } = require("../controllers/impact.controller");

const router = express.Router();

// Real train-conflict checking against the seeded network data — the
// engine behind #4/#9 in the feature plan. Distinct from the existing
// /api/ai/what-if, which proxies to the ML engine's small hard-coded
// sample timetable.
router.post("/what-if", whatIf);
router.get("/:sectionId/windows", getFreeWindows);

module.exports = router;
