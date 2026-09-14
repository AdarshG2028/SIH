import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function WhatIf() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [scenario, setScenario] = useState("emergency");
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch(`${API_URL}/planning/demo`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Failed to load plan");
        }

        setBlocks(result.data || []);

        if (result.data?.length > 0) {
          setSelectedBlock(result.data[0].blockId);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, []);

  const runSimulation = () => {
    const block = blocks.find((item) => item.blockId === selectedBlock);

    if (!block) return;

    let simulatedBlock = {
      ...block,
      tasks: [...block.tasks],
      departments: [...block.departments],
    };

    if (scenario === "emergency") {
      simulatedBlock.tasks.push({
        taskId: "EMERGENCY-001",
        assetId: "EMERGENCY-ASSET",
        department: "Track",
        taskType: "Emergency Defect",
        riskScore: 85,
        riskLevel: "CRITICAL",
      });

      simulatedBlock.departments = [
        ...new Set([...simulatedBlock.departments, "Track"]),
      ];

      simulatedBlock.predictedDelayMinutes += 5;
      simulatedBlock.estimatedPrice += 10000;
    }

    if (scenario === "machine") {
      simulatedBlock.tasks = simulatedBlock.tasks.slice(
        0,
        Math.max(1, simulatedBlock.tasks.length - 1),
      );

      simulatedBlock.predictedDelayMinutes = Math.max(
        0,
        simulatedBlock.predictedDelayMinutes - 4,
      );

      simulatedBlock.estimatedPrice = Math.max(
        0,
        simulatedBlock.estimatedPrice - 5000,
      );
    }

    if (scenario === "vip") {
      simulatedBlock.predictedDelayMinutes += 10;
      simulatedBlock.estimatedPrice += 15000;
    }

    setSimulation(simulatedBlock);
  };

  const selectedOriginalBlock = blocks.find(
    (block) => block.blockId === selectedBlock,
  );

  const getScenarioInfo = () => {
    switch (scenario) {
      case "emergency":
        return {
          title: "Emergency Defect",
          description: "Adds a critical maintenance job to the selected block.",
          badge: "Critical Impact",
          badgeClass: "bg-red-50 text-red-700 border-red-200",
        };

      case "machine":
        return {
          title: "Machine Unavailable",
          description:
            "Simulates one maintenance job being removed due to unavailable equipment.",
          badge: "Resource Constraint",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        };

      case "vip":
        return {
          title: "VIP / Priority Train",
          description:
            "Simulates additional operational impact caused by a priority train.",
          badge: "Priority Impact",
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };

      default:
        return {
          title: "Scenario",
          description: "",
          badge: "Simulation",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-72 rounded-lg bg-slate-200" />
            <div className="h-4 w-[500px] max-w-full rounded bg-slate-200" />

            <div className="h-72 rounded-2xl bg-white shadow-sm" />
            <div className="h-64 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  const scenarioInfo = getScenarioInfo();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <main className="mx-auto max-w-[1500px] px-6 py-8">
        {/* Header */}
        <section className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Railway AI
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-xs font-medium text-slate-400">
                  Decision Support
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                What-If Simulation
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Test how changes in maintenance conditions could affect the
                recommended plan.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                ?
              </span>
              Scenario Analysis
            </div>
          </div>
        </section>

        {/* Scenario Configuration */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                01
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Scenario Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Select a block and simulate an operational change
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-2">
            {/* Block */}
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Maintenance Block
              </label>

              <select
                value={selectedBlock}
                onChange={(event) => {
                  setSelectedBlock(event.target.value);
                  setSimulation(null);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              >
                {blocks.map((block) => (
                  <option key={block.blockId} value={block.blockId}>
                    {block.blockId} — {block.sectionId}
                  </option>
                ))}
              </select>

              {selectedOriginalBlock && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Current Jobs
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {selectedOriginalBlock.tasks.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Current Risk
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {Number(
                          selectedOriginalBlock.highestRiskScore || 0,
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scenario */}
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Change to Simulate
              </label>

              <select
                value={scenario}
                onChange={(event) => {
                  setScenario(event.target.value);
                  setSimulation(null);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              >
                <option value="emergency">Add emergency defect</option>
                <option value="machine">Machine unavailable</option>
                <option value="vip">VIP / priority train</option>
              </select>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {scenarioInfo.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {scenarioInfo.description}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${scenarioInfo.badgeClass}`}
                  >
                    {scenarioInfo.badge}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-4">
            <button
              onClick={runSimulation}
              disabled={!selectedBlock}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>▶</span>
              Run Simulation
            </button>
          </div>
        </section>

        {/* Result */}
        {simulation && selectedOriginalBlock && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600">
                      02
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-950">
                        Simulation Result
                      </h2>
                      <p className="text-xs text-slate-400">
                        Original plan compared with simulated conditions
                      </p>
                    </div>
                  </div>
                </div>

                <span className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  {scenarioInfo.title}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 border-b border-slate-200 bg-slate-50/60 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jobs
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <p className="text-2xl font-bold text-slate-950">
                    {selectedOriginalBlock.tasks.length}
                  </p>
                  <span className="pb-1 text-sm text-slate-400">→</span>
                  <p className="text-2xl font-bold text-indigo-600">
                    {simulation.tasks.length}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Departments
                </p>

                <p className="mt-2 truncate text-sm font-bold text-slate-950">
                  {simulation.departments.join(" + ")}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Predicted Delay
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <p className="text-2xl font-bold text-slate-950">
                    {selectedOriginalBlock.predictedDelayMinutes}
                  </p>
                  <span className="pb-1 text-sm text-slate-400">→</span>
                  <p className="text-2xl font-bold text-orange-600">
                    {simulation.predictedDelayMinutes}
                  </p>
                  <span className="pb-1 text-xs text-slate-400">min</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Estimated Cost
                </p>

                <div className="mt-2">
                  <p className="text-lg font-bold text-slate-950">
                    ₹{simulation.estimatedPrice.toLocaleString("en-IN")}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Original: ₹
                    {selectedOriginalBlock.estimatedPrice.toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Changed Jobs */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Changed Jobs
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Maintenance jobs affected by the selected scenario
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {scenario === "emergency" ? (
                  simulation.tasks
                    .filter((task) => task.taskId.startsWith("EMERGENCY"))
                    .map((task) => (
                      <div
                        key={task.taskId}
                        className="rounded-xl border border-red-200 bg-red-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-mono text-sm font-bold text-red-800">
                              {task.taskId}
                            </p>

                            <p className="mt-1 text-sm text-red-700">
                              {task.taskType} · {task.assetId}
                            </p>
                          </div>

                          <span className="w-fit rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700">
                            {task.riskLevel} · {task.riskScore}
                          </span>
                        </div>
                      </div>
                    ))
                ) : scenario === "machine" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">
                      One maintenance job was removed from the simulated plan.
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      This represents a machine or resource availability
                      constraint.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-sm font-semibold text-indigo-800">
                      Priority train impact applied.
                    </p>
                    <p className="mt-1 text-xs text-indigo-700">
                      The simulation increases predicted delay and estimated
                      cost to represent the operational priority.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Explanation */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
              AI
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">
                How to use What-If
              </h2>

              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    1. Select a block
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Choose an AI-recommended maintenance block.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    2. Apply a change
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Simulate an emergency, resource constraint, or priority
                    train.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    3. Compare impact
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Review changes in jobs, delay, departments, and estimated
                    cost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default WhatIf;
