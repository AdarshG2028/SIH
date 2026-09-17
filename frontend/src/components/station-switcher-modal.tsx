import { useState, useMemo } from "react";
import { useStation } from "@/lib/station-context";
import { STATIONS, searchStations, type Station } from "@/lib/stations";
import { Tag } from "@/components/control";
import { Search, MapPin, Check, X } from "lucide-react";

export function StationSwitcherModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeStation, setStationCode } = useStation();
  const [query, setQuery] = useState("");

  const filteredStations = useMemo(() => searchStations(query), [query]);

  if (!isOpen) return null;

  const handleSelect = (station: Station) => {
    setStationCode(station.code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-[10vh] backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[75vh] w-full max-w-2xl flex-col rounded-xl border border-line bg-ink2 shadow-2xl overflow-hidden">
        {/* Header & Search Bar */}
        <div className="border-b border-line bg-ink p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display text-sm font-semibold uppercase tracking-wider text-cream">
                Pan-India Station & Division Selector
              </span>
              <p className="font-mono text-[11px] text-steel">
                Select your assigned station across 16 Zonal Railways & 68 Divisions
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-steel hover:bg-ink3 hover:text-cream transition"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-steel" />
            <input
              type="text"
              placeholder="Search station code (e.g. NDLS, MMCT, LNL, HWH, MAS) or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-line bg-ink2 pl-9 pr-4 py-2 text-sm text-cream placeholder:text-steel font-mono outline-none focus:border-signal"
            />
          </div>
        </div>

        {/* Station List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-line/30">
          {filteredStations.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-steel">
              No matching stations found in catalog.
            </div>
          ) : (
            filteredStations.map((s) => {
              const isSelected = s.code === activeStation.code;
              return (
                <button
                  key={s.code}
                  onClick={() => handleSelect(s)}
                  className={`w-full p-3 text-left transition rounded-lg flex items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-signal/15 border border-signal/40"
                      : "hover:bg-ink3/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-cream">
                        {s.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-signal px-1.5 py-0.5 rounded bg-signal/10 border border-signal/20">
                        {s.code}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-clear">
                          <Check className="size-3" /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-steel">
                      <span>{s.division}</span>
                      <span>·</span>
                      <span>{s.zone}</span>
                      <span>·</span>
                      <span className="text-steel/70">{s.lines}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right font-mono text-[10px] text-steel">
                    <div>Section: <span className="text-cream">{s.sectionId}</span></div>
                    <div className="text-steel/70">Quiet: {s.quietWindow.start}–{s.quietWindow.end}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
