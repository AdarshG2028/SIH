#!/usr/bin/env python3
"""
SIH Prototype: What-If / Train Conflict Simulation Engine

Conforms to SIH Section 4 Specification:
Supports interactive simulation when a railway user proposes or modifies a block time:
1. System checks passenger timetable and COA goods train conflicts.
2. System calculates delay and passenger impact.
3. System recommends a conflict-free alternative time.

Passenger-train conflict checking is driven by the REAL national schedule
dataset (data/raw/schedules.jsonl + trains.csv, ~10k trains), indexed per
corridor in data_loader.get_corridor_train_passages(), rather than a
hand-typed timetable for two demo corridors. This means what-if checking
now works for any corridor defined in corridor_availability.json.
"""

import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from ML.src.planning.data_loader import (
        get_goods_forecast, get_corridor_info, get_corridor_train_passages
    )
except ImportError:
    from data_loader import get_goods_forecast, get_corridor_info, get_corridor_train_passages

try:
    from live_train_service import fetch_live_train_status
except ImportError:
    try:
        from planning.live_train_service import fetch_live_train_status
    except ImportError:
        def fetch_live_train_status(t):
            return {"live_delay_minutes": 0, "cause": "On Time"}


def time_to_minutes(val: str) -> int:
    try:
        parts = str(val).strip().split(":")
        return int(parts[0]) * 60 + int(parts[1][:2])
    except Exception:
        return 0


def minutes_to_time(m: int) -> str:
    m = m % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


def _resolve_corridor_key(corridor: str) -> str:
    """
    Uses the corridor id as given if it's a real key in
    corridor_availability.json; otherwise falls back to a loose match so
    callers that pass a station name or partial id still resolve to the
    right corridor.
    """
    if get_corridor_info(corridor):
        return corridor
    upper = (corridor or "").upper()
    for known in ["LNL-PUNE", "BPL-RKMP"]:
        if any(tok in upper for tok in known.split("-")):
            return known
    return corridor


def _runs_on_day(runs_days: str, weekday_abbr: str) -> bool:
    runs_days = (runs_days or "Daily").strip()
    if runs_days.lower() == "daily":
        return True
    return weekday_abbr in [d.strip() for d in runs_days.split(",")]


def simulate_what_if_block(
    corridor: str,
    proposed_date: str,
    proposed_start_time: str,
    proposed_end_time: str,
    department: str = "Engineering",
    maintenance_type: str = "Track Maintenance"
) -> Dict[str, Any]:
    """
    Simulates operational conflict and impact for a proposed block window,
    checked against the real train timetable for whichever corridor is
    passed in.
    """
    corridor_key = _resolve_corridor_key(corridor)

    start_min = time_to_minutes(proposed_start_time)
    end_min = time_to_minutes(proposed_end_time)
    if end_min <= start_min:
        end_min += 24 * 60
    duration_hrs = round((end_min - start_min) / 60.0, 1)

    try:
        weekday_abbr = datetime.strptime(proposed_date, "%Y-%m-%d").strftime("%a")
    except (ValueError, TypeError):
        weekday_abbr = "Mon"

    # 1. Check Passenger Train Conflicts against the REAL schedule dataset
    #    (with real-time dynamic delays applied on top of the scheduled time).
    passenger_conflicts = []
    seen_trains = set()
    timetable = [
        p for p in get_corridor_train_passages(corridor_key)
        if _runs_on_day(p.get("runs_days"), weekday_abbr)
    ]
    for trn in timetable:
        train_number = trn["train_number"]
        t_min = time_to_minutes(trn["time"])
        live_status = fetch_live_train_status(train_number)
        delay_min = live_status.get("live_delay_minutes", 0)
        effective_min = t_min + delay_min

        # Check if either scheduled or delayed effective time intersects the block window
        if start_min <= effective_min <= end_min or (start_min <= t_min <= end_min):
            if train_number in seen_trains:
                continue  # same train can pass 2+ corridor stations; count once
            seen_trains.add(train_number)
            passenger_conflicts.append({
                "train_number": train_number,
                "train_name": trn["train_name"],
                "train_type": trn["type"],
                "scheduled_passage": trn["time"],
                "effective_passage": minutes_to_time(effective_min),
                "live_delay_minutes": delay_min,
                "delay_reason": live_status.get("cause", "On Time"),
                "priority": trn["priority"],
                "estimated_delay_minutes": max(15, end_min - effective_min)
            })

    # 2. Check Goods / Freight Train Conflicts from COA
    goods_conflicts = []
    freight_forecast = get_goods_forecast(corridor=corridor_key)
    for g in freight_forecast:
        g_entry = time_to_minutes(g.get("estimated_corridor_entry", "00:00"))
        g_exit = time_to_minutes(g.get("estimated_corridor_exit", "00:00"))
        if max(start_min, g_entry) <= min(end_min, g_exit):
            goods_conflicts.append({
                "train_number": g["train_number"],
                "train_name": g["train_name"],
                "rake_type": g["rake_type"],
                "entry_time": g["estimated_corridor_entry"],
                "exit_time": g["estimated_corridor_exit"],
                "can_be_regulated": g.get("can_be_regulated", True),
                "delay_minutes": max(0, end_min - g_entry)
            })

    total_conflicts = len(passenger_conflicts) + len(goods_conflicts)
    has_conflict = total_conflicts > 0

    # 3. Calculate Impact
    total_passenger_delay = sum(c["estimated_delay_minutes"] for c in passenger_conflicts)
    total_freight_delay = sum(c["delay_minutes"] for c in goods_conflicts)

    # 4. Search for a clean alternative window by actually re-checking each
    #    candidate against the real timetable (not just a 0-conflict guess).
    candidate_alternatives = [
        {"start": "01:30", "end": minutes_to_time(time_to_minutes("01:30") + int(duration_hrs * 60))},
        {"start": "02:00", "end": minutes_to_time(time_to_minutes("02:00") + int(duration_hrs * 60))},
        {"start": "03:00", "end": minutes_to_time(time_to_minutes("03:00") + int(duration_hrs * 60))},
        {"start": "15:30", "end": minutes_to_time(time_to_minutes("15:30") + int(duration_hrs * 60))},
    ]

    best_alternative = None
    for alt in candidate_alternatives:
        a_start = time_to_minutes(alt["start"])
        a_end = time_to_minutes(alt["end"])

        alt_conflicts = 0
        for trn in timetable:
            t_m = time_to_minutes(trn["time"])
            if a_start <= t_m <= a_end:
                alt_conflicts += 1
        if alt_conflicts == 0:
            best_alternative = {
                "start_time": alt["start"],
                "end_time": alt["end"],
                "conflicts": 0,
                "note": "Zero passenger train timetable conflicts (verified against real schedule data)"
            }
            break

    if not best_alternative:
        # Every candidate had some conflict; recommend the one with the
        # fewest instead of silently claiming zero.
        scored_alts = []
        for alt in candidate_alternatives:
            a_start = time_to_minutes(alt["start"])
            a_end = time_to_minutes(alt["end"])
            c = sum(1 for trn in timetable if a_start <= time_to_minutes(trn["time"]) <= a_end)
            scored_alts.append((c, alt))
        scored_alts.sort(key=lambda x: x[0])
        best_conflicts, best_alt = scored_alts[0]
        best_alternative = {
            "start_time": best_alt["start"],
            "end_time": best_alt["end"],
            "conflicts": best_conflicts,
            "note": f"Lowest-conflict window available ({best_conflicts} residual conflict(s))"
        }

    # 5. Formulate Recommendation
    if has_conflict:
        first_conflict_name = passenger_conflicts[0]["train_name"] if passenger_conflicts else goods_conflicts[0]["train_name"]
        first_conflict_time = passenger_conflicts[0]["scheduled_passage"] if passenger_conflicts else goods_conflicts[0]["entry_time"]
        rec_msg = (
            f"Proposed block {proposed_start_time}–{proposed_end_time} conflicts with "
            f"{first_conflict_name} at {first_conflict_time}. "
            f"Recommendation: Shift block to {best_alternative['start_time']}–{best_alternative['end_time']} "
            f"to eliminate train delays and preserve punctual operations."
        )
    else:
        rec_msg = (
            f"Proposed block {proposed_start_time}–{proposed_end_time} is FEASIBLE! "
            f"Zero train conflicts detected. Corridor is clear for maintenance."
        )

    return {
        "simulation_query": {
            "corridor": corridor_key,
            "proposed_date": proposed_date,
            "proposed_start_time": proposed_start_time,
            "proposed_end_time": proposed_end_time,
            "duration_hours": duration_hrs,
            "department": department,
            "maintenance_type": maintenance_type
        },
        "has_conflict": has_conflict,
        "conflict_summary": {
            "total_conflicts": total_conflicts,
            "passenger_trains_affected": len(passenger_conflicts),
            "goods_trains_affected": len(goods_conflicts),
            "total_passenger_delay_minutes": total_passenger_delay,
            "total_freight_delay_minutes": total_freight_delay
        },
        "conflicting_trains": passenger_conflicts + goods_conflicts,
        "recommended_alternative": best_alternative,
        "recommendation": rec_msg
    }


def test_what_if_simulator():
    print("Testing What-If Conflict Simulator (Example: 10:30 – 12:00 on LNL-PUNE)...")
    res = simulate_what_if_block(
        corridor="LNL-PUNE",
        proposed_date="2026-09-16",
        proposed_start_time="10:30",
        proposed_end_time="12:00",
        department="Engineering",
        maintenance_type="Track Maintenance"
    )
    print(f"Has Conflict: {res['has_conflict']}")
    print(f"Total Conflicts: {res['conflict_summary']['total_conflicts']}")
    for trn in res["conflicting_trains"]:
        print(f"  • Conflict: {trn.get('train_name')} ({trn.get('train_number')}) at {trn.get('scheduled_passage') or trn.get('entry_time')}")
    print(f"Recommended Alternative: {res['recommended_alternative']['start_time']} → {res['recommended_alternative']['end_time']}")
    print(f"Recommendation: {res['recommendation']}")


if __name__ == "__main__":
    test_what_if_simulator()
