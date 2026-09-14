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

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parents[3]

SIH_DATA_DIR = BASE_DIR / "data" / "sih_prototype"
TMS_FILE = SIH_DATA_DIR / "tms_tasks.json"
SMMS_FILE = SIH_DATA_DIR / "smms_tasks.json"
TDMS_FILE = SIH_DATA_DIR / "tdms_tasks.json"
COA_FILE = SIH_DATA_DIR / "coa_goods_forecast.json"
CORRIDOR_FILE = SIH_DATA_DIR / "corridor_availability.json"

RAW_DATA_DIR = BASE_DIR / "data" / "raw"
SCHEDULES_FILE = RAW_DATA_DIR / "schedules.jsonl"
TRAINS_FILE = RAW_DATA_DIR / "trains.csv"


def load_json_file(file_path: Path) -> Dict[str, Any]:
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def get_all_department_tasks(corridor: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Unifies pending tasks across TMS, SMMS, and TDMS.
    """
    tms_data = load_json_file(TMS_FILE).get("tasks", [])
    smms_data = load_json_file(SMMS_FILE).get("tasks", [])
    tdms_data = load_json_file(TDMS_FILE).get("tasks", [])

    all_tasks = tms_data + smms_data + tdms_data

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
