const express = require("express");

const {
  getApproval,
  advanceApproval,
} = require("../controllers/approval.controller");

const router = express.Router();

router.get("/:blockId", getApproval);

router.post("/:blockId/advance", advanceApproval);

module.exports = router;
