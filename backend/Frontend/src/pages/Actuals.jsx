import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function Actuals() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [actualDuration, setActualDuration] = useState("");
  const [actualDelay, setActualDelay] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const response = await fetch(`${API_URL}/planning/demo`);

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Failed to load blocks");
        }

        setBlocks(data.data || []);

        if (data.data?.length > 0) {
          setSelectedBlockId(data.data[0].blockId);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadBlocks();
  }, []);

  const selectedBlock = blocks.find(
    (block) => block.blockId === selectedBlockId,
  );

  const compareResults = () => {
    if (!selectedBlock) return;

    const duration = Number(actualDuration);
    const delay = Number(actualDelay);

    if (
      Number.isNaN(duration) ||
      Number.isNaN(delay) ||
      duration < 0 ||
      delay < 0
    ) {
      return;
    }

    const durationVariance = duration - selectedBlock.durationMinutes;
    const delayVariance = delay - selectedBlock.predictedDelayMinutes;

    setResult({
      duration,
      delay,
      durationVariance,
      delayVariance,
    });
  };

  const getPerformanceLabel = () => {
    if (!result) return "";

    if (result.durationVariance <= 0 && result.delayVariance <= 0) {
      return "Better than planned";
    }

    if (result.durationVariance > 0 && result.delayVariance > 0) {
      return "Higher operational impact";
    }

    return "Mixed performance";
  };

  const getPerformanceText = () => {
    if (!result) return "";

    if (result.durationVariance <= 0 && result.delayVariance <= 0) {
      return "The maintenance execution performed at or better than the current planning estimate.";
    }

    if (result.durationVariance > 0 && result.delayVariance > 0) {
      return "The maintenance required more time and created more operational impact than expected.";
    }

    if (result.durationVariance > 0) {
      return "The maintenance required more execution time than expected, while train impact remained relatively controlled.";
    }

    return "Train impact was higher than expected even though maintenance duration remained close to the planned estimate.";
  };

  const performanceIsGood =
    result && result.durationVariance <= 0 && result.delayVariance <= 0;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-72 rounded-lg bg-slate-200" />
            <div className="h-4 w-[520px] max-w-full rounded bg-slate-200" />

            <div className="h-72 rounded-2xl bg-white shadow-sm" />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="h-32 rounded-2xl bg-white shadow-sm" />
              <div className="h-32 rounded-2xl bg-white shadow-sm" />
            </div>

            <div className="h-48 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!blocks.length) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500">
              —
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Maintenance Learning
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              No execution blocks are currently available for comparison.
            </p>
          </div>
        </main>
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
                  Execution Feedback
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Maintenance Learning
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Compare planned maintenance with actual execution and identify
                insights that can improve future planning.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                AI
              </span>
              Feedback Loop
            </div>
          </div>
        </section>

        {/* Record Execution */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white">
                01
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Record Execution Result
                </h2>

                <p className="text-xs text-slate-400">
                  Compare planned estimates with observed execution
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-500">
              Enter the observed result after a maintenance block has been
              completed. Railway AI can then evaluate the difference between the
              planned and actual outcome.
            </p>
          </div>

          <div className="p-6">
            {/* Block selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Maintenance Block
              </label>

              <select
                value={selectedBlockId}
                onChange={(event) => {
                  setSelectedBlockId(event.target.value);
                  setResult(null);
                  setActualDuration("");
                  setActualDelay("");
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              >
                {blocks.map((block) => (
                  <option key={block.blockId} value={block.blockId}>
                    {block.blockId} — {block.sectionId}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected block summary */}
            {selectedBlock && (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Location" value={selectedBlock.sectionId} />

                  <Metric
                    label="Departments"
                    value={selectedBlock.departments.join(" + ")}
                  />

                  <Metric label="Jobs" value={selectedBlock.tasks.length} />

                  <Metric
                    label="Risk Priority"
                    value={Number(selectedBlock.highestRiskScore || 0).toFixed(
                      2,
                    )}
                  />
                </div>

                {/* Planned vs actual inputs */}
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Planned Duration
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-950">
                          {selectedBlock.durationMinutes} min
                        </p>
                      </div>

                      <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                        Planned
                      </span>
                    </div>

                    <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actual Duration
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={actualDuration}
                      onChange={(event) =>
                        setActualDuration(event.target.value)
                      }
                      placeholder="e.g. 135"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Predicted Train Delay
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-950">
                          {selectedBlock.predictedDelayMinutes} min
                        </p>
                      </div>

                      <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                        AI Estimate
                      </span>
                    </div>

                    <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actual Train Delay
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={actualDelay}
                      onChange={(event) => setActualDelay(event.target.value)}
                      placeholder="e.g. 15"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-4">
            <button
              onClick={compareResults}
              disabled={!selectedBlock || !actualDuration || !actualDelay}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyse Execution
              <span>→</span>
            </button>
          </div>
        </section>

        {/* Results */}
        {result && selectedBlock && (
          <>
            <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                          performanceIsGood
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-orange-50 text-orange-600"
                        }`}
                      >
                        02
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-slate-950">
                          Execution Performance
                        </h2>

                        <p className="text-xs text-slate-400">
                          Planned versus actual outcome
                        </p>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
                      performanceIsGood
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : result.durationVariance > 0 &&
                            result.delayVariance > 0
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {getPerformanceLabel()}
                  </span>
                </div>

                <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-500">
                  {getPerformanceText()}
                </p>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <ComparisonCard
                  title="Maintenance Duration"
                  planned={selectedBlock.durationMinutes}
                  actual={result.duration}
                  variance={result.durationVariance}
                  unit="min"
                />

                <ComparisonCard
                  title="Train Delay"
                  planned={selectedBlock.predictedDelayMinutes}
                  actual={result.delay}
                  variance={result.delayVariance}
                  unit="min"
                />
              </div>
            </section>

            {/* Learning Insights */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Learning Insights
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Signals identified from the planned versus actual execution.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InsightCard
                  number="01"
                  title="Execution Pattern"
                  text={
                    result.durationVariance > 0
                      ? "Actual execution took longer than the planned window."
                      : "Actual execution stayed within the planned duration."
                  }
                />

                <InsightCard
                  number="02"
                  title="Operational Pattern"
                  text={
                    result.delayVariance > 0
                      ? "Actual train impact was higher than predicted."
                      : "Actual train impact was within or below the prediction."
                  }
                />

                <InsightCard
                  number="03"
                  title="Planning Signal"
                  text={
                    Math.abs(result.durationVariance) > 15
                      ? "Execution-duration assumptions should be reviewed."
                      : "Current duration assumptions appear reasonably aligned."
                  }
                />
              </div>
            </section>

            {/* Learning Flow */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-950">
                  How Railway AI Learns
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  The intended feedback loop from planning to future
                  improvement.
                </p>
              </div>

              <div className="grid gap-0 md:grid-cols-5">
                <LearningStep
                  number="1"
                  title="Planned"
                  text="AI creates the maintenance plan."
                />

                <LearningStep
                  number="2"
                  title="Executed"
                  text="Actual maintenance results are recorded."
                />

                <LearningStep
                  number="3"
                  title="Compared"
                  text="Planned and actual outcomes are analysed."
                />

                <LearningStep
                  number="4"
                  title="Learned"
                  text="Repeated patterns become training signals."
                />

                <LearningStep
                  number="5"
                  title="Improved"
                  text="Future predictions and planning can become more accurate."
                />
              </div>

              <div className="border-t border-amber-200 bg-amber-50 px-6 py-4">
                <p className="text-sm leading-6 text-amber-800">
                  <span className="font-bold">Prototype note:</span> This screen
                  demonstrates the feedback mechanism. Actual model retraining
                  and automatic learning from accumulated execution history are
                  planned for the production system.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ComparisonCard({ title, planned, actual, variance, unit }) {
  const positive = variance > 0;
  const neutral = variance === 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-400">
            Planned
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{planned}</p>
        </div>

        <span className="pb-1 text-lg text-slate-300">→</span>

        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-400">
            Actual
          </p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{actual}</p>
        </div>

        <span className="pb-1 text-xs text-slate-400">{unit}</span>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-400">Variance</p>

        <p
          className={`mt-1 text-sm font-bold ${
            neutral
              ? "text-slate-600"
              : positive
                ? "text-red-600"
                : "text-emerald-600"
          }`}
        >
          {variance >= 0 ? "+" : ""}
          {variance} {unit}
        </p>
      </div>
    </div>
  );
}

function InsightCard({ number, title, text }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-600 shadow-sm">
          {number}
        </span>

        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function LearningStep({ number, title, text }) {
  return (
    <div className="border-b border-slate-100 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <span className="text-xs font-bold text-indigo-600">{number}</span>

      <h3 className="mt-2 text-sm font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}

export default Actuals;
