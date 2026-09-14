import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { kpisQuery } from "@/lib/queries";
import { AsyncBlock, Disclaimer, Meta, PageHeader, Panel } from "@/components/control";
import { BeforeAfterTable } from "@/components/before-after";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impact — Before vs After AI Block Planning" },
      {
        name: "description",
        content:
          "Blocks, block hours, train conflicts and asset availability before and after AI planning.",
      },
    ],
  }),
  component: Impact,
});

const COMPARISONS = [
  { label: "Blocks", before: "blocksBefore", after: "blocksAfter", unit: "", lowerIsBetter: true },
  {
    label: "Block hours",
    before: "durationHoursBefore",
    after: "durationHoursAfter",
    unit: " h",
    lowerIsBetter: true,
  },
  {
    label: "Train conflicts",
    before: "conflictsBefore",
    after: "conflictsAfter",
    unit: "",
    lowerIsBetter: true,
  },
  {
    label: "Asset availability",
    before: "availabilityBefore",
    after: "availabilityAfter",
    unit: "%",
    lowerIsBetter: false,
  },
] as const;

function Comparison({
  label,
  before,
  after,
  unit,
  lowerIsBetter,
}: {
  label: string;
  before: number | undefined;
  after: number | undefined;
  unit: string;
  lowerIsBetter: boolean;
}) {
  const max = Math.max(before ?? 0, after ?? 0, 1);
  const better =
    before !== undefined &&
    after !== undefined &&
    (lowerIsBetter ? after < before : after > before);
  const change = before ? Math.round((((after ?? 0) - before) / before) * 1000) / 10 : null;
  return (
    <div className="rounded-lg bg-ink2/80 p-4 hairline">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-mono tracking-widest">{label}</span>
        {change !== null ? (
          <span className={cn("font-mono text-[11px]", better ? "text-clear" : "text-danger")}>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {[
          { name: "Before", value: before, bar: "bg-steel/60", text: "text-steel" },
          { name: "After AI", value: after, bar: "bg-signal", text: "text-signal" },
        ].map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)_4rem] items-center gap-2"
          >
            <span className="font-mono text-[10px] uppercase text-steel">{row.name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-ink3">
              <span
                className={cn("block h-full rounded-full", row.bar)}
                style={{ width: `${((row.value ?? 0) / max) * 100}%` }}
              />
            </span>
            <span className={cn("text-right font-mono text-[12px] tabular-nums", row.text)}>
              {row.value ?? "—"}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Impact() {
  const { data, isLoading, error } = useQuery(kpisQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EVALUATION · IMPACT"
        title="Before vs after AI planning"
        intro="Decentralized planning has each department request its own possession. The AI planner merges them into shared shadow blocks outside timetable peaks."
      />
      <AsyncBlock
        isLoading={isLoading}
        error={error}
        data={data}
        loadingLabel="Loading evaluation…"
      >
        {(kpis) => {
          const k = kpis.kpis ?? {};
          const s = kpis.evaluation_summary;
          return (
            <div className="space-y-6">
              {s ? (
                <Panel title={s.title ?? "Evaluation"}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Meta label="Corridor" value={s.corridor ?? "—"} />
                    <Meta label="Period" value={s.evaluation_period ?? "—"} />
                    <Meta
                      label="Downtime saved"
                      value={`${k["downtimeHoursSaved"] ?? "—"} h`}
                      tone="clear"
                    />
                  </div>
                  <div className="mt-3">
                    <Disclaimer text={s.prototype_disclaimer} />
                  </div>
                </Panel>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {COMPARISONS.map((c) => (
                  <Comparison
                    key={c.label}
                    label={c.label}
                    before={k[c.before]}
                    after={k[c.after]}
                    unit={c.unit}
                    lowerIsBetter={c.lowerIsBetter}
                  />
                ))}
              </div>
              <Panel title="Detailed comparison">
                <BeforeAfterTable data={kpis.before_vs_after} />
              </Panel>
            </div>
          );
        }}
      </AsyncBlock>
    </div>
  );
}
