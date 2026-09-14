import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { blockRequestsQuery } from "@/lib/queries";
import { BLOCK_REQUEST_STATUSES, SECTIONS } from "@/lib/types";
import {
  AsyncBlock,
  DataTable,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatusTag,
} from "@/components/control";
import { fmtDateTime, fmtNum, windowLabel } from "@/lib/format";

export const Route = createFileRoute("/requests/")({
  head: () => ({ meta: [{ title: "Block Requests — Railway AI Block Planner" }] }),
  component: RequestsList,
});

function RequestsList() {
  const [status, setStatus] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [limit, setLimit] = useState(50);

  const filters = {
    ...(status ? { status } : {}),
    ...(sectionId ? { sectionId } : {}),
    limit,
  };
  const { data, isLoading, error, isFetching } = useQuery(blockRequestsQuery(filters));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="BLOCK REQUESTS · BDMS"
        title="Block requests"
        intro="Every request filed by Track, S&T and TRD, with the AI engine's recommended window and the officer's decision."
        actions={
          <Link
            to="/requests/new"
            className="chrome rounded-md px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide hairline transition hover:brightness-105"
          >
            New request
          </Link>
        }
      />

      <Panel title="Filters" right={isFetching ? "REFRESHING…" : `${data?.length ?? 0} SHOWN`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {BLOCK_REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Section">
            <SelectInput value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">All sections</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Show">
            <SelectInput value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  Latest {n}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Panel>

      <Panel title="Requests">
        <AsyncBlock
          isLoading={isLoading}
          error={error}
          data={data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No matching block requests"
          emptyHint="Change the filters or file a new request."
        >
          {(rows) => (
            <DataTable
              head={[
                "Request",
                "Section",
                "Department",
                "Work",
                "Span (km)",
                "Selected window",
                "Score",
                "Status",
                "Filed",
              ]}
            >
              {rows.map((r) => (
                <tr key={r.requestId}>
                  <td>
                    <Link
                      to="/requests/$requestId"
                      params={{ requestId: r.requestId }}
                      className="text-signal hover:underline"
                    >
                      {r.requestId}
                    </Link>
                  </td>
                  <td>{r.sectionId ?? "—"}</td>
                  <td className="text-steel">{r.department ?? "—"}</td>
                  <td>{r.maintenanceType ?? "—"}</td>
                  <td>
                    {fmtNum(r.fromKm)} – {fmtNum(r.toKm)}
                  </td>
                  <td>{windowLabel(r.selectedWindow)}</td>
                  <td>{fmtNum(r.selectedWindow?.overallScore ?? r.selectedWindow?.score, 0)}</td>
                  <td>
                    <StatusTag status={r.status} />
                  </td>
                  <td className="text-steel">{fmtDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </AsyncBlock>
      </Panel>
    </div>
  );
}
