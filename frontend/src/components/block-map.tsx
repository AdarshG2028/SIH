import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { StationSearchResult } from "@/lib/types";

/**
 * #7: every real station with geo coordinates (7,572 of them, from the
 * public dataset seeded in Phase 1 — see docs/NETWORK_DATA.md), sized by
 * how many real assets sit there. preferCanvas keeps thousands of markers
 * responsive — Leaflet's default SVG/DOM renderer struggles well before
 * this many points.
 */
export function BlockMap({ stations }: { stations: StationSearchResult[] }) {
  // India's approximate geographic center — a reasonable default view
  // before the map fits to the actual station bounds.
  const center: [number, number] = [22.5, 79];

  return (
    <MapContainer
      center={center}
      zoom={5}
      preferCanvas
      style={{ height: 600, width: "100%" }}
      className="rounded-b-md"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map((s) => (
        <CircleMarker
          key={s.code}
          center={[s.lat!, s.lon!]}
          radius={Math.min(3 + Math.sqrt(s.assetCount), 12)}
          pathOptions={{
            color: "#38bdf8",
            fillColor: "#38bdf8",
            fillOpacity: 0.55,
            weight: 1,
          }}
        >
          <Popup>
            <div style={{ fontFamily: "monospace", fontSize: 12 }}>
              <div style={{ fontWeight: 700 }}>
                {s.name} ({s.code})
              </div>
              <div>{s.assetCount} real assets</div>
              <div style={{ color: "#666" }}>{s.assetTypes.join(", ")}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
