require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const importRoutes = require("./routes/import.routes");
const assetRoutes = require("./routes/asset.routes");
const errorHandler = require("./middleware/error.middleware");
const taskRoutes = require("./routes/task.routes");
const mlImportRoutes = require("./routes/mlImport.routes");
const riskRoutes = require("./routes/risk.routes");
const planningRoutes = require("./routes/planning.routes");
const approvalRoutes = require("./routes/approval.routes");
const blockRequestRoutes = require("./routes/blockRequest.routes");
const impactRoutes = require("./routes/impact.routes");
const stationRoutes = require("./routes/station.routes");
const assistantRoutes = require("./routes/assistant.routes");
const { warmUp: warmUpImpactEngine } = require("./services/impact.service");
const { warmUp: warmUpStationDirectory } = require("./services/stationDirectory.service");

const app = express();

connectDB();

// Prototype: no auth. CORS_ORIGIN (comma-separated) limits origins; unset allows any.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Railway AI backend is running",
  });
});

app.use("/api/import", importRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ml", mlImportRoutes);
app.use("/api/risks", riskRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/ai", blockRequestRoutes);
app.use("/api/impact", impactRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/assistant", assistantRoutes);

const PORT = process.env.PORT || 5000;

app.use(errorHandler);

// The impact engine's index is a ~2s / ~270 MB one-time build (see
// impact.service.js) — worth paying at boot rather than blocking whoever's
// unlucky enough to send the first /api/impact request.
warmUpImpactEngine()
  .then(() => console.log("Impact engine warmed up"))
  .catch((error) => console.error("Impact engine warmup failed:", error.message));

warmUpStationDirectory()
  .then(() => console.log("Station directory warmed up"))
  .catch((error) => console.error("Station directory warmup failed:", error.message));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});