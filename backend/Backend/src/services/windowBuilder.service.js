const DEFAULT_MIN_BLOCK_MINUTES = 30;

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_INDEX = new Map([
  ["mon", 0],
  ["monday", 0],
  ["tue", 1],
  ["tuesday", 1],
  ["wed", 2],
  ["wednesday", 2],
  ["thu", 3],
  ["thursday", 3],
  ["fri", 4],
  ["friday", 4],
  ["sat", 5],
  ["saturday", 5],
  ["sun", 6],
  ["sunday", 6],
]);

const timeToMinutes = (time) => {
  if (!time || typeof time !== "string") return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const normalized = minutes % 1440;

  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const parseRunsDays = (runsDays) => {
  if (!runsDays || typeof runsDays !== "string") {
    return [];
  }

  const value = runsDays.trim().toLowerCase();

  if (value === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  return value
    .split(",")
    .map((day) => day.trim())
    .filter((day) => DAY_INDEX.has(day))
    .map((day) => DAY_INDEX.get(day));
};

const buildSectionOccupations = (stops, trains) => {
  if (!Array.isArray(stops) || !Array.isArray(trains)) {
    return [];
  }

  const trainMap = new Map(
    trains.map((train) => [String(train.number), train]),
  );

  const grouped = new Map();

  for (const stop of stops) {
    const trainNumber = String(stop.train_number || "");

    if (!trainNumber || !trainMap.has(trainNumber)) {
      continue;
    }

    if (!grouped.has(trainNumber)) {
      grouped.set(trainNumber, []);
    }

    grouped.get(trainNumber).push(stop);
  }

  const occupations = [];

  // 21 days gives enough room for journeys that extend
  // beyond one weekly cycle.
  const horizonDays = 21;

  for (const [trainNumber, trainStops] of grouped) {
    const train = trainMap.get(trainNumber);

    const operatingDays = parseRunsDays(train.runs_days);

    if (!operatingDays.length) {
      continue;
    }

    const sortedStops = [...trainStops].sort(
      (a, b) => Number(a.seq) - Number(b.seq),
    );

    for (const operatingDay of operatingDays) {
      for (let weekOffset = 0; weekOffset < horizonDays; weekOffset += 7) {
        const journeyStartDay = operatingDay + weekOffset;

        for (let i = 0; i < sortedStops.length - 1; i += 1) {
          const from = sortedStops[i];
          const to = sortedStops[i + 1];

          const departure = timeToMinutes(from.departure);
          const arrival = timeToMinutes(to.arrival);

          if (departure === null || arrival === null) {
            continue;
          }

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

          const startMinutes =
            journeyStartDay * 1440 + (departureDay - 1) * 1440 + departure;

          const endMinutes =
            journeyStartDay * 1440 + (arrivalDay - 1) * 1440 + arrival;

          if (endMinutes <= startMinutes) {
            continue;
          }

          if (startMinutes >= horizonDays * 1440) {
            continue;
          }

          occupations.push({
            trainNumber,
            sectionId: `${from.station_code}-${to.station_code}`,
            fromStation: from.station_code,
            toStation: to.station_code,
            startMinutes,
            endMinutes,
          });
        }
      }
    }
  }

  return occupations;
};

const buildSectionWindows = (
  sectionId,
  occupations,
  minBlockMinutes = DEFAULT_MIN_BLOCK_MINUTES,
) => {
  const sectionOccupations = occupations
    .filter((item) => item.sectionId === sectionId)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const windows = [];

  for (let i = 0; i < sectionOccupations.length - 1; i += 1) {
    const current = sectionOccupations[i];
    const next = sectionOccupations[i + 1];

    const gapMinutes = next.startMinutes - current.endMinutes;

    if (gapMinutes < minBlockMinutes) {
      continue;
    }

    const windowStartMinutes = current.endMinutes;
    const windowEndMinutes = next.startMinutes;

    const dayIndex = Math.floor(windowStartMinutes / 1440) % 7;

    windows.push({
      sectionId,
      serviceDay: DAY_NAMES[dayIndex],
      windowStart: minutesToTime(windowStartMinutes),
      windowEnd: minutesToTime(windowEndMinutes),
      durationMinutes: gapMinutes,
      affectedTrains: [],
      predictedDelayMinutes: 0,
      price: 0,
      status: "available",
      source: "window_builder",
    });
  }

  return windows;
};

const buildAllSectionWindows = (
  stops,
  trains,
  minBlockMinutes = DEFAULT_MIN_BLOCK_MINUTES,
) => {
  const occupations = buildSectionOccupations(stops, trains);

  const sectionIds = [
    ...new Set(occupations.map((occupation) => occupation.sectionId)),
  ];

  return sectionIds.flatMap((sectionId) =>
    buildSectionWindows(sectionId, occupations, minBlockMinutes),
  );
};

module.exports = {
  timeToMinutes,
  minutesToTime,
  parseRunsDays,
  buildSectionOccupations,
  buildSectionWindows,
  buildAllSectionWindows,
};
