const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    department: {
      type: String,
      required: true,
      index: true,
    },

    sectionId: {
      type: String,
      required: true,
      index: true,
    },

    assetId: {
      type: String,
      index: true,
    },

    taskType: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    criticalityScore: {
      type: Number,
      default: 0,
    },

    dueDate: {
      type: Date,
      index: true,
    },

    status: {
      type: String,
      default: "pending",
      index: true,
    },

    source: {
      type: String,
    },

    scoreBreakdown: {
      defectDanger: {
        type: Number,
        default: 0,
      },
      failureRisk: {
        type: Number,
        default: 0,
      },
      sectionImportance: {
        type: Number,
        default: 0,
      },
      overdue: {
        type: Number,
        default: 0,
      },
      trainImpact: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Main F1 sorting/filtering index
taskSchema.index({
  sectionId: 1,
  department: 1,
  criticalityScore: -1,
});

module.exports = mongoose.model("Task", taskSchema);