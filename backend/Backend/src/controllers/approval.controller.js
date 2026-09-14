const PlanApproval = require("../models/PlanApproval");

const getApproval = async (req, res, next) => {
  try {
    const { blockId } = req.params;

    let approval = await PlanApproval.findOne({
      blockId,
    }).lean();

    if (!approval) {
      approval = await PlanApproval.create({
        blockId,
        status: "recommended",
      });
    }

    res.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
};

const advanceApproval = async (req, res, next) => {
  try {
    const { blockId } = req.params;

    let approval = await PlanApproval.findOne({
      blockId,
    });

    if (!approval) {
      approval = new PlanApproval({
        blockId,
        status: "recommended",
      });
    }

    const now = new Date();

    if (approval.status === "recommended") {
      approval.status = "department_approved";
      approval.departmentApprovedAt = now;
    } else if (approval.status === "department_approved") {
      approval.status = "drm_approved";
      approval.drmApprovedAt = now;
    } else if (approval.status === "drm_approved") {
      approval.status = "bdms_submitted";
      approval.bdmsSubmittedAt = now;
    }

    await approval.save();

    res.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApproval,
  advanceApproval,
};
