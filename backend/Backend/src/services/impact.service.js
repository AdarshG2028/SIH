// Train-impact engine: checks a proposed maintenance block against real
// train movements (from networkData.service.js) and suggests the nearest
// genuinely conflict-free window.
//
// This replaces the ML engine's hard-coded ~10-train timetable
// (ML/planning/what_if_simulator.py's CORRIDOR_PASSENGER_TIMETABLE) with
// the real seeded network, and is the shared engine behind the what-if
// simulator (#4), weekly/monthly planning (#3), multi-department block
// combining (#8) and the block map (#7) — see the feature plan.
//
// Deliberately does NOT reuse windowBuilder.service.js's
// buildSectionOccupations() to build its index: that function expands
// every stop-pair across a 21-day horizon (3x replication for weekly
// repeats), which is the right shape for a one-off full-network scan but
// the wrong one for a lookup index — building it measured 10s of blocked
// event-loop time and 1.35 GB of RAM. Instead, this indexes each
// (train, consecutive stop-pair) exactly once (~412k entries, not 7.6M)
// and only expands the handful of entries for ONE requested section into
// absolute minutes, on demand, which is cheap because that subset is small.
const { getTrains, getStops } = require("./networkData.service");
const { buildSectionWindows, timeToMinutes, parseRunsDays } = require("./windowBuilder.service");
const { parseSectionId } = require("../shared/sections");

// A physical corridor is undirected: a train from AA to MANW occupies the
// same track as one from MANW to AA. This canonical key merges both
// directions so conflict/free-window checks treat the corridor as shared
// track — the conservative assumption (a block closes both directions).
// This data doesn't record which sections are double-tracked with an
// independently blockable line, unlike the ML engine's small demo sample,
// which does model that via lineConfiguration.
const canonicalKey = (a, b) => [a, b].sort().join("-");

// Heuristic priority weight by train type. The source dataset's `type`
// field is a short code (Rajdhani/SF/Exp/MEMU/DEMU/PASS/...), not a
// controlled vocabulary, so this matches on substrings rather than an
// exact lookup table. Higher weight = more disruptive to delay.
const TYPE_WEIGHTS = [
  { pattern: /rajdhani|shatabdi|duronto|vande.?bharat|garib.?rath/i, weight: 100, label: "Premier" },
  { pattern: /superfast|\bsf\b/i, weight: 80, label: "Superfast" },
  { pattern: /express|\bexp\b/i, weight: 60, label: "Express" },
  { pattern: /mail/i, weight: 55, label: "Mail" },
  { pattern: /memu|demu|passenger|\bpass\b|local/i, weight: 30, label: "Passenger/Local" },
];

const priorityFor = (type) => {
  const match = TYPE_WEIGHTS.find((t) => t.pattern.test(type || ""));
  return match ? { weight: match.weight, label: match.label } : { weight: 40, label: "Standard" };
};

const DAY_INDEX_FROM_NAME = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};
const DAY_NAMES = Object.keys(DAY_INDEX_FROM_NAME).map(
  (name) => name[0].toUpperCase() + name.slice(1),
);

/** Monday-indexed (0=Monday) day-of-week for a "YYYY-MM-DD" date string. */
const dayIndexFromDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const jsDay = d.getUTCDay(); // 0=Sunday..6=Saturday
  return (jsDay + 6) % 7;
};

// Lazily built once per process: canonical section key -> that section's
// (train, stop-pair) entries, one each — NOT expanded across a horizon of
// days. Each entry's time-of-day is fixed regardless of which day it
// starts on; only `operatingDays` says which weekdays it applies to.
let indexPromise = null;

async function buildIndex() {
  const [trains, stops] = await Promise.all([getTrains(), getStops()]);
  const trainByNumber = new Map(trains.map((t) => [String(t.number), t]));

  const stopsByTrain = new Map();
  for (const stop of stops) {
    const trainNumber = String(stop.train_number || "");
    if (!trainNumber || !trainByNumber.has(trainNumber)) continue;
    if (!stopsByTrain.has(trainNumber)) stopsByTrain.set(trainNumber, []);
    stopsByTrain.get(trainNumber).push(stop);
  }

  const index = new Map();

  for (const [trainNumber, trainStops] of stopsByTrain) {
    const train = trainByNumber.get(trainNumber);
    const operatingDays = parseRunsDays(train.runs_days); // all 7 for "Daily" — see docs/NETWORK_DATA.md
    if (!operatingDays.length) continue;

    const sorted = [...trainStops].sort((a, b) => Number(a.seq) - Number(b.seq));

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const from = sorted[i];
      const to = sorted[i + 1];

      const departure = timeToMinutes(from.departure);
      const arrival = timeToMinutes(to.arrival);
      if (departure === null || arrival === null) continue;

      const departureDay = Number(from.day || 1);
      const arrivalDay = Number(to.day || departureDay);
      if (
        !Number.isInteger(departureDay) ||
        !Number.isInteger(arrivalDay) ||
        departureDay < 1 ||
        arrivalDay < departureDay
      ) {
        continue;
      }

      const durationMinutes = (arrivalDay - departureDay) * 1440 + (arrival - departure);
      if (durationMinutes <= 0) continue;

      const key = canonicalKey(from.station_code, to.station_code);
      if (!index.has(key)) index.set(key, []);

      index.get(key).push({
        trainNumber,
        trainName: train.name,
        trainType: train.type,
        fromStation: from.station_code,
        toStation: to.station_code,
        direction: `${from.station_code}-${to.station_code}`,
        departureTimeOfDay: departure, // minutes since midnight of the day it starts
        durationMinutes,
        operatingDays,
      });
    }
  }

  return index;
}

async function getIndex() {
  if (!indexPromise) indexPromise = buildIndex();
  return indexPromise;
}

/**
 * Expands one section's compact entries into absolute {startMinutes,
 * endMinutes} occupations for a single representative week (days 0-6) —
 * the shape windowBuilder.service.js's buildSectionWindows expects. Cheap
 * because a section's entry list is small (a handful to a few hundred).
 */
const expandToWeek = (entries, sectionKey) =>
  entries.flatMap((entry) =>
    entry.operatingDays.map((day) => ({
      sectionId: sectionKey,
      trainNumber: entry.trainNumber,
      trainName: entry.trainName,
      trainType: entry.trainType,
      direction: entry.direction,
      startMinutes: day * 1440 + entry.departureTimeOfDay,
      endMinutes: day * 1440 + entry.departureTimeOfDay + entry.durationMinutes,
    })),
  );

/**
 * Checks a proposed maintenance block against real train movements on a
 * section, and suggests the nearest genuinely conflict-free window.
 *
 * @param {string} sectionId - either direction of a "FROM-TO" pair, e.g. "AA-MANW".
 * @param {string} date - "YYYY-MM-DD"; only its day-of-week is used (see
 *   docs/NETWORK_DATA.md — every seeded train is assumed to run daily).
 * @param {string} startTime - "HH:MM"
 * @param {string} endTime - "HH:MM"; a value <= startTime is treated as
 *   crossing midnight into the next day.
 */
async function simulateBlockImpact({ sectionId, date, startTime, endTime }) {
  const parsed = parseSectionId(sectionId);
  if (!parsed.isSection) {
    throw Object.assign(new Error(`"${sectionId}" is not a FROM-TO section id`), { status: 400 });
  }

  const startMin = timeToMinutes(startTime);
  const endMinRaw = timeToMinutes(endTime);
  const dayIdx = dayIndexFromDate(date);

  if (startMin === null || endMinRaw === null) {
    throw Object.assign(new Error("startTime/endTime must be HH:MM"), { status: 400 });
  }
  if (dayIdx === null) {
    throw Object.assign(new Error("date must be YYYY-MM-DD"), { status: 400 });
  }

  const endMin = endMinRaw <= startMin ? endMinRaw + 24 * 60 : endMinRaw;

  const key = canonicalKey(parsed.from, parsed.to);
  const index = await getIndex();
  const occupations = expandToWeek(index.get(key) || [], key);

  const windowStart = dayIdx * 1440 + startMin;
  const windowEnd = dayIdx * 1440 + endMin;

  const conflicts = occupations
    .filter((occ) => occ.startMinutes < windowEnd && occ.endMinutes > windowStart)
    .map((occ) => {
      const priority = priorityFor(occ.trainType);
      return {
        trainNumber: occ.trainNumber,
        trainName: occ.trainName || `Train ${occ.trainNumber}`,
        type: occ.trainType,
        priority: priority.label,
        priorityWeight: priority.weight,
        direction: occ.direction,
        scheduledEntryMinute: occ.startMinutes - dayIdx * 1440,
        // How long this train would sit waiting for the block to clear.
        estimatedDelayMinutes: Math.max(0, windowEnd - occ.startMinutes),
      };
    })
    .sort((a, b) => b.priorityWeight - a.priorityWeight);

  const windows = buildSectionWindows(key, occupations);
  const targetAbs = windowStart;
  const recommendedAlternative =
    [...windows]
      .map((w) => ({
        ...w,
        distance: Math.abs(
          DAY_INDEX_FROM_NAME[w.serviceDay.toLowerCase()] * 1440 + timeToMinutes(w.windowStart) -
            targetAbs,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0] || null;

  return {
    sectionId: key,
    requestedDirection: sectionId,
    serviceDay: DAY_NAMES[dayIdx],
    startTime,
    endTime,
    durationMinutes: endMin - startMin,
    hasConflict: conflicts.length > 0,
    conflictSummary: {
      totalConflicts: conflicts.length,
      totalDelayMinutes: conflicts.reduce((sum, c) => sum + c.estimatedDelayMinutes, 0),
      highestPriority: conflicts[0]?.priority || null,
    },
    conflictingTrains: conflicts,
    recommendedAlternative: recommendedAlternative
      ? {
          serviceDay: recommendedAlternative.serviceDay,
          windowStart: recommendedAlternative.windowStart,
          windowEnd: recommendedAlternative.windowEnd,
          durationMinutes: recommendedAlternative.durationMinutes,
        }
      : null,
    source: "networkData", // distinguishes this from the ML engine's hard-coded /api/ai/what-if
  };
}

/** Every real, genuinely conflict-free window on a section (both directions combined). */
async function listFreeWindows(sectionId) {
  const parsed = parseSectionId(sectionId);
  if (!parsed.isSection) {
    throw Object.assign(new Error(`"${sectionId}" is not a FROM-TO section id`), { status: 400 });
  }

  const key = canonicalKey(parsed.from, parsed.to);
  const index = await getIndex();

  return buildSectionWindows(key, expandToWeek(index.get(key) || [], key));
}

/** Pre-builds the index so the first real request isn't the one paying for it. */
async function warmUp() {
  await getIndex();
}

module.exports = { simulateBlockImpact, listFreeWindows, warmUp };
