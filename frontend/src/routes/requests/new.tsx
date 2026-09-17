import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";
import { DEPARTMENTS, EQUIPMENT_OPTIONS, PRIORITIES, SECTIONS } from "@/lib/types";
import {
  Checkbox,
  ChromeButton,
  Field,
  GhostButton,
  PageHeader,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  Tag,
} from "@/components/control";
import { useStation } from "@/lib/station-context";
import {
  freeWindowsFor,
  planBlocks,
  prettyDate,
  to12h,
  weekdayName,
  blockPhases,
  closureSaved,
  type ExistingBlock,
  type PlanOption,
  type PlanResult,
} from "@/lib/block-plan";
import { getLiveTrains } from "@/lib/live-trains";
import { AlertTriangle, ArrowLeft, CalendarDays, Clock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/requests/new")({
  head: () => ({ meta: [{ title: "Request a Block — Railway AI Block Planner" }] }),
  component: NewRequest,
});

/** Maintenance types, per department — no more free typing. */
const MAINTENANCE_TYPES: Record<string, string[]> = {
  Engineering: [
    "Track Maintenance",
    "Ballast Tamping",
    "Rail Grinding",
    "Deep Screening",
    "Rail / Weld Renewal",
    "Points & Crossing Renewal",
    "Bridge Inspection",
  ],
  "Signal & Telecommunication (S&T)": [
    "Signal Testing",
    "Point Machine Overhaul",
    "Axle Counter Maintenance",
    "Interlocking Alteration",
    "Cable Laying / Fault Repair",
  ],
  "Traction Distribution (TRD)": [
    "OHE Inspection",
    "OHE Wire Renewal",
    "Insulator Replacement",
    "Mast / Structure Repair",
    "Traction Bonding",
  ],
};

/* ----------------------------------------------------- server plan adapter */

/** The shape the Python planner returns, in its own snake_case. */
interface ServerSession {
  block_id: string;
  sequence: number;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
}

interface ServerOption {
  option_id: string;
  cadence: string;
  window_label: string;
  start_time: string;
  end_time: string;
  session_hours: number;
  total_hours: number;
  sessions: ServerSession[];
  note: string;
  traffic_note: string;
  shares_existing_block?: boolean;
  forces_delay?: boolean;
  over_capacity?: boolean;
  affected_trains?: unknown[];
}

interface ServerPlan {
  request_ref: string;
  cadence: string;
  rationale: string;
  options: ServerOption[];
  ml_probability?: number | null;
  ml_risk_level?: string | null;
  planned_by?: string;
}

/**
 * Converts the planner's response into the shape these screens already render.
 * Keeping the mapping in one place means the UI never has to know whether a
 * plan came from Python or from the local fallback.
 */
function fromServerPlan(payload: ServerPlan): PlanResult {
  const options: PlanOption[] = (payload.options ?? []).map((o) => ({
    optionId: o.option_id,
    cadence: o.cadence as PlanOption["cadence"],
    windowLabel: o.window_label,
    startTime: o.start_time,
    endTime: o.end_time,
    sessionHours: o.session_hours,
    totalHours: o.total_hours,
    note: o.note,
    trafficNote: o.traffic_note,
    ...(o.shares_existing_block ? { sharesExistingBlock: true } : {}),
    ...(o.forces_delay ? { forcesDelay: true } : {}),
    ...(o.over_capacity ? { overCapacity: true } : {}),
    sessions: (o.sessions ?? []).map((s) => ({
      blockId: s.block_id,
      sequence: s.sequence,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      hours: s.hours,
    })),
  }));

  return {
    cadence: (payload.cadence ?? "single") as PlanResult["cadence"],
    rationale: payload.rationale ?? "",
    options,
    nightsNeeded: options[0]?.sessions.length ?? 1,
  };
}

type Step = "form" | "options" | "preview";

type FormState = {
  department: string;
  maintenanceType: string;
  priority: string;
  sectionId: string;
  fromLocation: string;
  toLocation: string;
  fromKm: string;
  toKm: string;
  assetId: string;
  startDate: string;
  durationHours: string;
  workersRequired: string;
  equipment: string[];
  extraEquipment: string;
  additionalNotes: string;
};

const INITIAL: FormState = {
  department: "Engineering",
  maintenanceType: "Track Maintenance",
  priority: "MEDIUM",
  sectionId: "LNL-PUNE",
  fromLocation: "Lonavala",
  toLocation: "Pune",
  fromKm: "45",
  toKm: "52",
  assetId: "",
  startDate: "2026-09-20",
  durationHours: "3",
  workersRequired: "10",
  equipment: ["Tamping Machine"],
  extraEquipment: "",
  additionalNotes: "Ballast tamping, track alignment and joint inspection on Up-line",
};

type Errors = Partial<Record<keyof FormState, string>>;

const isNum = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.sectionId) e.sectionId = "Section is required";
  if (!f.department) e.department = "Department is required";
  if (!f.maintenanceType) e.maintenanceType = "Pick a maintenance type";
  if (!isNum(f.fromKm)) e.fromKm = "From km must be a number";
  if (!isNum(f.toKm)) e.toKm = "To km must be a number";
  if (isNum(f.fromKm) && isNum(f.toKm) && Number(f.toKm) < Number(f.fromKm))
    e.toKm = "To km must be ≥ from km";
  if (!(Number(f.durationHours) > 0)) e.durationHours = "Duration must be greater than 0";
  if (!f.startDate) e.startDate = "Pick a start date";
  if (f.workersRequired && !(Number(f.workersRequired) >= 0))
    e.workersRequired = "Workers must be a number";
  return e;
}

const cadenceLabel: Record<string, string> = {
  single: "SINGLE BLOCK",
  weekly: "WEEKLY PLAN",
  monthly: "MONTHLY PLAN",
  continuous: "CONTINUOUS BLOCK",
};

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: PlanOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left transition ${
        selected
          ? "border-signal bg-signal/10"
          : "border-line bg-ink3/40 hover:border-signal/50 hover:bg-ink3"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg font-semibold text-cream">{option.windowLabel}</span>
        <Tag tone={option.forcesDelay ? "danger" : option.overCapacity ? "danger" : "steel"}>
          {cadenceLabel[option.cadence] ?? option.cadence}
        </Tag>
      </div>

      <div className="mt-2 font-mono text-[11px] text-steel">{option.note}</div>
      <div className="mt-1 font-mono text-[10px] text-steel">{option.trafficNote}</div>

      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] text-steel">
        <span>
          Blocks: <strong className="text-cream">{option.sessions.length}</strong>
        </span>
        <span>
          Per night: <strong className="text-cream">{option.sessionHours}h</strong>
        </span>
        <span>
          Total: <strong className="text-cream">{option.totalHours}h</strong>
        </span>
      </div>

      {option.forcesDelay ? (
        <div className="mt-3 flex items-start gap-2 rounded border border-danger/40 bg-danger/10 p-2 font-mono text-[10px] text-danger">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Too critical to split. Trains crossing this span will be regulated — the delay is
            accepted rather than leaving the asset part-worked.
          </span>
        </div>
      ) : null}

      {option.overCapacity ? (
        <div className="mt-3 flex items-start gap-2 rounded border border-danger/40 bg-danger/10 p-2 font-mono text-[10px] text-danger">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>Needs more night windows than a month holds. Consider splitting the km span.</span>
        </div>
      ) : null}
    </button>
  );
}

function SessionList({ option }: { option: PlanOption }) {
  const shown = option.sessions.slice(0, 12);
  const rest = option.sessions.length - shown.length;

  return (
    <div className="space-y-2">
      {shown.map((s) => (
        <div
          key={s.blockId}
          className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-ink3/40 px-3 py-2 font-mono text-[11px]"
        >
          <span className="text-signal">{s.blockId}</span>
          <span className="text-cream">
            {weekdayName(s.date)} {prettyDate(s.date)}
          </span>
          <span className="text-steel">
            {to12h(s.startTime)} – {to12h(s.endTime)}
          </span>
          <span className="text-steel">{s.hours}h</span>
        </div>
      ))}
      {rest > 0 ? (
        <p className="font-mono text-[10px] text-steel">
          + {rest} more block{rest > 1 ? "s" : ""} in this plan.
        </p>
      ) : null}
    </div>
  );
}

function NewRequest() {
  const navigate = useNavigate();
  const { activeStation, addPlannedTask, tasks, userProfile } = useStation();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const typeOptions = MAINTENANCE_TYPES[form.department] ?? [];

  // Live trains for this station, delays included. The planner cuts these out
  // of every candidate window using the effective passage time, so a slot is
  // never offered while a late rake is still occupying the section.
  const trains = useMemo(
    () =>
      getLiveTrains(activeStation.code).map((t) => ({
        number: t.number,
        name: t.name,
        scheduledPassage: t.scheduledPassage,
        effectivePassage: t.effectivePassage,
        liveDelayMinutes: t.liveDelayMinutes,
      })),
    [activeStation.code],
  );

  // Blocks already allotted on this corridor. Compatible work joins one of
  // these instead of opening a second closure — the requester just sees the
  // same timing come back.
  const existing = useMemo<ExistingBlock[]>(
    () =>
      tasks
        .filter((t) => t.status !== "completed")
        .flatMap((t) => {
          const spans = t.sessions?.length
            ? t.sessions
            : t.scheduledWindow
              ? [
                  {
                    date: t.scheduledWindow.date,
                    startTime: t.scheduledWindow.startTime,
                    endTime: t.scheduledWindow.endTime,
                  },
                ]
              : [];

          return spans.map((s) => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            sectionId: t.sectionId,
            fromKm: t.fromKm,
            toKm: t.toKm,
            departments: [t.department],
          }));
        }),
    [tasks],
  );

  const chosen = plan?.options.find((o) => o.optionId === chosenId) ?? null;

  const onSubmitToAi = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setPlanning(true);
    setPlanError(null);

    const requestRef = `REQ-${Date.now().toString().slice(-6)}`;

    try {
      // The windows come from the Python planner, which scores the asset with
      // the trained ensemble, cuts candidate windows around real goods traffic
      // and decides whether the job splits. The browser only renders them.
      const res = await apiPost<ServerPlan>("/ai/plan-request", {
        requestRef,
        corridor: form.sectionId,
        sectionId: form.sectionId,
        durationHours: Number(form.durationHours),
        startDate: form.startDate,
        priority: form.priority,
        department: form.department,
        fromKm: Number(form.fromKm),
        toKm: Number(form.toKm),
        assetId: form.assetId || undefined,
        maintenanceType: form.maintenanceType,
      });

      const result = fromServerPlan(res.data ?? (res as unknown as ServerPlan));
      setPlan(result);
      setChosenId(result.options[0]?.optionId ?? null);
      setStep("options");
    } catch (err) {
      // Falling back keeps the demo alive if the Python engine is down, but it
      // says so plainly rather than passing browser maths off as the AI.
      const fallback = planBlocks(
        {
          requestRef,
          sectionId: form.sectionId,
          durationHours: Number(form.durationHours),
          startDate: form.startDate,
          priority: form.priority,
          department: form.department,
          fromKm: Number(form.fromKm),
          toKm: Number(form.toKm),
          existing,
        },
        freeWindowsFor(activeStation.quietWindow, trains),
      );

      setPlanError(
        err instanceof Error
          ? `AI engine unreachable (${err.message}) — showing a local estimate.`
          : "AI engine unreachable — showing a local estimate.",
      );
      setPlan(fallback);
      setChosenId(fallback.options[0]?.optionId ?? null);
      setStep("options");
    } finally {
      setPlanning(false);
    }
  };

  const onConfirm = async () => {
    if (!chosen || !plan) return;
    const first = chosen.sessions[0];
    if (!first) return;

    const ref = first.blockId.replace(/-B\d+$/, "");
    setSaving(true);

    // Persist first. A request that only lives in React state disappears on
    // refresh, which is how a demo loses its own evidence mid-presentation.
    try {
      await apiPost("/ai/block-requests", {
        requestId: ref,
        sectionId: form.sectionId,
        department: form.department,
        maintenanceType: form.maintenanceType,
        priority: form.priority,
        fromKm: Number(form.fromKm),
        toKm: Number(form.toKm),
        assetId: form.assetId || undefined,
        submittedBy: userProfile.name,
        notes: form.additionalNotes,
        selectedWindow: {
          date: first.date,
          startTime: first.startTime,
          endTime: first.endTime,
          durationHours: chosen.sessionHours,
        },
        sessions: chosen.sessions,
        cadence: chosen.cadence,
      });
    } catch (err) {
      // The block is still shown locally so the officer is not left with
      // nothing, but they are told it did not reach the database.
      toast.error(
        err instanceof Error
          ? `Saved locally only — backend rejected it (${err.message})`
          : "Saved locally only — could not reach the backend",
      );
    } finally {
      setSaving(false);
    }

    addPlannedTask({
      id: ref,
      title: form.maintenanceType,
      department: form.department as never,
      maintenanceType: form.maintenanceType,
      sectionId: form.sectionId,
      stationCode: activeStation.code,
      fromKm: Number(form.fromKm),
      toKm: Number(form.toKm),
      durationHours: Number(form.durationHours),
      priority: form.priority as never,
      status: "scheduled",
      cadence: chosen.cadence,
      sessions: chosen.sessions,
      notes: form.additionalNotes,
      scheduledWindow: {
        date: first.date,
        startTime: first.startTime,
        endTime: first.endTime,
      },
    });

    toast.success(
      `${ref} accepted — ${chosen.sessions.length} block${chosen.sessions.length > 1 ? "s" : ""} allotted`,
    );
    void navigate({ to: "/dashboard" });
  };

  /* ---------------------------------------------------------------- form */
  if (step === "form") {
    return (
      <form onSubmit={onSubmitToAi} className="space-y-6" noValidate>
        <PageHeader
          eyebrow="BLOCK REQUEST · NEW"
          title="Request a block"
          intro="Describe the work, the span and when you want to start. The AI works out the free windows, checks train traffic and comes back with the timings you can actually have."
        />

        <Panel title="Work">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" error={errors.department}>
              <SelectInput
                value={form.department}
                onChange={(e) => {
                  const dept = e.target.value;
                  set("department", dept);
                  set("maintenanceType", MAINTENANCE_TYPES[dept]?.[0] ?? "");
                }}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Maintenance type" error={errors.maintenanceType}>
              <SelectInput
                value={form.maintenanceType}
                onChange={(e) => set("maintenanceType", e.target.value)}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Priority">
              <SelectInput value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Asset ID (optional)" hint="Attaches the latest ML risk score">
              <TextInput
                value={form.assetId}
                onChange={(e) => set("assetId", e.target.value)}
                placeholder="AST…"
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section" error={errors.sectionId}>
              <SelectInput
                value={form.sectionId}
                onChange={(e) => set("sectionId", e.target.value)}
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From km" error={errors.fromKm}>
                <TextInput
                  inputMode="decimal"
                  value={form.fromKm}
                  onChange={(e) => set("fromKm", e.target.value)}
                />
              </Field>
              <Field label="To km" error={errors.toKm}>
                <TextInput
                  inputMode="decimal"
                  value={form.toKm}
                  onChange={(e) => set("toKm", e.target.value)}
                />
              </Field>
            </div>
            <Field label="From location">
              <TextInput
                value={form.fromLocation}
                onChange={(e) => set("fromLocation", e.target.value)}
              />
            </Field>
            <Field label="To location">
              <TextInput
                value={form.toLocation}
                onChange={(e) => set("toLocation", e.target.value)}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Preferred window">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" error={errors.startDate}>
              <TextInput
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field
              label="Total duration (h)"
              error={errors.durationHours}
              hint="How long the work takes in total. The AI decides whether that is one block or several."
            >
              <TextInput
                inputMode="decimal"
                value={form.durationHours}
                onChange={(e) => set("durationHours", e.target.value)}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Resources">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Workers required" error={errors.workersRequired}>
              <TextInput
                inputMode="numeric"
                value={form.workersRequired}
                onChange={(e) => set("workersRequired", e.target.value)}
              />
            </Field>
            <Field label="Other equipment" hint="Comma-separated">
              <TextInput
                value={form.extraEquipment}
                onChange={(e) => set("extraEquipment", e.target.value)}
                placeholder="Flash Butt Welding Machine, …"
              />
            </Field>
          </div>
          <div className="mt-4">
            <span className="label-mono block tracking-widest">Equipment</span>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {EQUIPMENT_OPTIONS.map((item) => (
                <Checkbox
                  key={item}
                  label={item}
                  checked={form.equipment.includes(item)}
                  onChange={(on) =>
                    set(
                      "equipment",
                      on ? [...form.equipment, item] : form.equipment.filter((x) => x !== item),
                    )
                  }
                />
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Field label="Notes">
              <TextArea
                value={form.additionalNotes}
                onChange={(e) => set("additionalNotes", e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <ChromeButton type="submit" disabled={planning} className="flex items-center gap-2">
              <Sparkles className="size-4 text-signal" />
              <span>{planning ? "Asking the AI engine…" : "Submit to AI"}</span>
            </ChromeButton>
            <GhostButton
              onClick={() => {
                setForm(INITIAL);
                setErrors({});
              }}
            >
              Reset
            </GhostButton>
            {Object.keys(errors).length ? (
              <span className="font-mono text-[11px] text-danger">Fix the highlighted fields.</span>
            ) : null}
          </div>
        </Panel>
      </form>
    );
  }

  /* ------------------------------------------------------------- options */
  if (step === "options" && plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="BLOCK REQUEST · AI TIMINGS"
          title="Available timings"
          intro={plan.rationale}
          actions={
            <GhostButton onClick={() => setStep("form")} className="flex items-center gap-2">
              <ArrowLeft className="size-3.5" />
              <span>Back to form</span>
            </GhostButton>
          }
        />

        <Panel
          title="Free windows"
          right={
            <span className="font-mono text-[10px] text-steel">
              {plan.options.length} AVAILABLE · OCCUPIED SLOTS EXCLUDED
            </span>
          }
        >
          {planError ? (
            <p className="mb-3 rounded border border-danger/40 bg-danger/10 p-2 font-mono text-[11px] text-danger">
              {planError}
            </p>
          ) : null}
          <p className="mb-4 font-mono text-xs text-steel">
            Only windows that are actually free are shown. A window already held by another block
            cannot take this work on top of it, so it is left out of this list entirely.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            {plan.options.map((o) => (
              <OptionCard
                key={o.optionId}
                option={o}
                selected={chosenId === o.optionId}
                onSelect={() => setChosenId(o.optionId)}
              />
            ))}
          </div>
        </Panel>

        {chosen ? (
          <Panel
            title="Blocks in this plan"
            right={
              <span className="font-mono text-[10px] text-steel">
                {chosen.sessions.length} BLOCK{chosen.sessions.length > 1 ? "S" : ""}
              </span>
            }
          >
            <SessionList option={chosen} />
          </Panel>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <ChromeButton onClick={() => setStep("preview")} disabled={!chosen}>
            Preview
          </ChromeButton>
          <GhostButton onClick={() => setStep("form")}>Edit request</GhostButton>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- preview */
  if (step === "preview" && chosen) {
    const first = chosen.sessions[0]!;
    const last = chosen.sessions[chosen.sessions.length - 1]!;

    // Departments already inside this possession, plus this one. Named only
    // by department, never by task or requester.
    const alreadyIn = chosen.sharesExistingBlock
      ? [
          ...new Set(
            existing
              .filter((b) => b.date === first.date && b.startTime === chosen.startTime)
              .flatMap((b) => b.departments),
          ),
        ]
      : [];
    const phaseDepartments = [...new Set([...alreadyIn, form.department])];
    const sharedWith = phaseDepartments.length;

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="BLOCK REQUEST · REVIEW"
          title="Check before submitting"
          intro="This is exactly what will be filed. Change anything with Edit, or submit to have the blocks allotted."
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Submitted preferences">
            <dl className="space-y-2 font-mono text-[11px]">
              {[
                ["Department", form.department],
                ["Maintenance type", form.maintenanceType],
                ["Priority", form.priority],
                ["Section", form.sectionId],
                [
                  "Span",
                  `Km ${form.fromKm} – ${form.toKm} (${form.fromLocation} → ${form.toLocation})`,
                ],
                ["Requested start", prettyDate(form.startDate)],
                ["Total duration", `${form.durationHours} h`],
                ["Workers", form.workersRequired],
                [
                  "Equipment",
                  [...form.equipment, ...form.extraEquipment.split(",").map((x) => x.trim())]
                    .filter(Boolean)
                    .join(", ") || "—",
                ],
                ["Notes", form.additionalNotes || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line/40 pb-1.5">
                  <dt className="text-steel">{k}</dt>
                  <dd className="text-right text-cream">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <div className="space-y-6">
            <Panel title="Allotted window">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-display text-2xl font-semibold text-cream">
                  <Clock className="size-5 text-signal" />
                  {chosen.windowLabel}
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-steel">
                  <CalendarDays className="size-3.5" />
                  {chosen.sessions.length === 1
                    ? `${weekdayName(first.date)} ${prettyDate(first.date)}`
                    : `${prettyDate(first.date)} → ${prettyDate(last.date)} · ${chosen.sessions.length} blocks`}
                </div>
                <p className="font-mono text-[11px] text-steel">{chosen.note}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Tag tone="steel">{cadenceLabel[chosen.cadence]}</Tag>
                  <Tag tone="steel">{chosen.sessionHours}h per block</Tag>
                  <Tag tone="steel">{chosen.totalHours}h total</Tag>
                </div>
              </div>
            </Panel>

            <Panel title="Safety protocols">
              <ol className="list-decimal space-y-1.5 pl-4 font-mono text-[11px] text-steel">
                <li>Line block granted by the DRM and advised to adjacent station masters.</li>
                <li>Banner flags and detonators placed at 600 m and 1200 m on both approaches.</li>
                <li>
                  Power block taken and OHE earthed before any work near live equipment begins.
                </li>
                <li>
                  Sequence held: power block → engineering → S&amp;T → re-energisation and testing.
                </li>
                <li>
                  30 km/h caution order on the affected span for 24 h after the block is given up.
                </li>
              </ol>
            </Panel>
          </div>
        </div>

        <Panel title="Every block that will be held">
          <SessionList option={chosen} />
        </Panel>

        <div className="flex flex-wrap gap-3">
          <ChromeButton onClick={() => void onConfirm()} disabled={saving}>
            {saving ? "Filing…" : "Submit request"}
          </ChromeButton>
          <GhostButton onClick={() => setStep("options")}>Edit timing</GhostButton>
          <GhostButton onClick={() => setStep("form")}>Edit request</GhostButton>
        </div>
      </div>
    );
  }

  return null;
}
