# AI-Powered Automatic Block Planning System
## Smart India Hackathon (SIH) — ML Team Deliverable & Architecture Guide

---

## 1. Executive Summary

This repository houses the **Intelligence Layer** for Indian Railways' Automatic Block Planning system. It solves the operational inefficiency of decentralized, manual maintenance block planning across **Engineering (Track)**, **Signal & Telecommunication (S&T)**, and **Traction Distribution (TRD / OHE)**.

### Core Capabilities
1. **Multi-Source Data Ingestion**: Synthesizes and ingests maintenance demand from **TMS**, **SMMS**, **TDMS**, and corridor availability from **Train Timetables** and **COA Goods Forecasts**.
2. **Transparent Priority Scoring Model (0–100)**: Quantifies task criticality based on asset health, safety impact, overdue days, and predictive ML failure risk with explainable factors.
3. **Block Optimization & Multi-Department Shadow Blocking**: Consolidates separate departmental maintenance demands into synchronized, co-located corridor blocks during low-traffic windows.
4. **What-If / Train Conflict Simulator**: Analyzes proposed block times, flags passenger and freight conflicts, calculates delay impacts, and suggests optimal alternatives.
5. **Demonstrable Before-vs-After KPIs**: Proves significant reductions in corridor block hours, total closures, and train disruptions while improving asset availability.
6. **Production-Ready REST API Server**: Zero-dependency HTTP server with endpoints for backend integration.

---

## 2. Directory Structure & Key Files

```
railway-predictive-maintenance/
├── data/
│   ├── sih_prototype/
│   │   ├── tms_tasks.json             # Track Management System tasks
│   │   ├── smms_tasks.json            # Signalling & Telecom tasks
│   │   ├── tdms_tasks.json            # Traction/OHE tasks
│   │   ├── coa_goods_forecast.json    # Control Office freight forecast
│   │   └── corridor_availability.json # Corridor blocks & track geography
│   └── raw/
│       ├── schedules.jsonl            # Indian Railways passenger schedules
│       └── trains.csv                 # Timetabled train catalogue
├── ML/
│   └── src/
│       ├── api_server.py              # Zero-dependency REST API server
│       └── planning/
│           ├── data_loader.py         # Unified dataset ingestion
│           ├── priority_scoring_model.py # 0–100 Priority scoring model
│           ├── what_if_simulator.py   # Train conflict & delay simulator
│           ├── evaluation_metrics.py  # Before vs. After KPI calculator
│           ├── block_planner.py       # Core optimization & shadow scheduler
│           ├── maintenance_request_handler.py # User form parser & safety enricher
│           ├── test_user_block_planning.py    # Form-driven test script
│           └── run_sih_pipeline.py    # Full end-to-end test suite
├── outputs/
│   ├── demo_block_output.json         # Example optimized block JSON output
│   └── block_plan.json                # Persisted block schedule
└── backups/
    └── pre_sih_update/                # Complete pre-modification snapshot
```

---

## 3. The 7 SIH Prototype Components

### Component 1: Prototype Datasets
Datasets in `data/sih_prototype/` include all 15 required fields:
`task_id`, `department`, `asset_id`, `asset_type`, `location`, `corridor`, `task_type`, `criticality`, `urgency`, `due_date`, `overdue_days`, `estimated_duration`, `safety_impact`, `required_resources`, `status`.

- **TMS**: `data/sih_prototype/tms_tasks.json` (Track tamping, rail replacement, turnout overhaul)
- **SMMS**: `data/sih_prototype/smms_tasks.json` (Point machines, track circuit relays, interlocking)
- **TDMS**: `data/sih_prototype/tdms_tasks.json` (Contact wire stagger, dropper replacement, insulator cleaning)
- **COA**: `data/sih_prototype/coa_goods_forecast.json` (BOXN coal rakes, container trains, petroleum tankers)

### Component 2: Priority Scoring Model (0–100)
Implemented in [`priority_scoring_model.py`](file:///Users/jatinsharma/railway-ai/railway-predictive-maintenance/ML/src/planning/priority_scoring_model.py).

#### Inputs:
- Asset criticality (Max 25 pts)
- Safety impact: Derailment/arcing hazard vs. routine (Max 25 pts)
- Overdue days past due date (Max 20 pts: +4 pts per day overdue)
- Urgency flag (Max 5 pts)
- Physical asset condition score (Max 15 pts)
- Predictive ML failure risk probability (Max 10 pts)

#### Output Schema:
```json
{
  "task_id": "TMS-TRK-2026-002",
  "priority_score": 96.0,
  "priority_level": "Critical",
  "major_contributing_factors": [
    "+25 pts: Critical asset category directly affecting mainline running",
    "+25 pts: Severe safety hazard (risk of derailment, signal failure)",
    "+20 pts: Overdue by 5 day(s) beyond mandated inspection schedule",
    "+15 pts: Severely degraded physical condition score (41/100)"
  ]
}
```

### Component 3: Block Optimization Logic
Implemented in [`block_planner.py`](file:///Users/jatinsharma/railway-ai/railway-predictive-maintenance/ML/src/planning/block_planner.py).
Produces blocks formatted according to the exact SIH specification:

```json
{
  "block_id": "BLOCK-LNL-PUNE-01",
  "date": "2026-09-16",
  "corridor": "LNL-PUNE",
  "location": "Km 45.0 – 52.0 (Lonavala to Pune Up-Line)",
  "start_time": "01:00",
  "end_time": "04:00",
  "duration": 3.0,
  "departments": ["Engineering", "Signal & Telecommunication (S&T)", "Traction Distribution (TRD)"],
  "affected_assets": ["AST019466", "AST019467", "AST019469"],
  "affected_trains": [],
  "optimization_score": 100.0,
  "reason_recommendation": "Consolidated 3 tasks across 3 departments into a single 3.0h shadow block. Avoided 4.0h of separate corridor closures."
}
```

### Component 4: What-If / Train Conflict Simulator
Implemented in [`what_if_simulator.py`](file:///Users/jatinsharma/railway-ai/railway-predictive-maintenance/ML/src/planning/what_if_simulator.py).

#### Example:
- **User proposes**: `10:30 – 12:00` on corridor `LNL-PUNE`
- **Conflict Detected**: Train 11007 (Deccan Express) at 10:45, Train 99815 at 11:15, and BTPN-4412 goods rake at 10:45.
- **Alternative Recommended**: `01:30 – 03:00` (Zero conflict quiet corridor window).
- **Recommendation Advice**: "Move block to 01:30 to eliminate train delays and preserve punctual operations."

### Component 5: Prototype Evaluation Metrics (Before vs. After)
Implemented in [`evaluation_metrics.py`](file:///Users/jatinsharma/railway-ai/railway-predictive-maintenance/ML/src/planning/evaluation_metrics.py).

| Metric | Before AI (Manual / Decentralized) | After AI (Automatic Optimization) | Improvement / Impact |
|---|---|---|---|
| **Number of Blocks** | 7 blocks | **3 blocks** | **-57.1% reduction** in line disruptions |
| **Total Block Hours** | 8.5 hours | **5.0 hours** | **-41.2% reduction** in total track downtime |
| **Train Timetable Conflicts** | 5 conflicts | **0 conflicts** | **100% timetable conflicts eliminated** |
| **Asset Availability** | 91.4% | **95.8%** | **+4.4% availability gain** |
| **Tasks Consolidated** | 0 tasks | **7 tasks** | Multi-department shadow blocks |

> *Note: Metrics are prototype estimates based on simulated Indian Railways corridor scenarios.*

---

## 4. Backend Developer API Contract

The REST server in [`ML/src/api_server.py`](file:///Users/jatinsharma/railway-ai/railway-predictive-maintenance/ML/src/api_server.py) requires no external dependencies (uses standard Python library) and runs on port 8000.

### 1. `POST /api/ai/generate-plan`
**Request Payload**:
```json
{
  "planning_horizon": "weekly",
  "start_date": "2026-09-16",
  "end_date": "2026-09-22",
  "corridor": "LNL-PUNE"
}
```
**Response**: Full generated blocks, task priorities, conflicts, and Before vs After KPIs.

### 2. `POST /api/ai/priority`
**Request Payload**:
```json
{
  "criticality": "Critical",
  "overdue_days": 4,
  "safety_impact": "Derailment risk due to rail corrugation"
}
```
**Response**: `{"priority_score": 92.0, "priority_level": "Critical", "major_contributing_factors": [...]}`.

### 3. `POST /api/ai/what-if`
**Request Payload**:
```json
{
  "corridor": "LNL-PUNE",
  "proposed_date": "2026-09-16",
  "proposed_start_time": "10:30",
  "proposed_end_time": "12:00"
}
```
**Response**: `{"has_conflict": true, "conflicting_trains": [...], "recommended_alternative": {"start_time": "01:30", "end_time": "03:00"}}`.

### 4. `POST /api/ai/user-request`
Ingests form submissions from the frontend (taking duration, workers, equipment, and linear Km posts directly from the user).

---

## 5. How to Run the ML Components

### Run Full SIH Verification Suite:
```bash
python3 ML/src/planning/run_sih_pipeline.py
```

### Run Form-Driven Block Planner Test:
```bash
python3 ML/src/planning/test_user_block_planning.py
```

### Start the REST API Server:
```bash
python3 ML/src/api_server.py 8000
```

---

## 6. Assumptions and Limitations

1. **Prototype Assumptions**:
   - Goods train schedules from COA are represented using typical daily freight corridors.
   - Quiet corridor windows (01:00–04:30) are assumed to have minimal passenger traffic, consistent with Indian Railways night traffic patterns.
   - Machinery availability assumes standard depot inventory in division headquarters.
2. **Current Limitations**:
   - The optimization uses heuristic constraint scoring and multi-department grouping. In a future phase, it can be paired with mathematical integer programming (MILP via Google OR-Tools) for division-wide network solving.
   - Emergency unplanned line-breakages will trigger instant dynamic re-planning rather than static weekly scheduling.
