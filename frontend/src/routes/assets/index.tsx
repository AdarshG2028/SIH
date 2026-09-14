import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { assetsQuery } from "@/lib/queries";
import {
  AsyncBlock,
  ChromeButton,
  DataTable,
  Field,
  GhostButton,
  PageHeader,
  Pager,
  Panel,
  SelectInput,
  TextInput,
} from "@/components/control";
import { fmtDate, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/assets/")({
  head: () => ({ meta: [{ title: "Assets — Railway AI Block Planner" }] }),
  component: Assets,
});

const PAGE_SIZE = 50;

function Assets() {
  // GET /assets is unpaginated — ~14 MB for 41k assets — so it loads only on request.
  const [loadRegister, setLoadRegister] = useState(false);
  const { data, isLoading, error } = useQuery({ ...assetsQuery, enabled: loadRegister });
  const [jumpId, setJumpId] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const types = useMemo(
    () => [...new Set((data ?? []).map((a) => a.asset_type).filter(Boolean))].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (a) =>
        (!type || a.asset_type === type) &&
        (!q ||
          a.asset_id.toLowerCase().includes(q) ||
          (a.station_code ?? "").toLowerCase().includes(q) ||
          (a.station_name ?? "").toLowerCase().includes(q)),
    );
  }, [data, search, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const onJump = (e: FormEvent) => {
    e.preventDefault();
    const id = jumpId.trim();
    if (id) void navigate({ to: "/assets/$assetId", params: { assetId: id } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ASSET REGISTER"
        title="Railway assets"
        intro="Track, bridge, level crossing, OHE, signal and point machine assets with age and condition. Open one for inspections, failures, maintenance and ML risk."
      />

      <Panel title="Open an asset">
        <form onSubmit={onJump} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Field
              label="Asset ID"
              hint="Jumps straight to the asset — no need to load the register"
            >
              <TextInput
                value={jumpId}
                onChange={(e) => setJumpId(e.target.value)}
                placeholder="AST025645"
              />
            </Field>
          </div>
          <ChromeButton type="submit" disabled={!jumpId.trim()}>
            Open asset
          </ChromeButton>
          <Link
            to="/risks"
            className="rounded-md border border-line px-4 py-2.5 font-mono text-[11px] uppercase text-cream transition hover:bg-ink3"
          >
            Browse by risk
          </Link>
        </form>
      </Panel>

      {!loadRegister ? (
        <Panel title="Full register">
          <p className="max-w-[70ch] text-sm leading-relaxed text-steel">
            The backend returns every asset in one response — around{" "}
            <span className="text-cream">14 MB</span> for a full division, which takes a few
            seconds. Load it only if you want to browse and filter the whole list.
          </p>
          <div className="mt-4">
            <GhostButton onClick={() => setLoadRegister(true)}>Load full register</GhostButton>
          </div>
        </Panel>
      ) : (
        <>
          <Panel
            title="Filters"
            right={
              data
                ? `${filtered.length.toLocaleString("en-IN")} OF ${data.length.toLocaleString("en-IN")}`
                : undefined
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Search">
                <TextInput
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Asset ID, station code or name"
                />
              </Field>
              <Field label="Asset type">
                <SelectInput
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All types</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </Panel>

          <Panel title="Assets">
            <AsyncBlock
              isLoading={isLoading}
              error={error}
              data={data}
              isEmpty={(d) => d.length === 0}
              loadingLabel="Loading asset register — this takes a few seconds…"
              emptyTitle="No assets imported"
              emptyHint="Upload assets.csv from the Data page."
            >
              {() =>
                rows.length ? (
                  <>
                    <DataTable
                      head={[
                        "Asset",
                        "Type",
                        "Station",
                        "Installed",
                        "Age (y)",
                        "Expected life (y)",
                        "Initial condition",
                      ]}
                    >
                      {rows.map((a) => (
                        <tr key={a.asset_id}>
                          <td>
                            <Link
                              to="/assets/$assetId"
                              params={{ assetId: a.asset_id }}
                              className="text-signal hover:underline"
                            >
                              {a.asset_id}
                            </Link>
                          </td>
                          <td>{a.asset_type ?? "—"}</td>
                          <td>
                            {a.station_code ?? "—"}
                            {a.station_name ? (
                              <span className="text-steel"> · {a.station_name}</span>
                            ) : null}
                          </td>
                          <td className="text-steel">{fmtDate(a.installation_date)}</td>
                          <td>{fmtNum(a.asset_age_years)}</td>
                          <td>{fmtNum(a.expected_life_years)}</td>
                          <td>{fmtNum(a.initial_condition_score)}</td>
                        </tr>
                      ))}
                    </DataTable>
                    <Pager
                      page={current}
                      totalPages={totalPages}
                      total={filtered.length}
                      onPage={setPage}
                    />
                  </>
                ) : (
                  <p className="font-mono text-[11px] text-steel">No assets match these filters.</p>
                )
              }
            </AsyncBlock>
          </Panel>
        </>
      )}
    </div>
  );
}
