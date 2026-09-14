import { useEffect, useState } from "react";
import TaskTable from "../components/tasks/TaskTable";

const API_URL = `${import.meta.env.VITE_API_URL}/tasks`;

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [dueAfter, setDueAfter] = useState("");
  const [dueBefore, setDueBefore] = useState("");
  const [taskType, setTaskType] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTasks = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: targetPage,
        limit: 50,
      });

      if (search) params.set("search", search);
      if (department) params.set("department", department);
      if (taskType) params.set("taskType", taskType);
      if (minScore) params.set("minScore", minScore);
      if (maxScore) params.set("maxScore", maxScore);
      if (dueAfter) params.set("dueAfter", dueAfter);
      if (dueBefore) params.set("dueBefore", dueBefore);

      const response = await fetch(`${API_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const result = await response.json();

      setTasks(result.data || []);
      setPagination(result.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(page);
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    fetchTasks(1);
  };

  const clearFilters = () => {
    setSearch("");
    setDepartment("");
    setMinScore("");
    setMaxScore("");
    setDueAfter("");
    setDueBefore("");
    setTaskType("");
    setPage(1);

    setTimeout(() => {
      fetchTasks(1);
    }, 0);
  };

  const hasFilters =
    search ||
    department ||
    taskType ||
    minScore ||
    maxScore ||
    dueAfter ||
    dueBefore;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="w-full max-w-[1500px] mx-auto px-6 py-8">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-7">
          <div>
            <div className="text-xs font-bold tracking-[0.18em] text-indigo-600 mb-2">
              RAILWAY AI / WORK MANAGEMENT
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-950">
              Combined Work List
            </h1>

            <p className="mt-2 text-slate-500 max-w-3xl">
              Unified maintenance work list combining defects and overdue
              maintenance jobs across railway departments.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>

            <span className="text-sm font-medium text-slate-600">
              Live Maintenance Data
            </span>
          </div>
        </div>

        {/* =====================================================
            SUMMARY CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
              Total Pending Work
            </p>

            <p className="text-2xl font-bold text-slate-950 mt-2">
              {pagination?.total?.toLocaleString("en-IN") ?? "—"}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Maintenance tasks requiring attention
            </p>
          </div>

          <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-red-500 uppercase">
              Current Page
            </p>

            <p className="text-2xl font-bold text-slate-950 mt-2">
              {tasks.length}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Tasks displayed in this view
            </p>
          </div>

          <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-indigo-500 uppercase">
              Page
            </p>

            <p className="text-2xl font-bold text-slate-950 mt-2">
              {pagination ? `${page} / ${pagination.totalPages}` : "—"}
            </p>

            <p className="text-xs text-slate-500 mt-1">Work list navigation</p>
          </div>
        </div>

        {/* =====================================================
            FILTER PANEL
        ====================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Filter Work List
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Narrow the maintenance workload by asset, department, risk, task
                type or due date.
              </p>
            </div>

            {hasFilters && (
              <span className="inline-flex w-fit items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                Filters active
              </span>
            )}
          </div>

          {/* Search */}

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Search
            </label>

            <input
              type="text"
              placeholder="Search task, asset or description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          {/* Filters */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department */}

            <FilterField label="Department">
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="filter-input"
              >
                <option value="">All Departments</option>
                <option value="Track">Track</option>
                <option value="OHE">OHE</option>
                <option value="Signalling">Signalling</option>
              </select>
            </FilterField>

            {/* Task Type */}

            <FilterField label="Task Type">
              <select
                value={taskType}
                onChange={(event) => setTaskType(event.target.value)}
                className="filter-input"
              >
                <option value="">All Task Types</option>
                <option value="Defect">Defect</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </FilterField>

            {/* Minimum Risk */}

            <FilterField label="Minimum Risk Score">
              <input
                type="number"
                placeholder="e.g. 40"
                value={minScore}
                onChange={(event) => setMinScore(event.target.value)}
                className="filter-input"
              />
            </FilterField>

            {/* Maximum Risk */}

            <FilterField label="Maximum Risk Score">
              <input
                type="number"
                placeholder="e.g. 100"
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                className="filter-input"
              />
            </FilterField>

            {/* Due After */}

            <FilterField label="Due After">
              <input
                type="date"
                value={dueAfter}
                onChange={(event) => setDueAfter(event.target.value)}
                className="filter-input"
              />
            </FilterField>

            {/* Due Before */}

            <FilterField label="Due Before">
              <input
                type="date"
                value={dueBefore}
                onChange={(event) => setDueBefore(event.target.value)}
                className="filter-input"
              />
            </FilterField>
          </div>

          {/* Buttons */}

          <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-slate-100">
            <button
              onClick={applyFilters}
              className="px-5 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              Apply Filters
            </button>

            <button
              onClick={clearFilters}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
            >
              Clear Filters
            </button>

            <div className="ml-auto text-xs text-slate-400">
              Showing up to 50 tasks per page
            </div>
          </div>
        </div>

        {/* =====================================================
            TABLE HEADER
        ====================================================== */}

        <div className="bg-white border border-slate-200 rounded-t-2xl px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Maintenance Tasks</h2>

              <p className="text-xs text-slate-500 mt-1">
                Prioritized maintenance workload
              </p>
            </div>

            {!loading && !error && (
              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {tasks.length}
                </span>{" "}
                tasks
                {pagination && (
                  <>
                    {" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {pagination.total.toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <div className="bg-white border-x border-slate-200 overflow-hidden">
          {loading && (
            <div className="px-6 py-16 text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>

              <p className="text-sm font-medium text-slate-600 mt-4">
                Loading maintenance work...
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Fetching prioritized tasks from Railway AI
              </p>
            </div>
          )}

          {error && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-700">
                Unable to load work list
              </p>

              <p className="text-sm text-red-600 mt-1">{error}</p>

              <button
                onClick={() => fetchTasks(page)}
                className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-xl">
                ✓
              </div>

              <h3 className="font-bold text-slate-950 mt-4">No tasks found</h3>

              <p className="text-sm text-slate-500 mt-1">
                No maintenance tasks match the current filters.
              </p>
            </div>
          )}

          {!loading && !error && tasks.length > 0 && (
            <div className="overflow-x-auto">
              <TaskTable tasks={tasks} />
            </div>
          )}
        </div>

        {/* =====================================================
            PAGINATION
        ====================================================== */}

        {!loading && !error && pagination && pagination.totalPages > 1 && (
          <div className="bg-white border border-slate-200 rounded-b-2xl px-5 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-semibold text-slate-900">{page}</span> of{" "}
                <span className="font-semibold text-slate-900">
                  {pagination.totalPages}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Previous
                </button>

                <div className="px-4 py-2 rounded-lg bg-slate-950 text-white text-sm font-semibold">
                  {page}
                </div>

                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================
   FILTER FIELD
============================================================= */

function FilterField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
        {label}
      </label>

      {children}
    </div>
  );
}

export default Tasks;
