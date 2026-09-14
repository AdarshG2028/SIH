const express = require("express");

const {
  getTasks,
  generateDefectTasks,
} = require("../controllers/task.controller");

const router = express.Router();

router.get("/", getTasks);
router.post("/generate", generateDefectTasks);

module.exports = router;
