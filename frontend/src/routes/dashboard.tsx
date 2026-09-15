import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePersona } from "@/lib/persona";
import {
  backendHealthQuery,
  blockRequestsQuery,
  demoPlanQuery,
  healthQuery,
  kpisQuery,
  riskCountQuery,
  stationSearchQuery,
  stationSummaryQuery,
  taskCountQuery,
} from "@/lib/queries";
import {
  AsyncBlock,
  DataTable,
  Lamp,
  Meta,
  PageHeader,
  Panel,
  RiskTag,
  Stat,
  StatusTag,
  Tag,
  TextInput,
} from "@/components/control";
import { fmtDateTime, fmtNum, windowLabel } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Control Dashboard — Railway AI Block Planner" }] }),
  component: Dashboard,
});

function count(q: { isLoading: boolean; isError: boolean; data?: number | undefined }) {
  if (q.isLoading) return "…";
  if (q.isError) return "—";
  return fmtNum(q.data, 0);
}

/** #1: a station filter on the existing dashboard, not a separate page — searches real stations from Asset data. */
function StationLens() {
  const { persona } = usePersona();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);

  // A Station Master persona opens straight to their own station instead of
  // an empty search box — the other personas (Engineer/DRM) leave this alone.
  useEffect(() => {
    if (persona.id === "station_master" && persona.stationCode) {
      setSelected({ code: persona.stationCode, name: persona.stationName ?? persona.stationCode });
    }
  }, [persona.id, persona.stationCode, persona.stationName]);

  const search = useQuery(stationSearchQuery(query));
  const summary = useQuery(stationSummaryQuery(selected?.code ?? ""));

  const showDropdown = query.length > 0 && !selected;

  return (
    <Panel title="Station lens">
      <div className="relative max-w-sm">
        <TextInput
          placeholder="Search a station (code or name)…"
          value={selected ? `${selected.name} (${selected.code})` : query}
          onChange={(e) => {
            setSelected(null);
            setQuery(e.target.value);
          }}
        />
        {showDropdown ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-line bg-ink2 shadow-lg">
            {search.isLoading ? (
              <div className="px-3 py-2 font-mono text-[11px] text-steel">Searching…</div>
            ) : search.data?.length ? (
              search.data.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className="block w-full px-3 py-2 text-left font-mono text-[11px] text-cream hover:bg-ink3"
                  onClick={() => {
                    setSelected({ code: s.code, name: s.name });
                    setQuery("");
                  }}
                >
                  {s.name} <span className="text-steel">({s.code})</span>
                  <span className="ml-2 text-steel">{s.assetCount} assets</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 font-mono text-[11px] text-steel">No station matches.</div>
            )}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-4">
          <AsyncBlock
            isLoading={summary.isLoading}
            error={summary.error}
            data={summary.data}
            loadingLabel="Loading station snapshot…"
          >
            {(s) => (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Stat label="Assets" value={fmtNum(s.assetCount, 0)} />
                  <Stat
                    label="Critical"
                    value={fmtNum(s.riskLevelCounts.CRITICAL, 0)}
                    tone="danger"
                  />
                  <Stat label="High risk" value={fmtNum(s.riskLevelCounts.HIGH, 0)} tone="signal" />
                  <Stat label="Pending tasks" value={fmtNum(s.pendingTaskCount, 0)} />
                  <Stat
                    label="Overdue maintenance"
                    value={fmtNum(s.overdueMaintenanceCount, 0)}
                    tone={s.overdueMaintenanceCount > 0 ? "danger" : "clear"}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.assetTypes.map((t) => (
                    <Tag key={t} tone="steel">
                      {t}
                    </Tag>
                  ))}
                  {Object.entries(s.tasksByDepartment).map(([dept, n]) => (
                    <Tag key={dept} tone="signal">
                      {dept}: {n} pending
                    </Tag>
                  ))}
                </div>
                <DataTable head={["Asset", "Type", "Risk"]}>
                  {s.assets.map((a) => (
                    <tr key={a.assetId}>
                      <td className="text-signal">
                        <Link to="/assets/$assetId" params={{ assetId: a.assetId }} className="hover:underline">
                          {a.assetId}
                        </Link>
                      </td>
                      <td className="text-steel">{a.assetType ?? "—"}</td>
                      <td>
                        <RiskTag level={a.riskLevel} />
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            )}
          </AsyncBlock>
        </div>
      ) : (
        <p className="mt-3 font-mono text-[11px] text-steel">
          Search a station to see its real assets, risk levels and pending work.
        </p>
      )}
    </Panel>
  );
}

function Dashboard() {
  const tasks = useQuery(taskCountQuery);
  const critical = useQuery(riskCountQuery("CRITICAL"));
  const high = useQuery(riskCountQuery("HIGH"));
  const review = useQuery(blockRequestsQuery({ status: "needs_review", limit: 200 }));
  const recent = useQuery(blockRequestsQuery({ limit: 8 }));
  const demo = useQuery(demoPlanQuery);
  const backend = useQuery(backendHealthQuery);
  const engine = useQuery(healthQuery);
  const kpis = useQuery(kpisQuery);
  const k = kpis.data?.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CONTROL · OVERVIEW"
        title="Block control dashboard"
        intro="Live view of pending maintenance, asset failure risk, block requests awaiting an officer, and this week's shadow block plan."
        actions={
          <Link
            to="/requests/new"
            className="chrome rounded-md px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide hairline transition hover:brightness-105"
          >
            Request a block
          </Link>
        }
      />

      <StationLens />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Link to="/tasks">
          <Stat label="Pending tasks" value={count(tasks)} sub="Defects + overdue maintenance" />
        </Link>
        <Link to="/risks">
          <Stat
            label="Critical assets"
            value={count(critical)}
            tone="danger"
            sub="≥ 60% failure probability"
          />
        </Link>
        <Link to="/risks">
          <Stat label="High-risk assets" value={count(high)} tone="signal" sub="40 – 59%" />
        </Link>
        <Link to="/requests">
          <Stat
            label="Awaiting officer"
            value={review.isLoading ? "…" : review.isError ? "—" : String(review.data?.length ?? 0)}
            tone="signal"
            sub="Requests needing review"
          />
        </Link>
        <Link to="/planning">
          <Stat
            label="Planned blocks"
            value={
              demo.isLoading
                ? "…"
                : demo.isError
                  ? "—"
                  : String(demo.data?.optimizedPlan?.totalBlocks ?? 0)
            }
            tone="clear"
            sub="Optimized shadow blocks"
          />
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel
          title="Recent block requests"
          right={<Link to="/requests">VIEW ALL →</Link>}
          className="xl:col-span-8"
          bodyClassName="p-0"
        >
          <div className="p-4">
            <AsyncBlock
              isLoading={recent.isLoading}
              error={recent.error}
              data={recent.data}
              isEmpty={(d) => d.length === 0}
              emptyTitle="No block requests yet"
              emptyHint="Submit one from Request a block — the AI engine evaluates it instantly."
            >
              {(rows) => (
                <DataTable
                  head={["Request", "Section", "Department", "Window", "Status", "Submitted"]}
                >
                  {rows.map((r) => (
                    <tr key={r.requestId}>
                      <td>
                        <Link
                          to="/requests/$requestId"
                          params={{ requestId: r.requestId }}
                          className="text-signal hover:underline"
                        >
                          {r.requestId}
                        </Link>
                      </td>
                      <td>{r.sectionId ?? "—"}</td>
                      <td className="text-steel">{r.department ?? "—"}</td>
                      <td>{windowLabel(r.selectedWindow)}</td>
                      <td>
                        <StatusTag status={r.status} />
                      </td>
                      <td className="text-steel">{fmtDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </AsyncBlock>
          </div>
        </Panel>

        <Panel title="System status" className="xl:col-span-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lamp tone={backend.isError ? "danger" : backend.isLoading ? "signal" : "clear"} />
              <div>
                <div className="font-mono text-[11px] text-cream">NODE BACKEND</div>
                <div className="font-mono text-[10px] text-steel">
                  {backend.isError ? "Unreachable" : (backend.data ?? "Checking…")}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lamp tone={engine.isError ? "danger" : engine.isLoading ? "signal" : "clear"} />
              <div>
                <div className="font-mono text-[11px] text-cream">PYTHON AI ENGINE</div>
                <div className="font-mono text-[10px] text-steel">
                  {engine.isError
                    ? (engine.error?.message ?? "Offline")
                    : engine.data
                      ? `${engine.data.service ?? "AI engine"} · v${engine.data.version ?? "?"}`
                      : "Checking…"}
                </div>
                {engine.data?.mlApiUrl ? (
                  <div className="font-mono text-[10px] text-steel/70">{engine.data.mlApiUrl}</div>
                ) : null}
              </div>
            </div>
            <div className="border-t border-line pt-4">
              <div className="label-mono mb-3 tracking-widest">Impact this cycle</div>
              {k ? (
                <div className="grid grid-cols-2 gap-3">
                  <Meta
                    label="Blocks"
                    value={`${k["blocksBefore"] ?? "—"} → ${k["blocksAfter"] ?? "—"}`}
                    tone="signal"
                  />
                  <Meta
                    label="Hours saved"
                    value={`${k["downtimeHoursSaved"] ?? "—"} h`}
                    tone="clear"
                  />
                  <Meta
                    label="Conflicts"
                    value={`${k["conflictsBefore"] ?? "—"} → ${k["conflictsAfter"] ?? "—"}`}
                    tone="clear"
                  />
                  <Meta
                    label="Availability"
                    value={`+${k["availabilityGainPct"] ?? "—"}%`}
                    tone="signal"
                  />
                </div>
              ) : (
                <p className="font-mono text-[11px] text-steel">
                  {kpis.isLoading ? "Loading…" : "KPIs unavailable."}
                </p>
              )}
              <Link
                to="/impact"
                className="mt-3 inline-block font-mono text-[10px] text-signal hover:underline"
              >
                FULL IMPACT REPORT →
              </Link>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Top shadow blocks" right={<Link to="/planning">APPROVALS →</Link>}>
        <AsyncBlock
          isLoading={demo.isLoading}
          error={demo.error}
          data={demo.data?.optimizedPlan?.blocks}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No shadow blocks yet"
          emptyHint="Import ML outputs and generate tasks from the Data page to populate the planner."
        >
          {(blocks) => (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {blocks.slice(0, 3).map((b) => (
                <div key={b.blockId} className="rounded-md bg-ink3/50 p-4 hairline">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg uppercase text-cream">{b.blockId}</span>
                    <Tag tone={b.recommendation === "Recommended" ? "clear" : "signal"}>
                      {b.recommendation ?? "—"}
                    </Tag>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-steel">
                    {b.sectionId} · {b.serviceDay} {b.windowStart}–{b.windowEnd}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.departments.map((d) => (
                      <Tag key={d} tone="steel">
                        {d}
                      </Tag>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Meta label="Jobs" value={b.tasks.length} />
                    <Meta label="Peak risk" value={fmtNum(b.highestRiskScore)} tone="danger" />
                    <Meta label="Score" value={fmtNum(b.optimizationScore)} tone="signal" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {b.tasks.slice(0, 4).map((t) => (
                      <RiskTag key={t.taskId} level={t.riskLevel} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsyncBlock>
      </Panel>
    </div>
  );
}
