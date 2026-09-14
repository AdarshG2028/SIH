import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_URL}/assets`;

function AssetDetails() {
  const { assetId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/${assetId}/details`);

        if (!response.ok) {
          throw new Error("Failed to fetch asset details");
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-[1500px] px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-10 w-72 rounded-lg bg-slate-200" />
            <div className="h-5 w-80 rounded bg-slate-200" />

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="h-48 rounded-2xl bg-white shadow-sm" />
              <div className="h-48 rounded-2xl bg-white shadow-sm" />
              <div className="h-48 rounded-2xl bg-white shadow-sm" />
            </div>

            <div className="h-72 rounded-2xl bg-white shadow-sm" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Unable to load asset
            </h1>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <Link
              to="/tasks"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              ← Back to Work List
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              ?
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Asset not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              No details are available for this asset.
            </p>

            <Link
              to="/tasks"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              ← Back to Work List
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { asset, risk, explanation } = data;

  const riskLevel = String(risk?.risk_level || "").toUpperCase();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <main className="mx-auto max-w-[1500px] px-6 py-8">
        {/* Header */}
        <section className="mb-8">
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Work List
          </Link>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Railway AI
                </span>

                <span className="h-1 w-1 rounded-full bg-slate-300" />

                <span className="text-xs font-medium text-slate-400">
                  Asset Intelligence
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-950">
                  {asset.asset_id}
                </h1>

                {risk && <RiskBadge level={riskLevel} />}
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {asset.asset_type}{" "}
                <span className="mx-1 text-slate-300">•</span>{" "}
                {asset.station_name}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Asset ID
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                {asset.asset_id}
              </p>
            </div>
          </div>
        </section>

        {/* Asset overview */}
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="Asset Type"
            value={asset.asset_type || "—"}
            icon="A"
          />

          <InfoCard
            label="Location"
            value={asset.station_name || "—"}
            icon="L"
          />

          <InfoCard
            label="Installation Date"
            value={
              asset.installation_date
                ? new Date(asset.installation_date).toLocaleDateString()
                : "—"
            }
            icon="D"
          />

          <InfoCard
            label="Asset Age"
            value={
              asset.asset_age_years !== undefined &&
              asset.asset_age_years !== null
                ? `${asset.asset_age_years} years`
                : "—"
            }
            icon="T"
          />
        </section>

        {/* AI Risk */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600">
                  AI
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    AI Risk Assessment
                  </h2>

                  <p className="text-xs text-slate-400">
                    Predictive maintenance intelligence
                  </p>
                </div>
              </div>

              {risk && <RiskBadge level={riskLevel} />}
            </div>
          </div>

          {risk ? (
            <div className="p-6">
              <div className="grid gap-5 md:grid-cols-3">
                {/* Risk score */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Risk Score
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-bold tracking-tight text-slate-950">
                      {Number(risk.risk_score || 0).toFixed(2)}
                    </span>

                    <span className="pb-1 text-xs font-medium text-slate-400">
                      / 100
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${getRiskBarClass(
                        riskLevel,
                      )}`}
                      style={{
                        width: `${Math.min(
                          Number(risk.risk_score || 0),
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Probability */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Predicted Probability
                  </p>

                  <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                    {(Number(risk.predicted_probability || 0) * 100).toFixed(2)}
                    <span className="text-xl">%</span>
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    AI-estimated failure probability
                  </p>
                </div>

                {/* Recommended action */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Recommended Action
                  </p>

                  <p className="mt-3 text-sm font-bold leading-6 text-slate-900">
                    {risk.recommended_action || "No recommendation available"}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Based on the current AI risk assessment
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-600">
                No ML risk data available.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Risk information has not been generated for this asset.
              </p>
            </div>
          )}
        </section>

        {/* Explanation */}
        {explanation && (
          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Main reasons */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-600">
                    !
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Why Is This Asset at Risk?
                    </h2>

                    <p className="text-xs text-slate-400">
                      Key factors influencing the AI assessment
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {[
                    explanation.top_reason_1,
                    explanation.top_reason_2,
                    explanation.top_reason_3,
                    explanation.top_reason_4,
                    explanation.top_reason_5,
                  ]
                    .filter(Boolean)
                    .map((reason, index) => (
                      <div
                        key={index}
                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500 shadow-sm">
                          {index + 1}
                        </span>

                        <p className="text-sm leading-6 text-slate-600">
                          {reason}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Protective factors */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600">
                    ✓
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Protective Factors
                    </h2>

                    <p className="text-xs text-slate-400">
                      Factors reducing current risk
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {[
                    explanation.protective_factor_1,
                    explanation.protective_factor_2,
                    explanation.protective_factor_3,
                  ]
                    .filter(Boolean)
                    .map((factor, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"
                      >
                        <div className="flex gap-3">
                          <span className="mt-0.5 text-sm font-bold text-emerald-600">
                            ✓
                          </span>

                          <p className="text-sm leading-6 text-slate-600">
                            {factor}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer action */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Asset intelligence complete
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Use the Work List to review related maintenance tasks.
            </p>
          </div>

          <Link
            to="/tasks"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open Work List
            <span>→</span>
          </Link>
        </section>
      </main>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-4 truncate text-base font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function RiskBadge({ level }) {
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
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${classes}`}
    >
      {level || "UNKNOWN"}
    </span>
  );
}

function getRiskBarClass(level) {
  if (level === "CRITICAL") return "bg-red-500";
  if (level === "HIGH") return "bg-orange-500";
  if (level === "MEDIUM") return "bg-amber-500";
  if (level === "LOW") return "bg-emerald-500";

  return "bg-slate-400";
}

export default AssetDetails;
