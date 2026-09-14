import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const [pendingTasks, setPendingTasks] = useState(0);
  const [criticalAssets, setCriticalAssets] = useState(0);
  const [recommendedBlocks, setRecommendedBlocks] = useState(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPlanning, setLoadingPlanning] = useState(true);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const [tasksResponse, risksResponse] = await Promise.all([
          fetch(`${API_URL}/tasks?limit=1&status=pending`),
          fetch(`${API_URL}/risks?riskLevel=CRITICAL&limit=1`),
        ]);

        const tasksResult = await tasksResponse.json();
        const risksResult = await risksResponse.json();

        setPendingTasks(
          tasksResult.pagination?.total ?? tasksResult.total ?? 0,
        );

        setCriticalAssets(
          risksResult.pagination?.total ?? risksResult.total ?? 0,
        );
      } catch (error) {
        console.error("Dashboard stats loading failed:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchQuickStats();
  }, []);

  useEffect(() => {
    const fetchPlanningCount = async () => {
      try {
        const response = await fetch(`${API_URL}/planning/demo`);
        const result = await response.json();

        setRecommendedBlocks(
          result.optimizedPlan?.totalBlocks ??
            result.data?.length ??
            0,
        );
      } catch (error) {
        console.error("Planning count loading failed:", error);
        setRecommendedBlocks(0);
      } finally {
        setLoadingPlanning(false);
      }
    };

    fetchPlanningCount();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="w-full max-w-[1500px] mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
          <div>
            <div className="text-xs font-bold tracking-[0.18em] text-indigo-600 mb-2">
              RAILWAY AI
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-950">
              Maintenance Control Center
            </h1>

            <p className="mt-2 text-slate-500 max-w-2xl">
              AI-assisted predictive maintenance and railway maintenance
              planning from risk detection to execution.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>

            <span className="text-sm font-medium text-slate-600">
              AI Planning Engine Active
            </span>
          </div>
        </div>


        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

          {/* Pending Work */}
          <Link
            to="/tasks"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Pending Work
                </p>

                {loadingStats ? (
                  <div className="mt-3 h-9 w-28 bg-slate-200 rounded-lg animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-slate-950 mt-2">
                    {pendingTasks.toLocaleString("en-IN")}
                  </p>
                )}

                <p className="text-sm text-indigo-600 font-semibold mt-4 group-hover:translate-x-1 transition">
                  View Work List →
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                ≡
              </div>
            </div>
          </Link>


          {/* Critical Assets */}
          <Link
            to="/tasks"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-red-200 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Critical Assets
                </p>

                {loadingStats ? (
                  <div className="mt-3 h-9 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-slate-950 mt-2">
                    {criticalAssets.toLocaleString("en-IN")}
                  </p>
                )}

                <p className="text-sm text-red-600 font-semibold mt-4 group-hover:translate-x-1 transition">
                  View Critical Work →
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg">
                !
              </div>
            </div>
          </Link>


          {/* Recommended Blocks */}
          <Link
            to="/planning"
            className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-green-200 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Recommended Blocks
                </p>

                {loadingPlanning ? (
                  <div className="mt-3 h-9 w-16 bg-slate-200 rounded-lg animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-slate-950 mt-2">
                    {recommendedBlocks}
                  </p>
                )}

                <p className="text-sm text-green-600 font-semibold mt-4 group-hover:translate-x-1 transition">
                  Open Maintenance Plan →
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg">
                ✓
              </div>
            </div>
          </Link>

        </div>


        {/* AI WORKFLOW */}
        <div className="bg-slate-950 rounded-2xl p-7 md:p-8 text-white mb-6">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">

            <div className="max-w-3xl">

              <div className="text-xs font-bold tracking-[0.16em] text-indigo-300 mb-3">
                AI MAINTENANCE WORKFLOW
              </div>

              <h2 className="text-2xl font-bold">
                From Asset Risk to Executable Maintenance
              </h2>

              <p className="text-slate-400 mt-3 leading-relaxed">
                Identify high-risk assets, prioritize maintenance, combine
                work across departments, and recommend optimized maintenance
                blocks for execution.
              </p>

              <div className="flex flex-wrap gap-2 mt-5">
                <span className="px-3 py-1.5 rounded-lg bg-white/10 text-xs">
                  Risk Detection
                </span>

                <span className="text-slate-500 self-center">→</span>

                <span className="px-3 py-1.5 rounded-lg bg-white/10 text-xs">
                  Work Prioritisation
                </span>

                <span className="text-slate-500 self-center">→</span>

                <span className="px-3 py-1.5 rounded-lg bg-white/10 text-xs">
                  Multi-Department Planning
                </span>

                <span className="text-slate-500 self-center">→</span>

                <span className="px-3 py-1.5 rounded-lg bg-white/10 text-xs">
                  Execution
                </span>
              </div>

            </div>

            <Link
              to="/planning"
              className="shrink-0 px-5 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 transition"
            >
              Open AI Planning →
            </Link>

          </div>
        </div>


        {/* OPERATIONS */}
        <div className="mb-3">
          <h2 className="text-xl font-bold text-slate-950">
            Operations
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Access the main planning and decision-support modules.
          </p>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <QuickLink
            to="/planning"
            title="Maintenance Planning"
            description="Review AI-recommended maintenance blocks."
            icon="◆"
          />

          <QuickLink
            to="/plans"
            title="Weekly & Monthly Plans"
            description="Review planned work across execution periods."
            icon="▣"
          />

          <QuickLink
            to="/what-if"
            title="What-If Simulation"
            description="Test operational scenarios before execution."
            icon="◇"
          />

          <QuickLink
            to="/kpi"
            title="KPI Dashboard"
            description="Review planning and operational indicators."
            icon="↗"
          />

        </div>


        {/* EXECUTION */}
        <div className="mb-3">
          <h2 className="text-xl font-bold text-slate-950">
            Execution & Response
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Tools for execution tracking, emergency response and plan
            adjustments.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Link
            to="/planning/emergency"
            className="group bg-white border border-red-200 rounded-2xl p-5 hover:shadow-md hover:border-red-300 transition"
          >
            <div className="flex items-start gap-4">

              <div className="w-11 h-11 shrink-0 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                !
              </div>

              <div>
                <h3 className="font-bold text-slate-950">
                  Emergency Re-planning
                </h3>

                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Insert an emergency maintenance requirement and generate a
                  revised execution plan.
                </p>

                <p className="text-sm font-semibold text-red-600 mt-3">
                  Open Emergency Planning →
                </p>
              </div>

            </div>
          </Link>


          <Link
            to="/planning/actuals"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition"
          >
            <div className="flex items-start gap-4">

              <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                ✓
              </div>

              <div>
                <h3 className="font-bold text-slate-950">
                  Actual Execution
                </h3>

                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Compare planned execution with actual duration and delay.
                </p>

                <p className="text-sm font-semibold text-indigo-600 mt-3">
                  Record Actuals →
                </p>
              </div>

            </div>
          </Link>


          <Link
            to="/tasks"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition"
          >
            <div className="flex items-start gap-4">

              <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                ≡
              </div>

              <div>
                <h3 className="font-bold text-slate-950">
                  Combined Work List
                </h3>

                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Review pending maintenance jobs across railway departments.
                </p>

                <p className="text-sm font-semibold text-indigo-600 mt-3">
                  Open Work List →
                </p>
              </div>

            </div>
          </Link>

        </div>


        {/* FOOTER */}
        <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">

          <p className="text-xs text-slate-400">
            Railway AI · Predictive Maintenance & Maintenance Planning
          </p>

          <p className="text-xs text-slate-400">
            Prototype Environment
          </p>

        </div>

      </div>
    </div>
  );
}


/* =============================================================
   QUICK LINK
============================================================= */

function QuickLink({
  to,
  title,
  description,
  icon,
}) {
  return (
    <Link
      to={to}
      className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold mb-4">
        {icon}
      </div>

      <h3 className="font-bold text-slate-950">
        {title}
      </h3>

      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        {description}
      </p>

      <p className="text-sm text-indigo-600 font-semibold mt-4 group-hover:translate-x-1 transition">
        Open Module →
      </p>
    </Link>
  );
}

export default Dashboard;