import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { backendHealthQuery, healthQuery } from "@/lib/queries";
import { API_BASE_URL } from "@/lib/api";
import { Lamp } from "@/components/control";
import { PERSONAS, usePersona } from "@/lib/persona";
import { useStation } from "@/lib/station-context";
import { StationSwitcherModal } from "@/components/station-switcher-modal";
import { EmailInboxModal } from "@/components/email-inbox-modal";
import { MapPin, Mail, ChevronDown } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "/ DASHBOARD" },
  { to: "/schedule", label: "/ SCHEDULE" },
  { to: "/priority", label: "/ PRIORITY" },
  { to: "/assets", label: "/ ASSETS" },
  { to: "/risks", label: "/ RISKS" },
  { to: "/map", label: "/ MAP" },
  { to: "/impact", label: "/ IMPACT" },
  { to: "/assistant", label: "/ ASSISTANT" },
  { to: "/data", label: "/ DATA" },
  { to: "/about", label: "/ ABOUT" },
] as const;

/**
 * Demo persona switcher (plan item C) — see lib/persona.ts. No page is
 * gated by this; it's a narrative aid, not auth.
 */
function PersonaPicker() {
  const { persona, setPersona } = usePersona();

  return (
    <select
      value={persona.id}
      onChange={(e) => setPersona(e.target.value as (typeof PERSONAS)[number]["id"])}
      className="rounded border border-line bg-ink3 px-2 py-1.5 font-mono text-[10px] text-cream"
      title="Demo persona — changes what pages show by default, not a real login"
    >
      {PERSONAS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

export function useEngineHealth() {
  return useQuery(healthQuery);
}

export function EngineOfflineBanner() {
  const backend = useQuery(backendHealthQuery);
  const engine = useEngineHealth();

  // When Node itself is down every /ai call fails too, so report the root cause only.
  const message = backend.isError
    ? `BACKEND UNREACHABLE — nothing is answering at ${API_BASE_URL}. Start it with "npm run dev" in Backend/.`
    : engine.isError
      ? `AI ENGINE OFFLINE — ${(engine.error as Error)?.message ?? "ML service unavailable"}. Requests, what-if and plans need the Python engine.`
      : null;
  if (!message) return null;

  return (
    <div className="border-b border-signal/40 bg-signal/15">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-6 py-2">
        <Lamp tone="danger" />
        <span className="font-mono text-[11px] tracking-wide text-signal">{message}</span>
      </div>
    </div>
  );
}

function StatusLamp({
  label,
  isError,
  isLoading,
  text,
}: {
  label: string;
  isError: boolean;
  isLoading: boolean;
  text: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="hidden text-steel sm:inline">{label}</span>
      <Lamp tone={isError ? "danger" : isLoading ? "signal" : "clear"} />
      <span className={isError ? "text-danger" : "text-clear"}>
        {isError ? "DOWN" : isLoading ? "…" : text}
      </span>
    </span>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const backend = useQuery(backendHealthQuery);
  const engine = useEngineHealth();
  const { activeStation, userProfile, unreadCount, setIsInboxOpen } = useStation();
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink text-cream">
      <div className="dusk pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90" />
      <div className="vignette pointer-events-none absolute inset-x-0 top-0 h-[460px]" />

      <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex shrink-0 items-center gap-3">
              <span className="chrome grid size-8 place-items-center rounded-md font-display text-sm font-bold">
                S
              </span>
              <span className="leading-none hidden sm:block">
                <span className="block font-display text-sm font-semibold tracking-wide">
                  BLOCK-AI
                </span>
                <span className="block font-mono text-[10px] tracking-[0.2em] text-steel">
                  AI BLOCK PLANNER
                </span>
              </span>
            </Link>

            {/* Station Switcher Button */}
            <button
              onClick={() => setIsStationModalOpen(true)}
              className="flex items-center gap-2 rounded-md border border-line bg-ink3/60 px-2.5 py-1.5 font-mono text-xs text-cream transition hover:border-signal/80 hover:bg-ink3"
              title="Click to switch Indian Railways station"
            >
              <MapPin className="size-3.5 text-signal" />
              <span className="font-bold text-signal">{activeStation.code}</span>
              <span className="text-steel hidden md:inline">· {activeStation.name}</span>
              <span className="rounded bg-signal/15 px-1.5 py-0.2 text-[10px] text-signal font-semibold hidden lg:inline">
                {activeStation.zone.split(" ")[0]} · {activeStation.division.split(" ")[0]}
              </span>
              <ChevronDown className="size-3 text-steel" />
            </button>
          </div>

          <nav className="hidden items-center gap-0.5 font-mono text-[11px] text-steel 2xl:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded px-2.5 py-2 transition hover:text-cream"
                activeProps={{ className: "rounded px-2.5 py-2 bg-ink3 text-cream" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3 font-mono text-[11px]">
            {/* Engineer Mailbox Button */}
            <button
              onClick={() => setIsInboxOpen(true)}
              className="relative flex items-center gap-2 rounded-md border border-line bg-ink3/40 px-3 py-1.5 text-xs text-cream hover:border-signal/70 hover:bg-ink3 transition"
              title={`Logged in as ${userProfile.email}`}
            >
              <Mail className="size-3.5 text-signal" />
              <span className="hidden sm:inline font-mono text-[11px] text-steel max-w-[140px] truncate">
                {userProfile.email.split("@")[0]}
              </span>
              {unreadCount > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white animate-pulse">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            <PersonaPicker />
            <StatusLamp
              label="API"
              isError={backend.isError}
              isLoading={backend.isLoading}
              text="UP"
            />
            <StatusLamp
              label="ML ENGINE"
              isError={engine.isError}
              isLoading={engine.isLoading}
              text={engine.data?.status ?? "UP"}
            />
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 border-t border-line/60 px-4 py-2 font-mono text-[10px] text-steel 2xl:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded px-2 py-1"
              activeProps={{ className: "rounded px-2 py-1 bg-ink3 text-cream" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <StationSwitcherModal
        isOpen={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
      />

      <EmailInboxModal />

      <EngineOfflineBanner />

      <main className="relative z-10 mx-auto max-w-[1440px] px-6 py-8">{children}</main>

      <footer className="relative z-10 mt-8 border-t border-line/70">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-6 font-mono text-[10px] text-steel">
          <span>
            Model ensemble · LightGBM 50 · Temporal CNN 30 · Random Forest 20 · recall 0.85
          </span>
          <span>Railway AI Block Planner · Smart India Hackathon prototype · simulated data</span>
        </div>
      </footer>
    </div>
  );
}
