// Canonical department vocabulary.
//
// The Mongo-side data (Task.department, taskAdapter.service.js) uses the
// short internal names below. The Python ML engine and the frontend's
// request form (frontend/src/lib/types.ts DEPARTMENTS) use the longer
// official names. Both refer to the same three departments — this module
// is the single place that maps between them, so no controller has to
// hardcode the translation.
const CANONICAL_DEPARTMENTS = ["Track", "Signalling", "OHE"];

const DISPLAY_LABELS = {
  Track: "Engineering",
  Signalling: "Signal & Telecommunication (S&T)",
  OHE: "Traction Distribution (TRD)",
};

const CANONICAL_BY_DISPLAY = Object.fromEntries(
  Object.entries(DISPLAY_LABELS).map(([canonical, display]) => [display, canonical]),
);

const toDisplay = (canonical) => DISPLAY_LABELS[canonical] || canonical;

const toCanonical = (display) => CANONICAL_BY_DISPLAY[display] || display;

module.exports = {
  CANONICAL_DEPARTMENTS,
  DISPLAY_LABELS,
  toDisplay,
  toCanonical,
};
