#!/usr/bin/env python3
"""
Request Planner — plans a single user's maintenance request.

This is what runs when an officer fills in the block request form. It answers
one question: given this much work, starting around this date, on this stretch
of track, which windows can we actually offer?

It differs from block_planner.generate_sih_optimized_plan, which plans the
whole corridor backlog. Here the backlog is one request, and the output is a
short list of options for a human to choose between.

Three things make the answer real rather than a guess:

  1. Windows are cut around trains using their EFFECTIVE passage time, so a
     late rake removes the slot it is actually occupying, not the one the
     timetable says it should be in.
  2. Work that can share an existing possession is offered that same window,
     which is how two departments end up in one block without either of them
     asking for it.
  3. The asset's failure probability comes from the trained ensemble, so
     urgency is the model's opinion, not a dropdown.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from data_loader import (
        get_all_department_tasks,
        get_corridor_info,
        get_goods_forecast,
        load_asset_risk_scores,
    )
    from what_if_simulator import simulate_what_if_block
except ImportError:  # pragma: no cover - import shim for package-style imports
    from .data_loader import (
        get_all_department_tasks,
        get_corridor_info,
        get_goods_forecast,
        load_asset_risk_scores,
    )
    from .what_if_simulator import simulate_what_if_block


MAX_DEPARTMENTS_PER_BLOCK = 3
TRAIN_BUFFER_MINUTES = 20
SHORTEST_USABLE_MINUTES = 90
MIN_SESSION_HOURS = 2.0
MAX_OPTIONS = 3


# ----------------------------------------------------------------- time utils

def to_minutes(value: str) -> int:
    hours, minutes = str(value).split(":")[:2]
    return int(hours) * 60 + int(minutes)


def to_clock(minutes: int) -> str:
    wrapped = minutes % (24 * 60)
    return f"{wrapped // 60:02d}:{wrapped % 60:02d}"


def to_12h(value: str) -> str:
    minutes = to_minutes(value)
    hour24, minute = divmod(minutes % (24 * 60), 60)
    suffix = "PM" if hour24 >= 12 else "AM"
    hour12 = hour24 % 12 or 12
    return f"{hour12:02d}:{minute:02d} {suffix}"


def add_days(date_str: str, days: int) -> str:
    base = datetime.strptime(date_str, "%Y-%m-%d").date()
    return (base + timedelta(days=days)).isoformat()


def pretty_date(date_str: str) -> str:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").strftime("%d %b")
    except ValueError:
        return date_str


# ------------------------------------------------------------ window building

def _quiet_window(corridor: str) -> tuple:
    """The corridor's own quiet hours, falling back to a conservative night."""
    info = get_corridor_info(corridor) or {}
    windows = (info.get("traffic_profile") or {}).get("quiet_corridor_hours") or []

    if windows:
        try:
            start, end = [part.strip() for part in windows[0].split("-")]
            span = (to_minutes(end) - to_minutes(start)) / 60.0
            if span > 0:
                return start, end, span
        except (ValueError, AttributeError, IndexError):
            pass

    return "01:00", "04:30", 3.5


def _blocking_intervals(corridor: str, date: str) -> List[Dict[str, Any]]:
    """
    Times the corridor is occupied, from the COA goods forecast.

    Freight is the traffic that actually runs through the quiet hours, so it is
    the traffic that decides whether a night window is usable.
    """
    intervals = []

    for path in get_goods_forecast(corridor) or []:
        entry = path.get("estimated_corridor_entry")
        exit_ = path.get("estimated_corridor_exit")
        if not entry or not exit_:
            continue

        try:
            entry_min = to_minutes(entry)
            exit_min = to_minutes(exit_)
        except (ValueError, AttributeError):
            continue

        # A rake occupies the corridor for its whole transit, not a moment, so
        # the blocked span runs entry to exit rather than a point either side.
        if exit_min < entry_min:
            exit_min += 24 * 60

        delay = int(path.get("delay_minutes") or 0)

        intervals.append({
            "from": entry_min + delay - TRAIN_BUFFER_MINUTES,
            "to": exit_min + delay + TRAIN_BUFFER_MINUTES,
            "train_number": path.get("train_number") or "GOODS",
            "train_name": path.get("train_name") or "Goods rake",
            "scheduled": f"{to_12h(to_clock(entry_min))}–{to_12h(to_clock(exit_min))}",
            "effective": f"{to_12h(to_clock(entry_min + delay))}–{to_12h(to_clock(exit_min + delay))}",
            "delay_minutes": delay,
            "can_be_regulated": bool(path.get("can_be_regulated")),
        })

    return intervals


def _free_segments(corridor: str, date: str) -> List[Dict[str, Any]]:
    """Quiet-hour spans with every known train movement carved out of them."""
    start, end, span_hours = _quiet_window(corridor)
    start_min, end_min = to_minutes(start), to_minutes(end)

    # The nominal quiet window is a guideline, not a fence. On a real timetable
    # the genuinely quietest slot often sits a couple of hours before it opens,
    # so the search has to be allowed to look there.
    spans = [
        {"from": start_min, "to": end_min, "source": "Core quiet window"},
        {"from": start_min - 150, "to": end_min, "source": "Quiet window opened early"},
        {"from": start_min, "to": end_min + 90, "source": "Quiet window extended into the shoulder"},
    ]

    blocking = _blocking_intervals(corridor, date)
    out: List[Dict[str, Any]] = []
    seen = set()

    for span in spans:
        segments = [{"from": span["from"], "to": span["to"], "cut_by": []}]

        for block in blocking:
            nxt = []
            for seg in segments:
                overlaps = block["from"] < seg["to"] and block["to"] > seg["from"]
                if not overlaps:
                    nxt.append(seg)
                    continue
                if block["from"] - seg["from"] >= SHORTEST_USABLE_MINUTES:
                    nxt.append({
                        "from": seg["from"],
                        "to": block["from"],
                        "cut_by": seg["cut_by"] + [block],
                    })
                if seg["to"] - block["to"] >= SHORTEST_USABLE_MINUTES:
                    nxt.append({
                        "from": block["to"],
                        "to": seg["to"],
                        "cut_by": seg["cut_by"] + [block],
                    })
            segments = nxt

        for seg in segments:
            hours = round((seg["to"] - seg["from"]) / 60.0, 2)
            if hours <= 0:
                continue

            key = (seg["from"], seg["to"])
            if key in seen:
                continue
            seen.add(key)

            late = next((c for c in seg["cut_by"] if c["delay_minutes"] > 0), None)
            any_cut = seg["cut_by"][0] if seg["cut_by"] else None

            if late:
                note = (
                    f"Trimmed around {late['train_name']} (#{late['train_number']}) "
                    f"running +{late['delay_minutes']}m — now passing {late['effective']}, "
                    f"not {late['scheduled']}"
                )
            elif any_cut:
                note = (
                    f"Trimmed around {any_cut['train_name']} "
                    f"(#{any_cut['train_number']}) occupying {any_cut['effective']}"
                )
            else:
                note = f"{span['source']} — no train movements in this span"

            out.append({
                "start_time": to_clock(seg["from"]),
                "end_time": to_clock(seg["to"]),
                "hours": hours,
                "traffic_note": note,
            })

    out.sort(key=lambda w: w["hours"], reverse=True)
    return out


def _placements(segments: List[Dict[str, Any]], duration: float) -> List[Dict[str, Any]]:
    """
    Distinct start times for a job of this length inside the clear time.

    Trimming often leaves one usable segment, which would mean offering the
    officer a single take-it-or-leave-it window. A 3h segment can hold a 2h job
    at several different start times, so the choice is real: earliest start,
    latest start, and the midpoint between them.
    """
    out: List[Dict[str, Any]] = []
    seen = set()

    for seg in segments:
        slack = int((seg["hours"] - duration) * 60)
        if slack < 0:
            continue

        # Step through the segment rather than sampling three points. On a real
        # corridor the difference between a 15-minute-earlier start can be
        # several trains, so the candidates have to be dense enough to find it.
        offsets = [0] if slack < 15 else list(range(0, slack + 1, 15))

        for offset in offsets:
            start_min = to_minutes(seg["start_time"]) + offset
            key = start_min
            if key in seen:
                continue
            seen.add(key)

            out.append({
                "start_time": to_clock(start_min),
                "end_time": to_clock(start_min + int(duration * 60)),
                "hours": seg["hours"],
                "traffic_note": seg["traffic_note"],
            })

    return out


def _rank_conflicts(sim: Dict[str, Any]) -> tuple:
    """
    How bad a window is. Every window on a busy corridor has some traffic, so
    the useful question is how many trains and whether they can be held in a
    loop. A rake that cannot be regulated has to be diverted, which is a far
    bigger operational cost than one that can wait.
    """
    trains = sim.get("conflicting_trains", []) or []
    hard = sum(1 for t in trains if not t.get("can_be_regulated", False))
    return (hard, len(trains))


def _pick_best(corridor: str, date: str, department: str,
               placements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Simulates every candidate and returns the least-disruptive few."""
    scored = []

    for place in placements:
        sim = simulate_what_if_block(
            corridor=corridor,
            proposed_date=date,
            proposed_start_time=place["start_time"],
            proposed_end_time=place["end_time"],
            department=department,
        )
        scored.append((_rank_conflicts(sim), place))

    scored.sort(key=lambda item: item[0])

    # Keep the best, but spread them out — three windows fifteen minutes apart
    # is not a choice. Anything an hour clear of an already-picked option counts
    # as genuinely different.
    picked: List[Dict[str, Any]] = []
    for _, place in scored:
        start = to_minutes(place["start_time"])
        if all(abs(start - to_minutes(p["start_time"])) >= 60 for p in picked):
            picked.append(place)
        if len(picked) >= MAX_OPTIONS:
            break

    return picked or [p for _, p in scored[:MAX_OPTIONS]]


# ------------------------------------------------------------ block occupancy

def _existing_blocks(corridor: str) -> List[Dict[str, Any]]:
    """
    Possessions already committed on this corridor, derived from the pending
    backlog. Compatible work joins one of these instead of opening a second
    closure.
    """
    blocks = []

    for task in get_all_department_tasks(corridor=corridor):
        window = task.get("scheduled_window") or {}
        if not window.get("date"):
            continue
        blocks.append({
            "date": window["date"],
            "start_time": window.get("start_time", "01:00"),
            "corridor": task.get("corridor"),
            "from_km": float(task.get("from_km") or 0.0),
            "to_km": float(task.get("to_km") or 0.0),
            "departments": [task.get("department", "Engineering")],
        })

    return blocks


def _slot_state(
    existing: List[Dict[str, Any]],
    date: str,
    start_time: str,
    corridor: str,
    from_km: float,
    to_km: float,
    department: str,
) -> str:
    """free | share | taken — see the module docstring for why share exists."""
    block = next(
        (b for b in existing if b["date"] == date and b["start_time"] == start_time),
        None,
    )
    if not block:
        return "free"

    same_corridor = block.get("corridor") == corridor
    colocated = block["from_km"] <= to_km and block["to_km"] >= from_km
    new_department = department not in block["departments"]
    has_room = len(block["departments"]) < MAX_DEPARTMENTS_PER_BLOCK

    if same_corridor and colocated and new_department and has_room:
        return "share"
    return "taken"


def _next_usable(
    existing: List[Dict[str, Any]],
    from_date: str,
    start_time: str,
    corridor: str,
    from_km: float,
    to_km: float,
    department: str,
) -> Dict[str, Any]:
    date = from_date
    for _ in range(120):
        state = _slot_state(existing, date, start_time, corridor, from_km, to_km, department)
        if state != "taken":
            return {"date": date, "shared": state == "share"}
        date = add_days(date, 1)
    return {"date": date, "shared": False}


# -------------------------------------------------------------------- planner

# An unbroken possession longer than this is not something a corridor can
# absorb — beyond it the work is split however critical it is, because the
# alternative is closing the line for most of a day.
MAX_CONTINUOUS_HOURS = 10.0


def _must_run_continuous(priority: str, ml_probability: Optional[float], hours: float) -> bool:
    """
    Work that cannot safely be left part-finished between nights.

    Splitting a critical job across several nights leaves the asset part-worked
    each morning, which can be worse than delaying trains once. But this only
    holds for jobs short enough to actually finish in one possession — a 12-hour
    unbroken block closes the corridor through the morning peak, so past
    MAX_CONTINUOUS_HOURS the work is split regardless and the risk is carried by
    sequencing instead.

    The model can trigger this on its own, but only at high confidence. An
    earlier threshold of 0.60 pulled ordinary medium-priority jobs into
    continuous possessions, which is not what the rule is for.
    """
    if hours <= 8 or hours > MAX_CONTINUOUS_HOURS:
        return False
    if str(priority).upper() == "CRITICAL":
        return True
    return ml_probability is not None and ml_probability >= 0.75


def plan_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Plans one user request and returns the windows that can be offered."""
    corridor = payload.get("corridor") or payload.get("sectionId") or "LNL-PUNE"
    duration = float(payload.get("durationHours") or payload.get("duration_hours") or 2.0)
    start_date = payload.get("startDate") or payload.get("start_date") or datetime.today().date().isoformat()
    department = payload.get("department") or "Engineering"
    priority = payload.get("priority") or "MEDIUM"
    from_km = float(payload.get("fromKm") or payload.get("from_km") or 0.0)
    to_km = float(payload.get("toKm") or payload.get("to_km") or 0.0)
    asset_id = payload.get("assetId") or payload.get("asset_id")
    request_ref = payload.get("requestRef") or f"REQ-{int(datetime.now().timestamp())}"

    # The model's view of this asset, if it has one.
    risk = load_asset_risk_scores().get(asset_id or "", {})
    ml_probability = risk.get("ml_probability")

    windows = _free_segments(corridor, start_date)
    if not windows:
        windows = [{
            "start_time": "01:00",
            "end_time": "04:30",
            "hours": 3.5,
            "traffic_note": "Default night window — no corridor profile available",
        }]

    existing = _existing_blocks(corridor)
    widest = max(w["hours"] for w in windows)
    options: List[Dict[str, Any]] = []

    def build_option(index: int, window: Dict[str, Any], cadence: str,
                     session_hours: float, count: int, stride: int) -> Dict[str, Any]:
        sessions = []
        claimed = list(existing)
        cursor = start_date
        shared = False

        for i in range(count):
            slot = _next_usable(
                claimed, cursor, window["start_time"], corridor, from_km, to_km, department
            )
            if slot["shared"]:
                shared = True

            start_min = to_minutes(window["start_time"])
            end_time = to_clock(start_min + int(session_hours * 60))

            sessions.append({
                "block_id": f"{request_ref}-B{i + 1:02d}",
                "sequence": i + 1,
                "date": slot["date"],
                "start_time": window["start_time"],
                "end_time": end_time,
                "start_time_12h": to_12h(window["start_time"]),
                "end_time_12h": to_12h(end_time),
                "hours": session_hours,
            })

            claimed.append({
                "date": slot["date"],
                "start_time": window["start_time"],
                "corridor": corridor,
                "from_km": from_km,
                "to_km": to_km,
                "departments": [department],
            })
            cursor = add_days(slot["date"], stride)

        first, last = sessions[0], sessions[-1]

        # Verify the chosen window against the passenger timetable as well.
        sim = simulate_what_if_block(
            corridor=corridor,
            proposed_date=first["date"],
            proposed_start_time=first["start_time"],
            proposed_end_time=first["end_time"],
            department=department,
        )
        conflicts = sim.get("conflicting_trains", [])

        if cadence == "single":
            note = (
                "Fits in one block on your preferred date"
                if first["date"] == start_date
                else f"Nearest usable night is {pretty_date(first['date'])} — your preferred date is fully held"
            )
        elif cadence == "continuous":
            note = (
                f"One unbroken {duration}h possession. Too critical to split, so trains "
                "crossing this span will be regulated."
            )
        elif cadence == "weekly":
            note = (
                f"{count} nights of {session_hours}h, running "
                f"{pretty_date(first['date'])} to {pretty_date(last['date'])}"
            )
        else:
            note = (
                f"{count} sessions of {session_hours}h spread over "
                f"{pretty_date(first['date'])} to {pretty_date(last['date'])}"
            )

        return {
            "option_id": f"OPT-{index + 1}",
            "cadence": cadence,
            "window_label": f"{to_12h(first['start_time'])} – {to_12h(first['end_time'])}",
            "start_time": first["start_time"],
            "end_time": first["end_time"],
            "session_hours": session_hours,
            "total_hours": duration,
            "sessions": sessions,
            "note": note,
            "traffic_note": window["traffic_note"],
            "shares_existing_block": shared,
            "forces_delay": cadence == "continuous",
            "over_capacity": count > 30,
            "affected_trains": conflicts,
            "optimization_score": round(max(0.0, 100.0 - len(conflicts) * 15.0), 1),
        }

    # Case 1 — fits one night.
    if duration <= widest:
        usable = _pick_best(corridor, start_date, department, _placements(windows, duration))
        options = [build_option(i, w, "single", duration, 1, 1) for i, w in enumerate(usable)]
        rationale = f"{duration}h of work fits inside one night window, so this stays a single block."
        cadence = "single"

    # Case 2 — too big for one night and too risky to interrupt.
    elif _must_run_continuous(priority, ml_probability, duration):
        options = [
            build_option(i, w, "continuous", duration, 1, 1)
            for i, w in enumerate(windows[:MAX_OPTIONS])
        ]
        reason = (
            f"the model puts this asset's failure probability at {ml_probability * 100:.1f}%"
            if ml_probability is not None and str(priority).upper() != "CRITICAL"
            else "this asset is critical"
        )
        rationale = (
            f"The work cannot be left part-finished between nights because {reason}. "
            "It runs unbroken and trains absorb the delay."
        )
        cadence = "continuous"

    # Case 3 — split across nights.
    else:
        for i, window in enumerate(windows[:MAX_OPTIONS]):
            session_hours = max(MIN_SESSION_HOURS, min(window["hours"], duration))
            count = int(-(-duration // session_hours))  # ceil
            weekly = count <= 7
            stride = 1 if weekly else max(1, min(3, 30 // max(1, count)))
            options.append(
                build_option(i, window, "weekly" if weekly else "monthly",
                             session_hours, count, stride)
            )

        nights = len(options[0]["sessions"]) if options else 1
        cadence = options[0]["cadence"] if options else "weekly"

        if options and options[0]["over_capacity"]:
            rationale = (
                f"{duration}h needs {nights} night sessions, more than a month of windows on "
                "this corridor. Raise the hours per night or split the km stretch into "
                "separate requests."
            )
        elif cadence == "weekly":
            rationale = (
                f"{duration}h will not fit in one night, so it is split across {nights} "
                "consecutive nights in the same window. You choose the window; the AI lays "
                "out the nights."
            )
        else:
            rationale = (
                f"{duration}h needs {nights} sessions across the month. You choose the "
                "window; the AI lays out the dates."
            )

    return {
        "request_ref": request_ref,
        "corridor": corridor,
        "department": department,
        "duration_hours": duration,
        "cadence": cadence,
        "rationale": rationale,
        "options": options,
        "ml_probability": ml_probability,
        "ml_risk_level": risk.get("risk_level"),
        "planned_by": "python_request_planner",
    }


if __name__ == "__main__":
    import json

    demo = plan_request({
        "corridor": "LNL-PUNE",
        "durationHours": 2,
        "startDate": "2026-09-20",
        "department": "Engineering",
        "priority": "MEDIUM",
        "fromKm": 45,
        "toKm": 52,
        "assetId": "AST019466",
    })
    print(json.dumps(demo, indent=2)[:2000])
