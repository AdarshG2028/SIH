import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { stationsGeoQuery } from "@/lib/queries";
import { AsyncBlock, PageHeader, Panel } from "@/components/control";

// leaflet touches `window` at module-load time (not just render time), so
// even a static import crashes SSR regardless of any client-only render
// guard. React.lazy's dynamic import() is only evaluated when this
// component actually attempts to render, which — combined with the
// `mounted` gate below — never happens during SSR or the initial client
// hydration pass, only after.
const BlockMap = lazy(() =>
  import("@/components/block-map").then((m) => ({ default: m.BlockMap })),
);

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Block Map — Railway AI Block Planner" },
      {
        name: "description",
        content: "Every real station your asset data references, plotted from real geo coordinates.",
      },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  // Leaflet touches window/document directly, so it can't run during SSR —
  // wait for the client mount before rendering it at all.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading, error } = useQuery(stationsGeoQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="NETWORK · MAP"
        title="Interactive station map"
        intro="Every station your real asset data references, plotted at its real coordinates — sized by how many assets sit there. Click a station for details."
      />
      <Panel title="Stations" right={data ? `${data.length} plotted` : undefined} bodyClassName="p-0">
        {mounted ? (
          <AsyncBlock
            isLoading={isLoading}
            error={error}
            data={data}
            isEmpty={(d) => d.length === 0}
            loadingLabel="Loading stations…"
            emptyTitle="No stations with coordinates"
            emptyHint="Station geo data comes from the seed script — see backend/docs/NETWORK_DATA.md."
          >
            {(stations) => (
              <Suspense
                fallback={
                  <div
                    style={{ height: 600 }}
                    className="flex items-center justify-center font-mono text-[11px] text-steel"
                  >
                    Loading map…
                  </div>
                }
              >
                <BlockMap stations={stations} />
              </Suspense>
            )}
          </AsyncBlock>
        ) : (
          <div
            style={{ height: 600 }}
            className="flex items-center justify-center font-mono text-[11px] text-steel"
          >
            Loading map…
          </div>
        )}
      </Panel>
    </div>
  );
}
