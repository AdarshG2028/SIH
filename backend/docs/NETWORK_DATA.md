# Network data: stations, trains, stops

## Why this exists

The repo shipped with `Station`, `Train` and `Stop` Mongoose schemas but
nothing that ever loaded data into them — real train-conflict checking
(#4/#9 in the feature plan) and real free-window planning (#3) need this
data and were previously stuck on the ML engine's small hard-coded sample
(~10 trains, 2 corridors).

## Source

[`datameet/railways`](https://github.com/datameet/railways) — a public,
**CC0-licensed** (public domain) GeoJSON snapshot of Indian Railways
stations, trains and schedules, gathered ~2016. It's a strong match for
this repo's own data: 7,662 of this repo's 8,557 real station codes match
the public dataset's codes, with the same or near-identical station names.

- `stations.json` — 8,990 stations, each with code, name, lat/lon, zone, state.
- `trains.json` — 5,208 trains (5,139 after de-duplicating by number), with
  source/destination station, distance, duration.
- `schedules.json` — 417,080 stop rows across those trains.

## Where the data lives

| Collection | In Mongo? | Why |
|---|---|---|
| `Station` | Yes | Small (~2 MB with index), and useful to query directly for the dashboard/map (#1/#7). |
| `Train` / `Stop` | **No** — file-backed, in-process | At full size these are ~120 MB of data+index. Seeding them into Mongo the first time alone blew through Atlas's free M0 tier's 512 MB cap and **blocked writes cluster-wide** — including the live app's own block-request/task writes. Deleting the documents afterwards freed them logically, but MongoDB's storage engine doesn't shrink allocated disk back down without a compaction, which the M0 tier doesn't expose — so once you're over quota on M0, waiting for background reclaim (or a manual pause/resume, or a brief paid-tier upgrade) is genuinely the only way out, not something a script can undo. |

`Train`/`Stop` are read via **`src/services/networkData.service.js`**,
which lazily parses the cached JSON into memory on first use (a 1–2 second
parse, ~120 MB of process RAM once loaded) and keeps it there for the life
of the process. Anything that needs `windowBuilder.service.js`'s
`buildSectionOccupations` / `buildAllSectionWindows` should get its `trains`
and `stops` arrays from `getTrains()` / `getStops()` there — **not** from
the `Train` / `Stop` Mongoose models, whose collections are intentionally
kept empty.

## Setup

```bash
cd backend/Backend
npm run seed:network            # seeds Station; downloads trains.json/schedules.json into .cache/
npm run seed:network -- --force # wipes and reseeds Station
```

The three source files (~98 MB total) are cached under `.cache/network-data/`
(gitignored) on first run — one download per machine, not committed.

## Known limitations of the source data

- **No weekly running-day pattern per train.** The public dataset doesn't
  record which days of the week a train runs, so every train's
  `runs_days` defaults to `"Daily"`. `windowBuilder`'s occupancy math still
  works correctly; it's just an over-approximation for non-daily trains.
- **No per-stop running distance.** `Stop.distance_km` is left unset —
  the source schedules don't carry it, only each train's total journey
  distance (on `Train.distance_km`).
- **~10% of real station codes are name-only.** 895 of this repo's 8,557
  station codes aren't in the ~2016 public snapshot (renamed/new/removed
  stations); their `Station` documents have a name but no coordinates.

## Canonical section/department vocabulary

Two small shared modules resolve naming mismatches between the Mongo-side
data and the Python ML engine, so future work doesn't have to re-derive them:

- **`src/shared/departments.js`** — Task.department uses short internal
  names (`Track`/`Signalling`/`OHE`); the ML engine and the frontend's
  request form use the official names (`Engineering`/`Signal &
  Telecommunication (S&T)`/`Traction Distribution (TRD)`). `toDisplay()` /
  `toCanonical()` convert between them.
- **`src/shared/sections.js`** — `Task.sectionId` / `Asset.station_code`
  hold either a bare station code (`"AA"`) or a dashed pair (`"AA-MANW"`)
  meaning a section between two stations — the same `FROM-TO` shape
  `windowBuilder.service.js` builds from consecutive stops.
  `parseSectionId()` tells the two apart.
