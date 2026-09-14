import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function KPI() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchKPIData = async () => {
      try {
        const response = await fetch(`${API_URL}/planning/demo`);

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Failed to load KPI data");
        }

        setBlocks(result.optimizedPlan?.blocks || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-slate-200" />
            <div className="h-4 w-[500px] max-w-full rounded bg-slate-200" />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>

            <div className="h-80 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-semibold text-red-700">
              Unable to load KPI dashboard
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalBlocks = blocks.length;

  const multiDepartmentBlocks = blocks.filter(
    (block) => block.departments.length > 1,
  ).length;

  const criticalJobs = blocks.reduce(
    (total, block) =>
      total +
      block.tasks.filter((task) => task.riskLevel === "CRITICAL").length,
    0,
  );

  const trainMinutesLost = blocks.reduce(
    (total, block) => total + block.predictedDelayMinutes,
    0,
  );

  const blockUtilisation =
    totalBlocks > 0 ? Math.round((totalBlocks / 5) * 100) : 0;

  const corridorAdherence = totalBlocks > 0 ? 100 : 0;

  const kpis = [
    {
      label: "Block Utilisation",
      value: `${blockUtilisation}%`,
      description: "Recommended blocks used",
      icon: "▦",
      iconClass: "bg-indigo-50 text-indigo-600",
      valueClass: "text-indigo-600",
    },
    {
      label: "Multi-Department Blocks",
      value: multiDepartmentBlocks,
      description: "Blocks serving multiple departments",
      icon: "＋",
      iconClass: "bg-violet-50 text-violet-600",
      valueClass: "text-violet-600",
    },
    {
      label: "Critical Jobs Planned",
      value: criticalJobs,
      description: "Critical-risk jobs included",
      icon: "!",
      iconClass: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
    {
      label: "Train-Minutes Lost",
      value: trainMinutesLost,
      description: "Based on current planning estimates",
      icon: "↗",
      iconClass: "bg-orange-50 text-orange-600",
      valueClass: "text-orange-600",
    },
    {
      label: "Window Adherence",
      value: `${corridorAdherence}%`,
      description: "Prototype scheduled-window adherence",
      icon: "✓",
      iconClass: "bg-emerald-50 text-emerald-600",
      valueClass: "text-emerald-600",
    },
  ];

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
                  Performance Monitoring
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                KPI Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Key indicators for AI-assisted railway maintenance planning.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Planning Metrics Live
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${kpi.iconClass}`}
                >
                  {kpi.icon}
                </div>
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {kpi.label}
              </p>

              <p
                className={`mt-1 text-3xl font-bold tracking-tight ${kpi.valueClass}`}
              >
                {kpi.value}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {kpi.description}
              </p>
            </div>
          ))}
        </section>

        {/* KPI Context */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Planning Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current indicators derived from the AI-recommended maintenance
                blocks.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {totalBlocks} active blocks
            </div>
          </div>
        </section>

        {/* Block Performance */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Block Performance
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Performance indicators for recommended maintenance blocks
                </p>
              </div>

              <span className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {blocks.length} Blocks
              </span>
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-600">
                No block performance data available.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Generate a planning recommendation to populate this dashboard.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Block
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Location
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Departments
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Jobs
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Risk
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Predicted Delay
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {blocks.map((block) => {
                    const isCritical = block.highestRiskScore >= 60;
                    const isHigh = block.highestRiskScore >= 40;

                    return (
                      <tr
                        key={block.blockId}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {block.blockId}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {block.sectionId}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {block.departments.join(" + ")}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-slate-900">
                            {block.tasks.length}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                              isCritical
                                ? "border-red-200 bg-red-50 text-red-700"
                                : isHigh
                                  ? "border-orange-200 bg-orange-50 text-orange-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isCritical
                                  ? "bg-red-500"
                                  : isHigh
                                    ? "bg-orange-500"
                                    : "bg-emerald-500"
                              }`}
                            />

                            {Number(block.highestRiskScore || 0).toFixed(2)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-slate-700">
                            {block.predictedDelayMinutes} min
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Prototype Notice */}
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-700">
              i
            </div>

            <div>
              <p className="text-sm font-bold text-amber-900">
                Prototype KPI note
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                Planning Window Adherence is currently a prototype indicator.
                Production deployment can connect this metric to actual
                scheduled versus executed maintenance windows.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default KPI;
