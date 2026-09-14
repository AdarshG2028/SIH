import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { backendHealthQuery, healthQuery } from "@/lib/queries";
import { API_BASE_URL } from "@/lib/api";
import { Lamp } from "@/components/control";

const NAV = [
  { to: "/dashboard", label: "/ CONTROL" },
  { to: "/requests", label: "/ REQUESTS" },
  { to: "/what-if", label: "/ WHAT-IF" },
  { to: "/plan", label: "/ PLAN" },
  { to: "/planning", label: "/ APPROVALS" },
  { to: "/priority", label: "/ PRIORITY" },
  { to: "/tasks", label: "/ TASKS" },
  { to: "/assets", label: "/ ASSETS" },
  { to: "/risks", label: "/ RISKS" },
  { to: "/impact", label: "/ IMPACT" },
  { to: "/data", label: "/ DATA" },
  { to: "/about", label: "/ ABOUT" },
] as const;

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink text-cream">
      <div className="dusk pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90" />
      <div className="vignette pointer-events-none absolute inset-x-0 top-0 h-[460px]" />

      <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-6">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="chrome grid size-8 place-items-center rounded-md font-display text-sm font-bold">
              S
            </span>
            <span className="leading-none">
              <span className="block font-display text-sm font-semibold tracking-wide">
                SHADOWBLOCK
              </span>
              <span className="block font-mono text-[10px] tracking-[0.2em] text-steel">
                BLOCK PLANNER · CONTROL
              </span>
            </span>
          </Link>
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
          <div className="flex shrink-0 items-center gap-4 font-mono text-[11px]">
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
