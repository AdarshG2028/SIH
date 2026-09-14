import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function BlockDetails() {
  const { blockId } = useParams();

  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/planning/demo`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Failed to load block");
        }

        const selectedBlock = result.data.find(
          (item) => item.blockId === blockId,
        );

        if (!selectedBlock) {
          throw new Error("Block not found");
        }

        setBlock(selectedBlock);

        const approvalResponse = await fetch(`${API_URL}/approvals/${blockId}`);

        const approvalResult = await approvalResponse.json();

        if (!approvalResponse.ok || !approvalResult.success) {
          throw new Error("Failed to load approval status");
        }

        setApproval(approvalResult.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [blockId]);

  const advanceApproval = async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/approvals/${blockId}/advance`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error("Failed to update approval");
      }

      setApproval(result.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-[1500px] px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-10 w-64 rounded-lg bg-slate-200" />
            <div className="h-5 w-80 rounded bg-slate-200" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>

            <div className="h-80 rounded-2xl bg-white shadow-sm" />
            <div className="h-64 rounded-2xl bg-white shadow-sm" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !block) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Unable to load block
            </h1>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <Link
              to="/planning"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              ← Back to Planning
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!block) {
    return null;
  }

  const approvalStatus = approval?.status || "recommended";

  const departmentApproved =
    approvalStatus === "department_approved" ||
    approvalStatus === "drm_approved" ||
    approvalStatus === "bdms_submitted";

  const drmApproved =
    approvalStatus === "drm_approved" || approvalStatus === "bdms_submitted";

  const bdmsSubmitted = approvalStatus === "bdms_submitted";

  const approvalButtonLabel =
    approvalStatus === "recommended"
      ? "Approve by Department"
      : approvalStatus === "department_approved"
        ? "Approve by DRM"
        : "Submit to BDMS";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <main className="mx-auto max-w-[1500px] px-6 py-8">
        {/* Header */}
        <section className="mb-8">
          <Link
            to="/planning"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Maintenance Planning
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Railway AI
                </span>

                <span className="h-1 w-1 rounded-full bg-slate-300" />

                <span className="text-xs font-medium text-slate-400">
                  Block Intelligence
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-950">
                  {block.blockId}
                </h1>

                <RecommendationBadge recommendation={block.recommendation} />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Location:{" "}
                <span className="font-semibold text-slate-700">
                  {block.sectionId}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500">
                AI Recommendation
              </p>

              <p className="mt-1 text-sm font-bold text-indigo-900">
                {block.recommendation}
              </p>
            </div>
          </div>
        </section>

        {/* Block metrics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Maintenance Window"
            value={`${block.serviceDay} ${block.windowStart} – ${block.windowEnd}`}
            icon="W"
          />

          <MetricCard
            label="Duration"
            value={`${block.durationMinutes} min`}
            icon="T"
          />

          <MetricCard
            label="Highest Risk"
            value={Number(block.highestRiskScore || 0).toFixed(2)}
            icon="R"
            emphasis
          />

          <MetricCard
            label="Average Risk"
            value={Number(block.averageRiskScore || 0).toFixed(2)}
            icon="A"
          />

          <MetricCard
            label="Affected Trains"
            value={block.affectedTrains}
            icon="T"
          />

          <MetricCard
            label="Predicted Delay"
            value={`${block.predictedDelayMinutes} min`}
            icon="D"
          />

          <MetricCard
            label="Estimated Price"
            value={`₹${Number(block.estimatedPrice || 0).toLocaleString(
              "en-IN",
            )}`}
            icon="₹"
          />

          <MetricCard
            label="Departments"
            value={block.departments.join(" + ")}
            icon="D"
          />
        </section>

        {/* Why this block */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600">
                AI
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Why This Block?
                </h2>

                <p className="text-xs text-slate-400">
                  AI selection rationale and coordination factors
                </p>
              </div>
            </div>
          </div>

          {block.whyThis ? (
            <div className="p-6">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                <p className="text-sm leading-6 text-slate-700">
                  {block.whyThis.reason}
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <SummaryCard
                  label="Risk Priority"
                  value={Number(block.whyThis.highestRisk || 0).toFixed(2)}
                />

                <SummaryCard
                  label="Departments Combined"
                  value={block.whyThis.departmentsCombined.join(" + ")}
                />

                <SummaryCard
                  label="Jobs Included"
                  value={block.whyThis.jobsIncluded}
                />
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-bold text-slate-950">
                  AI Selection Factors
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Factor text="High-risk maintenance work was prioritized." />

                  <Factor text="Multiple departments can be coordinated at this location." />

                  <Factor text="Selected work fits within the available maintenance window." />

                  <Factor text="Coordinating the work can reduce the need for separate maintenance blocks." />
                </div>
              </div>

              {block.whyThis.pushedAside?.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-bold text-slate-950">
                    Lower-priority Alternatives
                  </h3>

                  <div className="mt-4 space-y-3">
                    {block.whyThis.pushedAside.map((task) => (
                      <div
                        key={task.taskId}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {task.taskId}
                          </span>

                          <span className="mx-2 text-slate-300">•</span>

                          <span className="text-sm text-slate-500">
                            {task.department}
                          </span>
                        </div>

                        <RiskBadge
                          riskLevel={task.riskLevel}
                          riskScore={task.riskScore}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                AI selection explanation is not available for this block.
              </p>
            </div>
          )}
        </section>

        {/* Approval workflow */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Approval Workflow
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Department → DRM → BDMS
                </p>
              </div>

              <ApprovalStatusBadge status={approvalStatus} />
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-3 md:grid-cols-4">
              <ApprovalStep
                number="1"
                title="Plan"
                status="Recommended"
                active
                completed
              />

              <ApprovalStep
                number="2"
                title="Department"
                status={departmentApproved ? "Approved" : "Pending"}
                completed={departmentApproved}
                active={!departmentApproved}
              />

              <ApprovalStep
                number="3"
                title="DRM"
                status={drmApproved ? "Approved" : "Pending"}
                completed={drmApproved}
                active={departmentApproved && !drmApproved}
              />

              <ApprovalStep
                number="4"
                title="BDMS"
                status={bdmsSubmitted ? "Submitted" : "Pending"}
                completed={bdmsSubmitted}
                active={drmApproved && !bdmsSubmitted}
              />
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!bdmsSubmitted ? (
              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Next approval action
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Advance this prototype workflow to the next stage.
                  </p>
                </div>

                <button
                  onClick={advanceApproval}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {approvalButtonLabel}
                  <span>→</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  ✓
                </div>

                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Plan successfully submitted to BDMS
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    The approval workflow has reached its final prototype stage.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Included jobs */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Included Maintenance Jobs
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {block.tasks.length} jobs included in this maintenance block
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {block.departments.length} Departments
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <TableHeader>Task</TableHeader>
                  <TableHeader>Asset</TableHeader>
                  <TableHeader>Department</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Risk</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {block.tasks.map((task) => (
                  <tr
                    key={task.taskId}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {task.taskId}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {task.assetId ? (
                        <Link
                          to={`/assets/${task.assetId}`}
                          className="font-mono text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline"
                        >
                          {task.assetId}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {task.department}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-slate-700">
                        {task.taskType}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <RiskBadge
                        riskLevel={task.riskLevel}
                        riskScore={task.riskScore}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {block.tasks.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-600">
                No maintenance jobs included.
              </p>
            </div>
          )}
        </section>

        {/* Bottom navigation */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Continue planning workflow
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Review alternatives, scenarios, or return to the recommended
              blocks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/what-if"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              What-If
            </Link>

            <Link
              to="/planning/emergency"
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Emergency
            </Link>

            <Link
              to="/planning"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Planning
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon, emphasis = false }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        emphasis ? "border-indigo-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${
            emphasis
              ? "bg-indigo-50 text-indigo-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {icon}
        </span>
      </div>

      <p
        className={`mt-4 truncate text-base font-bold ${
          emphasis ? "text-indigo-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Factor({ text }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-emerald-600 shadow-sm">
        ✓
      </span>

      <p className="text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function RiskBadge({ riskLevel, riskScore }) {
  const level = String(riskLevel || "").toUpperCase();

  let classes = "border-slate-200 bg-slate-50 text-slate-600";

  if (level === "CRITICAL") {
    classes = "border-red-200 bg-red-50 text-red-700";
  } else if (level === "HIGH") {
    classes = "border-orange-200 bg-orange-50 text-orange-700";
  } else if (level === "MEDIUM") {
    classes = "border-amber-200 bg-amber-50 text-amber-700";
  } else if (level === "LOW") {
    classes = "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${classes}`}
    >
      <span>{level || "UNKNOWN"}</span>

      {riskScore !== undefined && riskScore !== null && (
        <span className="opacity-75">{Number(riskScore).toFixed(2)}</span>
      )}
    </span>
  );
}

function RecommendationBadge({ recommendation }) {
  const recommended =
    String(recommendation || "").toLowerCase() === "recommended";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
        recommended
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {recommendation}
    </span>
  );
}

function ApprovalStatusBadge({ status }) {
  const labels = {
    recommended: "Awaiting Department",
    department_approved: "Awaiting DRM",
    drm_approved: "Ready for BDMS",
    bdms_submitted: "BDMS Submitted",
  };

  const isComplete = status === "bdms_submitted";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
        isComplete
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-indigo-200 bg-indigo-50 text-indigo-700"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function ApprovalStep({
  number,
  title,
  status,
  completed = false,
  active = false,
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        completed
          ? "border-emerald-200 bg-emerald-50/60"
          : active
            ? "border-indigo-200 bg-indigo-50/50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
            completed
              ? "bg-emerald-600 text-white"
              : active
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-500"
          }`}
        >
          {completed ? "✓" : number}
        </span>

        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${
            completed
              ? "text-emerald-600"
              : active
                ? "text-indigo-600"
                : "text-slate-400"
          }`}
        >
          {status}
        </span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-900">{title}</p>
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

export default BlockDetails;
