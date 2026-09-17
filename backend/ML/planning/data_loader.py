#!/usr/bin/env python3
"""
SIH Prototype Unified Data Loader

Integrates maintenance data across:
- TMS (Track Management System - Engineering)
- SMMS (Signalling Maintenance & Management System - S&T)
- TDMS (Traction Distribution Management System - TRD/OHE)
- COA (Control Office Application Freight/Goods Forecast)
- Train Timetables (Passenger Schedules)
"""

import csv
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parents[3]

SIH_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
TMS_FILE = SIH_DATA_DIR / "tms_tasks.json"
SMMS_FILE = SIH_DATA_DIR / "smms_tasks.json"
TDMS_FILE = SIH_DATA_DIR / "tdms_tasks.json"
COA_FILE = SIH_DATA_DIR / "coa_goods_forecast.json"
CORRIDOR_FILE = SIH_DATA_DIR / "corridor_availability.json"

RAW_DATA_DIR = BASE_DIR / "data" / "raw"
SCHEDULES_FILE = RAW_DATA_DIR / "schedules.jsonl"
TRAINS_FILE = RAW_DATA_DIR / "trains.csv"

# Real trained-model output (produced by ML/src/models + models/predict.py
# offline batch scoring) and the asset master, used to enrich tasks with a
# genuine ML failure-risk probability and physical condition score instead
# of the priority model falling back to a flat default.
ML_DIR = Path(__file__).resolve().parents[1]
ASSET_RISK_SCORES_FILE = ML_DIR / "outputs" / "asset_risk_scores.csv"
ASSETS_MASTER_FILE = ML_DIR / "data" / "assets_master_optimized.csv"

_asset_risk_cache: Optional[Dict[str, float]] = None
_asset_condition_cache: Optional[Dict[str, float]] = None


def load_json_file(file_path: Path) -> Dict[str, Any]:
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_asset_risk_scores() -> Dict[str, Dict[str, Any]]:
    """
    Loads the trained predictive-maintenance model's batch-scored output
    (outputs/asset_risk_scores.csv, produced from
    models/best_predictive_maintenance_model.joblib) and returns
    {asset_id: {ml_probability, risk_level, risk_score, recommended_action,
    snapshot_date}} using the most recent snapshot_date per asset. Cached
    after first read since the file is ~40k rows and doesn't change within
    a process lifetime.
    """
    global _asset_risk_cache
    if _asset_risk_cache is not None:
        return _asset_risk_cache

    scores: Dict[str, Dict[str, Any]] = {}
    latest_date: Dict[str, str] = {}

    if ASSET_RISK_SCORES_FILE.exists():
        with open(ASSET_RISK_SCORES_FILE, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                asset_id = row.get("asset_id")
                snapshot_date = row.get("snapshot_date", "")
                if not asset_id:
                    continue
                if asset_id not in latest_date or snapshot_date > latest_date[asset_id]:
                    latest_date[asset_id] = snapshot_date
                    try:
                        scores[asset_id] = {
                            "ml_probability": float(row.get("predicted_probability", 0.0)),
                            "risk_score": float(row.get("risk_score", 0.0)),
                            "risk_level": row.get("risk_level"),
                            "recommended_action": row.get("recommended_action"),
                            "snapshot_date": snapshot_date,
                        }
                    except (TypeError, ValueError):
                        pass

    _asset_risk_cache = scores
    return scores


def load_asset_conditions() -> Dict[str, float]:
    """
    Loads condition_score per asset_id from the asset master table, used to
    enrich tasks whose source system (TMS/SMMS/TDMS) doesn't already carry
    a physical condition reading.
    """
    global _asset_condition_cache
    if _asset_condition_cache is not None:
        return _asset_condition_cache

    conditions: Dict[str, float] = {}

    if ASSETS_MASTER_FILE.exists():
        with open(ASSETS_MASTER_FILE, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                asset_id = row.get("asset_id")
                if not asset_id:
                    continue
                try:
                    conditions[asset_id] = float(row.get("condition_score", 0.0))
                except (TypeError, ValueError):
                    pass

    _asset_condition_cache = conditions
    return conditions


def enrich_task_with_ml_risk(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Attaches ml_probability (trained-model failure risk) and asset_condition
    to a task in place, looked up by asset_id. Does not overwrite values the
    source system already provided. Assets without a match (e.g. prototype
    TEST-* placeholder IDs not present in the training data) are left
    unset, so priority_scoring_model.py falls back to its documented
    neutral default rather than a fabricated number.
    """
    asset_id = task.get("asset_id") or task.get("assetId")
    if not asset_id:
        return task

    risk_scores = load_asset_risk_scores()
    if task.get("ml_probability") is None and asset_id in risk_scores:
        task["ml_probability"] = risk_scores[asset_id]["ml_probability"]
        task.setdefault("ml_risk_level", risk_scores[asset_id]["risk_level"])

    conditions = load_asset_conditions()
    if task.get("asset_condition") is None and asset_id in conditions:
        task["asset_condition"] = conditions[asset_id]

    return task


def get_all_department_tasks(corridor: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Unifies pending tasks across TMS, SMMS, and TDMS, enriched with the
    trained predictive-maintenance model's failure-risk probability and
    asset condition score wherever the asset is known to the model.
    """
    tms_data = load_json_file(TMS_FILE).get("tasks", [])
    smms_data = load_json_file(SMMS_FILE).get("tasks", [])
    tdms_data = load_json_file(TDMS_FILE).get("tasks", [])

    all_tasks = tms_data + smms_data + tdms_data
    all_tasks = [enrich_task_with_ml_risk(t) for t in all_tasks]

    if corridor:
        all_tasks = [t for t in all_tasks if t.get("corridor") == corridor]

    return all_tasks


def get_goods_forecast(corridor: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves the COA freight / goods train forecast.
    """
    coa_data = load_json_file(COA_FILE).get("forecasts", [])
    if corridor:
        coa_data = [f for f in coa_data if f.get("corridor") == corridor]
    return coa_data


def get_corridor_info(corridor_id: str) -> Dict[str, Any]:
    """
    Retrieves corridor track geography, stations, and speed limits.
    """
    corridors = load_json_file(CORRIDOR_FILE).get("corridors", {})
    return corridors.get(corridor_id, {})


# ============================================================
# REAL TRAIN TIMETABLE INDEX (data/raw/schedules.jsonl, trains.csv)
#
# Replaces the old hand-typed 2-corridor timetable dict in
# what_if_simulator.py with an index built from the actual national
# schedule dataset, so what-if conflict checking works for any corridor
# defined in corridor_availability.json, not just two hardcoded ones.
# ============================================================

# Known station renames / aliases that don't literally substring-match
# between corridor_availability.json's station names and the schedule
# dataset's stop names (e.g. Rani Kamlapati was renamed from Habibganj).
_STATION_ALIASES = {
    "RANI KAMLAPATI": ["HABIBGANJ", "BHOPAL"],
    "CHINCHWAD": ["PUNE"],       # no direct entry in this dataset; fall back
    "SHIVAJINAGAR": ["PUNE"],    # to the nearest matched station on corridor
}

_TYPE_PRIORITY = {
    "Vande Bharat": "VIP", "Vande Bharat Metro": "VIP", "Vande Bharat Sleeper": "VIP",
    "Rajdhani": "VIP", "Shatabdi": "VIP", "Duronto": "VIP", "Tejas": "VIP",
    "Garib Rath": "VIP", "Amrit Bharat": "VIP",
    "Mail/Express": "HIGH", "Superfast": "HIGH", "Jan Shatabdi": "HIGH",
    "Premium Express": "HIGH", "Special": "HIGH", "Tourist": "HIGH",
    "Suburban": "COMMUTER", "MEMU": "COMMUTER", "DMU": "COMMUTER",
    "EMU": "COMMUTER", "Passenger": "COMMUTER",
}

_schedules_cache: Optional[List[Dict[str, Any]]] = None
_corridor_passage_cache: Dict[str, List[Dict[str, Any]]] = {}
_stop_name_index: Optional[Dict[str, set]] = None


def _normalize_station_name(name: str) -> str:
    name = (name or "").upper().strip()
    for suffix in [" JUNCTION", " JN.", " JN", " ROAD", "."]:
        name = name.replace(suffix, "")
    return name.strip()


def load_train_schedules() -> List[Dict[str, Any]]:
    """
    Loads and caches the full national schedule dataset
    (data/raw/schedules.jsonl — one JSON object per train, each with a
    'stops' list carrying station code, name, arrival/departure time).
    """
    global _schedules_cache
    if _schedules_cache is not None:
        return _schedules_cache

    schedules: List[Dict[str, Any]] = []
    if SCHEDULES_FILE.exists():
        with open(SCHEDULES_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    schedules.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    _schedules_cache = schedules
    return schedules


def get_corridor_station_codes(corridor_id: str) -> List[str]:
    """
    Resolves a corridor's station names (from corridor_availability.json)
    into real station codes present in the schedule dataset, by matching
    stop names across every train's stop list. Falls back through
    _STATION_ALIASES for known renames/local-only stations.
    """
    corridor_info = get_corridor_info(corridor_id)
    station_names = []
    for section in corridor_info.get("block_sections", []):
        station_names.extend(section.get("stations", []))

    if not station_names:
        return []

    wanted = [_normalize_station_name(n) for n in station_names]

    # Build a normalized-stop-name -> set(codes) index once, reused for
    # every corridor lookup (cheap relative to re-scanning per station).
    global _stop_name_index
    if _stop_name_index is None:
        index: Dict[str, set] = {}
        for train in load_train_schedules():
            for stop in train.get("stops", []):
                nm = _normalize_station_name(stop.get("name", ""))
                code = stop.get("code")
                if nm and code:
                    index.setdefault(nm, set()).add(code)
        _stop_name_index = index

    def _match_one(norm_name: str) -> set:
        if not norm_name:
            return set()
        # 1. Exact match first (highest confidence).
        exact = _stop_name_index.get(norm_name)
        if exact:
            return set(exact)
        # 2. Prefix match only (e.g. "PUNE" vs "PUNE CANTT") — deliberately
        #    NOT a bare substring check, which false-positives badly on
        #    Indian station names (e.g. "Ghorawadi" contains "Wadi", an
        #    unrelated station ~500km away).
        matched = set()
        if len(norm_name) >= 4:
            for stop_name, stop_codes in _stop_name_index.items():
                if len(stop_name) >= 4 and (
                    stop_name.startswith(norm_name) or norm_name.startswith(stop_name)
                ):
                    matched |= stop_codes
        return matched

    codes: List[str] = []
    for raw_name, norm_name in zip(station_names, wanted):
        matched = _match_one(norm_name)
        if not matched:
            for alias in _STATION_ALIASES.get(raw_name.upper(), []):
                matched |= _match_one(_normalize_station_name(alias))
        codes.extend(matched)

    return sorted(set(codes))


def get_corridor_train_passages(corridor_id: str) -> List[Dict[str, Any]]:
    """
    Returns every real scheduled train passage (arrival or departure) at
    any station belonging to the given corridor, built once from the
    national schedule dataset and cached per corridor.

    Each entry: train_number, train_name, type_label, runs_days,
    station_code, time (HH:MM), priority tier.
    """
    if corridor_id in _corridor_passage_cache:
        return _corridor_passage_cache[corridor_id]

    codes = set(get_corridor_station_codes(corridor_id))
    passages: List[Dict[str, Any]] = []

    if codes:
        for train in load_train_schedules():
            for stop in train.get("stops", []):
                if stop.get("code") not in codes:
                    continue
                passage_time = stop.get("dep") or stop.get("arr")
                if not passage_time:
                    continue
                type_label = train.get("type_label", "")
                passages.append({
                    "train_number": train.get("number"),
                    "train_name": train.get("name"),
                    "type": type_label,
                    "time": passage_time,
                    "runs_days": train.get("runs_days", "Daily"),
                    "priority": _TYPE_PRIORITY.get(type_label, "MEDIUM"),
                    "station_code": stop.get("code"),
                })

    _corridor_passage_cache[corridor_id] = passages
    return passages
