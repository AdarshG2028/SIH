import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { API_BASE_URL, apiPost, apiUpload } from "@/lib/api";
import { useGenerateTasks } from "@/lib/actions";
import { backendHealthQuery, healthQuery } from "@/lib/queries";
import { IMPORT_DATASETS, type MlImportResult } from "@/lib/types";
import {
  ChromeButton,
  DataTable,
  ErrorNote,
  Field,
  GhostButton,
  Lamp,
  Meta,
  PageHeader,
  Panel,
  SelectInput,
} from "@/components/control";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/data")({
  head: () => ({ meta: [{ title: "Data & System — Railway AI Block Planner" }] }),
  component: DataPage,
});

type CsvResult = { dataset: string; file: string; inserted: number; failed: number };

function DataPage() {
  const qc = useQueryClient();
  const backend = useQuery(backendHealthQuery);
  const engine = useQuery(healthQuery);

  const [dataset, setDataset] = useState<string>(IMPORT_DATASETS[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<CsvResult[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // Imports change what almost every page shows, so refresh everything.
  const refreshAll = () => void qc.invalidateQueries();

  const csv = useMutation({
    mutationFn: async ({ dataset, file }: { dataset: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      const res = await apiUpload<never>(`/import/${encodeURIComponent(dataset)}`, form);
      return {
        dataset: res.dataset ?? dataset,
        file: file.name,
        inserted: res.inserted ?? 0,
        failed: res.failed ?? 0,
      };
    },
    onSuccess: (r) => {
      setHistory((h) => [r, ...h]);
      toast.success(`${r.dataset}: ${r.inserted} inserted, ${r.failed} failed`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      refreshAll();
    },
  });

  const mlImport = useMutation({
    mutationFn: async () => (await apiPost<MlImportResult>("/ml/import")).data,
    onSuccess: () => {
      toast.success("ML outputs imported");
      refreshAll();
    },
  });

  const generate = useGenerateTasks();

  const onUpload = (e: FormEvent) => {
    e.preventDefault();
    if (file) csv.mutate({ dataset, file });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADMIN · DATA & SYSTEM"
        title="Data pipeline"
        intro="Load the railway datasets, pull in the ML ensemble's predictions, and turn defects and overdue schedules into plannable tasks. Run the steps top to bottom on a fresh database."
      />

      <Panel title="System status">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <Lamp tone={backend.isError ? "danger" : backend.isLoading ? "signal" : "clear"} />
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-cream">NODE BACKEND · {API_BASE_URL}</div>
              <div className="font-mono text-[10px] text-steel">
                {backend.isError
                  ? (backend.error?.message ?? "Unreachable")
                  : (backend.data ?? "Checking…")}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lamp tone={engine.isError ? "danger" : engine.isLoading ? "signal" : "clear"} />
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-cream">
                PYTHON AI ENGINE · {engine.data?.mlApiUrl ?? "via backend"}
              </div>
              <div className="font-mono text-[10px] text-steel">
                {engine.isError
                  ? (engine.error?.message ?? "Offline")
                  : engine.data
                    ? `${engine.data.status ?? "UP"} · ${engine.data.service ?? ""} · v${engine.data.version ?? "?"}`
                    : "Checking…"}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <GhostButton
            onClick={() => {
              void qc.invalidateQueries({ queryKey: ["backend-health"] });
              void qc.invalidateQueries({ queryKey: ["ai-health"] });
            }}
          >
            Re-check
          </GhostButton>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="1 · Import CSV datasets" className="xl:col-span-7">
          <form onSubmit={onUpload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dataset">
                <SelectInput value={dataset} onChange={(e) => setDataset(e.target.value)}>
                  {IMPORT_DATASETS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.id})
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="CSV file" hint="Rows with duplicate IDs are counted as failed">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-line bg-ink3/60 px-3 py-1.5 font-mono text-[12px] text-cream file:mr-3 file:rounded file:border-0 file:bg-ink3 file:px-2 file:py-1 file:font-mono file:text-[11px] file:text-cream"
                />
              </Field>
            </div>
            {csv.error ? <ErrorNote error={csv.error} title="Import failed" /> : null}
            <ChromeButton type="submit" disabled={!file || csv.isPending}>
              {csv.isPending ? "Importing…" : "Upload & import"}
            </ChromeButton>
          </form>
          {history.length ? (
            <div className="mt-5">
              <DataTable head={["Dataset", "File", "Inserted", "Failed"]}>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{h.dataset}</td>
                    <td className="text-steel">{h.file}</td>
                    <td className="text-clear">{fmtNum(h.inserted, 0)}</td>
                    <td className={h.failed ? "text-danger" : "text-steel"}>
                      {fmtNum(h.failed, 0)}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6 xl:col-span-5">
          <Panel title="2 · Import ML outputs">
            <p className="text-sm leading-relaxed text-steel">
              Upserts <span className="text-cream">asset_risk_scores</span>,{" "}
              <span className="text-cream">ensemble_predictions</span> and{" "}
              <span className="text-cream">asset_explanations</span> from ML/outputs into MongoDB.
              Safe to re-run.
            </p>
            {mlImport.error ? (
              <div className="mt-3">
                <ErrorNote error={mlImport.error} title="ML import failed" />
              </div>
            ) : null}
            {mlImport.data ? (
              <div className="mt-4">
                <DataTable head={["Output", "Processed", "Inserted", "Updated"]}>
                  {(
                    [
                      ["Risk scores", mlImport.data.riskScores],
                      ["Ensemble predictions", mlImport.data.ensemblePredictions],
                      ["Explanations", mlImport.data.explanations],
                    ] as const
                  ).map(([label, s]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{fmtNum(s.processed, 0)}</td>
                      <td className="text-clear">{fmtNum(s.inserted ?? 0, 0)}</td>
                      <td>{fmtNum(s.updated ?? 0, 0)}</td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            ) : null}
            <ChromeButton
              className="mt-4"
              onClick={() => mlImport.mutate()}
              disabled={mlImport.isPending}
            >
              {mlImport.isPending ? "Importing…" : "Import ML outputs"}
            </ChromeButton>
          </Panel>

          <Panel title="3 · Generate tasks">
            <p className="text-sm leading-relaxed text-steel">
              Creates pending tasks from inspections marked{" "}
              <span className="text-cream">Attention Required</span> and from maintenance schedules
              past their due date. Existing tasks are left untouched.
            </p>
            {generate.error ? (
              <div className="mt-3">
                <ErrorNote error={generate.error} title="Task generation failed" />
              </div>
            ) : null}
            {generate.data ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Meta
                  label="Defect tasks"
                  value={`${generate.data.defects?.created ?? 0} new · ${generate.data.defects?.matched ?? 0} existing`}
                  tone="signal"
                />
                <Meta
                  label="Overdue maintenance"
                  value={`${generate.data.overdueMaintenance?.created ?? 0} new · ${generate.data.overdueMaintenance?.matched ?? 0} existing`}
                  tone="signal"
                />
              </div>
            ) : null}
            <ChromeButton
              className="mt-4"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? "Generating…" : "Generate tasks"}
            </ChromeButton>
          </Panel>
        </div>
      </div>
    </div>
  );
}
