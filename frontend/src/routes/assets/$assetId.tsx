import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { assetDetailsQuery } from "@/lib/queries";
import type { AssetDetails } from "@/lib/types";
import {
  AsyncBlock,
  DataTable,
  EmptyState,
  Meta,
  PageHeader,
  Panel,
  RiskTag,
  ScoreBar,
  Stat,
  Tag,
} from "@/components/control";
import { ShapFactors } from "@/components/shap";
import { daysOverdue, fmtDate, fmtInr, fmtNum, fmtProb } from "@/lib/format";

export const Route = createFileRoute("/assets/$assetId")({
  head: ({ params }) => ({ meta: [{ title: `${params.assetId} — Asset Details` }] }),
  component: AssetDetail,
});

function AssetDetail() {
  const { assetId } = Route.useParams();
  const { data, isLoading, error } = useQuery(assetDetailsQuery(assetId));

  return (
    <div className="space-y-6">
      <Link to="/assets" className="font-mono text-[11px] text-steel hover:text-cream">
        ← ASSET REGISTER
      </Link>
      <AsyncBlock
        isLoading={isLoading}
        error={error}
        data={data}
        loadingLabel="Loading asset history…"
      >
        {(d) => <AssetView details={d} />}
      </AsyncBlock>
    </div>
  );
}

function AssetView({ details: d }: { details: AssetDetails }) {
  const { asset, risk, explanation, schedule } = d;
  const overdue = daysOverdue(schedule?.next_scheduled_date);
  const totalDowntime = d.failures.reduce((sum, f) => sum + (f.downtime_hours ?? 0), 0);
  const totalCost = d.maintenance.reduce((sum, m) => sum + (m.cost_inr ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`ASSET · ${asset.asset_type ?? "UNKNOWN"}`}
        title={asset.asset_id}
        intro={`${asset.station_name ?? "—"} (${asset.station_code ?? "—"}) · installed ${fmtDate(asset.installation_date)} · ${fmtNum(
          asset.asset_age_years,
        )} of ${fmtNum(asset.expected_life_years)} years expected life`}
        actions={
          risk ? (
            <Link
              to="/risks/$assetId"
              params={{ assetId: asset.asset_id }}
              className="rounded-md border border-line px-4 py-2.5 font-mono text-[11px] uppercase text-cream transition hover:bg-ink3"
            >
              Risk detail
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Risk score"
          value={risk ? fmtNum(risk.risk_score) : "—"}
          tone={risk?.risk_level === "CRITICAL" ? "danger" : "signal"}
          sub={risk ? `${risk.risk_level} · ${fmtProb(risk.risk_probability)}` : "Not scored"}
        />
        <Stat
          label="Inspections"
          value={d.inspections.length}
          sub={`Latest ${fmtDate(d.inspections[0]?.inspection_date)}`}
        />
        <Stat
          label="Failures"
          value={d.failures.length}
          tone={d.failures.length ? "danger" : "clear"}
          sub={`${fmtNum(totalDowntime)} h downtime`}
        />
        <Stat
          label="Maintenance jobs"
          value={d.maintenance.length}
          sub={`${fmtInr(totalCost)} spent`}
        />
        <Stat
          label="Next maintenance"
          value={schedule ? fmtDate(schedule.next_scheduled_date) : "—"}
          tone={overdue > 0 ? "danger" : "clear"}
          sub={
            overdue > 0
              ? `${overdue} days overdue`
              : (schedule?.maintenance_priority ?? "No schedule")
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="ML risk" className="xl:col-span-5">
          {risk ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <ScoreBar value={risk.risk_score} />
                <RiskTag level={risk.risk_level} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Predicted probability" value={fmtProb(risk.predicted_probability)} />
                <Meta label="Snapshot" value={fmtDate(risk.snapshot_date)} />
              </div>
              {risk.recommended_action ? (
                <p className="text-sm text-cream">{risk.recommended_action}</p>
              ) : null}
              {schedule ? (
                <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <Meta label="Last maintained" value={fmtDate(schedule.last_maintenance_date)} />
                  <Meta
                    label="Interval"
                    value={`${fmtNum(schedule.maintenance_interval_days, 0)} days`}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No risk score" hint="Run the ML import on the Data page." />
          )}
        </Panel>
        <Panel title="SHAP explanation" className="xl:col-span-7">
          {explanation ? (
            <ShapFactors explanation={explanation} />
          ) : (
            <EmptyState
              title="No explanation"
              hint="Explanations exist for a 5,000-asset sample only."
            />
          )}
        </Panel>
      </div>

      <Panel title="Inspections" right={`${d.inspections.length}`}>
        {d.inspections.length ? (
          <DataTable
            head={["Inspection", "Date", "Condition", "Wear", "Defects", "Inspector", "Status"]}
          >
            {d.inspections.slice(0, 25).map((i) => (
              <tr key={i.inspection_id}>
                <td className="text-signal">{i.inspection_id}</td>
                <td>{fmtDate(i.inspection_date)}</td>
                <td>{fmtNum(i.condition_score)}</td>
                <td>{fmtNum(i.wear_level)}</td>
                <td>{fmtNum(i.defect_count, 0)}</td>
                <td className="text-steel">{i.inspector_id ?? "—"}</td>
                <td>
                  <Tag tone={i.inspection_status === "Attention Required" ? "danger" : "steel"}>
                    {i.inspection_status ?? "—"}
                  </Tag>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="font-mono text-[11px] text-steel">No inspections on record.</p>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Failure events" right={`${d.failures.length}`}>
          {d.failures.length ? (
            <DataTable head={["Date", "Type", "Severity", "Downtime", "Resolved"]}>
              {d.failures.map((f) => (
                <tr key={f.failure_id}>
                  <td>{fmtDate(f.failure_date)}</td>
                  <td>{f.failure_type ?? "—"}</td>
                  <td>
                    <Tag
                      tone={f.severity === "High" || f.severity === "Critical" ? "danger" : "steel"}
                    >
                      {f.severity ?? "—"}
                    </Tag>
                  </td>
                  <td>{fmtNum(f.downtime_hours)} h</td>
                  <td className="text-steel">{f.resolved ?? "—"}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <p className="font-mono text-[11px] text-steel">No failures recorded.</p>
          )}
        </Panel>

        <Panel title="Maintenance history" right={`${d.maintenance.length}`}>
          {d.maintenance.length ? (
            <DataTable head={["Date", "Type", "Reason", "Downtime", "Cost", "Team"]}>
              {d.maintenance.slice(0, 25).map((m) => (
                <tr key={m.maintenance_id}>
                  <td>{fmtDate(m.maintenance_date)}</td>
                  <td>{m.maintenance_type ?? "—"}</td>
                  <td className="text-steel">{m.maintenance_reason ?? "—"}</td>
                  <td>{fmtNum(m.downtime_hours)} h</td>
                  <td>{fmtInr(m.cost_inr)}</td>
                  <td className="text-steel">{m.technician_team ?? "—"}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <p className="font-mono text-[11px] text-steel">No maintenance recorded.</p>
          )}
        </Panel>
      </div>

      <Panel title="Usage" right={`${d.usage.length} MONTHS`}>
        {d.usage.length ? (
          <DataTable head={["Month", "Train passages", "Usage index", "Cumulative usage"]}>
            {d.usage.slice(0, 12).map((u) => (
              <tr key={u.usage_id}>
                <td>{fmtDate(u.usage_month)}</td>
                <td>{fmtNum(u.train_passages, 0)}</td>
                <td>{fmtNum(u.usage_index, 2)}</td>
                <td>{fmtNum(u.cumulative_usage, 0)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="font-mono text-[11px] text-steel">No usage recorded.</p>
        )}
      </Panel>
    </div>
  );
}
