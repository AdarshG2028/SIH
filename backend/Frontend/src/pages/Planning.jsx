import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function Planning() {
  const [blocks, setBlocks] = useState([]);
  const [optimizedPlan, setOptimizedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`${API_URL}/planning/demo`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Failed to load planning data");
        }

        setBlocks(result.data || []);
        setOptimizedPlan(result.optimizedPlan || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading maintenance plan...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Building AI-assisted maintenance recommendations
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="max-w-[1500px] mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Unable to load maintenance plan
            </h2>

            <p className="text-sm text-red-600 mt-2">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="w-full max-w-[1500px] mx-auto px-6 py-8">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-bold tracking-[0.18em] text-indigo-600 mb-2">
              RAILWAY AI / PLANNING
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-950">
              Maintenance Planning
            </h1>

            <p className="mt-2 max-w-3xl text-slate-500">
              AI-assisted recommendations for combining high-risk maintenance
              activities into suitable railway work blocks.
            </p>
          </div>

          {/* Actions */}

          <div className="flex flex-wrap gap-3">
            <Link
              to="/tasks"
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              ← Work List
            </Link>

            <Link
              to="/plans"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Weekly & Monthly Plans
            </Link>

            <Link
              to="/planning/emergency"
              className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              Emergency Re-planning
            </Link>
          </div>
        </div>

        {/* =====================================================
            PLAN SUMMARY
        ====================================================== */}

        {optimizedPlan && (
          <div className="bg-slate-950 rounded-2xl p-6 md:p-7 text-white mb-7">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="text-xs font-bold tracking-[0.16em] text-indigo-300">
                  AI OPTIMIZED MAINTENANCE PLAN
                </div>

                <h2 className="text-2xl font-bold mt-2">
                  Recommended Execution Blocks
                </h2>

                <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                  The recommended plan prioritizes high-risk maintenance while
                  combining work across departments at the same location.
                </p>
              </div>

              <Link
                to="/plans"
                className="shrink-0 px-4 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-bold hover:bg-slate-100 transition"
              >
                View Full Plan →
              </Link>
            </div>

            {/* Summary metrics */}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-7">
              <PlanMetric
                label="Total Blocks"
                value={optimizedPlan.totalBlocks}
              />

              <PlanMetric label="Total Jobs" value={optimizedPlan.totalJobs} />

              <PlanMetric
                label="Departments"
                value={optimizedPlan.departments?.length ?? 0}
              />

              <PlanMetric
                label="Predicted Delay"
                value={`${optimizedPlan.totalPredictedDelayMinutes} min`}
              />

              <PlanMetric
                label="Estimated Cost"
                value={`₹${(
                  optimizedPlan.estimatedTotalPrice ?? 0
                ).toLocaleString("en-IN")}`}
              />
            </div>
          </div>
        )}

        {/* =====================================================
            PLAN EXPLANATION
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                AI
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  How the recommendation works
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Prototype planning workflow
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
              <WorkflowStep
                number="01"
                title="Identify Risk"
                text="Prioritize higher-risk maintenance jobs."
              />

              <WorkflowStep
                number="02"
                title="Group Work"
                text="Find work at the same railway location."
              />

              <WorkflowStep
                number="03"
                title="Combine Teams"
                text="Bring Track, OHE and Signalling work together."
              />

              <WorkflowStep
                number="04"
                title="Recommend Block"
                text="Create an executable maintenance block."
              />
            </div>
          </div>

          {/* Departments */}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Departments
            </p>

            <h3 className="text-lg font-bold text-slate-950 mt-2">
              Cross-functional planning
            </h3>

            <div className="flex flex-wrap gap-2 mt-5">
              {(optimizedPlan?.departments || []).map((department) => (
                <span
                  key={department}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  {department}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-5 leading-relaxed">
              Multiple maintenance departments can be combined into one
              operational block when their work is located together.
            </p>
          </div>
        </div>

        {/* =====================================================
            BLOCK LIST HEADER
        ====================================================== */}

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.16em] text-indigo-600">
              RECOMMENDED BLOCKS
            </div>

            <h2 className="text-2xl font-bold text-slate-950 mt-1">
              Maintenance Execution Blocks
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Review, investigate and simulate each recommended block.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            {blocks.length} recommended blocks
          </div>
        </div>

        {/* =====================================================
            BLOCKS
        ====================================================== */}

        {blocks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-500">
              —
            </div>

            <h3 className="font-bold text-slate-950 mt-4">
              No recommended blocks found
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              There are currently no suitable multi-department maintenance
              blocks available.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {blocks.map((block, index) => (
              <div
                key={block.blockId}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Block top */}

                <div className="p-6">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/planning/blocks/${block.blockId}`}
                            className="text-lg font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {block.blockId}
                          </Link>

                          <RecommendationBadge
                            recommendation={block.recommendation}
                          />
                        </div>

                        <p className="text-sm text-slate-500 mt-1">
                          Location{" "}
                          <span className="font-semibold text-slate-800">
                            {block.sectionId}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/planning/blocks/${block.blockId}`}
                        className="px-3.5 py-2 rounded-lg bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 transition"
                      >
                        View Details
                      </Link>

                      <Link
                        to="/what-if"
                        className="px-3.5 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
                      >
                        What-If
                      </Link>

                      <Link
                        to="/planning/emergency"
                        className="px-3.5 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition"
                      >
                        Emergency
                      </Link>
                    </div>
                  </div>

                  {/* Block metrics */}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden mt-6">
                    <BlockMetric
                      label="Window"
                      value={`${block.serviceDay} ${block.windowStart}`}
                      subValue={block.windowEnd}
                    />

                    <BlockMetric
                      label="Duration"
                      value={`${block.durationMinutes}`}
                      subValue="minutes"
                    />

                    <BlockMetric
                      label="Highest Risk"
                      value={Number(block.highestRiskScore).toFixed(2)}
                      risk
                    />

                    <BlockMetric
                      label="Average Risk"
                      value={Number(block.averageRiskScore).toFixed(2)}
                    />

                    <BlockMetric
                      label="Affected Trains"
                      value={block.affectedTrains}
                    />

                    <BlockMetric
                      label="Predicted Delay"
                      value={`${block.predictedDelayMinutes}`}
                      subValue="minutes"
                    />

                    <BlockMetric
                      label="Estimated Price"
                      value={`₹${(block.estimatedPrice ?? 0).toLocaleString(
                        "en-IN",
                      )}`}
                    />
                  </div>

                  {/* Departments */}

                  <div className="flex flex-wrap items-center gap-2 mt-5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Combined Work:
                    </span>

                    {block.departments.map((department) => (
                      <span
                        key={department}
                        className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold"
                      >
                        {department}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Jobs */}

                <div className="border-t border-slate-200 bg-slate-50/70">
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Included Jobs
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {block.tasks.length} maintenance activities selected for
                        this block.
                      </p>
                    </div>

                    <Link
                      to={`/planning/blocks/${block.blockId}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Inspect block reasoning →
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-b border-slate-200 bg-white">
                          <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wide font-bold text-slate-400">
                            Task
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-bold text-slate-400">
                            Asset
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-bold text-slate-400">
                            Department
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wide font-bold text-slate-400">
                            Type
                          </th>

                          <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wide font-bold text-slate-400">
                            Risk
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {block.tasks.map((task) => (
                          <tr
                            key={task.taskId}
                            className="border-b border-slate-100 last:border-0 hover:bg-white transition"
                          >
                            <td className="px-6 py-3.5 font-semibold text-slate-800">
                              {task.taskId}
                            </td>

                            <td className="px-4 py-3.5">
                              {task.assetId ? (
                                <Link
                                  to={`/assets/${task.assetId}`}
                                  className="text-indigo-600 font-semibold hover:underline"
                                >
                                  {task.assetId}
                                </Link>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                                {task.department}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-slate-600">
                              {task.taskType}
                            </td>

                            <td className="px-6 py-3.5">
                              <RiskBadge
                                level={task.riskLevel}
                                score={task.riskScore}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =====================================================
            BOTTOM ACTIONS
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7">
          <Link
            to="/plans"
            className="bg-slate-950 text-white rounded-2xl p-5 hover:bg-slate-900 transition"
          >
            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
              F6
            </p>

            <h3 className="font-bold mt-2">Weekly & Monthly Plans</h3>

            <p className="text-sm text-slate-400 mt-1">
              Convert recommended blocks into planning periods.
            </p>

            <p className="text-sm font-semibold mt-4">Open Plans →</p>
          </Link>

          <Link
            to="/what-if"
            className="bg-white border border-indigo-200 rounded-2xl p-5 hover:shadow-md transition"
          >
            <p className="text-xs font-bold tracking-wide text-indigo-500 uppercase">
              F8
            </p>

            <h3 className="font-bold text-slate-950 mt-2">
              What-If Simulation
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Test emergency, machine and priority scenarios.
            </p>

            <p className="text-sm font-semibold text-indigo-600 mt-4">
              Run Simulation →
            </p>
          </Link>

          <Link
            to="/planning/emergency"
            className="bg-white border border-red-200 rounded-2xl p-5 hover:shadow-md transition"
          >
            <p className="text-xs font-bold tracking-wide text-red-500 uppercase">
              F12
            </p>

            <h3 className="font-bold text-slate-950 mt-2">
              Emergency Re-planning
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              React to unexpected maintenance requirements.
            </p>

            <p className="text-sm font-semibold text-red-600 mt-4">
              Open Emergency Planning →
            </p>
          </Link>
        </div>

        {/* Footer */}

        <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col md:flex-row md:justify-between gap-2">
          <p className="text-xs text-slate-400">
            Railway AI · Maintenance Planning Prototype
          </p>

          <p className="text-xs text-slate-400">
            AI recommendations are prototype planning outputs
          </p>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   PLAN METRIC
============================================================= */

function PlanMetric({ label, value }) {
  return (
    <div className="bg-white/10 rounded-xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

/* =============================================================
   WORKFLOW STEP
============================================================= */

function WorkflowStep({ number, title, text }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="text-[10px] font-bold tracking-wide text-indigo-500">
        {number}
      </div>

      <h3 className="font-bold text-sm text-slate-900 mt-2">{title}</h3>

      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}

/* =============================================================
   BLOCK METRIC
============================================================= */

function BlockMetric({ label, value, subValue, risk = false }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
        {label}
      </p>

      <p
        className={`text-sm font-bold mt-1 ${
          risk ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>

      {subValue && (
        <p className="text-[10px] text-slate-400 mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

/* =============================================================
   RECOMMENDATION BADGE
============================================================= */

function RecommendationBadge({ recommendation }) {
  const recommended = String(recommendation).toLowerCase() === "recommended";

  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
        recommended
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {recommendation}
    </span>
  );
}

/* =============================================================
   RISK BADGE
============================================================= */

function RiskBadge({ level, score }) {
  const normalized = String(level || "").toUpperCase();

  let classes = "bg-slate-100 text-slate-700";

  if (normalized === "CRITICAL") {
    classes = "bg-red-50 text-red-700 border border-red-200";
  } else if (normalized === "HIGH") {
    classes = "bg-orange-50 text-orange-700 border border-orange-200";
  } else if (normalized === "MEDIUM") {
    classes = "bg-amber-50 text-amber-700 border border-amber-200";
  } else if (normalized === "LOW") {
    classes = "bg-green-50 text-green-700 border border-green-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${classes}`}
    >
      {level || "Unknown"}

      {score !== undefined && score !== null && (
        <span className="font-semibold opacity-80">
          {Number(score).toFixed(2)}
        </span>
      )}
    </span>
  );
}

export default Planning;
