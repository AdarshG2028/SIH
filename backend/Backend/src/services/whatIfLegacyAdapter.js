// Reshapes impact.service.js's result into the exact response shape the
// ML engine's /api/ai/what-if has always returned (snake_case field names
// matching ML/planning/what_if_simulator.py's output), so the frontend
// (frontend/src/routes/what-if.tsx, WhatIfResult in lib/types.ts) needs no
// changes to benefit from real train data instead of the ML engine's small
// hard-coded sample.
const { minutesToTime } = require("./windowBuilder.service");

function toLegacyShape(result, { department, maintenanceType }) {
  const passengerConflicts = result.conflictingTrains; // this dataset is passenger-only — see NETWORK_DATA.md
  const totalPassengerDelay = passengerConflicts.reduce(
    (sum, t) => sum + t.estimatedDelayMinutes,
    0,
  );

  const conflictingTrains = passengerConflicts.map((t) => ({
    train_number: t.trainNumber,
    train_name: t.trainName,
    train_type: t.type,
    scheduled_passage: minutesToTime(t.scheduledEntryMinute),
    priority: t.priority,
    estimated_delay_minutes: t.estimatedDelayMinutes,
  }));

  const recommendedAlternative = result.recommendedAlternative
    ? {
        start_time: result.recommendedAlternative.windowStart,
        end_time: result.recommendedAlternative.windowEnd,
        conflicts: 0, // buildSectionWindows only returns genuinely conflict-free gaps
        note: `Real conflict-free window on ${result.recommendedAlternative.serviceDay} (network data, not simulated)`,
      }
    : null;

  const recommendation = result.hasConflict
    ? `Proposed block ${result.startTime}–${result.endTime} on ${result.sectionId} conflicts with ` +
      `${conflictingTrains[0].train_name} at ${conflictingTrains[0].scheduled_passage}. ` +
      (recommendedAlternative
        ? `Recommendation: shift to ${recommendedAlternative.start_time}–${recommendedAlternative.end_time} to clear all real train conflicts.`
        : "No conflict-free window found on this section.")
    : `Proposed block ${result.startTime}–${result.endTime} on ${result.sectionId} is FEASIBLE. ` +
      "Zero real train conflicts detected for this window.";

  return {
    simulation_query: {
      corridor: result.sectionId,
      proposed_date: null, // the caller already has this; not worth threading through just to echo back
      proposed_start_time: result.startTime,
      proposed_end_time: result.endTime,
      duration_hours: Math.round((result.durationMinutes / 60) * 10) / 10,
      department,
      maintenance_type: maintenanceType,
    },
    has_conflict: result.hasConflict,
    conflict_summary: {
      total_conflicts: result.conflictSummary.totalConflicts,
      passenger_trains_affected: passengerConflicts.length,
      goods_trains_affected: 0, // the seeded dataset has no freight schedules
      total_passenger_delay_minutes: totalPassengerDelay,
      total_freight_delay_minutes: 0,
    },
    conflicting_trains: conflictingTrains,
    recommended_alternative: recommendedAlternative,
    recommendation,
    engine: "real_network_data", // extra field the frontend ignores; useful for debugging/API consumers
  };
}

module.exports = { toLegacyShape };
