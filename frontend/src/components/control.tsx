import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { errorMessages } from "@/lib/api";

export function Panel({
  title,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg hairline overflow-hidden bg-ink2/80", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line bg-ink3/60">
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel">
            {title}
          </span>
          {right ? <span className="font-mono text-[10px] text-signal">{right}</span> : null}
        </header>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Meta({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "signal" | "clear" | "danger";
}) {
  return (
    <div>
      <div className="label-mono tracking-widest">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-sm text-cream",
          tone === "signal" && "text-signal",
          tone === "clear" && "text-clear",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "signal" | "clear" | "danger" | "steel";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-line bg-ink3 px-2 py-1 font-mono text-[10px] uppercase tracking-wide",
        tone === "neutral" && "text-cream",
        tone === "signal" && "text-signalsoft",
        tone === "clear" && "text-clear",
        tone === "danger" && "text-danger",
        tone === "steel" && "text-steel",
      )}
    >
      {children}
    </span>
  );
}

const RISK_TONE: Record<string, "clear" | "signal" | "danger" | "steel"> = {
  LOW: "clear",
  MEDIUM: "signal",
  HIGH: "signal",
  CRITICAL: "danger",
};

export function RiskTag({ level }: { level?: string | undefined }) {
  const key = (level ?? "").toUpperCase();
  return <Tag tone={RISK_TONE[key] ?? "steel"}>{key || "UNKNOWN"}</Tag>;
}

const STATUS_TONE: Record<string, "clear" | "signal" | "danger" | "steel"> = {
  recommended: "clear",
  needs_review: "signal",
  accepted: "clear",
  rejected: "danger",
  department_approved: "signal",
  drm_approved: "signal",
  bdms_submitted: "clear",
  APPROVED_RECOMMENDED: "clear",
  NEEDS_OFFICER_REVIEW: "signal",
};

export function StatusTag({ status }: { status?: string | undefined }) {
  if (!status) return <Tag tone="steel">—</Tag>;
  return <Tag tone={STATUS_TONE[status] ?? "steel"}>{status.replace(/_/g, " ")}</Tag>;
}

export function Lamp({
  tone = "clear",
  pulse = true,
}: {
  tone?: "clear" | "signal" | "danger" | "steel";
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        tone === "clear" && "bg-clear text-clear",
        tone === "signal" && "bg-signal text-signal",
        tone === "danger" && "bg-danger text-danger",
        tone === "steel" && "bg-steel text-steel",
        pulse && "lamp",
      )}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow: string;
  title: string;
  intro?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <div className="rise flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded border border-signal/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-signal">
          <Lamp tone="signal" />
          {eyebrow}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold uppercase leading-none tracking-tight text-cream">
          {title}
        </h1>
        {intro ? (
          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-steel">{intro}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function ChromeButton({
  children,
  type = "button",
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "chrome rounded-md px-5 py-3 font-display text-sm font-semibold tracking-wide uppercase hairline transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  tone = "neutral",
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40",
        tone === "neutral" && "border-line text-cream hover:bg-ink3",
        tone === "danger" && "border-danger/50 text-danger hover:bg-danger/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-mono block tracking-widest">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? (
        <span className="mt-1 block font-mono text-[10px] text-steel/70">{hint}</span>
      ) : null}
      {error ? <span className="mt-1 block font-mono text-[10px] text-danger">{error}</span> : null}
    </label>
  );
}

const controlClasses =
  "w-full rounded-md border border-line bg-ink3/60 px-3 py-2 font-mono text-[12px] text-cream outline-none transition placeholder:text-steel/50 focus:border-signal/60";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClasses, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClasses, "min-h-20", props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClasses, "appearance-none", props.className)} />;
}

export function Loading({ label = "Working…" }: { label?: string | undefined }) {
  return (
    <div className="flex items-center gap-2 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
      <Lamp tone="signal" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string | undefined }) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
      <p className="font-display text-sm uppercase tracking-wide text-cream">{title}</p>
      {hint ? <p className="mt-1.5 font-mono text-[11px] text-steel">{hint}</p> : null}
    </div>
  );
}

export function ErrorNote({ error, title }: { error: unknown; title?: string | undefined }) {
  const messages = errorMessages(error);
  return (
    <div className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">
        {title ?? "Error"}
      </p>
      <ul className="mt-1.5 space-y-1">
        {messages.map((m, i) => (
          <li key={i} className="font-mono text-[11px] text-cream">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Disclaimer({ text }: { text?: string | undefined }) {
  return (
    <p className="font-mono text-[10px] leading-relaxed text-steel/70">
      {text ?? "Prototype — heuristic optimizer, simulated corridor data."}
    </p>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "signal" | "clear" | "danger" | undefined;
}) {
  return (
    <div className="h-full rounded-lg bg-ink2/80 p-4 hairline">
      <div className="label-mono tracking-widest">{label}</div>
      <div
        className={cn(
          "mt-2 font-display text-3xl font-semibold leading-none text-cream",
          tone === "signal" && "text-signal",
          tone === "clear" && "text-clear",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-2 font-mono text-[10px] text-steel">{sub}</div> : null}
    </div>
  );
}

export function DataTable({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-[11px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="label-mono whitespace-nowrap border-b border-line px-3 py-2 font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line/50 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-cream [&_tr:hover]:bg-ink3/40">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total?: number | undefined;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(totalPages, 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 font-mono text-[11px] text-steel">
      <span>
        {total !== undefined ? `${total.toLocaleString("en-IN")} records · ` : ""}page {page} /{" "}
        {pages}
      </span>
      <div className="flex gap-2">
        <GhostButton onClick={() => onPage(page - 1)} disabled={page <= 1}>
          Prev
        </GhostButton>
        <GhostButton onClick={() => onPage(page + 1)} disabled={page >= pages}>
          Next
        </GhostButton>
      </div>
    </div>
  );
}

/** Loading / error / empty handling shared by every data panel. */
export function AsyncBlock<T>({
  isLoading,
  error,
  data,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyHint,
  loadingLabel,
  errorTitle,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  data: T;
  isEmpty?: ((data: NonNullable<T>) => boolean) | undefined;
  emptyTitle?: string | undefined;
  emptyHint?: string | undefined;
  loadingLabel?: string | undefined;
  errorTitle?: string | undefined;
  children: (data: NonNullable<T>) => ReactNode;
}) {
  if (isLoading) return <Loading label={loadingLabel} />;
  if (error) return <ErrorNote error={error} title={errorTitle} />;
  if (data === undefined || data === null)
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  const value = data as NonNullable<T>;
  if (isEmpty?.(value)) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return <>{children(value)}</>;
}

export function ScoreBar({
  value,
  max = 100,
}: {
  value?: number | null | undefined;
  max?: number;
}) {
  const has = typeof value === "number" && Number.isFinite(value);
  const pct = has ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-ink3">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 60
              ? "bg-danger"
              : pct >= 40
                ? "bg-signal"
                : pct >= 20
                  ? "bg-signalsoft"
                  : "bg-clear",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums">{has ? value.toFixed(1) : "—"}</span>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-cream">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-(--signal)"
      />
      {label}
    </label>
  );
}

export function KeyValueGrid({ data }: { data: Record<string, unknown> | undefined | null }) {
  if (!data) return null;
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== "object",
  );
  if (!entries.length) return null;
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="label-mono tracking-widest">
            {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
          </dt>
          <dd className="mt-1 font-mono text-[12px] text-cream">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
