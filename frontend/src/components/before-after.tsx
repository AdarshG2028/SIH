import { DataTable } from "@/components/control";
import { display, humanize } from "@/lib/format";

/** Renders the ML engine's `before_vs_after` map: { metric: { before, after, improvement | note | ... } }. */
export function BeforeAfterTable({ data }: { data: Record<string, unknown> | undefined }) {
  const rows = Object.entries(data ?? {}).filter(
    (entry): entry is [string, Record<string, unknown>] =>
      !!entry[1] && typeof entry[1] === "object",
  );
  if (!rows.length) return null;
  return (
    <DataTable head={["Metric", "Before AI", "After AI", "Change"]}>
      {rows.map(([metric, v]) => {
        const change = Object.entries(v)
          .filter(([k]) => k !== "before" && k !== "after")
          .map(([k, val]) =>
            k === "improvement" || k === "note" ? display(val) : `${humanize(k)}: ${display(val)}`,
          )
          .join(" · ");
        return (
          <tr key={metric}>
            <td className="capitalize">{humanize(metric)}</td>
            <td className="text-steel">{display(v["before"])}</td>
            <td className="text-signal">{display(v["after"])}</td>
            <td className="text-clear">{change || "—"}</td>
          </tr>
        );
      })}
    </DataTable>
  );
}
