import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  backendHealthQuery,
  blockRequestsQuery,
  demoPlanQuery,
  healthQuery,
  kpisQuery,
  riskCountQuery,
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
