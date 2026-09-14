import { useEffect, useMemo, useState } from "react";

const EMERGENCY_JOB = {
  taskId: "EMERGENCY-001",
  assetId: "EMG-001",
  department: "Track",
  taskType: "Emergency Defect",
  riskScore: 100,
  riskLevel: "CRITICAL",
};

export default function Emergency() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [replanned, setReplanned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/planning/demo");
        const result = await response.json();

        if (result.success) {
          setBlocks(result.data || []);

          if (result.data?.length) {
            setSelectedBlockId(result.data[0].blockId);
          }
        }
      } catch (error) {
        console.error("Failed to load plan:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, []);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.blockId === selectedBlockId),
    [blocks, selectedBlockId],
  );

  const revisedPlan = useMemo(() => {
    if (!selectedBlock) return null;

    const originalTasks = selectedBlock.tasks || [];

    const sortedTasks = [...originalTasks].sort(
      (a, b) => (a.riskScore || 0) - (b.riskScore || 0),
    );

    const movedTask = sortedTasks[0];

    const remainingTasks = originalTasks.filter(
      (task) => task.taskId !== movedTask?.taskId,
    );

    return {
      ...selectedBlock,
      tasks: [EMERGENCY_JOB, ...remainingTasks],
      movedTask,
      predictedDelayMinutes: (selectedBlock.predictedDelayMinutes || 0) + 5,
      estimatedPrice: (selectedBlock.estimatedPrice || 0) + 10000,
    };
  }, [selectedBlock]);

  const handleReplan = () => {
    setReplanned(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200" />

              <div className="space-y-2">
                <div className="h-7 w-72 rounded-lg bg-gray-200" />
                <div className="h-4 w-96 max-w-full rounded bg-gray-200" />
              </div>
            </div>

            {/* Emergency Alert Skeleton */}
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="h-5 w-64 rounded bg-gray-200" />
                  <div className="h-4 w-96 max-w-full rounded bg-gray-200" />
                </div>

                <div className="hidden sm:block space-y-2">
                  <div className="h-3 w-28 rounded bg-gray-200" />
                  <div className="h-8 w-12 rounded bg-gray-200" />
                </div>
              </div>
            </div>

            {/* Emergency Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="bg-white border border-gray-200 rounded-2xl p-5"
                >
                  <div className="h-3 w-28 rounded bg-gray-200" />
                  <div className="h-6 w-32 rounded bg-gray-200 mt-3" />
                </div>
              ))}
            </div>

            {/* Current Execution Block */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                <div className="space-y-2">
                  <div className="h-6 w-56 rounded bg-gray-200" />
                  <div className="h-4 w-80 rounded bg-gray-200" />
                </div>

                <div className="h-12 w-full md:w-96 rounded-xl bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="bg-gray-50 rounded-xl p-4">
                    <div className="h-3 w-20 rounded bg-gray-200" />
                    <div className="h-5 w-24 rounded bg-gray-200 mt-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Button Skeleton */}
            <div className="flex justify-end">
              <div className="h-12 w-48 rounded-xl bg-gray-200" />
            </div>

            {/* Bottom Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-72 rounded-2xl bg-white border border-gray-200" />
              <div className="h-72 rounded-2xl bg-white border border-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!blocks.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border rounded-2xl p-10 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Emergency Re-planning
            </h1>
            <p className="mt-3 text-gray-500">
              No recommended execution blocks are currently available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-xl">!</span>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Emergency Re-planning
              </h1>

              <p className="text-gray-500 mt-1">
                Quickly revise the current maintenance plan when an emergency
                requirement occurs.
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Alert */}
        <div className="border border-red-200 bg-red-50 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-red-900 text-lg">
                  Emergency Maintenance Required
                </h2>

                <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                  CRITICAL
                </span>
              </div>

              <p className="text-sm text-red-700 mt-1">
                A critical defect has been reported and requires immediate
                intervention.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-red-600">Emergency Risk Score</p>
              <p className="text-3xl font-bold text-red-700">100</p>
            </div>
          </div>
        </div>

        {/* Emergency Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">Emergency Asset</p>
            <p className="text-lg font-bold text-gray-900 mt-2">
              {EMERGENCY_JOB.assetId}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">Department</p>
            <p className="text-lg font-bold text-gray-900 mt-2">
              {EMERGENCY_JOB.department}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">Task Type</p>
            <p className="text-lg font-bold text-gray-900 mt-2">
              {EMERGENCY_JOB.taskType}
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">Priority</p>
            <p className="text-lg font-bold text-red-600 mt-2">Immediate</p>
          </div>
        </div>

        {/* Current Execution Block */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Current Execution Block
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Select the planned block that needs to be re-planned.
              </p>
            </div>

            <select
              value={selectedBlockId}
              onChange={(e) => {
                setSelectedBlockId(e.target.value);
                setReplanned(false);
              }}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900 font-medium outline-none focus:ring-2 focus:ring-gray-400 w-full md:w-96"
            >
              {blocks.map((block) => (
                <option key={block.blockId} value={block.blockId}>
                  {block.blockId} — {block.sectionId} — {block.windowStart}-
                  {block.windowEnd}
                </option>
              ))}
            </select>
          </div>

          {selectedBlock && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Location
                </p>
                <p className="font-bold text-gray-900 mt-1">
                  {selectedBlock.sectionId}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Departments
                </p>
                <p className="font-bold text-gray-900 mt-1">
                  {selectedBlock.departments?.join(" + ")}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Planned Jobs
                </p>
                <p className="font-bold text-gray-900 mt-1">
                  {selectedBlock.tasks?.length || 0}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Maintenance Window
                </p>
                <p className="font-bold text-gray-900 mt-1">
                  {selectedBlock.windowStart} - {selectedBlock.windowEnd}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Re-plan Button */}
        <div className="flex justify-end">
          <button
            onClick={handleReplan}
            className="px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold shadow-sm hover:bg-gray-800 transition"
          >
            Re-plan for Emergency
          </button>
        </div>

        {/* Before / After */}
        {replanned && selectedBlock && revisedPlan && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Plan Comparison
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Compare the original execution plan with the emergency
                re-planned sequence.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Plan */}
              <div className="bg-white border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Original Plan</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Before emergency intervention
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
                      {selectedBlock.tasks?.length || 0} Jobs
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {selectedBlock.tasks?.map((task, index) => (
                    <div key={task.taskId} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {task.taskId}
                            </p>

                            <p className="text-sm text-gray-500">
                              {task.department} · {task.taskType}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Risk</p>

                          <p className="font-bold text-gray-900">
                            {Number(task.riskScore || 0).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revised Plan */}
              <div className="bg-white border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Revised Plan</h3>

                      <p className="text-xs text-gray-500 mt-1">
                        After emergency intervention
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      Re-planned
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {revisedPlan.tasks?.map((task, index) => (
                    <div
                      key={`${task.taskId}-${index}`}
                      className={`border rounded-xl p-4 ${
                        task.taskId === EMERGENCY_JOB.taskId
                          ? "border-red-300 bg-red-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              task.taskId === EMERGENCY_JOB.taskId
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">
                                {task.taskId}
                              </p>

                              {task.taskId === EMERGENCY_JOB.taskId && (
                                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                                  NEW
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-500">
                              {task.department} · {task.taskType}
                            </p>

                            {task.taskId === EMERGENCY_JOB.taskId && (
                              <p className="text-xs text-red-600 font-medium mt-1">
                                Highest priority — immediate execution
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Risk</p>

                          <p
                            className={`font-bold ${
                              task.taskId === EMERGENCY_JOB.taskId
                                ? "text-red-600"
                                : "text-gray-900"
                            }`}
                          >
                            {Number(task.riskScore || 0).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Impact */}
            <div className="bg-white border rounded-2xl p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Re-planning Impact
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Operational impact of inserting the emergency maintenance
                  task.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="border rounded-xl p-5">
                  <p className="text-sm text-gray-500">Emergency Jobs Added</p>

                  <p className="text-3xl font-bold text-red-600 mt-2">1</p>
                </div>

                <div className="border rounded-xl p-5">
                  <p className="text-sm text-gray-500">Jobs Moved</p>

                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {revisedPlan.movedTask ? 1 : 0}
                  </p>
                </div>

                <div className="border rounded-xl p-5">
                  <p className="text-sm text-gray-500">
                    Predicted Delay Impact
                  </p>

                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    +5 min
                  </p>
                </div>
              </div>

              {revisedPlan.movedTask && (
                <div className="mt-5 rounded-xl bg-gray-50 border p-5">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">
                      {revisedPlan.movedTask.taskId}
                    </span>{" "}
                    has been moved aside to accommodate the emergency
                    maintenance requirement.
                  </p>
                </div>
              )}

              {/* Logic explanation */}
              <div className="mt-5 rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900">
                  How Emergency Re-planning Works
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      01
                    </p>
                    <p className="font-medium mt-1">Detect Emergency</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Critical maintenance requirement is received.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      02
                    </p>
                    <p className="font-medium mt-1">Prioritise Job</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Emergency work receives highest priority.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      03
                    </p>
                    <p className="font-medium mt-1">Rebuild Plan</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lower-priority work is moved aside.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      04
                    </p>
                    <p className="font-medium mt-1">Show Impact</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Revised sequence and delay impact are displayed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
