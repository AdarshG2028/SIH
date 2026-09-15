const express = require("express");

const { postChat, getStatus } = require("../controllers/assistant.controller");

const router = express.Router();

router.get("/status", getStatus);
router.post("/chat", postChat);

module.exports = router;
