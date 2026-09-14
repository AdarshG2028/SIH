# Railway Block Planner

Build the frontend for "Railway AI Block Planner" — a Smart India Hackathon prototype for Indian Railways that automatically plans maintenance "blocks" (time windows when a track section is closed for maintenance). It combines requests from three departments — Engineering (Track / P-Way), Signal & Telecommunication (S&T), and Traction Distribution (TRD / OHE overhead power) — into shared "shadow blocks", avoids passenger and freight train conflicts, and orders the safety steps between departments.

Do not add authentication, login, or user accounts. All endpoints are public.

## 1. Backend connection

- Base URL from an env variable: VITE_API_BASE_URL, default "http://localhost:5000/api".
- All responses are JSON in the envelope: { "success": true, "data": ... } (list endpoints may also include "count" or "pagination").
- Errors: { "success": false, "message": "...", "errors"?: [...], "details"?: ..., "availableOptions"?: [...] }.
  - 400 = validation error (show "errors" array / "message" to the user)
  - 404 = not found
  - 409 = duplicate requestId
  - 502 = ML engine returned an error
  - 503 = ML engine is offline ("ML service unavailable at ..."). Show a clear "AI engine offline" state wherever AI endpoints are used.
- Some AI calls take 1–3 seconds; show loading states. Use a request timeout of ~20s.
- Do NOT use these endpoints (they exist but currently return empty data): /api/assets, /api/tasks, /api/planning/demo, /api/planning/periods.

## 2. Endpoints

### 2.1 Health
- GET /health → { success, message: "Railway AI backend is running" }
- GET /ai/health → { success, data: { mlApiUrl, status: "UP", service, version } }  (503 if the ML engine is down)

### 2.2 Maintenance Block Requests (core flow: form → AI decision → saved with audit trail)

POST /ai/block-requests
Request body:
{
  "department": "Engineering",            // required. Options: "Engineering", "Signal & Telecommunication (S&T)", "Traction Distribution (TRD)"
  "maintenanceType": "Track Maintenance", // free text; keywords drive safety rules: track, tamping, rail renewal, OHE, catenary, signal, point machine, bridge
  "priority": "MEDIUM",                   // LOW | MEDIUM | HIGH | CRITICAL
  "sectionId": "LNL-PUNE",                // required. Known sections: "LNL-PUNE" (full data: Lonavala–Pune), "BPL", "RKMP"
  "fromLocation": "Lonavala",
  "toLocation": "Pune",
  "fromKm": 45.0,                         // required number
  "toKm": 52.0,                           // required number, >= fromKm
  "assetId": "AST027697",                 // optional; if given, the backend attaches the asset's ML risk score
  "submittedBy": "SSE/P-Way Lonavala",    // optional free text name, stored in audit trail
  "requestId": "optional-custom-id",      // optional; omit to let backend generate "REQ-<timestamp>"
  "schedulingPreferences": {
    "preferredDate": "16/09/2026",        // DD/MM/YYYY or YYYY-MM-DD
    "durationHours": 3,                   // required, > 0
    "preferredStartTime": "01:00 AM",     // "HH:MM AM/PM" or "HH:MM" 24h
    "preferredEndTime": "05:00 AM"        // may cross midnight
  },
  "resources": {
    "workersRequired": 10,
    "equipmentRequired": ["Tamping Machine"], // options: "Tamping Machine", "Tower Wagon", "Signal Testing Equipment", "Rail Crane", "Track Recording Car"
    "additionalNotes": "Ballast tamping, track alignment, and joint inspection on Up-line"
  },
  "canBeCombined": true                   // allow AI to bundle other departments' tasks into this block
}

Response 201:
{
  "success": true,
  "data": {
    "id": "...",
    "requestId": "REQ-1789132717408",
    "status": "recommended",           // recommended | needs_review | accepted | rejected
    "selectedWindow": { ...same shape as decision.recommendedWindow },
    "assetRisk": null | { "asset_id", "snapshot_date", "risk_probability": 0.557, "risk_score": 55.72, "risk_level": "HIGH", "recommended_action": "Schedule inspection within 7 days" },
    "decision": {
      "requestId", "status": "APPROVED_RECOMMENDED" | "NEEDS_OFFICER_REVIEW",
      "sectionId", "fromLocation", "toLocation", "fromKm", "toKm", "linearSpanKm": 7.0,
      "lineConfiguration": "DOUBLE_LINE_ELECTRIFIED (...)",
      "department", "maintenanceType", "priority",
      "userPreferences": { "preferredDate", "durationHours", "preferredStartTime", "preferredEndTime", "workersRequired", "equipmentRequired": [], "additionalNotes", "canBeCombined" },
      "safetyProtocols": { "speedRestriction", "safetyPrecautions", "powerBlockRequired": bool, "trafficBlockRequired": bool },
      "recommendedWindow": { "date": "2026-09-16", "startTime": "01:00", "endTime": "04:00", "durationHours": 3.0, "trafficLevel": "VERY_LOW", "trafficScore": 100.0, "weatherSuitable": true, "overallScore": 100 },
      "multiDepartmentCoordination": {
        "integratedDepartments": ["Engineering", "Signal & Telecommunication (S&T)", "Traction Distribution (TRD)"],
        "isMultiDepartment": true,
        "downtimeSavedHours": 7.5,        // headline number: hours of separate closures avoided by shadow blocking
        "primaryTask": { "department", "work", "durationHours", "workers", "equipment": [], "span": "Km 45.0 – 52.0" },
        "coLocatedTasks": [ { "taskId": "TDMS-OHE-2026-001", "department", "description", "taskType", "durationHours", "workers", "equipment": [], "span" } ]
      },
      "interDepartmentSequencing": [   // ordered safety timeline inside the block
        { "phase": 1, "timeWindow": "01:00 – 01:15", "department": "Traction Distribution (TRD)", "safetyAction": "25 kV AC OHE Power Block Isolation", "operatingProtocol": "..." }
      ],
      "corridorStarvationAnalysis": { "historicalDemandedBlocks", "historicalGrantedBlocks", "historicalDeniedBlocks", "grantRatioPct", "starvationLevel", "justification" },
      "blockProductivityAndBuffers": { "totalPossessionDuration", "effectiveWorkTime", "machineShuntingAndTransit", "mandatorySafetyBuffer", "overrunRiskBuffer", "productivityRatio", "overrunProtectionNote" },
      "specialTrafficCalendar": { "isExclusionWindow", "calendarStatus", "holidayEmbargo", "notes" },
      "reasons": ["...human-readable explanation strings..."],
      "alternativeOptions": [ { "optionId": "ALTERNATIVE_1", "date", "startTime": "01:30", "endTime": "04:30", "durationHours", "trafficLevel", "trafficScore", "weatherSuitable", "score" } ]
    }
  }
}

GET /ai/block-requests?status=&sectionId=&limit=  → { success, count, data: [BlockRequest] }
  BlockRequest = { _id, requestId, sectionId, department, maintenanceType, fromKm, toKm, preferredDate, input, decision, status, selectedWindow, assetRisk, auditTrail: [ { action, at, by, note } ], createdAt, updatedAt }
  audit actions: "submitted", "ml_evaluated", "window_selected", "accepted", "rejected"

GET /ai/block-requests/:requestId → { success, data: BlockRequest }  (404 if missing)

PATCH /ai/block-requests/:requestId/window
  body: { "optionId": "ALTERNATIVE_1", "by": "Section Controller", "note": "optional" }   // optionId: "RECOMMENDED" | "ALTERNATIVE_1" | "ALTERNATIVE_2"
  → { success, data: BlockRequest }   (400 with "availableOptions" if optionId is unknown)

PATCH /ai/block-requests/:requestId/decision
  body: { "decision": "accepted" | "rejected", "by": "DRM", "note": "optional" }
  → { success, data: BlockRequest }

### 2.3 AI engine tools (stateless, nothing saved)

POST /ai/what-if — train conflict simulator for a proposed block time
  body: { "corridor": "LNL-PUNE" | "BPL-RKMP", "proposed_date": "2026-09-16", "proposed_start_time": "10:30", "proposed_end_time": "12:00", "department": "Engineering", "maintenance_type": "Track Maintenance" }
  data: {
    "simulation_query": {...echo of inputs, "duration_hours"},
    "has_conflict": true,
    "conflict_summary": { "total_conflicts", "passenger_trains_affected", "goods_trains_affected", "total_passenger_delay_minutes", "total_freight_delay_minutes" },
    "conflicting_trains": [ { "train_number": "11007", "train_name": "Deccan Express", "train_type": "Express", "scheduled_passage": "10:45", "priority": "HIGH", "estimated_delay_minutes": 75 } ],
    "recommended_alternative": { "start_time": "01:30", "end_time": "03:00", "conflicts": 0, "note" },
    "recommendation": "text"
  }

POST /ai/generate-plan — optimized multi-department weekly block plan
  body: { "planning_horizon": "weekly", "start_date": "2026-09-16", "end_date": "2026-09-22", "corridor": "LNL-PUNE" }   // omit corridor for all corridors
  data: {
    "planning_horizon", "start_date", "end_date", "corridor", "total_tasks_processed",
    "generated_blocks": [ {
      "block_id": "BLOCK-LNL-PUNE-01", "date", "corridor", "location", "start_time", "end_time", "duration",
      "selected_tasks": [ { "task_id", "department", "task_type", "asset_id", "priority_score", "priority_level", "estimated_duration" } ],
      "departments": [], "affected_assets": [],
      "affected_trains": [ { "train_number", "train_name", "rake_type", "entry_time", "exit_time", "can_be_regulated", "delay_minutes" } ],
      "optimization_score", "reason_recommendation"
    } ],
    "task_priorities": [ { "task_id", "priority_score", "priority_level", "major_contributing_factors": [], "raw_task_reference": { "department", "task_type", "location", "due_date", "overdue_days" } } ],
    "conflicts": [], "kpis": {...see /ai/kpis}, "before_vs_after_evaluation": {...}, "recommendations": ["text"]
  }

POST /ai/priority — 0–100 maintenance priority score
  body: { "criticality": "Critical" | "High" | "Medium" | "Low", "overdue_days": 4, "safety_impact": "free text, e.g. Derailment risk due to rail corrugation", "urgency": "Urgent" | "Flexible", "condition_score": 41, "ml_probability": 0.62, "department", "task_type" }   // all optional
  data: { "task_id", "priority_score": 76, "priority_level": "Critical" | "High" | "Medium" | "Low", "major_contributing_factors": ["+25 pts: ..."], "raw_task_reference": {...} }

GET /ai/kpis — before vs after AI impact
  data: {
    "evaluation_summary": { "title", "prototype_disclaimer", "corridor", "evaluation_period" },
    "before_vs_after": { "number_of_blocks": { before, after, improvement }, "total_block_duration_hours": {...}, "train_timetable_conflicts": {...}, "asset_downtime_hours": { before, after, downtime_saved_hours }, "estimated_asset_availability": { before, after, improvement }, "tasks_consolidated": { before, after, note } },
    "kpis": { "blocksBefore": 7, "blocksAfter": 3, "durationHoursBefore": 8.5, "durationHoursAfter": 5.0, "conflictsBefore": 5, "conflictsAfter": 0, "availabilityBefore": 91.4, "availabilityAfter": 95.8, "downtimeHoursSaved": 3.5, "availabilityGainPct": 4.4 }
  }
  Always show the prototype_disclaimer next to these numbers.

### 2.4 Asset failure risk (ML predictions, 41,552 rows)

GET /risks?riskLevel=&minScore=&maxScore=&search=&page=1&limit=50   (limit max 100, sorted by risk_score desc)
  → { success, data: [ { "asset_id", "snapshot_date", "predicted_probability", "predicted_class", "risk_probability", "risk_score": 75.33, "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "recommended_action" } ], pagination: { page, limit, total, totalPages } }
  search = partial asset_id match.
GET /risks/:assetId → latest risk row for that asset (404 if none)
GET /risks/:assetId/explanation → { "asset_id", "snapshot_date", "ensemble_probability", "risk_level", "top_reason_1".."top_reason_5", "protective_factor_1".."protective_factor_3" }
  - Only ~5,000 assets have explanations; treat 404 as "no explanation available".
  - Reason strings look like "numeric__total_maintenance_cost (+0.0129)". Parse them: strip the "numeric__" / "categorical__" prefix, replace underscores with spaces, and read the signed number as the SHAP contribution (+ increases risk, − reduces risk).
Risk levels: LOW < 20%, MEDIUM 20–39%, HIGH 40–59%, CRITICAL ≥ 60%. Model: weighted ensemble (LightGBM 50%, Temporal CNN 30%, Random Forest 20%), recall 0.85.

### 2.5 Block approval workflow (for generated plan blocks)
GET  /approvals/:blockId → { success, data: { blockId, status, departmentApprovedAt?, drmApprovedAt?, bdmsSubmittedAt? } }  (auto-creates with status "recommended")
POST /approvals/:blockId/advance → moves status one step: recommended → department_approved → drm_approved → bdms_submitted (final)
Use block_id values from /ai/generate-plan (e.g. "BLOCK-LNL-PUNE-01").

## 3. Pages

1. Landing page (public home, "/")
   - What the product is: AI-powered automatic maintenance block planning for Indian Railways.
   - The problem: each department (Track, Signal, OHE/TRD) requests separate track closures, often in daytime, causing repeated line shutdowns, train delays, and under-maintained corridors.
   - The solution / capabilities: AI failure-risk prediction for assets; 0–100 priority scoring; multi-department shadow blocking (one closure, several departments); timetable & freight conflict detection with alternative slots; inter-department safety sequencing (TRD power cut → track work → S&T testing → re-energize); before-vs-after KPIs.
   - Live impact numbers from GET /ai/kpis (blocks 7 → 3, block hours 8.5 → 5.0, conflicts 5 → 0, availability 91.4% → 95.8%) with the disclaimer.
   - "How it works" steps: submit request → AI evaluates traffic, weather, resources, co-located tasks → recommended window + alternatives + safety timeline → officer accepts/rejects.
   - Calls to action: "Request a Block" and "Open Dashboard".

2. About / How it works page ("/about")
   - Departments involved and what each maintains.
   - Explanation of shadow blocking, what-if simulation, priority scoring factors (criticality max 25, safety impact max 25, overdue days max 20, urgency 5, condition max 15, ML failure probability max 10), and risk levels.
   - ML model summary (ensemble weights, risk thresholds, SHAP explanations) and data sources (TMS, SMMS, TDMS, COA freight forecast, operational constraints).
   - Prototype disclaimer and limitations (heuristic optimizer, simulated corridor data).

3. Dashboard ("/dashboard")
   - AI engine status from GET /ai/health.
   - Counts of block requests by status (from GET /ai/block-requests).
   - Latest 5 block requests with requestId, section, department, window, status.
   - KPI summary from GET /ai/kpis.
   - Count of CRITICAL and HIGH risk assets (GET /risks?riskLevel=CRITICAL&limit=1 → pagination.total; same for HIGH).

4. New Block Request ("/requests/new")
   - Form for every field in POST /ai/block-requests (section, department, maintenance type, priority, from/to location, from/to km, optional asset id, date, duration, preferred start/end time, workers, equipment multi-select, notes, "allow combining with other departments" toggle, submitted by).
   - Prefill button with the LNL-PUNE demo values shown above.
   - Client-side validation matching the backend rules; show backend 400 "errors" too.
   - On success, navigate to the request's detail page.

5. Block Request Detail / Decision ("/requests/:requestId")
   - Data from GET /ai/block-requests/:requestId.
   - Recommended/selected window (date, start–end, traffic level, score, weather), AI status, current status.
   - Hours saved by shadow blocking (downtimeSavedHours) and the list of integrated departments + co-located tasks.
   - Safety sequencing timeline (interDepartmentSequencing).
   - Safety protocols, productivity & buffers, corridor starvation analysis, special traffic calendar, reasons list.
   - Asset risk (if assetRisk present).
   - Alternative options with a one-click "Use this window" (PATCH /window; also allow switching back to "RECOMMENDED").
   - Accept / Reject with name + note (PATCH /decision); disable when already accepted/rejected.
   - Audit trail (action, by, time, note).

6. Block Requests list ("/requests")
   - Table from GET /ai/block-requests with filters for status and section; row click → detail page.

7. What-If Simulator ("/what-if")
   - Inputs for corridor, date, start time, end time, department, maintenance type → POST /ai/what-if.
   - Show conflict yes/no, conflict summary, conflicting trains table, recommended alternative, recommendation text.

8. Plan Generator ("/plan")
   - Inputs: planning horizon, start date, end date, corridor (optional) → POST /ai/generate-plan.
   - Show generated blocks (time, location, departments, selected tasks with priority, affected assets, affected trains, optimization score, reason), task priorities with contributing factors, recommendations, KPIs.
   - For each block, show its approval status (GET /approvals/:blockId) and an "Advance approval" action (POST /approvals/:blockId/advance) until "bdms_submitted".

9. Priority Calculator ("/priority")
   - Inputs for criticality, overdue days, safety impact, urgency, condition score, ML probability → POST /ai/priority.
   - Show score, level, and contributing factors.

10. Asset Risk Explorer ("/risks") and Asset Risk Detail ("/risks/:assetId")
   - Paginated list from GET /risks with filters (risk level, min/max score, asset id search).
   - Detail: latest risk (GET /risks/:assetId) and explanation (GET /risks/:assetId/explanation) with top risk drivers and protective factors parsed as described above.

11. Impact / KPIs ("/impact")
   - Full before_vs_after table and kpis from GET /ai/kpis with the disclaimer.

Global: navigation to all pages; an "AI engine offline" banner when /ai/health fails; friendly empty states (e.g. no block requests yet).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f57f74d7-063f-4e31-87e6-5644975c4f4e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
