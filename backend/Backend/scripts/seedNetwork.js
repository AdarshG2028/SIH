#!/usr/bin/env node
/**
 * One-time network setup: seeds Station in MongoDB and makes sure the
 * local dataset cache exists for Train/Stop.
 *
 * Station, Train and Stop come from the public datameet/railways dataset
 * (CC0 license — https://github.com/datameet/railways), which fills a real
 * gap: this repo has schemas for them but nothing that ever loaded data in,
 * which blocked real (non-hard-coded) train-conflict checking and
 * free-window planning.
 *
 * Station (~2 MB) is seeded into Mongo here because it's small and useful
 * to query directly. Train/Stop are NOT seeded into Mongo — at full size
 * they're ~120 MB of data+index, which is enough on its own to blow through
 * Atlas's free M0 tier's 512 MB cap (it did, the first time this ran, and
 * blocked writes cluster-wide). They're read at runtime from the local
 * cache instead — see src/services/networkData.service.js. This script
 * clears any Train/Stop documents left over from before that change.
 *
 * Known limitations of the source data (safe defaults are used):
 *   - No weekly running-day pattern per train -> Train.runs_days = "Daily".
 *   - No per-stop running distance -> Stop.distance_km is left unset.
 *   - ~10% of this repo's real station codes (895 of 8,557) predate or
 *     postdate the public snapshot and get name-only Station rows.
 *
 * Usage:
 *   node scripts/seedNetwork.js            # skip Station if it already has data
 *   node scripts/seedNetwork.js --force     # wipe Station first, then reseed
 */
require("dotenv").config();

const mongoose = require("mongoose");

const Asset = require("../src/models/Asset");
const Task = require("../src/models/Task");
const Station = require("../src/models/Station");
const Train = require("../src/models/Train");
const Stop = require("../src/models/Stop");
const { parseSectionId } = require("../src/shared/sections");
const { ensureCached, buildStationRecords } = require("../src/shared/networkSource");

const INSERT_BATCH_SIZE = 2000;
const FORCE = process.argv.includes("--force");

const log = (...args) => console.log("[seed:network]", ...args);

async function insertInBatches(Model, docs, label) {
  // insertMany's return value (and even the shape of its thrown errors)
  // isn't trustworthy on its own as a source of truth for what actually
  // landed in MongoDB — under an Atlas storage-quota error it reported
  // "inserted" for documents that were in fact rejected server-side. Every
  // batch is verified against a real countDocuments() before/after.
  const startCount = await Model.countDocuments();
  let failed = 0;

  for (let i = 0; i < docs.length; i += INSERT_BATCH_SIZE) {
    const batch = docs.slice(i, i + INSERT_BATCH_SIZE);
    const before = await Model.countDocuments();

    try {
      await Model.insertMany(batch, { ordered: false });
    } catch {
      // Ignore whatever insertMany claims — verified by the real count below.
    }

    const landed = (await Model.countDocuments()) - before;

    if (landed < batch.length) {
      log(`${label}: batch at ${i} landed ${landed}/${batch.length}, retrying individually`);

      for (const doc of batch) {
        try {
          await Model.create(doc);
        } catch (docError) {
          failed += 1;
          if (failed <= 5) log(`${label}: dropped one doc — ${docError.message}`);
        }
      }
    }

    process.stdout.write(
      `\r[seed:network] ${label}: ${Math.min(i + INSERT_BATCH_SIZE, docs.length)}/${docs.length}`,
    );
  }

  process.stdout.write("\n");

  const finalCount = await Model.countDocuments();
  log(`${label}: ${finalCount} docs now in collection (+${finalCount - startCount} this run, ${failed} dropped)`);

  return { inserted: finalCount - startCount, failed };
}

async function seedStations(stationsPath) {
  const existing = await Station.countDocuments();

  if (existing > 0 && !FORCE) {
    log(`Station already has ${existing} docs, skipping (use --force to reseed)`);
    return;
  }

  if (FORCE) {
    await Station.deleteMany({});
  }

  const byCode = new Map(buildStationRecords(stationsPath).map((s) => [s.code, s]));

  // Fill in every station code this repo's own data references but the
  // public snapshot doesn't have, so map/dashboard lookups never 404 on a
  // real asset's station.
  const [assetCodes, assetNames, taskSectionIds] = await Promise.all([
    Asset.distinct("station_code"),
    Asset.aggregate([{ $group: { _id: "$station_code", name: { $first: "$station_name" } } }]),
    Task.distinct("sectionId"),
  ]);
  const nameByCode = new Map(assetNames.map((row) => [row._id, row.name]));

  const referencedCodes = new Set();
  for (const code of [...assetCodes, ...taskSectionIds]) {
    const parsed = parseSectionId(code);
    for (const c of parsed.isSection ? [parsed.from, parsed.to] : [parsed.stationCode]) {
      if (c) referencedCodes.add(c);
    }
  }

  let addedFromAssetData = 0;
  for (const code of referencedCodes) {
    if (!byCode.has(code)) {
      byCode.set(code, { code, name: nameByCode.get(code) || code, source: "asset_data" });
      addedFromAssetData += 1;
    }
  }

  log(`stations: ${byCode.size - addedFromAssetData} public + ${addedFromAssetData} asset-only = ${byCode.size} total`);

  await insertInBatches(Station, [...byCode.values()], "Station");
}

async function clearLegacyTrainStopData() {
  const [trainCount, stopCount] = await Promise.all([Train.countDocuments(), Stop.countDocuments()]);

  if (trainCount === 0 && stopCount === 0) return;

  log(
    `clearing ${trainCount} Train + ${stopCount} Stop docs from Mongo — this data now lives in ` +
      "src/services/networkData.service.js (file-backed) instead, to stay under Atlas's free-tier storage cap.",
  );
  await Promise.all([Train.deleteMany({}), Stop.deleteMany({})]);
}

async function main() {
  log(FORCE ? "running with --force (existing Station data will be wiped)" : "running");

  await mongoose.connect(process.env.MONGO_URI);
  log("connected to MongoDB");

  const stationsPath = await ensureCached("stations.json");
  // Also warm the local cache for Train/Stop so networkData.service.js's
  // first request doesn't pay the download cost.
  await Promise.all([ensureCached("trains.json"), ensureCached("schedules.json")]);

  // Clear the oversized Train/Stop data FIRST — if it's still present,
  // Atlas's storage quota blocks every insert below (deletes still work
  // under a quota block; inserts don't).
  await clearLegacyTrainStopData();
  await seedStations(stationsPath);

  log("done");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("[seed:network] FAILED:", error);
  process.exit(1);
});
