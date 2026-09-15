const {
  simulateWhatIf,
  generatePlan,
  scorePriority,
  getKpis,
} = require("../services/mlClient.service");

// Stateless pass-throughs to the Python ML engine. The ML response is
// returned unchanged inside the usual { success, data } envelope.

const whatIf = async (req, res, next) => {
  try {
    const data = await simulateWhatIf(req.body || {});

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const optimizedPlan = async (req, res, next) => {
  try {
    const data = await generatePlan(req.body || {});

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const priority = async (req, res, next) => {
  try {
    const data = await scorePriority(req.body || {});

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const kpis = async (req, res, next) => {
  try {
    const data = await getKpis();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  whatIf,
  optimizedPlan,
  priority,
  kpis,
};
