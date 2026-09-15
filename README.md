# Railway AI — Block Planner

Predictive maintenance, real train-conflict checking, multi-department block
combining, and an AI assistant, over real Indian Railways data.

Three services:

| Service | What | Port |
|---|---|---|
| `frontend/` | TanStack Start app (control dashboard, map, assistant, …) | 8080 |
| `backend/Backend/` | Node/Express API, MongoDB Atlas | 5000 |
| `backend/ML/` | Python engine — block planning, priority scoring, what-if | 8000 |

## Prerequisites

- **Node.js** 18+ and **npm**
- **[Bun](https://bun.sh)** (the frontend's package manager — `bun.lock`, not `package-lock.json`)
- **Python 3.9+** — no `pip install` needed; the ML engine is standard-library only
- A **MongoDB Atlas connection string** — ask whoever's running the project for
  the shared one, or point at your own Atlas cluster (see [`backend/docs/NETWORK_DATA.md`](backend/docs/NETWORK_DATA.md)
  for what to seed into an empty one)

## Setup

```bash
git clone <this repo>
cd Railwayy
npm install                # installs `concurrently`, used to run all 3 services together
npm run install:all        # installs backend + frontend dependencies
```

Then create the one `.env` file that actually holds secrets:

```bash
cp backend/Backend/.env.example backend/Backend/.env
```

Edit `backend/Backend/.env` and set `MONGO_URI`. Everything else in there has a
working default. `AI_API_KEY` is optional — leave it blank to run without the
AI assistant (`/assistant` shows a clear "not configured" message instead of
breaking); see that file's comments for how to get a free key (Groq/xAI/OpenAI
all work).

The frontend needs no `.env` for local dev — `frontend/.env.example` documents
its one optional override.

### One-time: seed the network data

Stations, trains and the block-planning engine's real train-conflict data
come from a public dataset, not from anything you need to supply:

```bash
npm run seed:network
```

Safe to re-run; it skips anything already seeded unless you pass `--force`.
Full explanation of what this does and why: [`backend/docs/NETWORK_DATA.md`](backend/docs/NETWORK_DATA.md).

## Run everything

```bash
npm run dev
```

Starts all three services together (color-coded output per service). First
boot takes 20-30s while the frontend and the impact/station-directory caches
warm up. Then:

- Frontend: **http://localhost:8080**
- Backend health check: **http://localhost:5000/api/health**
- ML engine health check: **http://localhost:8000/api/health**

Stop with `Ctrl+C` — it kills all three.

Need just one service on its own (e.g. for focused backend debugging)?
`npm run dev:backend`, `npm run dev:ml`, or `npm run dev:frontend` from the
repo root, or the normal `npm run dev` / `bun run dev` from inside that
service's own folder.

## Troubleshooting

- **"Cannot reach the backend"** in the UI → the Node backend isn't running,
  or `MONGO_URI` is wrong/missing in `backend/Backend/.env`.
- **"AI ENGINE OFFLINE"** in the UI → the Python engine isn't running, or
  `ML_SERVICE_URL` in `backend/Backend/.env` doesn't match where it's
  actually listening (default `http://127.0.0.1:8000` — use `127.0.0.1`,
  not `localhost`: Node tries IPv6 `::1` first and the Python server only
  listens on IPv4).
- **Assistant page says "not configured"** → expected until you add
  `AI_API_KEY` to `backend/Backend/.env` and restart the backend (env
  changes need a restart — `nodemon` doesn't watch `.env`).
- **Atlas storage quota errors** on writes → see
  [`backend/docs/NETWORK_DATA.md`](backend/docs/NETWORK_DATA.md)'s note on
  the free M0 tier's 512MB cap; it's why Train/Stop don't live in Mongo.

## Project structure

```
frontend/            TanStack Start app
backend/Backend/      Node/Express API + MongoDB models
backend/ML/            Python planning/scoring engine
backend/docs/          Integration notes (ML<->backend contract, network data)
scripts/run-ml.js      Cross-platform Python launcher used by `npm run dev:ml`
```
