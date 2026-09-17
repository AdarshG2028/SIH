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
from functools import lru_cache
from pathlib import Path
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parents[3]

SIH_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
TMS_FILE = SIH_DATA_DIR / "tms_tasks.json"
SMMS_FILE = SIH_DATA_DIR / "smms_tasks.json"
TDMS_FILE = SIH_DATA_DIR / "tdms_tasks.json"
COA_FILE = SIH_DATA_DIR / "coa_goods_forecast.json"
CORRIDOR_FILE = SIH_DATA_DIR / "corridor_availability.json"

ML_ROOT = Path(__file__).resolve().parents[1]
RISK_SCORES_FILE = ML_ROOT / "outputs" / "asset_risk_scores.csv"
ASSETS_MASTER_FILE = SIH_DATA_DIR / "assets_master_optimized.csv"

RAW_DATA_DIR = ML_ROOT / "data" / "raw"
SCHEDULES_FILE = RAW_DATA_DIR / "schedules.jsonl"
TRAINS_FILE = RAW_DATA_DIR / "trains.csv"


def load_json_file(file_path: Path) -> Dict[str, Any]:
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


@lru_cache(maxsize=1)
def load_asset_risk_scores() -> Dict[str, Dict[str, Any]]:
    """
    Failure probabilities produced by the trained ensemble, keyed by asset.

    This is the output of the model in models/ after batch scoring. Without it
    the priority formula has no AI input at all and every task falls back to a
    flat default, which makes "AI-driven prioritisation" untrue.
    """
    scores: Dict[str, Dict[str, Any]] = {}

    if not RISK_SCORES_FILE.exists():
        return scores

    with open(RISK_SCORES_FILE, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            asset_id = (row.get("asset_id") or "").strip()
            if not asset_id:
                continue
            try:
                scores[asset_id] = {
                    "ml_probability": float(row["risk_probability"]),
                    "risk_level": row.get("risk_level"),
                    "risk_score": float(row.get("risk_score") or 0.0),
                    "recommended_action": row.get("recommended_action"),
                }
            except (KeyError, TypeError, ValueError):
                continue

    return scores


@lru_cache(maxsize=1)
def load_asset_conditions() -> Dict[str, Dict[str, Any]]:
    """Condition score, age and traffic load per asset, from the master sheet."""
    conditions: Dict[str, Dict[str, Any]] = {}

    if not ASSETS_MASTER_FILE.exists():
        return conditions

    with open(ASSETS_MASTER_FILE, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            asset_id = (row.get("asset_id") or "").strip()
            if not asset_id:
                continue

            def num(key):
                try:
                    return float(row.get(key) or 0.0)
                except (TypeError, ValueError):
                    return None

            conditions[asset_id] = {
                "asset_condition": num("condition_score"),
                "asset_age_years": num("asset_age_years"),
                "cumulative_traffic_passages": num("cumulative_traffic_passages"),
                "asset_type": row.get("asset_type"),
                "station_code": row.get("station_code"),
                "last_maintenance_date": row.get("last_maintenance_date"),
            }

    return conditions


def enrich_task_with_ml(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Attaches the model's failure probability and the asset's real condition to
    a task, so the priority score reflects the model rather than a default.

    Tasks whose asset is absent from the scored set are left untouched and the
    priority model applies its neutral fallback. That is deliberate: inventing
    a probability for an unseen asset would be worse than admitting we have none.
    """
    asset_id = task.get("asset_id") or task.get("assetId")
    if not asset_id:
        return task

    enriched = dict(task)

    risk = load_asset_risk_scores().get(asset_id)
    if risk:
        enriched["ml_probability"] = risk["ml_probability"]
        enriched["ml_risk_level"] = risk["risk_level"]
        enriched["ml_risk_score"] = risk["risk_score"]
        enriched["ml_recommended_action"] = risk["recommended_action"]
        enriched["ml_source"] = "trained_ensemble"
    else:
        enriched["ml_source"] = "unscored_asset"

    condition = load_asset_conditions().get(asset_id)
    if condition:
        for key, value in condition.items():
            if value is not None and key not in enriched:
                enriched[key] = value

    return enriched


def get_all_department_tasks(
    corridor: Optional[str] = None,
    with_ml: bool = True,
) -> List[Dict[str, Any]]:
    """
    Unifies pending tasks across TMS, SMMS, and TDMS, with the trained model's
    risk score attached to each task that has a known asset.
    """
    tms_data = load_json_file(TMS_FILE).get("tasks", [])
    smms_data = load_json_file(SMMS_FILE).get("tasks", [])
    tdms_data = load_json_file(TDMS_FILE).get("tasks", [])

    all_tasks = tms_data + smms_data + tdms_data

    if corridor:
        all_tasks = [t for t in all_tasks if t.get("corridor") == corridor]

    if with_ml:
        all_tasks = [enrich_task_with_ml(t) for t in all_tasks]

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
