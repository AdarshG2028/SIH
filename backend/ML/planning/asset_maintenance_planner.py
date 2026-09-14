#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta


BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

TASKS_FILE = BASE_DIR / "data" / "processed" / "maintenance_tasks.json"
CONSTRAINTS_FILE = BASE_DIR / "data" / "processed" / "operational_constraints.json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "asset_maintenance_options.json"


TRAFFIC_SCORE = {
    "VERY_LOW": 100,
    "LOW": 90,
    "MEDIUM": 65,
    "HIGH": 30,
    "VERY_HIGH": 10,
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def time_to_minutes(value):
    hour, minute = map(int, value.split(":"))
    return hour * 60 + minute


def minutes_to_time(minutes):
    minutes = minutes % (24 * 60)
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def get_priority(task):
    score = float(task.get("criticalityScore", 0))

    if score >= 90:
        return "CRITICAL"
    elif score >= 75:
        return "HIGH"
    elif score >= 50:
        return "MEDIUM"
    return "LOW"


def weather_score(weather):
    if not weather:
        return 0, False

    rain = float(weather.get("rain_probability", 1))
    wind = float(weather.get("wind_kmph", 999))
    visibility = float(weather.get("visibility_km", 0))

    suitable = (
        rain <= 0.30
        and wind <= 35
        and visibility >= 3
    )

    if not suitable:
        return 0, False

    score = 100

    if rain > 0.15:
        score -= 10

    if wind > 20:
        score -= 10

    if visibility < 7:
        score -= 10

    return max(score, 0), True


def traffic_windows(section):
    return section.get("traffic_windows", [])


def find_task(tasks, asset_id):
    for task in tasks:
        if task.get("assetId") == asset_id:
            return task
    return None


def find_section(constraints, section_id):
    sections = constraints.get("sections", {})
    return sections.get(section_id)


def calculate_duration(task):
    """
    Duration can later come from historical maintenance data.
    For now use task type / department based defaults.
    """

    department = task.get("department", "").lower()
    task_type = task.get("taskType", "").lower()

    if department == "signalling":
        return 2.5

    if department == "ohe":
        return 3.0

    if department == "track":
        if "defect" in task_type:
            return 2.5
        return 3.0

    return 2.5


def compute_window_traffic(windows, start_min, end_min):
    total_duration = end_min - start_min
    if total_duration <= 0:
        return 50.0, "UNKNOWN"

    overlap_scores = []
    total_covered = 0
    levels = []

    for w in windows:
        w_start = time_to_minutes(w["start"])
        w_end = time_to_minutes(w["end"])
        overlap_start = max(start_min, w_start)
        overlap_end = min(end_min, w_end)

        if overlap_end > overlap_start:
            overlap_duration = overlap_end - overlap_start
            level = w.get("traffic_level", "HIGH")
            levels.append(level)
            score = TRAFFIC_SCORE.get(level, 40)
            overlap_scores.append(score * overlap_duration)
            total_covered += overlap_duration

    if total_covered > 0:
        avg_score = sum(overlap_scores) / total_covered
    else:
        avg_score = 40.0

    unique_levels = set(levels)
    if len(unique_levels) == 1:
        final_level = list(unique_levels)[0]
    else:
        final_level = "MIXED"

    return round(avg_score, 1), final_level


def generate_candidate_windows(section, duration_hours):
    candidates = []
    windows = traffic_windows(section)
    if not windows:
        return candidates

    duration = int(duration_hours * 60)

    # 1. Single windows
    for window in windows:
        start = time_to_minutes(window["start"])
        end = time_to_minutes(window["end"])

        if end - start < duration:
            continue

        current = start
        while current + duration <= end:
            t_level = window.get("traffic_level", "UNKNOWN")
            t_score = TRAFFIC_SCORE.get(t_level, 40)
            candidates.append(
                {
                    "start": current,
                    "end": current + duration,
                    "trafficLevel": t_level,
                    "trafficScore": t_score,
                    "windowType": "SINGLE_WINDOW",
                }
            )
            current += 30

    # 2. Combined adjacent windows for broader coverage
    for i in range(len(windows)):
        start = time_to_minutes(windows[i]["start"])
        comb_end = time_to_minutes(windows[i]["end"])

        for j in range(i, len(windows)):
            cur_start = time_to_minutes(windows[j]["start"])
            cur_end = time_to_minutes(windows[j]["end"])

            if j > i and cur_start != comb_end:
                break
            comb_end = cur_end

            if comb_end - start >= duration:
                current = start
                while current + duration <= comb_end:
                    avg_score, level = compute_window_traffic(windows, current, current + duration)
                    candidates.append(
                        {
                            "start": current,
                            "end": current + duration,
                            "trafficLevel": level,
                            "trafficScore": avg_score,
                            "windowType": "COMBINED_WINDOW" if level == "MIXED" else "SINGLE_WINDOW",
                        }
                    )
                    current += 30
                break

    # Deduplicate by start and end
    unique = {}
    for c in candidates:
        key = (c["start"], c["end"])
        if key not in unique or c["trafficScore"] > unique[key]["trafficScore"]:
            unique[key] = c

    return list(unique.values())


def calculate_due_date_urgency(due_date_str, snapshot_date_str):
    if not due_date_str:
        return 70, "Standard maintenance schedule"

    try:
        due = datetime.strptime(str(due_date_str), "%Y-%m-%d").date()
        snap = datetime.strptime(str(snapshot_date_str), "%Y-%m-%d").date()
        days_remaining = (due - snap).days

        if days_remaining < 0:
            return 100, f"Overdue by {abs(days_remaining)} days (Immediate action required)"
        elif days_remaining == 0:
            return 98, "Due today (High operational urgency)"
        elif days_remaining <= 1:
            return 95, "Due within 24 hours (High operational urgency)"
        elif days_remaining <= 3:
            return 85, f"Due in {days_remaining} days"
        elif days_remaining <= 7:
            return 70, f"Due in {days_remaining} days"
        else:
            return 50, f"Due in {days_remaining} days (Flexible schedule)"
    except Exception:
        return 70, "Standard maintenance schedule"


def score_option(
    candidate,
    weather_ok,
    weather_score_value,
    team_available,
    priority,
    due_date_urgency_score,
    ml_risk_info=None,
):
    traffic_score = candidate.get("trafficScore", TRAFFIC_SCORE.get(candidate.get("trafficLevel"), 40))
    traffic_level = candidate.get("trafficLevel", "UNKNOWN")
    start_min = candidate.get("start", 0)

    if priority == "CRITICAL":
        pri_score = 100.0
    elif priority == "HIGH":
        pri_score = 90.0
    elif priority == "MEDIUM":
        pri_score = 70.0
    else:
        pri_score = 50.0

    ml_risk_score = 50.0
    if ml_risk_info and "risk_score" in ml_risk_info:
        ml_risk_score = float(ml_risk_info["risk_score"])

    # Weighted scoring model:
    # Traffic (35%), Weather (15%), Team (15%), Priority (15%), Due-Date Urgency (12%), ML Risk (8%)
    base_score = (
        traffic_score * 0.35
        + weather_score_value * 0.15
        + (100.0 if team_available else 0.0) * 0.15
        + pri_score * 0.15
        + due_date_urgency_score * 0.12
        + ml_risk_score * 0.08
    )

    # Deterministic tie-breaking for operational scheduling:
    # Bonus for early deep-night start giving maximal buffer before morning traffic shift
    tie_break = 0.0
    if start_min == 60:        # 01:00 (prime start, 30 min buffer before 04:00)
        tie_break += 0.40
    elif start_min == 90:      # 01:30 (starts right on time, exactly finishes at 04:00)
        tie_break += 0.25
    elif start_min == 30:      # 00:30 (early transition)
        tie_break += 0.15
    elif start_min == 0:       # 00:00
        tie_break += 0.05

    final_score = round(base_score + tie_break, 2)

    reasons = []
    if weather_ok:
        reasons.append("Weather conditions suitable")
    else:
        reasons.append("Weather conditions unsuitable")

    if team_available:
        reasons.append("Required maintenance team available")
    else:
        reasons.append("Required maintenance team unavailable")

    if traffic_level == "VERY_LOW":
        reasons.append("Prime minimal-traffic window (deep overnight quiet period)")
    elif traffic_level == "LOW":
        reasons.append("Low train traffic window (minimal operational impact)")
    elif traffic_level == "MIXED":
        reasons.append(f"Combined operational window (average traffic score: {traffic_score})")
    elif traffic_level == "MEDIUM":
        reasons.append("Medium traffic window (pre-morning peak)")
    else:
        reasons.append("Higher traffic window")

    if priority == "CRITICAL":
        reasons.append("Critical maintenance priority")
    elif priority == "HIGH":
        reasons.append("High maintenance priority")

    if ml_risk_info and ml_risk_info.get("risk_level") in ["HIGH", "CRITICAL"]:
        reasons.append(f"ML Failure Risk: {ml_risk_info.get('risk_score')}% ({ml_risk_info.get('risk_level')})")

    return final_score, reasons, traffic_score


def build_plan(asset_id, tasks, constraints):
    task = find_task(tasks, asset_id)

    if not task:
        raise ValueError(
            f"No maintenance task found for asset: {asset_id}"
        )

    section_id = task.get("sectionId")
    department = task.get("department")

    section = find_section(constraints, section_id)

    if not section:
        raise ValueError(
            f"No operational constraints found for section: {section_id}"
        )

    priority = get_priority(task)
    duration = calculate_duration(task)

    available_teams = section.get("available_teams", [])
    team_available = department in available_teams

    weather = section.get("weather", {})
    weather_value, weather_ok = weather_score(weather)

    snapshot_date = constraints.get(
        "snapshot_date",
        datetime.now().strftime("%Y-%m-%d"),
    )

    # Compute due-date urgency
    due_date = task.get("dueDate")
    urgency_score, urgency_reason = calculate_due_date_urgency(due_date, snapshot_date)

    # Check ML failure risk if available
    ml_risk_info = None
    try:
        from src.features.live_feature_extractor import predict_asset_failure_risk
        ml_risk_info = predict_asset_failure_risk(asset_id, snapshot_date=snapshot_date)
    except Exception:
        ml_risk_info = None

    candidates = generate_candidate_windows(
        section,
        duration,
    )

    options = []

    for index, candidate in enumerate(candidates, start=1):
        score, reasons, traffic_score = score_option(
            candidate,
            weather_ok,
            weather_value,
            team_available,
            priority,
            urgency_score,
            ml_risk_info,
        )

        reasons_with_urgency = list(reasons)
        reasons_with_urgency.append(f"Schedule: {urgency_reason}")

        options.append(
            {
                "optionId": f"OPTION_{index}",
                "startTime": minutes_to_time(candidate["start"]),
                "endTime": minutes_to_time(candidate["end"]),
                "durationHours": duration,
                "trafficLevel": candidate["trafficLevel"],
                "trafficScore": traffic_score,
                "weatherSuitable": weather_ok,
                "weatherScore": weather_value,
                "teamAvailable": team_available,
                "score": score,
                "reasons": reasons_with_urgency,
                "recommended": False,
            }
        )

    # Sort options by score descending
    options.sort(
        key=lambda x: (
            x["score"],
            x["trafficScore"],
        ),
        reverse=True,
    )

    # Ensure diverse operational alternatives (e.g. at least 30 mins apart)
    diverse_options = []
    seen_starts = set()

    for opt in options:
        start_t = opt["startTime"]
        if start_t not in seen_starts:
            seen_starts.add(start_t)
            diverse_options.append(opt)
        if len(diverse_options) == 4:
            break

    options = diverse_options

    for index, option in enumerate(options, start=1):
        option["optionId"] = f"OPTION_{index}"

    if options:
        options[0]["recommended"] = True

    recommended = options[0] if options else None

    return {
        "snapshotDate": snapshot_date,
        "planner": "Asset Maintenance Option Planner",
        "assetId": asset_id,
        "sectionId": section_id,
        "department": department,
        "priority": priority,
        "criticalityScore": task.get("criticalityScore"),
        "description": task.get("description"),
        "dueDate": due_date,
        "durationHours": duration,
        "mlRisk": {
            "predictedProbability": ml_risk_info.get("predicted_probability") if ml_risk_info else None,
            "riskScore": ml_risk_info.get("risk_score") if ml_risk_info else None,
            "riskLevel": ml_risk_info.get("risk_level") if ml_risk_info else None,
            "recommendedAction": ml_risk_info.get("recommended_action") if ml_risk_info else None,
        } if ml_risk_info else None,
        "recommendedOption": (
            recommended["optionId"]
            if recommended
            else None
        ),
        "options": options,
    }


def print_plan(plan):
    print()
    print("=" * 70)
    print("ASSET MAINTENANCE OPTIONS")
    print("=" * 70)

    print()
    print(f"Asset: {plan['assetId']}")
    print(f"Section: {plan['sectionId']}")
    print(f"Department: {plan['department']}")
    print(f"Priority: {plan['priority']}")
    print(f"Criticality: {plan['criticalityScore']}")
    print(f"Due Date: {plan['dueDate']}")

    if plan.get("mlRisk") and plan["mlRisk"].get("riskScore") is not None:
        risk = plan["mlRisk"]
        print(f"ML Failure Risk: {risk.get('riskLevel')} (Score: {risk.get('riskScore')}%, Prob: {risk.get('predictedProbability')})")
        print(f"ML Recommended Action: {risk.get('recommendedAction')}")

    print()
    print(f"Description: {plan['description']}")

    if not plan["options"]:
        print()
        print("NO FEASIBLE MAINTENANCE WINDOW")
        return

    print()
    print("RECOMMENDED:")
    recommended = next(
        x for x in plan["options"]
        if x["recommended"]
    )

    print(
        f"  {recommended['startTime']} → "
        f"{recommended['endTime']}"
    )
    print(f"  Score: {recommended['score']}")
    print(f"  Traffic: {recommended['trafficLevel']}")
    print(
        f"  Weather suitable: "
        f"{recommended['weatherSuitable']}"
    )

    print()
    print("AVAILABLE OPTIONS:")

    for option in plan["options"]:
        print()
        print(f"  {option['optionId']}")

        if option["recommended"]:
            print("    ★ RECOMMENDED")

        print(
            f"    Time: {option['startTime']} → "
            f"{option['endTime']}"
        )

        print(
            f"    Duration: "
            f"{option['durationHours']} hours"
        )

        print(
            f"    Traffic: "
            f"{option['trafficLevel']}"
        )

        print(
            f"    Traffic score: "
            f"{option['trafficScore']}"
        )

        print(
            f"    Weather suitable: "
            f"{option['weatherSuitable']}"
        )

        print(
            f"    Team available: "
            f"{option['teamAvailable']}"
        )

        print(
            f"    Score: "
            f"{option['score']}"
        )

        print("    Reasons:")

        for reason in option["reasons"]:
            print(f"      ✓ {reason}")


def main():

    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python ML/src/planning/"
            "asset_maintenance_planner.py <asset_id>"
        )
        sys.exit(1)

    asset_id = sys.argv[1]

    print(
        f"Loading tasks: {TASKS_FILE}"
    )

    print(
        f"Loading operational constraints: "
        f"{CONSTRAINTS_FILE}"
    )

    tasks_data = load_json(TASKS_FILE)
    constraints = load_json(CONSTRAINTS_FILE)

    if isinstance(tasks_data, dict):
        tasks = tasks_data.get("tasks", [])
    else:
        tasks = tasks_data

    print(f"Tasks found: {len(tasks)}")

    plan = build_plan(
        asset_id,
        tasks,
        constraints,
    )

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            plan,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print_plan(plan)

    print()
    print("Plan saved to:")
    print(OUTPUT_FILE)
    print()


if __name__ == "__main__":
    main()
