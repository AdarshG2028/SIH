const express = require("express");

const {
  importMLOutputsController,
} = require("../controllers/mlImport.controller");

const router = express.Router();

router.post("/import", importMLOutputsController);

module.exports = router;
