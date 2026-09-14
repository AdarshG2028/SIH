import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { tasksQuery, type TaskFilters } from "@/lib/queries";
import { useGenerateTasks, usePriorityScore } from "@/lib/actions";
import { TASK_DEPARTMENTS, TASK_TYPES, type Task } from "@/lib/types";
import {
  AsyncBlock,
  ChromeButton,
  DataTable,
  ErrorNote,
  Field,
  GhostButton,
  Loading,
  PageHeader,
  Pager,
  Panel,
  RiskTag,
  SelectInput,
  TextInput,
} from "@/components/control";
import { PriorityResultView } from "@/components/priority-result";
import { daysOverdue, fmtDate, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Maintenance Tasks — Railway AI Block Planner" }] }),
  component: Tasks,
});

type Draft = Required<Omit<TaskFilters, "page" | "limit">>;
const EMPTY: Draft = {
  department: "",
  sectionId: "",
  taskType: "",
  minScore: "",
  maxScore: "",
  dueAfter: "",
  dueBefore: "",
  search: "",
};

const CRITICALITY: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Maps a backend Task (+ its joined risk) onto the ML priority model's input fields. */
function toPriorityInput(t: Task) {
  const overdue = daysOverdue(t.dueDate);
  const level = t.risk?.riskLevel?.toUpperCase() ?? "";
  return {
    task_id: t.taskId,
    department: t.department,
    task_type: t.taskType,
    location: t.sectionId,
    ...(t.dueDate ? { due_date: t.dueDate.slice(0, 10) } : {}),
    criticality: CRITICALITY[level] ?? "Medium",
    urgency: overdue > 3 ? "Urgent" : overdue > 0 ? "Short-term" : "Flexible",
    overdue_days: overdue,
    safety_impact: t.description ?? t.taskType,
    ...(t.risk?.predictedProbability !== undefined
      ? { ml_probability: t.risk.predictedProbability }
      : {}),
  };
}

function Tasks() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [filters, setFilters] = useState<Draft>(EMPTY);
  const [page, setPage] = useState(1);
  const [scoring, setScoring] = useState<Task | null>(null);
  const { data, isLoading, error, isFetching } = useQuery(
    tasksQuery({ ...filters, page, limit: 50 }),
  );
  const generate = useGenerateTasks();
  const score = usePriorityScore();

  const set = (key: keyof Draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFilters(draft);
    setPage(1);
  };
  const scoreTask = (t: Task) => {
    setScoring(t);
    score.mutate(toPriorityInput(t));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="WORK BANK · TASKS"
        title="Pending maintenance tasks"
        intro="Defects from inspections flagged 'Attention Required' and overdue scheduled maintenance, joined with each asset's latest ML risk."
        actions={
          <ChromeButton onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Generating…" : "Generate tasks"}
          </ChromeButton>
        }
      />
      {generate.error ? <ErrorNote error={generate.error} title="Task generation failed" /> : null}

      <Panel title="Filters">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <Field label="Search">
            <TextInput
              value={draft.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Task, asset, text"
            />
          </Field>
          <Field label="Department">
            <SelectInput
              value={draft.department}
              onChange={(e) => set("department", e.target.value)}
            >
              <option value="">All</option>
              {TASK_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Type">
            <SelectInput value={draft.taskType} onChange={(e) => set("taskType", e.target.value)}>
              <option value="">All</option>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Station / section">
            <TextInput
              value={draft.sectionId}
              onChange={(e) => set("sectionId", e.target.value)}
              placeholder="Code"
            />
          </Field>
          <Field label="Due after">
            <TextInput
              type="date"
              value={draft.dueAfter}
              onChange={(e) => set("dueAfter", e.target.value)}
            />
          </Field>
          <Field label="Due before">
            <TextInput
              type="date"
              value={draft.dueBefore}
              onChange={(e) => set("dueBefore", e.target.value)}
            />
          </Field>
          <Field label="Criticality min / max">
            <div className="flex gap-2">
              <TextInput
                inputMode="decimal"
                value={draft.minScore}
                onChange={(e) => set("minScore", e.target.value)}
                placeholder="0"
              />
              <TextInput
                inputMode="decimal"
                value={draft.maxScore}
                onChange={(e) => set("maxScore", e.target.value)}
                placeholder="100"
              />
            </div>
          </Field>
          <div className="flex items-end gap-2">
            <ChromeButton type="submit" className="flex-1">
              Apply
            </ChromeButton>
            <GhostButton
              onClick={() => {
                setDraft(EMPTY);
                setFilters(EMPTY);
                setPage(1);
              }}
            >
              Clear
            </GhostButton>
          </div>
        </form>
      </Panel>

      {scoring ? (
        <Panel
          title={`AI priority · ${scoring.taskId}`}
          right={
            <button type="button" onClick={() => setScoring(null)} className="hover:underline">
              CLOSE ✕
            </button>
          }
        >
          {score.isPending ? <Loading label="Scoring…" /> : null}
          {score.error ? <ErrorNote error={score.error} title="Scoring failed" /> : null}
          {score.data ? <PriorityResultView result={score.data} /> : null}
        </Panel>
      ) : null}

      <Panel title="Tasks" right={isFetching ? "REFRESHING…" : undefined}>
        <AsyncBlock
          isLoading={isLoading}
          error={error}
          data={data}
          isEmpty={(d) => d.rows.length === 0}
          emptyTitle="No pending tasks"
          emptyHint="Import inspections and maintenance schedules, then press Generate tasks."
        >
          {({ rows, pagination }) => (
            <>
              <DataTable
                head={[
                  "Task",
                  "Department",
                  "Station",
                  "Asset",
                  "Type",
                  "Description",
                  "Due",
                  "Risk",
                  "",
                ]}
              >
                {rows.map((t) => {
                  const overdue = daysOverdue(t.dueDate);
                  return (
                    <tr key={t.taskId}>
                      <td className="text-signal">{t.taskId}</td>
                      <td>{t.department}</td>
                      <td>{t.sectionId}</td>
                      <td>
                        {t.assetId ? (
                          <Link
                            to="/assets/$assetId"
                            params={{ assetId: t.assetId }}
                            className="text-signal hover:underline"
                          >
                            {t.assetId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{t.taskType}</td>
                      <td className="max-w-64 text-steel">{t.description ?? "—"}</td>
                      <td className={overdue > 0 ? "text-danger" : "text-steel"}>
                        {fmtDate(t.dueDate)}
                        {overdue > 0 ? (
                          <div className="text-[10px]">{overdue} d overdue</div>
                        ) : null}
                      </td>
                      <td>
                        {t.risk ? (
                          <div className="flex items-center gap-2">
                            <RiskTag level={t.risk.riskLevel} />
                            <span>{fmtNum(t.risk.riskScore)}</span>
                          </div>
                        ) : (
                          <span className="text-steel">—</span>
                        )}
                      </td>
                      <td>
                        <GhostButton className="px-2.5 py-1.5" onClick={() => scoreTask(t)}>
                          AI score
                        </GhostButton>
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
              <Pager
                page={pagination?.page ?? page}
                totalPages={pagination?.totalPages ?? 1}
                total={pagination?.total}
                onPage={setPage}
              />
            </>
          )}
        </AsyncBlock>
      </Panel>
    </div>
  );
}
