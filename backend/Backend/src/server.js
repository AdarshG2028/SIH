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

const app = express();

connectDB();

app.use(helmet());
app.use(cors());
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

const PORT = process.env.PORT || 5000;

app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});