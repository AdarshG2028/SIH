// In-process source of Train + Stop timetable data.
//
// This data comes from the public datameet/railways dataset (~5,100 trains,
// ~413k stops nationwide). It does NOT live in MongoDB: at full size it's
// ~120 MB of data+index, which alone blew through Atlas's free M0 tier's
// 512 MB cap and blocked writes cluster-wide the first time it was seeded
// there. Station stays in Mongo (it's ~2 MB and genuinely benefits from
// being queryable), but Train/Stop are read-only reference data, so they're
// parsed once from the locally cached JSON and kept in memory instead —
// zero ongoing DB storage cost.
//
// Usage: whatever needs windowBuilder.service.js's buildSectionOccupations /
// buildAllSectionWindows should get its `trains` and `stops` arrays from
// getTrains() / getStops() here, NOT from the Train / Stop Mongoose models.
//
// Cost of this approach: ~120 MB of Node process memory once loaded, and a
// one-to-two second parse on first use after a server restart. Both are
// fine for a single backend instance; if this ever needs to scale beyond
// that, move it to a dedicated cache (Redis) instead of reintroducing it to
// Mongo.
const { ensureCached, buildTrainRecords, buildStopRecords } = require("../shared/networkSource");

let cache = null; // { trains, stops } | null
let loadingPromise = null;

async function load() {
  const [trainsPath, schedulesPath] = await Promise.all([
    ensureCached("trains.json"),
    ensureCached("schedules.json"),
  ]);

  const trains = buildTrainRecords(trainsPath);
  const { records: stops, numStopsByNumber } = buildStopRecords(schedulesPath);

  for (const train of trains) {
    train.num_stops = numStopsByNumber.get(train.number) || 0;
  }

  return { trains, stops };
}

async function ensureLoaded() {
  if (cache) return cache;
  if (!loadingPromise) loadingPromise = load();
  cache = await loadingPromise;
  return cache;
}

async function getTrains() {
  return (await ensureLoaded()).trains;
}

async function getStops() {
  return (await ensureLoaded()).stops;
}

async function getTrainsAndStops() {
  return ensureLoaded();
}

module.exports = { getTrains, getStops, getTrainsAndStops };
