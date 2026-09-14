import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { usePriorityScore } from "@/lib/actions";
import { riskQuery } from "@/lib/queries";
import { CRITICALITY_OPTIONS, DEPARTMENTS, URGENCY_OPTIONS } from "@/lib/types";
import {
  ChromeButton,
  EmptyState,
  ErrorNote,
  Field,
  GhostButton,
  PageHeader,
  Panel,
  SelectInput,
  TextInput,
} from "@/components/control";
import { PriorityResultView } from "@/components/priority-result";
import { errorMessages } from "@/lib/api";

export const Route = createFileRoute("/priority")({
  head: () => ({ meta: [{ title: "Priority Scoring — Railway AI Block Planner" }] }),
  component: Priority,
});

type PriorityForm = {
  task_id: string;
  department: string;
  task_type: string;
  location: string;
  due_date: string;
  criticality: string;
  urgency: string;
  overdue_days: string;
  safety_impact: string;
  asset_condition: string;
  ml_probability: string;
};

const INITIAL: PriorityForm = {
  task_id: "TMS-TRK-2026-002",
  department: "Engineering",
  task_type: "Rail Weld Defect Rectification",
  location: "BPL-RKMP",
  due_date: "2026-09-12",
  criticality: "Critical",
  urgency: "Urgent",
  overdue_days: "5",
  safety_impact: "Ultrasonic flaw detection detected rail head fissure defect",
  asset_condition: "41",
  ml_probability: "0.495",
};

function toBody(f: PriorityForm): Record<string, unknown> {
  const opt = (key: keyof PriorityForm) => (f[key].trim() ? { [key]: f[key].trim() } : {});
  const num = (key: keyof PriorityForm) =>
    f[key].trim() && Number.isFinite(Number(f[key])) ? { [key]: Number(f[key]) } : {};
  return {
    ...opt("task_id"),
    department: f.department,
    ...opt("task_type"),
    ...opt("location"),
    ...opt("due_date"),
    criticality: f.criticality,
    urgency: f.urgency,
    overdue_days: Number(f.overdue_days) || 0,
    ...opt("safety_impact"),
    ...num("asset_condition"),
    ...num("ml_probability"),
  };
}

function Priority() {
  const [form, setForm] = useState<PriorityForm>(INITIAL);
  const [assetId, setAssetId] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const qc = useQueryClient();
  const score = usePriorityScore();
  const set = <K extends keyof PriorityForm>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    score.mutate(toBody(form));
  };

  // Pull the ensemble's failure probability for an asset into the ML-probability field.
  const lookupRisk = async () => {
    const id = assetId.trim();
    if (!id) return;
    setLookingUp(true);
    try {
      const risk = await qc.fetchQuery(riskQuery(id));
      const p = risk?.risk_probability ?? risk?.predicted_probability;
      if (p === undefined) throw new Error("No probability on record");
      set("ml_probability", String(p));
      toast.success(`${id}: ${risk?.risk_level ?? ""} · probability ${(p * 100).toFixed(1)}%`);
    } catch (err) {
      toast.error(errorMessages(err)[0] ?? "Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI ENGINE · PRIORITY"
        title="Score a maintenance task"
        intro="Criticality, safety impact, overdue days, urgency, asset condition and ML failure probability are combined into a single 0–100 priority."
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="Task" className="xl:col-span-7">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Task ID">
                <TextInput value={form.task_id} onChange={(e) => set("task_id", e.target.value)} />
              </Field>
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
              <Field label="Task type">
                <TextInput
                  value={form.task_type}
                  onChange={(e) => set("task_type", e.target.value)}
                />
              </Field>
              <Field label="Location / section">
                <TextInput
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </Field>
              <Field label="Criticality">
                <SelectInput
                  value={form.criticality}
                  onChange={(e) => set("criticality", e.target.value)}
                >
                  {CRITICALITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Urgency">
                <SelectInput value={form.urgency} onChange={(e) => set("urgency", e.target.value)}>
                  {URGENCY_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Due date">
                <TextInput
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                />
              </Field>
              <Field label="Overdue days">
                <TextInput
                  inputMode="numeric"
                  value={form.overdue_days}
                  onChange={(e) => set("overdue_days", e.target.value)}
                />
              </Field>
              <Field label="Asset condition" hint="0 (failed) – 100 (new)">
                <TextInput
                  inputMode="decimal"
                  value={form.asset_condition}
                  onChange={(e) => set("asset_condition", e.target.value)}
                />
              </Field>
              <Field label="ML failure probability" hint="0 – 1, or look it up from an asset below">
                <TextInput
                  inputMode="decimal"
                  value={form.ml_probability}
                  onChange={(e) => set("ml_probability", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Safety impact">
              <TextInput
                value={form.safety_impact}
                onChange={(e) => set("safety_impact", e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap items-end gap-3 rounded-md bg-ink3/40 p-3 hairline">
              <div className="min-w-48 flex-1">
                <Field label="Fill probability from asset">
                  <TextInput
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    placeholder="AST027697"
                  />
                </Field>
              </div>
              <GhostButton
                onClick={() => void lookupRisk()}
                disabled={lookingUp || !assetId.trim()}
              >
                {lookingUp ? "Looking up…" : "Look up risk"}
              </GhostButton>
            </div>
            <div className="flex flex-wrap gap-3">
              <ChromeButton type="submit" disabled={score.isPending}>
                {score.isPending ? "Scoring…" : "Score task"}
              </ChromeButton>
              <GhostButton
                onClick={() => {
                  setForm(INITIAL);
                  score.reset();
                }}
              >
                Reset
              </GhostButton>
            </div>
          </form>
        </Panel>

        <Panel title="Result" className="xl:col-span-5">
          {score.error ? <ErrorNote error={score.error} title="Scoring failed" /> : null}
          {score.data ? (
            <PriorityResultView result={score.data} />
          ) : !score.error ? (
            <EmptyState
              title="Not scored yet"
              hint="The form is pre-filled with an overdue rail weld defect."
            />
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
