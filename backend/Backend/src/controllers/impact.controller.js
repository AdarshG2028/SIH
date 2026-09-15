const { simulateBlockImpact, listFreeWindows } = require("../services/impact.service");

const whatIf = async (req, res, next) => {
  try {
    const { sectionId, date, startTime, endTime } = req.body || {};

    if (!sectionId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "sectionId, date, startTime and endTime are required",
      });
    }

    const result = await simulateBlockImpact({ sectionId, date, startTime, endTime });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFreeWindows = async (req, res, next) => {
  try {
    const windows = await listFreeWindows(req.params.sectionId);

    res.json({
      success: true,
      count: windows.length,
      data: windows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { whatIf, getFreeWindows };
