import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPatch } from "@/lib/api";
import { blockRequestQuery } from "@/lib/queries";
import type { BlockRequest, Window } from "@/lib/types";
import {
  AsyncBlock,
  DataTable,
  ErrorNote,
  GhostButton,
  KeyValueGrid,
  Meta,
  PageHeader,
  Panel,
  RiskTag,
  StatusTag,
  Tag,
} from "@/components/control";
import { cn } from "@/lib/utils";
import { display, fmtDateTime, fmtNum, fmtProb } from "@/lib/format";

export const Route = createFileRoute("/requests/$requestId")({
  head: ({ params }) => ({ meta: [{ title: `${params.requestId} — Block Request` }] }),
  component: RequestDetail,
});

function sameWindow(a?: Window | null, b?: Window | null) {
  return !!a && !!b && a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime;
}

function RequestDetail() {
  const { requestId } = Route.useParams();
  const { data, isLoading, error } = useQuery(blockRequestQuery(requestId));

  return (
    <div className="space-y-6">
      <Link to="/requests" className="font-mono text-[11px] text-steel hover:text-cream">
        ← ALL REQUESTS
      </Link>
      <AsyncBlock isLoading={isLoading} error={error} data={data} loadingLabel="Loading request…">
        {(r) => <RequestView request={r} />}
      </AsyncBlock>
    </div>
  );
}

function RequestView({ request: r }: { request: BlockRequest }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = `/ai/block-requests/${encodeURIComponent(r.requestId)}`;
  const d = r.decision;

  const selectWindow = useMutation({
    mutationFn: (optionId: string) => apiPatch<BlockRequest>(`${path}/window`, { optionId }),
    onSuccess: (_res, optionId) => {
      toast.success(`Block confirmed for ${optionId.replace(/_/g, " ").toLowerCase()}`);
      void qc.invalidateQueries({ queryKey: ["block-request", r.requestId] });
      void qc.invalidateQueries({ queryKey: ["block-requests"] });
      void navigate({ to: "/" });
    },
  });

  const options: Window[] = [
    ...(d?.recommendedWindow ? [{ ...d.recommendedWindow, optionId: "RECOMMENDED" }] : []),
    ...(d?.alternativeOptions ?? []),
  ];
  const coord = d?.multiDepartmentCoordination;
  const safety = d?.safetyProtocols;
  const precautions = Array.isArray(safety?.safetyPrecautions)
    ? safety.safetyPrecautions
    : safety?.safetyPrecautions
      ? [safety.safetyPrecautions]
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`BLOCK REQUEST · ${r.sectionId ?? ""}`}
        title={r.requestId}
        intro={`${r.department ?? "—"} · ${r.maintenanceType ?? "—"} · Km ${fmtNum(r.fromKm)} – ${fmtNum(r.toKm)}${
          d?.lineConfiguration ? ` · ${d.lineConfiguration}` : ""
        }`}
        actions={<StatusTag status={r.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Panel title="Window options" right={d?.status ? d.status.replace(/_/g, " ") : undefined}>
            {options.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {options.map((w) => {
                  const selected = sameWindow(w, r.selectedWindow);
                  const id = w.optionId ?? "RECOMMENDED";
                  return (
                    <div
                      key={id}
                      className={cn(
                        "flex flex-col rounded-md bg-ink3/50 p-3 hairline",
                        selected && "bg-signal/10 ring-1 ring-signal/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] tracking-widest text-steel">
                          {id.replace(/_/g, " ")}
                        </span>
                        {selected ? <Tag tone="signal">Selected</Tag> : null}
                      </div>
                      <div className="mt-2 font-display text-2xl text-cream">
                        {w.startTime}–{w.endTime}
                      </div>
                      <div className="font-mono text-[11px] text-steel">
                        {w.date} · {fmtNum(w.durationHours)} h
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Meta label="Traffic" value={w.trafficLevel ?? "—"} />
                        <Meta
                          label="Score"
                          value={fmtNum(w.overallScore ?? w.score, 0)}
                          tone="signal"
                        />
                        <Meta label="Traffic score" value={fmtNum(w.trafficScore)} />
                        <Meta
                          label="Weather"
                          value={
                            w.weatherSuitable === undefined
                              ? "—"
                              : w.weatherSuitable
                                ? "OK"
                                : "Unsuitable"
                          }
                          tone={w.weatherSuitable === false ? "danger" : "clear"}
                        />
                      </div>
                      <GhostButton
                        className="mt-3"
                        disabled={selected || selectWindow.isPending}
                        onClick={() => selectWindow.mutate(id)}
                      >
                        {selected ? "In use" : "Confirm this block"}
                      </GhostButton>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-[11px] text-steel">The engine returned no windows.</p>
            )}
            {selectWindow.error ? (
              <div className="mt-3">
                <ErrorNote error={selectWindow.error} title="Could not confirm this window" />
              </div>
            ) : null}
          </Panel>

          {d?.reasons?.length ? (
            <Panel title="Why the AI recommends this">
              <ul className="space-y-2">
                {d.reasons.map((reason, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-steel">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                    {reason}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {coord ? (
            <Panel
              title="Shadow block coordination"
              right={
                coord.isMultiDepartment
                  ? `${fmtNum(coord.downtimeSavedHours)} H DOWNTIME SAVED`
                  : "SINGLE DEPARTMENT"
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {(coord.integratedDepartments ?? []).map((dep) => (
                  <Tag key={dep} tone="steel">
                    {dep}
                  </Tag>
                ))}
              </div>
              {coord.primaryTask ? (
                <div className="mt-4">
                  <div className="label-mono mb-2 tracking-widest">Primary task</div>
                  <KeyValueGrid data={coord.primaryTask} />
                </div>
              ) : null}
              {coord.coLocatedTasks?.length ? (
                <div className="mt-4">
                  <div className="label-mono mb-2 tracking-widest">
                    Co-located tasks merged into this block
                  </div>
                  <DataTable
                    head={["Task", "Department", "Type", "Span", "Hours", "Workers", "Equipment"]}
                  >
                    {coord.coLocatedTasks.map((t, i) => (
                      <tr key={String(t["taskId"] ?? i)}>
                        <td className="text-signal">{display(t["taskId"])}</td>
                        <td>{display(t["department"])}</td>
                        <td>{display(t["taskType"])}</td>
                        <td>{display(t["span"])}</td>
                        <td>{display(t["durationHours"])}</td>
                        <td>{display(t["workers"])}</td>
                        <td className="text-steel">{display(t["equipment"])}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {d?.interDepartmentSequencing?.length ? (
            <Panel title="Inter-department safety sequencing">
              <ol className="relative ml-1.5 space-y-4 border-l border-line">
                {d.interDepartmentSequencing.map((step, i) => (
                  <li key={i} className="relative pl-5">
                    <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-signal" />
                    <div className="font-mono text-[10px] text-signal">
                      PHASE {step.phase ?? i + 1} · {step.timeWindow}
                    </div>
                    <div className="text-sm text-cream">
                      {step.department} · {step.safetyAction}
                    </div>
                    <div className="text-xs text-steel">{step.operatingProtocol}</div>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}

          <div className="grid gap-6 md:grid-cols-3">
            <Panel title="Corridor starvation">
              <KeyValueGrid data={d?.corridorStarvationAnalysis} />
            </Panel>
            <Panel title="Productivity & buffers">
              <KeyValueGrid data={d?.blockProductivityAndBuffers} />
            </Panel>
            <Panel title="Traffic calendar">
              <KeyValueGrid data={d?.specialTrafficCalendar} />
            </Panel>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          {safety ? (
            <Panel title="Safety protocols">
              <div className="grid grid-cols-2 gap-3">
                <Meta
                  label="Power block"
                  value={safety.powerBlockRequired ? "Required" : "Not required"}
                  tone={safety.powerBlockRequired ? "danger" : "clear"}
                />
                <Meta
                  label="Traffic block"
                  value={safety.trafficBlockRequired ? "Required" : "Not required"}
                  tone={safety.trafficBlockRequired ? "signal" : "clear"}
                />
              </div>
              {safety.speedRestriction ? (
                <div className="mt-3">
                  <Meta label="Speed restriction" value={safety.speedRestriction} />
                </div>
              ) : null}
              {precautions.length ? (
                <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-steel">
                  {precautions.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          ) : null}

          <Panel title="Asset risk">
            {r.assetRisk ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to="/risks/$assetId"
                    params={{ assetId: r.assetRisk.asset_id }}
                    className="font-mono text-sm text-signal hover:underline"
                  >
                    {r.assetRisk.asset_id}
                  </Link>
                  <RiskTag level={r.assetRisk.risk_level} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Meta label="Risk score" value={fmtNum(r.assetRisk.risk_score)} tone="danger" />
                  <Meta label="Probability" value={fmtProb(r.assetRisk.risk_probability)} />
                </div>
                {r.assetRisk.recommended_action ? (
                  <p className="text-xs text-steel">{r.assetRisk.recommended_action}</p>
                ) : null}
              </div>
            ) : (
              <p className="font-mono text-[11px] text-steel">No asset linked to this request.</p>
            )}
          </Panel>

          <Panel title="Submitted preferences">
            <KeyValueGrid data={d?.userPreferences} />
          </Panel>

          <Panel title="Audit trail">
            {r.auditTrail?.length ? (
              <ol className="space-y-3">
                {r.auditTrail.map((a, i) => (
                  <li key={i} className="border-l border-line pl-3">
                    <div className="font-mono text-[11px] uppercase text-cream">
                      {a.action?.replace(/_/g, " ")}
                    </div>
                    <div className="font-mono text-[10px] text-steel">
                      {fmtDateTime(a.at)} · {a.by ?? "system"}
                    </div>
                    {a.note ? <div className="text-xs text-steel">{a.note}</div> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-mono text-[11px] text-steel">No entries.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
