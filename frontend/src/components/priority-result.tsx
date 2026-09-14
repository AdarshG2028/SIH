import type { PriorityResult } from "@/lib/types";
import { KeyValueGrid, RiskTag } from "@/components/control";
import { cn } from "@/lib/utils";

export function PriorityResultView({ result }: { result: PriorityResult }) {
  const score = result.priority_score ?? 0;
  const tone = score >= 75 ? "danger" : score >= 50 ? "signal" : "clear";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono tracking-widest">Priority score</div>
          <div
            className={cn(
              "font-display text-6xl font-semibold leading-none",
              tone === "danger" ? "text-danger" : tone === "signal" ? "text-signal" : "text-clear",
            )}
          >
            {score.toFixed(1)}
            <span className="text-xl text-steel"> / 100</span>
          </div>
        </div>
        <RiskTag level={result.priority_level} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink3">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "danger" ? "bg-danger" : tone === "signal" ? "bg-signal" : "bg-clear",
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {result.major_contributing_factors?.length ? (
        <div>
          <div className="label-mono mb-2 tracking-widest">Contributing factors</div>
          <ul className="space-y-1.5">
            {result.major_contributing_factors.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-steel">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.raw_task_reference ? (
        <div>
          <div className="label-mono mb-2 tracking-widest">Task reference</div>
          <KeyValueGrid data={result.raw_task_reference} />
        </div>
      ) : null}
    </div>
  );
}
