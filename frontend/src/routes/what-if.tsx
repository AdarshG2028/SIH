import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import { CORRIDORS, DEPARTMENTS, type WhatIfResult } from "@/lib/types";
import {
  ChromeButton,
  DataTable,
  EmptyState,
  ErrorNote,
  Field,
  GhostButton,
  KeyValueGrid,
  Lamp,
  Loading,
  Meta,
  PageHeader,
  Panel,
  SelectInput,
  Tag,
  TextInput,
} from "@/components/control";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/what-if")({
  head: () => ({ meta: [{ title: "What-If Simulator — Railway AI Block Planner" }] }),
  component: WhatIf,
});

type WhatIfForm = {
  corridor: string;
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  department: string;
  maintenance_type: string;
};

const INITIAL: WhatIfForm = {
  corridor: "LNL-PUNE",
  proposed_date: "2026-09-16",
  proposed_start_time: "10:30",
  proposed_end_time: "12:00",
  department: "Engineering",
  maintenance_type: "Track Maintenance",
};

function WhatIf() {
  const [form, setForm] = useState<WhatIfForm>(INITIAL);
  const set = <K extends keyof WhatIfForm>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const run = useMutation({
    mutationFn: async (body: WhatIfForm) => (await apiPost<WhatIfResult>("/ai/what-if", body)).data,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run.mutate(form);
  };

  const tryAlternative = (start?: string, end?: string) => {
    if (!start || !end) return;
    const next = { ...form, proposed_start_time: start, proposed_end_time: end };
    setForm(next);
    run.mutate(next);
  };

  const result = run.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIMULATOR · WHAT-IF"
        title="Test a block against the timetable"
        intro="Propose a corridor and time. The engine walks the timetable for that window, lists every passenger and goods service it would hit with an estimated delay, and suggests a cleaner slot."
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="Proposed block" className="xl:col-span-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Corridor">
              <SelectInput value={form.corridor} onChange={(e) => set("corridor", e.target.value)}>
                {CORRIDORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Date">
              <TextInput
                type="date"
                value={form.proposed_date}
                onChange={(e) => set("proposed_date", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start">
                <TextInput
                  type="time"
                  value={form.proposed_start_time}
                  onChange={(e) => set("proposed_start_time", e.target.value)}
                />
              </Field>
              <Field label="End">
                <TextInput
                  type="time"
                  value={form.proposed_end_time}
                  onChange={(e) => set("proposed_end_time", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Department">
              <SelectInput
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Maintenance type">
              <TextInput
                value={form.maintenance_type}
                onChange={(e) => set("maintenance_type", e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <ChromeButton type="submit" disabled={run.isPending}>
                {run.isPending ? "Simulating…" : "Run simulation"}
              </ChromeButton>
              <GhostButton
                onClick={() => {
                  setForm(INITIAL);
                  run.reset();
                }}
              >
                Reset
              </GhostButton>
            </div>
          </form>
        </Panel>

        <div className="space-y-6 xl:col-span-8">
          {run.isPending ? <Loading label="Walking the timetable…" /> : null}
          {run.error ? <ErrorNote error={run.error} title="Simulation failed" /> : null}
          {!result && !run.isPending && !run.error ? (
            <EmptyState
              title="No simulation yet"
              hint="Try 10:30–12:00 on LNL-PUNE to see daytime conflicts, then 01:00–04:00."
            />
          ) : null}

          {result ? (
            <>
              <Panel
                title="Verdict"
                right={`${form.corridor} · ${form.proposed_start_time}–${form.proposed_end_time}`}
              >
                <div className="flex items-center gap-3">
                  <Lamp tone={result.has_conflict ? "danger" : "clear"} />
                  <span className="font-display text-2xl uppercase text-cream">
                    {result.has_conflict ? "Timetable conflict" : "Clear of traffic"}
                  </span>
                </div>
                {result.recommendation ? (
                  <p className="mt-3 text-sm leading-relaxed text-steel">{result.recommendation}</p>
                ) : null}
                {result.conflict_summary ? (
                  <div className="mt-4">
                    <KeyValueGrid data={result.conflict_summary} />
                  </div>
                ) : null}
              </Panel>

              {result.recommended_alternative ? (
                <Panel title="Suggested alternative slot">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid grid-cols-3 gap-6">
                      <Meta
                        label="Window"
                        value={`${result.recommended_alternative.start_time ?? "?"}–${result.recommended_alternative.end_time ?? "?"}`}
                        tone="signal"
                      />
                      <Meta
                        label="Conflicts"
                        value={fmtNum(result.recommended_alternative.conflicts, 0)}
                        tone="clear"
                      />
                      <Meta label="Note" value={result.recommended_alternative.note ?? "—"} />
                    </div>
                    <GhostButton
                      onClick={() =>
                        tryAlternative(
                          result.recommended_alternative?.start_time,
                          result.recommended_alternative?.end_time,
                        )
                      }
                    >
                      Simulate this slot
                    </GhostButton>
                  </div>
                </Panel>
              ) : null}

              <Panel
                title="Affected trains"
                right={`${result.conflicting_trains?.length ?? 0} SERVICES`}
              >
                {result.conflicting_trains?.length ? (
                  <DataTable head={["Train", "Name", "Type", "Passage", "Priority", "Est. delay"]}>
                    {result.conflicting_trains.map((t, i) => (
                      <tr key={`${t.train_number}-${i}`}>
                        <td className="text-signal">{t.train_number ?? "—"}</td>
                        <td>{t.train_name ?? "—"}</td>
                        <td className="text-steel">{t.train_type ?? "—"}</td>
                        <td>{t.scheduled_passage ?? "—"}</td>
                        <td>
                          <Tag tone="steel">{t.priority ?? "—"}</Tag>
                        </td>
                        <td className="text-danger">{fmtNum(t.estimated_delay_minutes, 0)} min</td>
                      </tr>
                    ))}
                  </DataTable>
                ) : (
                  <p className="font-mono text-[11px] text-clear">
                    No train passes through this window.
                  </p>
                )}
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
