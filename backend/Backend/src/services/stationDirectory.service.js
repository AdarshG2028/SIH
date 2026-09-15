// A searchable directory of every station your real Asset/Task data
// actually references — built once from Mongo (a single aggregation over
// all assets) and cached in memory, the same lazy-singleton pattern
// networkData.service.js and impact.service.js use, so a station search
// box isn't re-scanning 41k assets on every keystroke.
//
// Geo coordinates come from the same public dataset seeded in Phase 1
// (networkSource.js), read directly from the local cache — this doesn't
// depend on the Station Mongo collection, which is still empty pending
// Atlas's storage quota clearing (see docs/NETWORK_DATA.md). Once Station
// is seeded, this could switch to reading it instead, but there's no
// reason to block the map/station picker on that.
const Asset = require("../models/Asset");
const { ensureCached, buildStationRecords } = require("../shared/networkSource");

let directoryPromise = null;

async function buildDirectory() {
  const [assetGroups, stationsPath] = await Promise.all([
    Asset.aggregate([
      {
        $group: {
          _id: "$station_code",
          name: { $first: "$station_name" },
          assetCount: { $sum: 1 },
          assetTypes: { $addToSet: "$asset_type" },
        },
      },
    ]),
    ensureCached("stations.json"),
  ]);

  const geoByCode = new Map(buildStationRecords(stationsPath).map((s) => [s.code, s]));

  return assetGroups
    .filter((g) => g._id) // drop the rare null/blank station_code
    .map((g) => {
      const geo = geoByCode.get(g._id);
      return {
        code: g._id,
        name: g.name || geo?.name || g._id,
        assetCount: g.assetCount,
        assetTypes: g.assetTypes.filter(Boolean).sort(),
        lat: geo?.lat,
        lon: geo?.lon,
        hasGeo: Boolean(geo?.lat && geo?.lon),
      };
    })
    .sort((a, b) => b.assetCount - a.assetCount);
}

async function getStationDirectory() {
  if (!directoryPromise) directoryPromise = buildDirectory();
  return directoryPromise;
}

/** Case-insensitive substring match on code or name, busiest stations first. */
async function searchStations(query, limit = 20) {
  const directory = await getStationDirectory();

  if (!query) return directory.slice(0, limit);

  const q = query.trim().toLowerCase();
  return directory
    .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, limit);
}

async function getStation(code) {
  const directory = await getStationDirectory();
  return directory.find((s) => s.code === code) || null;
}

/** Pre-builds the directory so the first request isn't the one paying for it. */
async function warmUp() {
  await getStationDirectory();
}

module.exports = { getStationDirectory, searchStations, getStation, warmUp };
