import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import {
  DEPARTMENTS,
  EQUIPMENT_OPTIONS,
  PRIORITIES,
  SECTIONS,
  type AssetRisk,
  type Decision,
  type Window,
} from "@/lib/types";
import {
  Checkbox,
  ChromeButton,
  ErrorNote,
  Field,
  GhostButton,
  PageHeader,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/control";

export const Route = createFileRoute("/requests/new")({
  head: () => ({ meta: [{ title: "Request a Block — Railway AI Block Planner" }] }),
  component: NewRequest,
});

type CreateResult = {
  id: string;
  requestId: string;
  status: string;
  selectedWindow?: Window;
  decision: Decision;
  assetRisk: AssetRisk | null;
};

type FormState = {
  requestId: string;
  department: string;
  maintenanceType: string;
  priority: string;
  sectionId: string;
  fromLocation: string;
  toLocation: string;
  fromKm: string;
  toKm: string;
  assetId: string;
  submittedBy: string;
  preferredDate: string;
  durationHours: string;
  preferredStartTime: string;
  preferredEndTime: string;
  workersRequired: string;
  equipment: string[];
  extraEquipment: string;
  additionalNotes: string;
  canBeCombined: boolean;
};

// Pre-filled with the reference LNL-PUNE night block so the demo works in one click.
const INITIAL: FormState = {
  requestId: "",
  department: "Engineering",
  maintenanceType: "Track Maintenance",
  priority: "MEDIUM",
  sectionId: "LNL-PUNE",
  fromLocation: "Lonavala",
  toLocation: "Pune",
  fromKm: "45",
  toKm: "52",
  assetId: "",
  submittedBy: "",
  preferredDate: "2026-09-16",
  durationHours: "3",
  preferredStartTime: "01:00",
  preferredEndTime: "05:00",
  workersRequired: "10",
  equipment: ["Tamping Machine"],
  extraEquipment: "",
  additionalNotes: "Ballast tamping, track alignment and joint inspection on Up-line",
  canBeCombined: true,
};

type Errors = Partial<Record<keyof FormState, string>>;

const isNum = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.sectionId) e.sectionId = "Section is required";
  if (!f.department) e.department = "Department is required";
  if (!isNum(f.fromKm)) e.fromKm = "From km must be a number";
  if (!isNum(f.toKm)) e.toKm = "To km must be a number";
  if (isNum(f.fromKm) && isNum(f.toKm) && Number(f.toKm) < Number(f.fromKm))
    e.toKm = "To km must be ≥ from km";
  if (!(Number(f.durationHours) > 0)) e.durationHours = "Duration must be greater than 0";
  if (!f.preferredDate) e.preferredDate = "Pick a preferred date";
  if (f.workersRequired && !(Number(f.workersRequired) >= 0))
    e.workersRequired = "Workers must be a number";
  return e;
}

function toPayload(f: FormState) {
  const equipment = [
    ...f.equipment,
    ...f.extraEquipment
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  return {
    ...(f.requestId.trim() ? { requestId: f.requestId.trim() } : {}),
    department: f.department,
    maintenanceType: f.maintenanceType.trim() || "Track Maintenance",
    priority: f.priority,
    sectionId: f.sectionId,
    fromLocation: f.fromLocation.trim(),
    toLocation: f.toLocation.trim(),
    fromKm: Number(f.fromKm),
    toKm: Number(f.toKm),
    ...(f.assetId.trim() ? { assetId: f.assetId.trim() } : {}),
    ...(f.submittedBy.trim() ? { submittedBy: f.submittedBy.trim() } : {}),
    // The ML parser accepts ISO dates and 24h times, exactly what the native inputs emit.
    schedulingPreferences: {
      preferredDate: f.preferredDate,
      durationHours: Number(f.durationHours),
      preferredStartTime: f.preferredStartTime,
      preferredEndTime: f.preferredEndTime,
    },
    resources: {
      workersRequired: Number(f.workersRequired || 0),
      equipmentRequired: equipment,
      additionalNotes: f.additionalNotes.trim(),
    },
    canBeCombined: f.canBeCombined,
  };
}

function NewRequest() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const qc = useQueryClient();
  const navigate = useNavigate();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const create = useMutation({
    mutationFn: async (body: ReturnType<typeof toPayload>) =>
      (await apiPost<CreateResult>("/ai/block-requests", body)).data,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["block-requests"] });
      if (!data) return;
      toast.success(`${data.requestId} evaluated — ${data.status.replace(/_/g, " ")}`);
      void navigate({ to: "/requests/$requestId", params: { requestId: data.requestId } });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    create.mutate(toPayload(form));
  };

  const toggleEquipment = (item: string, on: boolean) =>
    set("equipment", on ? [...form.equipment, item] : form.equipment.filter((x) => x !== item));

  const errorTitle =
    create.error instanceof ApiError && create.error.isEngineOffline
      ? "AI engine offline — the request was not saved"
      : "Could not submit the request";

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <PageHeader
        eyebrow="BLOCK REQUEST · NEW"
        title="Request a block"
        intro="Describe the work, span and preferred window. The AI engine scores traffic, weather, resources and co-located tasks from other departments, then recommends a window with alternatives."
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Panel title="Work">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" error={errors.department}>
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
              <Field
                label="Maintenance type"
                hint="e.g. Track Maintenance, OHE Inspection, Signal Testing"
              >
                <TextInput
                  value={form.maintenanceType}
                  onChange={(e) => set("maintenanceType", e.target.value)}
                />
              </Field>
              <Field label="Priority">
                <SelectInput
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field
                label="Asset ID (optional)"
                hint="Attaches the latest ML risk score, e.g. AST027697"
              >
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
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Date" error={errors.preferredDate}>
                <TextInput
                  type="date"
                  value={form.preferredDate}
                  onChange={(e) => set("preferredDate", e.target.value)}
                />
              </Field>
              <Field label="Earliest start">
                <TextInput
                  type="time"
                  value={form.preferredStartTime}
                  onChange={(e) => set("preferredStartTime", e.target.value)}
                />
              </Field>
              <Field label="Latest end">
                <TextInput
                  type="time"
                  value={form.preferredEndTime}
                  onChange={(e) => set("preferredEndTime", e.target.value)}
                />
              </Field>
              <Field label="Duration (h)" error={errors.durationHours}>
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
                    onChange={(on) => toggleEquipment(item, on)}
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
          </Panel>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Panel title="Submit">
            <div className="space-y-4">
              <Checkbox
                label="Allow shadow blocking with other departments"
                checked={form.canBeCombined}
                onChange={(on) => set("canBeCombined", on)}
              />
              <Field label="Submitted by (optional)">
                <TextInput
                  value={form.submittedBy}
                  onChange={(e) => set("submittedBy", e.target.value)}
                  placeholder="SSE/P-Way Lonavala"
                />
              </Field>
              <Field label="Request ID (optional)" hint="Leave blank to auto-generate">
                <TextInput
                  value={form.requestId}
                  onChange={(e) => set("requestId", e.target.value)}
                  placeholder="REQ-…"
                />
              </Field>
              {Object.keys(errors).length ? (
                <p className="font-mono text-[11px] text-danger">Fix the highlighted fields.</p>
              ) : null}
              {create.error ? <ErrorNote error={create.error} title={errorTitle} /> : null}
              <div className="flex flex-wrap gap-3">
                <ChromeButton type="submit" disabled={create.isPending}>
                  {create.isPending ? "Evaluating…" : "Submit to AI"}
                </ChromeButton>
                <GhostButton
                  onClick={() => {
                    setForm(INITIAL);
                    setErrors({});
                    create.reset();
                  }}
                >
                  Reset
                </GhostButton>
              </div>
            </div>
          </Panel>
          <Panel title="What happens next">
            <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-steel">
              <li>The backend validates the form and forwards it to the AI engine.</li>
              <li>
                The engine scores windows on traffic, weather and resources and merges co-located
                tasks.
              </li>
              <li>The request is saved with a recommended window and alternatives.</li>
              <li>An officer switches windows if needed and accepts or rejects it.</li>
            </ol>
          </Panel>
        </div>
      </div>
    </form>
  );
}
