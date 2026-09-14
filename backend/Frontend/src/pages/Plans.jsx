import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function Plans() {
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/planning/periods`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Failed to load plans");
        }

        setMonthlyPlan(result.data.monthlyPlan);
        setWeeklyPlan(result.data.weeklyPlan);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getRiskStyle = (level) => {
    switch (level) {
      case "CRITICAL":
        return "bg-red-50 text-red-700 border-red-200";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  const renderJobs = (jobs = [], showSlot = false) => {
    if (!jobs.length) {
      return (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            No maintenance jobs in this plan.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Task
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Asset
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Department
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk
                </th>
                {showSlot && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Execution Slot
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {jobs.map((job) => (
                <tr
                  key={`${job.taskId}-${job.executionSlot || ""}`}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {job.taskId}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {job.assetId || "-"}
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {job.department}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {job.taskType}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getRiskStyle(
                        job.riskLevel,
                      )}`}
                    >
                      {job.riskLevel}
                      <span className="opacity-70">
                        {Number(job.riskScore || 0).toFixed(2)}
                      </span>
                    </span>
                  </td>

                  {showSlot && (
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {job.executionSlot || "-"}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-72 rounded-lg bg-slate-200" />
            <div className="h-4 w-[500px] max-w-full rounded bg-slate-200" />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
              <div className="h-28 rounded-2xl bg-white shadow-sm" />
            </div>

            <div className="h-96 rounded-2xl bg-white shadow-sm" />
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
              Unable to load plans
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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
                  Maintenance Planning
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Weekly & Monthly Plans
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                AI-assisted planning from long-term maintenance capacity
                reservation to weekly execution.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              AI Planning Active
            </div>
          </div>
        </section>

        {/* Planning Flow */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Planning Workflow
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Capacity reservation → weekly execution
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">
                Monthly
              </span>
              <span className="text-slate-300">→</span>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                Weekly
              </span>
              <span className="text-slate-300">→</span>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                Execution
              </span>
            </div>
          </div>
        </section>

        {/* Monthly Plan */}
        {monthlyPlan && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                      M
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">
                        Monthly Plan
                      </h2>
                      <p className="text-xs text-slate-400">
                        Long-term maintenance capacity reservation
                      </p>
                    </div>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  Capacity Reserved
                </span>
              </div>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-500">
                {monthlyPlan.objective}
              </p>
            </div>

            <div className="grid gap-4 border-b border-slate-200 bg-slate-50/60 p-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reserved Blocks
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {monthlyPlan.reservedBlocks}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reserved Jobs
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {monthlyPlan.reservedJobs}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Departments
                </p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {monthlyPlan.departments?.join(" + ") || "-"}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Reserved Maintenance
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Jobs selected for long-term capacity planning
                  </p>
                </div>

                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {monthlyPlan.jobs?.length || 0} Jobs
                </span>
              </div>

              {renderJobs(monthlyPlan.jobs)}
            </div>
          </section>
        )}

        {/* Weekly Plan */}
        {weeklyPlan && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600">
                      W
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">
                        Weekly Plan
                      </h2>
                      <p className="text-xs text-slate-400">
                        Near-term maintenance execution
                      </p>
                    </div>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Ready for Execution
                </span>
              </div>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-500">
                {weeklyPlan.objective}
              </p>
            </div>

            <div className="grid gap-4 border-b border-slate-200 bg-slate-50/60 p-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Planned Blocks
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {weeklyPlan.plannedBlocks}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Planned Jobs
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {weeklyPlan.plannedJobs}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Departments
                </p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {weeklyPlan.departments?.join(" + ") || "-"}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Weekly Execution
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Jobs assigned to planned execution slots
                  </p>
                </div>

                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {weeklyPlan.jobs?.length || 0} Jobs
                </span>
              </div>

              {renderJobs(weeklyPlan.jobs, true)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Plans;
