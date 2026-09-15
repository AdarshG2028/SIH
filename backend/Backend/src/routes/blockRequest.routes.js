const express = require("express");

const {
  createBlockRequest,
  listBlockRequests,
  getBlockRequest,
  selectAlternative,
  decideBlockRequest,
  mlHealth,
} = require("../controllers/blockRequest.controller");
const {
  whatIf,
  optimizedPlan,
  priority,
  kpis,
} = require("../controllers/aiEngine.controller");

const router = express.Router();

router.get("/health", mlHealth);

router.post("/what-if", whatIf);
router.post("/generate-plan", optimizedPlan);
router.post("/priority", priority);
router.get("/kpis", kpis);

router.post("/block-requests", createBlockRequest);
router.get("/block-requests", listBlockRequests);
router.get("/block-requests/:requestId", getBlockRequest);
router.patch("/block-requests/:requestId/window", selectAlternative);
router.patch("/block-requests/:requestId/decision", decideBlockRequest);

module.exports = router;
