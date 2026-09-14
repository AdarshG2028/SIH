const { importMLOutputs } = require("../services/mlImport.service");

const importMLOutputsController = async (req, res, next) => {
  try {
    const result = await importMLOutputs();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importMLOutputsController,
};
