#!/usr/bin/env node
// Cross-platform launcher for the Python ML engine. It's stdlib-only (see
// its own docstring and backend/docs/ — no `pip install` needed to run
// it), but the interpreter is invoked differently across platforms
// ("python" on Windows, often "python3" on Linux/Mac, sometimes "py" via
// the Windows launcher) — this tries each until one actually exists,
// instead of hardcoding one and leaving teammates on other platforms stuck.
const { spawnSync, spawn } = require("child_process");
const path = require("path");

const CANDIDATES = ["python", "python3", "py"];
const SCRIPT = path.join(__dirname, "..", "backend", "ML", "api_server.py");
const PORT = process.env.ML_PORT || "8000";

let chosen = null;
for (const cmd of CANDIDATES) {
  const check = spawnSync(cmd, ["--version"], { stdio: "ignore" });
  if (!check.error) {
    chosen = cmd;
    break;
  }
}

if (!chosen) {
  console.error(
    `[run-ml] No Python interpreter found (tried: ${CANDIDATES.join(", ")}). Install Python 3 and re-run.`,
  );
  process.exit(1);
}

const proc = spawn(chosen, [SCRIPT, PORT], { stdio: "inherit" });
proc.on("exit", (code) => process.exit(code ?? 0));
