const buildSectionOccupations = (stops) => {
  if (!Array.isArray(stops)) {
    return [];
  }

  const groupedByTrain = new Map();

  for (const stop of stops) {
    if (!stop.train_number) {
      continue;
    }

    if (!groupedByTrain.has(stop.train_number)) {
      groupedByTrain.set(stop.train_number, []);
    }

    groupedByTrain.get(stop.train_number).push(stop);
  }

  const occupations = [];

  for (const [trainNumber, trainStops] of groupedByTrain) {
    const sortedStops = [...trainStops].sort(
      (a, b) => Number(a.seq) - Number(b.seq)
    );

    for (let i = 0; i < sortedStops.length - 1; i += 1) {
      const from = sortedStops[i];
      const to = sortedStops[i + 1];

      if (
        !from.station_code ||
        !to.station_code ||
        !from.departure ||
        !to.arrival
      ) {
        continue;
      }

      occupations.push({
        trainNumber,
        sectionId: `${from.station_code}-${to.station_code}`,
        fromStation: from.station_code,
        toStation: to.station_code,
        departure: from.departure,
        arrival: to.arrival,
        day: from.day,
      });
    }
  }

  return occupations;
};

const groupOccupationsBySection = (occupations) => {
  const sections = new Map();

  for (const occupation of occupations) {
    if (!occupation.sectionId) {
      continue;
    }

    if (!sections.has(occupation.sectionId)) {
      sections.set(occupation.sectionId, []);
    }

    sections.get(occupation.sectionId).push(occupation);
  }

  return sections;
};

module.exports = {
  buildSectionOccupations,
  groupOccupationsBySection,
};