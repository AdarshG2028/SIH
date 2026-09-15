// Real domain reasoning for why combining departments into one shared
// maintenance block makes sense — distinct from a scheduling/logistics
// compatibility check (which the real Task/Asset data can't support yet:
// no km ranges, no crew/equipment fields — see the #8 planning notes).
// These are railway safety/operations facts, true regardless of what
// other data is or isn't available.
const SYNERGY_RULES = [
  {
    departments: ["OHE", "Track"],
    reason:
      "An OHE power block de-energizes the overhead line, which is also the precondition for safe Track possession — combining them means Track work doesn't need its own separate isolation.",
  },
  {
    departments: ["Track", "Signalling"],
    reason:
      "Track possession already protects the section from traffic, giving Signalling safe access to trackside equipment (point machines, track circuits) without a separate protection order.",
  },
  {
    departments: ["OHE", "Signalling"],
    reason:
      "OHE isolation removes the traction-power risk to Signalling staff testing trackside equipment in the same section.",
  },
];

/**
 * A real, department-specific reason for combining the given departments
 * into one block — not a generic "multiple departments" statement.
 */
const describeDepartmentSynergy = (departments) => {
  const present = new Set(departments);
  const matched = SYNERGY_RULES.filter((rule) => rule.departments.every((d) => present.has(d)));

  if (!matched.length) {
    // Shouldn't normally happen (callers only combine locations with >=2
    // departments among Track/OHE/Signalling), but stay honest if it does.
    return "Combines maintenance work across multiple departments at the same location.";
  }

  return matched.map((rule) => rule.reason).join(" ");
};

module.exports = { describeDepartmentSynergy };
