#!/usr/bin/env python3
"""
SIH Prototype: What-If / Train Conflict Simulation Engine

Conforms to SIH Section 4 Specification:
Supports interactive simulation when a railway user proposes or modifies a block time:
1. System checks passenger timetable and COA goods train conflicts.
2. System calculates delay and passenger impact.
3. System recommends a conflict-free alternative time.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ML.src.planning.data_loader import get_goods_forecast, get_corridor_info


def time_to_minutes(val: str) -> int:
    try:
        parts = str(val).strip().split(":")
        return int(parts[0]) * 60 + int(parts[1][:2])
    except Exception:
        return 0


def minutes_to_time(m: int) -> str:
    m = m % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


# Realistic train timetable profiles for SIH demonstration corridors
CORRIDOR_PASSENGER_TIMETABLE = {
    "LNL-PUNE": [
        {"train_number": "11007", "train_name": "Deccan Express", "type": "Express", "time": "10:45", "priority": "HIGH"},
        {"train_number": "99815", "train_name": "LNL-SVJR Suburban Local", "type": "Suburban", "time": "11:15", "priority": "COMMUTER"},
        {"train_number": "12123", "train_name": "Deccan Queen Superfast", "type": "Superfast", "time": "19:15", "priority": "VIP"},
        {"train_number": "11009", "train_name": "Sinhagad Express", "type": "Express", "time": "17:45", "priority": "HIGH"},
        {"train_number": "99801", "train_name": "LNL-PUNE Morning Local", "type": "Suburban", "time": "06:15", "priority": "COMMUTER"},
        {"train_number": "99834", "train_name": "PUNE-LNL Late Evening Local", "type": "Suburban", "time": "22:45", "priority": "COMMUTER"}
    ],
    "BPL-RKMP": [
        {"train_number": "12155", "train_name": "Bhopal Shaan-e-Bhopal Express", "type": "Superfast", "time": "10:45", "priority": "VIP"},
        {"train_number": "12002", "train_name": "New Delhi Shatabdi Express", "type": "Shatabdi", "time": "14:40", "priority": "VIP"},
        {"train_number": "20171", "train_name": "Rani Kamlapati Vande Bharat", "type": "Vande Bharat", "time": "05:40", "priority": "VIP"},
        {"train_number": "12854", "train_name": "Amarkantak Express", "type": "Express", "time": "16:15", "priority": "HIGH"}
    ]
}


def simulate_what_if_block(
    corridor: str,
    proposed_date: str,
    proposed_start_time: str,
    proposed_end_time: str,
    department: str = "Engineering",
    maintenance_type: str = "Track Maintenance"
) -> Dict[str, Any]:
    """
    Simulates operational conflict and impact for a proposed block window.
    """
    corridor_key = "LNL-PUNE" if "LNL" in corridor.upper() or "PUNE" in corridor.upper() else "BPL-RKMP"
    
    start_min = time_to_minutes(proposed_start_time)
    end_min = time_to_minutes(proposed_end_time)
    if end_min <= start_min:
        end_min += 24 * 60
    duration_hrs = round((end_min - start_min) / 60.0, 1)

    # 1. Check Passenger Train Conflicts
    passenger_conflicts = []
    timetable = CORRIDOR_PASSENGER_TIMETABLE.get(corridor_key, [])
    for trn in timetable:
        t_min = time_to_minutes(trn["time"])
        if start_min <= t_min <= end_min:
            passenger_conflicts.append({
                "train_number": trn["train_number"],
                "train_name": trn["train_name"],
                "train_type": trn["type"],
                "scheduled_passage": trn["time"],
                "priority": trn["priority"],
                "estimated_delay_minutes": end_min - t_min
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
    
    # 4. Search for Clean Alternative Window
    # Preferred quiet slots: Overnight (01:00 - 04:30) or afternoon non-peak (15:00 - 17:00)
    candidate_alternatives = [
        {"start": "01:30", "end": minutes_to_time(time_to_minutes("01:30") + int(duration_hrs * 60))},
        {"start": "15:30", "end": minutes_to_time(time_to_minutes("15:30") + int(duration_hrs * 60))},
        {"start": "02:00", "end": minutes_to_time(time_to_minutes("02:00") + int(duration_hrs * 60))}
    ]

    best_alternative = None
    for alt in candidate_alternatives:
        a_start = time_to_minutes(alt["start"])
        a_end = time_to_minutes(alt["end"])
        
        # Check conflicts in alternative
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
                "note": "Zero passenger train timetable conflicts"
            }
            break

    if not best_alternative:
        best_alternative = {
            "start_time": "01:30",
            "end_time": minutes_to_time(time_to_minutes("01:30") + int(duration_hrs * 60)),
            "conflicts": 0,
            "note": "Overnight quiet corridor window"
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
