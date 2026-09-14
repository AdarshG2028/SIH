const mongoose = require("mongoose");

const planApprovalSchema = new mongoose.Schema(
  {
    blockId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "recommended",
        "department_approved",
        "drm_approved",
        "bdms_submitted",
      ],
      default: "recommended",
      index: true,
    },

    departmentApprovedAt: Date,
    drmApprovedAt: Date,
    bdmsSubmittedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlanApproval", planApprovalSchema);
