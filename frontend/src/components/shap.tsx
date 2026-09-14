import { parseShapReason } from "@/lib/queries";
import type { RiskExplanation } from "@/lib/types";
import { cn } from "@/lib/utils";

type Factor = { label: string; value: number | null };

function collect(explanation: RiskExplanation, prefix: string, count: number): Factor[] {
  const out: Factor[] = [];
  for (let i = 1; i <= count; i++) {
    const parsed = parseShapReason(explanation[`${prefix}${i}`]);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Signed SHAP contributions: drivers push failure risk up, protective factors pull it down. */
export function ShapFactors({ explanation }: { explanation: RiskExplanation }) {
  const drivers = collect(explanation, "top_reason_", 5);
  const protective = collect(explanation, "protective_factor_", 3);
  const max = Math.max(0.0001, ...[...drivers, ...protective].map((f) => Math.abs(f.value ?? 0)));

  const row = (f: Factor, tone: "danger" | "clear") => (
    <li
      key={`${tone}-${f.label}`}
      className="grid grid-cols-[minmax(0,1fr)_7rem_4.5rem] items-center gap-3"
    >
      <span className="truncate text-sm capitalize text-cream" title={f.label}>
        {f.label}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-ink3">
        <span
          className={cn("block h-full rounded-full", tone === "danger" ? "bg-danger" : "bg-clear")}
          style={{ width: `${(Math.abs(f.value ?? 0) / max) * 100}%` }}
        />
      </span>
      <span
        className={cn(
          "text-right font-mono text-[11px] tabular-nums",
          tone === "danger" ? "text-danger" : "text-clear",
        )}
      >
        {f.value === null ? "—" : `${f.value > 0 ? "+" : ""}${f.value.toFixed(4)}`}
      </span>
    </li>
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="label-mono mb-2 tracking-widest">Pushing risk up</div>
        {drivers.length ? (
          <ul className="space-y-2">{drivers.map((f) => row(f, "danger"))}</ul>
        ) : (
          <p className="font-mono text-[11px] text-steel">No drivers recorded.</p>
        )}
      </div>
      <div>
        <div className="label-mono mb-2 tracking-widest">Protective factors</div>
        {protective.length ? (
          <ul className="space-y-2">{protective.map((f) => row(f, "clear"))}</ul>
        ) : (
          <p className="font-mono text-[11px] text-steel">No protective factors recorded.</p>
        )}
      </div>
    </div>
  );
}
