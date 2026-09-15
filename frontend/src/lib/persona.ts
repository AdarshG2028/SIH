import { useEffect, useState } from "react";

/**
 * Demo personas (plan item C) — a role SWITCHER for demo narrative, not
 * real auth. No page is gated; each persona just changes what a page
 * defaults to showing, matching what that role would actually care about
 * first: a Station Master's own station, a department engineer's own
 * queue, or the DRM's division-wide view.
 */
export type PersonaId = "station_master" | "engineer" | "drm";

export type Persona = {
  id: PersonaId;
  label: string;
  /** Station Master only — the station this persona is responsible for. */
  stationCode?: string;
  stationName?: string;
  /** Engineer only — the department this persona works in. */
  department?: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "station_master",
    label: "Station Master — Ataria (AA)",
    stationCode: "AA",
    stationName: "ATARIA",
  },
  { id: "engineer", label: "Engineer — Signalling", department: "Signalling" },
  { id: "drm", label: "DRM — Division Control" },
];

const STORAGE_KEY = "railway-ai:persona";

function readStoredPersonaId(): PersonaId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && PERSONAS.some((p) => p.id === stored)) return stored as PersonaId;
  } catch {
    // localStorage can throw (private browsing, blocked storage) — fall through to the default.
  }
  return "drm";
}

/**
 * The active demo persona, persisted per-browser via localStorage (a
 * per-viewer convenience, not shared state — each teammate picks their own
 * when clicking around the app).
 */
export function usePersona() {
  const [id, setId] = useState<PersonaId>("drm");

  // Read localStorage only after mount — SSR has no localStorage, and this
  // avoids a server/client render mismatch.
  useEffect(() => setId(readStoredPersonaId()), []);

  const setPersona = (next: PersonaId) => {
    setId(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal — the choice just won't survive a reload.
    }
  };

  const persona = PERSONAS.find((p) => p.id === id) ?? PERSONAS[2]!;

  return { persona, setPersona };
}
