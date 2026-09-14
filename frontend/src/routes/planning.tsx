import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { approvalQuery, demoPlanQuery, periodPlanQuery } from "@/lib/queries";
import { APPROVAL_STAGES, type ApprovalStatus, type DemoBlock, type PeriodJob } from "@/lib/types";
import {
  AsyncBlock,
  DataTable,
  ErrorNote,
  GhostButton,
  Meta,
  PageHeader,
  Panel,
  RiskTag,
  ScoreBar,
  Stat,
  Tag,
} from "@/components/control";
import { cn } from "@/lib/utils";
import { fmtDateTime, fmtInr, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/planning")({
  head: () => ({ meta: [{ title: "Block Approvals — Railway AI Block Planner" }] }),
  component: Planning,
});

const TABS = [
  { id: "optimized", label: "Optimized plan" },
  { id: "candidates", label: "All candidate blocks" },
  { id: "periods", label: "Month & week" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STAGE_LABEL: Record<(typeof APPROVAL_STAGES)[number], string> = {
  recommended: "AI recommended",
  department_approved: "Department",
  drm_approved: "DRM",
  bdms_submitted: "BDMS",
};

const NEXT_ACTION: Record<string, string> = {
  recommended: "Department approve",
  department_approved: "DRM approve",
  drm_approved: "Submit to BDMS",
};

function Planning() {
  const [tab, setTab] = useState<TabId>("optimized");
  const demo = useQuery(demoPlanQuery);
  const periods = useQuery(periodPlanQuery);
  const plan = demo.data?.optimizedPlan;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PLANNING · APPROVALS"
        title="Shadow block plan & approvals"
        intro="Blocks built from pending tasks and ML risk: locations where two or more departments have high-risk work are merged into one closure. Each block moves through Department → DRM → BDMS."
      />

      {plan ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Blocks" value={plan.totalBlocks} tone="signal" />
          <Stat label="Jobs" value={plan.totalJobs} />
          <Stat
            label="Departments"
            value={plan.departments.length}
            sub={plan.departments.join(" · ")}
          />
          <Stat
            label="Predicted delay"
            value={`${fmtNum(plan.totalPredictedDelayMinutes, 0)}m`}
            tone="danger"
          />
          <Stat label="Estimated cost" value={fmtInr(plan.estimatedTotalPrice)} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-md bg-ink2/80 p-1 hairline">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded px-4 py-2 font-mono text-[11px] uppercase tracking-wide transition",
              tab === t.id ? "bg-ink3 text-cream" : "text-steel hover:text-cream",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "periods" ? (
        <AsyncBlock
          isLoading={periods.isLoading}
          error={periods.error}
          data={periods.data}
          isEmpty={(p) => p.monthlyPlan.jobs.length === 0}
          emptyTitle="No period plan yet"
          emptyHint="Needs pending tasks with ML risk at locations shared by two or more departments."
        >
          {(p) => (
            <div className="grid gap-6 xl:grid-cols-2">
              <PeriodPanel
                title={p.monthlyPlan.period}
                objective={p.monthlyPlan.objective}
                blocks={p.monthlyPlan.reservedBlocks}
                jobs={p.monthlyPlan.jobs}
                departments={p.monthlyPlan.departments}
                blocksLabel="Reserved blocks"
              />
              <PeriodPanel
                title={p.weeklyPlan.period}
                objective={p.weeklyPlan.objective}
                blocks={p.weeklyPlan.plannedBlocks}
                jobs={p.weeklyPlan.jobs}
                departments={p.weeklyPlan.departments}
                blocksLabel="Planned blocks"
                withSlot
              />
            </div>
          )}
        </AsyncBlock>
      ) : (
        <AsyncBlock
          isLoading={demo.isLoading}
          error={demo.error}
          data={tab === "optimized" ? plan?.blocks : demo.data?.blocks}
          isEmpty={(b) => b.length === 0}
          loadingLabel="Building blocks…"
          emptyTitle="No blocks to plan"
          emptyHint="Import data, run the ML import and generate tasks from the Data page."
        >
          {(blocks) => (
            <div className="space-y-4">
              {blocks.map((b) => (
                <BlockCard key={b.blockId} block={b} />
              ))}
            </div>
          )}
        </AsyncBlock>
      )}

      <p className="font-mono text-[10px] text-steel/70">
        Looking for the ML engine's corridor plan (TMS / SMMS / TDMS)?{" "}
        <Link to="/plan" className="text-signal hover:underline">
          Open the plan generator
        </Link>
        .
      </p>
    </div>
  );
}

function PeriodPanel({
  title,
  objective,
  blocks,
  jobs,
  departments,
  blocksLabel,
  withSlot = false,
}: {
  title: string;
  objective: string;
  blocks: number;
  jobs: PeriodJob[];
  departments: string[];
  blocksLabel: string;
  withSlot?: boolean;
}) {
  return (
    <Panel title={title}>
      <p className="text-sm text-steel">{objective}</p>
      <div className="my-4 grid grid-cols-3 gap-3">
        <Meta label={blocksLabel} value={blocks} tone="signal" />
        <Meta label="Jobs" value={jobs.length} />
        <Meta label="Departments" value={departments.join(", ") || "—"} />
      </div>
      <DataTable
        head={["Task", "Asset", "Department", "Type", "Risk", ...(withSlot ? ["Slot"] : [])]}
      >
        {jobs.map((j) => (
          <tr key={`${j.taskId}-${j.executionSlot ?? ""}`}>
            <td className="text-signal">{j.taskId}</td>
            <td>
              {j.assetId ? (
                <Link
                  to="/assets/$assetId"
                  params={{ assetId: j.assetId }}
                  className="hover:underline"
                >
                  {j.assetId}
                </Link>
              ) : (
                "—"
              )}
            </td>
            <td>{j.department ?? "—"}</td>
            <td>{j.taskType ?? "—"}</td>
            <td>
              <div className="flex items-center gap-2">
                <RiskTag level={j.riskLevel} />
                {fmtNum(j.riskScore)}
              </div>
            </td>
            {withSlot ? <td>{j.executionSlot ?? "—"}</td> : null}
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

function BlockCard({ block: b }: { block: DemoBlock }) {
  return (
    <Panel title={`${b.blockId} · ${b.sectionId ?? ""}`} right={b.recommendation?.toUpperCase()}>
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Meta label="Day" value={b.serviceDay ?? "—"} />
            <Meta
              label="Window"
              value={`${b.windowStart ?? "?"}–${b.windowEnd ?? "?"}`}
              tone="signal"
            />
            <Meta label="Duration" value={`${fmtNum(b.durationMinutes, 0)} min`} />
            <Meta label="Trains hit" value={fmtNum(b.affectedTrains, 0)} />
            <Meta label="Delay" value={`${fmtNum(b.predictedDelayMinutes, 0)} min`} tone="danger" />
            <Meta label="Cost" value={fmtInr(b.estimatedPrice)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {b.departments.map((d) => (
              <Tag key={d} tone="steel">
                {d}
              </Tag>
            ))}
            {b.optimizationScore !== undefined ? (
              <Tag tone="signal">Opt score {fmtNum(b.optimizationScore)}</Tag>
            ) : null}
          </div>
          <DataTable head={["Task", "Asset", "Department", "Type", "Risk", "Findings"]}>
            {b.tasks.map((t) => (
              <tr key={t.taskId}>
                <td className="text-signal">{t.taskId}</td>
                <td>
                  {t.assetId ? (
                    <Link
                      to="/assets/$assetId"
                      params={{ assetId: t.assetId }}
                      className="hover:underline"
                    >
                      {t.assetId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{t.department ?? "—"}</td>
                <td>{t.taskType ?? "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <RiskTag level={t.riskLevel} />
                    <ScoreBar value={t.riskScore} />
                  </div>
                </td>
                <td>{fmtNum(t.findingCount, 0)}</td>
              </tr>
            ))}
          </DataTable>
          {b.whyThis ? (
            <div className="rounded-md bg-ink3/40 p-3 hairline">
              <div className="label-mono tracking-widest">Why this block</div>
              <p className="mt-1.5 text-sm text-steel">{b.whyThis.reason}</p>
              {b.whyThis.pushedAside?.length ? (
                <div className="mt-2 font-mono text-[10px] text-steel">
                  Pushed aside:{" "}
                  {b.whyThis.pushedAside
                    .map((p) => `${p.taskId} (${p.riskLevel ?? "?"} ${fmtNum(p.riskScore)})`)
                    .join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="xl:col-span-4">
          <ApprovalTrack blockId={b.blockId} />
        </div>
      </div>
    </Panel>
  );
}

function ApprovalTrack({ blockId }: { blockId: string }) {
  const qc = useQueryClient();
  // Note: the backend creates the approval record on first read.
  const { data, isLoading, error } = useQuery(approvalQuery(blockId));
  const advance = useMutation({
    mutationFn: async () =>
      (await apiPost<ApprovalStatus>(`/approvals/${encodeURIComponent(blockId)}/advance`)).data,
    onSuccess: (next) => {
      qc.setQueryData(approvalQuery(blockId).queryKey, next);
      toast.success(`${blockId}: ${next?.status.replace(/_/g, " ") ?? "advanced"}`);
    },
  });

  const status = data?.status ?? "recommended";
  const index = APPROVAL_STAGES.indexOf(status as (typeof APPROVAL_STAGES)[number]);
  const stamps: Record<string, string | undefined> = {
    recommended: data?.createdAt,
    department_approved: data?.departmentApprovedAt,
    drm_approved: data?.drmApprovedAt,
    bdms_submitted: data?.bdmsSubmittedAt,
  };
  const nextAction = NEXT_ACTION[status];

  return (
    <div className="h-full rounded-md bg-ink3/40 p-4 hairline">
      <div className="label-mono mb-3 tracking-widest">Approval workflow</div>
      {isLoading ? (
        <p className="font-mono text-[11px] text-steel">Loading…</p>
      ) : error ? (
        <ErrorNote error={error} />
      ) : (
        <>
          <ol className="relative ml-1.5 space-y-4 border-l border-line">
            {APPROVAL_STAGES.map((stage, i) => {
              const done = i <= index;
              return (
                <li key={stage} className="relative pl-5">
                  <span
                    className={cn(
                      "absolute -left-[5px] top-1 size-2.5 rounded-full",
                      done
                        ? i === index
                          ? "bg-signal lamp text-signal"
                          : "bg-clear"
                        : "bg-ink3 ring-1 ring-line",
                    )}
                  />
                  <div
                    className={cn(
                      "font-mono text-[11px] uppercase",
                      done ? "text-cream" : "text-steel",
                    )}
                  >
                    {STAGE_LABEL[stage]}
                  </div>
                  <div className="font-mono text-[10px] text-steel">
                    {done ? fmtDateTime(stamps[stage]) : "Pending"}
                  </div>
                </li>
              );
            })}
          </ol>
          {advance.error ? (
            <div className="mt-3">
              <ErrorNote error={advance.error} />
            </div>
          ) : null}
          <GhostButton
            className="mt-4 w-full"
            disabled={!nextAction || advance.isPending}
            onClick={() => advance.mutate()}
          >
            {advance.isPending ? "Advancing…" : (nextAction ?? "Submitted to BDMS")}
          </GhostButton>
        </>
      )}
    </div>
  );
}
