import { Link } from "react-router-dom";

function TaskTable({ tasks }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Task ID
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Department
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Asset
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Type
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Description
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Due Date
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Risk
              </th>

              <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {tasks.map((task) => (
              <tr key={task.taskId} className="transition hover:bg-slate-50">
                {/* Task ID */}
                <td className="px-5 py-4">
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {task.taskId}
                  </span>
                </td>

                {/* Department */}
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {task.department}
                  </span>
                </td>

                {/* Asset */}
                <td className="px-5 py-4">
                  {task.assetId ? (
                    <Link
                      to={`/assets/${task.assetId}`}
                      className="font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {task.assetId}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>

                {/* Type */}
                <td className="px-5 py-4">
                  <span className="text-sm font-semibold text-slate-800">
                    {task.taskType}
                  </span>
                </td>

                {/* Description */}
                <td className="max-w-[280px] px-5 py-4">
                  <p
                    className="truncate text-sm text-slate-500"
                    title={task.description || ""}
                  >
                    {task.description || "-"}
                  </p>
                </td>

                {/* Due Date */}
                <td className="px-5 py-4">
                  <span className="text-sm text-slate-600">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "-"}
                  </span>
                </td>

                {/* Risk */}
                <td className="px-5 py-4">
                  {task.risk ? (
                    <RiskBadge
                      riskLevel={task.risk.riskLevel}
                      riskScore={task.risk.riskScore}
                    />
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-5 py-4">
                  {task.assetId ? (
                    <Link
                      to={`/assets/${task.assetId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      View Asset
                      <span>→</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">No asset</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tasks.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">
            No pending tasks found.
          </p>
        </div>
      )}
    </>
  );
}

function RiskBadge({ riskLevel, riskScore }) {
  const level = String(riskLevel || "").toUpperCase();

  let classes = "border-slate-200 bg-slate-50 text-slate-700";

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
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${classes}`}
    >
      <span className="text-xs font-bold">{level || "UNKNOWN"}</span>

      <span className="text-xs font-semibold opacity-75">
        {Number(riskScore || 0).toFixed(2)}
      </span>
    </div>
  );
}

export default TaskTable;
