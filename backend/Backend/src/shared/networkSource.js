// Loads and transforms the public datameet/railways dataset (CC0 license —
// https://github.com/datameet/railways) into the shapes this app's Station /
// Train / Stop schemas expect.
//
// Pure fs + network — no Mongoose here. scripts/seedNetwork.js uses this to
// seed Station into Mongo; src/services/networkData.service.js uses it to
// load Train/Stop into process memory instead (see that file for why they
// don't live in Mongo).
const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "..", "..", ".cache", "network-data");
const SOURCE_BASE = "https://raw.githubusercontent.com/datameet/railways/master";

async function ensureCached(filename) {
  const filePath = path.join(CACHE_DIR, filename);

  if (fs.existsSync(filePath)) {
    return filePath;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const url = `${SOURCE_BASE}/${filename}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }

  fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));

  return filePath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function buildStationRecords(stationsPath) {
  return readJson(stationsPath)
    .features.map((feature) => {
      const p = feature.properties || {};
      const [lon, lat] = feature.geometry?.coordinates || [];

      if (!p.code) return null;

      return {
        code: p.code,
        name: p.name,
        lat: typeof lat === "number" ? lat : undefined,
        lon: typeof lon === "number" ? lon : undefined,
        zone: p.zone || undefined,
        state: p.state || undefined,
        source: "datameet_railways",
      };
    })
    .filter(Boolean);
}

/** Train records, keyed by the same normalized number Stop records use. */
function buildTrainRecords(trainsPath) {
  const seenNumbers = new Set();
  const records = [];

  for (const feature of readJson(trainsPath).features) {
    const p = feature.properties || {};
    const number = parseInt(p.number, 10);

    if (!Number.isFinite(number) || seenNumbers.has(number)) continue;
    seenNumbers.add(number);

    const durationH = Number(p.duration_h) || 0;
    const durationM = Number(p.duration_m) || 0;

    records.push({
      number,
      name: p.name,
      type: p.type,
      type_label: p.type,
      // The public dataset has no weekly running-day field per train;
      // default to daily rather than guess.
      runs_days: "Daily",
      source_code: p.from_station_code,
      source: p.from_station_name,
      dest_code: p.to_station_code,
      destination: p.to_station_name,
      distance_km: p.distance,
      travel_time: `${durationH}:${String(durationM).padStart(2, "0")}`,
      num_stops: 0, // filled in by the caller once stops are built
    });
  }

  return records;
}

/**
 * Stop records with `seq` derived from each row's (monotonically
 * increasing) `id` field, since schedules.json does not store rows in
 * per-train order. Also returns num_stops per train number so callers can
 * backfill Train.num_stops without a second pass over the raw file.
 */
function buildStopRecords(schedulesPath) {
  const byTrain = new Map();

  for (const row of readJson(schedulesPath)) {
    const trainNumber = parseInt(row.train_number, 10);
    if (!Number.isFinite(trainNumber)) continue;

    if (!byTrain.has(trainNumber)) byTrain.set(trainNumber, []);
    byTrain.get(trainNumber).push(row);
  }

  const records = [];
  const numStopsByNumber = new Map();

  for (const [trainNumber, trainRows] of byTrain) {
    trainRows.sort((a, b) => a.id - b.id);
    numStopsByNumber.set(trainNumber, trainRows.length);

    trainRows.forEach((row, index) => {
      const arrival = row.arrival && row.arrival !== "None" ? row.arrival : undefined;
      const departure = row.departure && row.departure !== "None" ? row.departure : undefined;

      let haltMin;
      if (arrival && departure) {
        const [ah, am] = arrival.split(":").map(Number);
        const [dh, dm] = departure.split(":").map(Number);
        if ([ah, am, dh, dm].every(Number.isFinite)) {
          haltMin = Math.max(0, dh * 60 + dm - (ah * 60 + am));
        }
      }

      records.push({
        train_number: trainNumber,
        seq: index + 1,
        station_code: row.station_code,
        station_name: row.station_name,
        day: Number(row.day) || 1,
        arrival,
        departure,
        halt_min: haltMin,
        // distance_km isn't present in the source schedules.
      });
    });
  }

  return { records, numStopsByNumber };
}

module.exports = {
  CACHE_DIR,
  ensureCached,
  readJson,
  buildStationRecords,
  buildTrainRecords,
  buildStopRecords,
};
