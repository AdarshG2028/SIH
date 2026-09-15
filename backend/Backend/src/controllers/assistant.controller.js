const { chat, isConfigured } = require("../services/aiAssistant.service");

const postChat = async (req, res, next) => {
  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({
        success: false,
        message: "messages (non-empty array of {role, content}) is required",
      });
    }

    const result = await chat(messages);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getStatus = (req, res) => {
  res.json({
    success: true,
    data: { configured: isConfigured() },
  });
};

module.exports = { postChat, getStatus };
