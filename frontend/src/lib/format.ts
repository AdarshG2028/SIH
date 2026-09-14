const DASH = "—";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function fmtDate(value?: string | null) {
  if (!value) return DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(value?: string | null) {
  if (!value) return DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtNum(value: unknown, digits = 1) {
  const n = toNumber(value);
  return n === null ? DASH : n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

/** 0–1 probability -> "55.7%" */
export function fmtProb(value: unknown) {
  const n = toNumber(value);
  return n === null ? DASH : `${(n * 100).toFixed(1)}%`;
}

export function fmtInr(value: unknown) {
  const n = toNumber(value);
  return n === null ? DASH : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** "downtimeHoursSaved" / "number_of_blocks" -> "downtime Hours Saved" / "number of blocks" */
export function humanize(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
}

export function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return DASH;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function daysOverdue(due?: string | null) {
  if (!due) return 0;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function windowLabel(
  w?: {
    date?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
  } | null,
) {
  if (!w?.startTime) return DASH;
  return `${w.date ? `${w.date} · ` : ""}${w.startTime}–${w.endTime ?? "?"}`;
}
