import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import { CORRIDORS, type GeneratedBlock, type PlanResult } from "@/lib/types";
import {
  ChromeButton,
  DataTable,
  EmptyState,
  ErrorNote,
  Field,
  KeyValueGrid,
  Loading,
  Meta,
  PageHeader,
  Panel,
  RiskTag,
  ScoreBar,
  SelectInput,
  Stat,
  Tag,
  TextInput,
} from "@/components/control";
import { BeforeAfterTable } from "@/components/before-after";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Plan Generator — Railway AI Block Planner" }] }),
  component: PlanGenerator,
});

type PlanForm = {
  planning_horizon: string;
  start_date: string;
  end_date: string;
  corridor: string;
  task_ids: string;
};

const INITIAL: PlanForm = {
  planning_horizon: "weekly",
  start_date: "2026-09-16",
  end_date: "2026-09-22",
  corridor: "",
  task_ids: "",
};

function toBody(f: PlanForm) {
  const ids = f.task_ids
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    planning_horizon: f.planning_horizon,
    start_date: f.start_date,
    end_date: f.end_date,
    ...(f.corridor ? { corridor: f.corridor } : {}),
    ...(ids.length ? { task_ids: ids } : {}),
  };
}

function PlanGenerator() {
  const [form, setForm] = useState<PlanForm>(INITIAL);
  const set = <K extends keyof PlanForm>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const generate = useMutation({
    mutationFn: async (body: ReturnType<typeof toBody>) =>
      (await apiPost<PlanResult>("/ai/generate-plan", body)).data,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    generate.mutate(toBody(form));
  };

  const plan = generate.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI ENGINE · PLAN GENERATOR"
        title="Generate an optimized block plan"
        intro="Pulls pending TMS, SMMS and TDMS work, scores every task 0–100, bundles co-located tasks into shared shadow blocks and checks each block against the timetable."
      />

      <Panel title="Planning inputs">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-6">
          <Field label="Horizon">
            <SelectInput
              value={form.planning_horizon}
              onChange={(e) => set("planning_horizon", e.target.value)}
            >
              {["daily", "weekly", "monthly"].map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Start date">
            <TextInput
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </Field>
          <Field label="End date">
            <TextInput
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </Field>
          <Field label="Corridor">
            <SelectInput value={form.corridor} onChange={(e) => set("corridor", e.target.value)}>
              <option value="">All corridors</option>
              {CORRIDORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Task IDs (optional)" hint="Comma-separated, e.g. TMS-TRK-2026-001">
            <TextInput
              value={form.task_ids}
              onChange={(e) => set("task_ids", e.target.value)}
              placeholder="All pending"
            />
          </Field>
          <div className="flex items-end">
            <ChromeButton type="submit" disabled={generate.isPending} className="w-full">
              {generate.isPending ? "Optimizing…" : "Generate plan"}
            </ChromeButton>
          </div>
        </form>
        <p className="mt-3 font-mono text-[10px] text-steel/70">
          Generated plans are simulations and are not saved. Officer approvals for planned blocks
          live on{" "}
          <Link to="/planning" className="text-signal hover:underline">
            Approvals
          </Link>
          .
        </p>
      </Panel>

      {generate.isPending ? <Loading label="Scoring tasks and bundling shadow blocks…" /> : null}
      {generate.error ? <ErrorNote error={generate.error} title="Plan generation failed" /> : null}
      {!plan && !generate.isPending && !generate.error ? (
        <EmptyState
          title="No plan generated yet"
          hint="Pick a horizon and corridor, then generate."
        />
      ) : null}

      {plan ? <PlanView plan={plan} /> : null}
    </div>
  );
}

function PlanView({ plan }: { plan: PlanResult }) {
  const k = plan.kpis ?? {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Tasks processed"
          value={fmtNum(plan.total_tasks_processed, 0)}
          sub={plan.corridor ?? "All corridors"}
        />
        <Stat
          label="Shadow blocks"
          value={fmtNum(plan.generated_blocks?.length ?? 0, 0)}
          tone="signal"
          sub={`${k["blocksBefore"] ?? "—"} separate blocks before`}
        />
        <Stat
          label="Train conflicts"
          value={fmtNum(plan.conflicts?.length ?? 0, 0)}
          tone={plan.conflicts?.length ? "danger" : "clear"}
          sub={`${k["conflictsBefore"] ?? "—"} before`}
        />
        <Stat
          label="Availability"
          value={`${k["availabilityAfter"] ?? "—"}%`}
          tone="clear"
          sub={`from ${k["availabilityBefore"] ?? "—"}% · +${k["availabilityGainPct"] ?? "—"}%`}
        />
      </div>

      <div className="space-y-4">
        {(plan.generated_blocks ?? []).map((b) => (
          <BlockCard key={b.block_id} block={b} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="Task priority ranking" className="xl:col-span-7">
          {plan.task_priorities?.length ? (
            <DataTable head={["Task", "Score", "Level", "Main factors"]}>
              {plan.task_priorities.map((t, i) => (
                <tr key={t.task_id ?? i}>
                  <td className="text-signal">{t.task_id ?? "—"}</td>
                  <td>
                    <ScoreBar value={t.priority_score} />
                  </td>
                  <td>
                    <RiskTag level={t.priority_level} />
                  </td>
                  <td className="text-steel">
                    {(t.major_contributing_factors ?? []).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <p className="font-mono text-[11px] text-steel">No priorities returned.</p>
          )}
        </Panel>
        <div className="space-y-6 xl:col-span-5">
          <Panel title="Recommendations">
            <ul className="space-y-2">
              {(plan.recommendations ?? []).map((r, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-steel">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-clear" />
                  {r}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Plan KPIs">
            <KeyValueGrid data={plan.kpis} />
          </Panel>
        </div>
      </div>

      <Panel title="Before vs after">
        <BeforeAfterTable data={plan.before_vs_after_evaluation} />
      </Panel>
    </div>
  );
}

function BlockCard({ block: b }: { block: GeneratedBlock }) {
  return (
    <Panel title={b.block_id} right={`OPTIMIZATION ${fmtNum(b.optimization_score)}`}>
      <div className="grid gap-4 md:grid-cols-5">
        <Meta label="Date" value={b.date ?? "—"} />
        <Meta label="Window" value={`${b.start_time ?? "?"}–${b.end_time ?? "?"}`} tone="signal" />
        <Meta label="Duration" value={`${fmtNum(b.duration)} h`} />
        <Meta label="Corridor" value={b.corridor ?? "—"} />
        <Meta
          label="Train conflicts"
          value={b.affected_trains?.length ?? 0}
          tone={b.affected_trains?.length ? "danger" : "clear"}
        />
      </div>
      {b.location ? <p className="mt-3 font-mono text-[11px] text-steel">{b.location}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(b.departments ?? []).map((d) => (
          <Tag key={d} tone="steel">
            {d}
          </Tag>
        ))}
      </div>
      {b.selected_tasks?.length ? (
        <div className="mt-4">
          <DataTable head={["Task", "Department", "Work", "Asset", "Priority", "Level", "Hours"]}>
            {b.selected_tasks.map((t, i) => (
              <tr key={t.task_id ?? i}>
                <td className="text-signal">{t.task_id ?? "—"}</td>
                <td>{t.department ?? "—"}</td>
                <td>{t.task_type ?? "—"}</td>
                <td className="text-steel">{t.asset_id ?? "—"}</td>
                <td>
                  <ScoreBar value={t.priority_score} />
                </td>
                <td>
                  <RiskTag level={t.priority_level} />
                </td>
                <td>{fmtNum(t.estimated_duration)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      ) : null}
      {b.affected_trains?.length ? (
        <div className="mt-4">
          <div className="label-mono mb-2 tracking-widest">Affected trains</div>
          <DataTable head={["Train", "Name", "Rake", "Entry", "Exit", "Regulable", "Delay"]}>
            {b.affected_trains.map((t, i) => (
              <tr key={`${t.train_number}-${i}`}>
                <td>{t.train_number ?? "—"}</td>
                <td>{t.train_name ?? "—"}</td>
                <td>{t.rake_type ?? "—"}</td>
                <td>{t.entry_time ?? "—"}</td>
                <td>{t.exit_time ?? "—"}</td>
                <td>{t.can_be_regulated ? "Yes" : "No"}</td>
                <td className="text-danger">{fmtNum(t.delay_minutes, 0)} min</td>
              </tr>
            ))}
          </DataTable>
        </div>
      ) : null}
      {b.reason_recommendation ? (
        <p className="mt-4 text-sm leading-relaxed text-steel">{b.reason_recommendation}</p>
      ) : null}
    </Panel>
  );
}
