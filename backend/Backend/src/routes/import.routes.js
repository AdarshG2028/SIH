const express = require("express");
const multer = require("multer");

const { importData } = require("../controllers/import.controller");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.post("/:dataset", upload.single("file"), importData);

module.exports = router;