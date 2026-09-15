// Canonical section/station identity.
//
// Task.sectionId and Asset.station_code hold two shapes of value:
//   - a bare station code, e.g. "AA"              -> a point asset at one station
//   - a dashed pair, e.g. "AA-MANW"                -> a section BETWEEN two stations
// This is the same "FROM-TO" shape windowBuilder.service.js builds from
// consecutive stops (`${from.station_code}-${to.station_code}`), so a
// dashed sectionId can be matched directly against BlockWindow / occupancy
// data without any extra lookup table.
const parseSectionId = (sectionId) => {
  if (!sectionId || typeof sectionId !== "string") {
    return { isSection: false, stationCode: null, from: null, to: null };
  }

  const parts = sectionId.split("-");

  if (parts.length === 2 && parts[0] && parts[1]) {
    return { isSection: true, stationCode: null, from: parts[0], to: parts[1] };
  }

  return { isSection: false, stationCode: sectionId, from: null, to: null };
};

/** Every station code referenced by a sectionId, whether it's a station or a section. */
const stationCodesOf = (sectionId) => {
  const parsed = parseSectionId(sectionId);
  return parsed.isSection ? [parsed.from, parsed.to] : [parsed.stationCode];
};

module.exports = {
  parseSectionId,
  stationCodesOf,
};
