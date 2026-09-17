const express = require("express");

const {
  createBlockRequest,
  planBlockRequest,
  listBlockRequests,
  getBlockRequest,
  selectAlternative,
  decideBlockRequest,
  completeBlockRequest,
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
router.patch("/block-requests/:requestId/complete", completeBlockRequest);
router.post("/plan-request", planBlockRequest);

module.exports = router;
