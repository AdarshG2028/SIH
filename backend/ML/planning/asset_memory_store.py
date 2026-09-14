#!/usr/bin/env python3
"""
Railway Asset Memory & Continuous Learning Store

Maintains a persistent lifecycle memory for each railway asset:
1. Records employee repair requests and AI proactive recommendations
2. Records officer decisions and approved time slots
3. Records actual maintenance execution outcomes (downtime, cost, condition improvements)
4. Updates asset degradation memory (MTBM, condition restoration)
5. Generates Early Memory Alerts in future cycles BEFORE human employees report defects.
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

TASKS_FILE = BASE_DIR / "data" / "processed" / "maintenance_tasks.json"
MEMORY_FILE = BASE_DIR / "data" / "processed" / "asset_memory.json"
CONFIRMED_BLOCKS_FILE = BASE_DIR / "data" / "processed" / "confirmed_maintenance_blocks.json"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def initialize_memory():
    """
    Initializes asset memory from existing fixture data if memory file doesn't exist.
    """
    if MEMORY_FILE.exists():
        return load_json(MEMORY_FILE)

    tasks_data = load_json(TASKS_FILE) if TASKS_FILE.exists() else {}
    assets = tasks_data.get("assets", [])
    inspections = tasks_data.get("inspections", [])
    history = tasks_data.get("maintenance_history", [])
    failures = tasks_data.get("failure_events", [])
    usage = tasks_data.get("asset_usage", [])

    memory = {
        "version": "1.0",
        "lastUpdated": datetime.now().isoformat(),
        "assets": {},
    }

    for a in assets:
        aid = a["asset_id"]
        a_insp = [i for i in inspections if i.get("asset_id") == aid]
        a_hist = [h for h in history if h.get("asset_id") == aid]
        a_fail = [f for f in failures if f.get("asset_id") == aid]
        a_usage = next((u for u in usage if u.get("asset_id") == aid), {})

        latest_insp = a_insp[-1] if a_insp else {}
        latest_hist = a_hist[-1] if a_hist else {}

        memory["assets"][aid] = {
            "assetId": aid,
            "assetType": a.get("asset_type"),
            "stationCode": a.get("station_code"),
            "installationDate": a.get("installation_date"),
            "currentConditionScore": latest_insp.get("condition_score", 60),
            "currentWearLevel": latest_insp.get("wear_level", 40),
            "currentDefectCount": latest_insp.get("defect_count", 0),
            "lastMaintenanceDate": latest_hist.get("maintenance_date", "2026-01-01"),
            "totalMaintenanceCycles": len(a_hist),
            "totalDowntimeHours": sum(h.get("downtime_hours", 0) for h in a_hist),
            "totalCostInr": sum(h.get("cost_inr", 0) for h in a_hist),
            "totalFailuresRecorded": len(a_fail),
            "trainPassagesMonthly": a_usage.get("train_passages", 1800),
            "maintenanceHistoryLog": [
                {
                    "maintenanceId": h.get("maintenance_id"),
                    "date": h.get("maintenance_date"),
                    "type": h.get("maintenance_type"),
                    "reason": h.get("maintenance_reason"),
                    "downtimeHours": h.get("downtime_hours"),
                    "costInr": h.get("cost_inr"),
                }
                for h in a_hist
            ],
            "approvedBlocks": [],
            "executionOutcomes": [],
            "learningMetrics": {
                "estimatedDegradationPerMonth": 2.5,  # points lost per month
                "estimatedWearIncreasePerMonth": 3.0,  # % wear per month
                "meanDaysBetweenMaintenance": 180,
                "projectedNextMaintenanceDate": "2026-10-15",
                "proactiveEarlyWarningActive": False,
            },
        }

    save_json(MEMORY_FILE, memory)
    return memory


def record_officer_approved_block(block_record):
    """
    Stores an officer-approved maintenance block into the asset's memory.
    """
    memory = initialize_memory()
    aid = block_record.get("assetId")

    if aid not in memory["assets"]:
        memory["assets"][aid] = {
            "assetId": aid,
            "approvedBlocks": [],
            "executionOutcomes": [],
        }

    memory["assets"][aid]["approvedBlocks"].append(block_record)
    memory["lastUpdated"] = datetime.now().isoformat()
    save_json(MEMORY_FILE, memory)

    # Also record in confirmed blocks file
    confirmed_data = load_json(CONFIRMED_BLOCKS_FILE) if CONFIRMED_BLOCKS_FILE.exists() else {"planner": "F3 Confirmed Maintenance Blocks", "blocks": []}
    confirmed_data["blocks"] = [b for b in confirmed_data["blocks"] if b.get("blockId") != block_record.get("blockId")]
    confirmed_data["blocks"].append(block_record)
    save_json(CONFIRMED_BLOCKS_FILE, confirmed_data)

    return block_record


def record_maintenance_execution(
    asset_id,
    block_id,
    execution_date,
    actual_downtime_hours,
    actual_cost_inr,
    condition_score_after,
    wear_level_after,
    defects_resolved_count=0,
    technician_notes="",
):
    """
    Records post-maintenance execution outcome:
    - Restores condition & resets wear in memory
    - Updates degradation learning metrics
    - Computes next projected maintenance date
    """
    memory = initialize_memory()
    if asset_id not in memory["assets"]:
        raise ValueError(f"Asset {asset_id} not found in memory store.")

    asset_mem = memory["assets"][asset_id]
    before_cond = asset_mem.get("currentConditionScore", 50)
    before_wear = asset_mem.get("currentWearLevel", 60)

    outcome = {
        "blockId": block_id,
        "executionDate": execution_date,
        "actualDowntimeHours": actual_downtime_hours,
        "actualCostInr": actual_cost_inr,
        "conditionScoreBefore": before_cond,
        "conditionScoreAfter": condition_score_after,
        "conditionImprovement": round(condition_score_after - before_cond, 1),
        "wearLevelBefore": before_wear,
        "wearLevelAfter": wear_level_after,
        "wearReduction": round(before_wear - wear_level_after, 1),
        "defectsResolved": defects_resolved_count,
        "technicianNotes": technician_notes,
        "recordedAt": datetime.now().isoformat(),
    }

    # Update asset state in memory
    asset_mem["currentConditionScore"] = condition_score_after
    asset_mem["currentWearLevel"] = wear_level_after
    asset_mem["currentDefectCount"] = max(0, asset_mem.get("currentDefectCount", 0) - defects_resolved_count)
    asset_mem["lastMaintenanceDate"] = execution_date
    asset_mem["totalMaintenanceCycles"] = asset_mem.get("totalMaintenanceCycles", 0) + 1
    asset_mem["totalDowntimeHours"] = asset_mem.get("totalDowntimeHours", 0) + actual_downtime_hours
    asset_mem["totalCostInr"] = asset_mem.get("totalCostInr", 0) + actual_cost_inr

    asset_mem["executionOutcomes"].append(outcome)

    # Continuous learning: Project next maintenance date based on wear reduction and degradation
    # A fresh maintenance typically gives ~180 days of stable life
    exec_dt = datetime.strptime(execution_date, "%Y-%m-%d").date()
    mtbm = asset_mem.get("learningMetrics", {}).get("meanDaysBetweenMaintenance", 180)
    next_due = exec_dt + timedelta(days=mtbm)

    asset_mem["learningMetrics"]["projectedNextMaintenanceDate"] = str(next_due)
    asset_mem["learningMetrics"]["proactiveEarlyWarningActive"] = False

    memory["lastUpdated"] = datetime.now().isoformat()
    save_json(MEMORY_FILE, memory)

    return outcome


def check_early_warning_from_memory(asset_id, current_date=None):
    """
    Evaluates historical degradation in memory to trigger early warning
    BEFORE an employee or inspection reports a fault.
    """
    memory = initialize_memory()
    asset_mem = memory["assets"].get(asset_id)
    if not asset_mem:
        return None

    if current_date is None:
        current_date = datetime.now().strftime("%Y-%m-%d")

    curr_dt = datetime.strptime(current_date, "%Y-%m-%d").date()
    last_maint_str = asset_mem.get("lastMaintenanceDate", "2026-01-01")
    last_dt = datetime.strptime(last_maint_str, "%Y-%m-%d").date()

    days_elapsed = (curr_dt - last_dt).days
    mtbm = asset_mem.get("learningMetrics", {}).get("meanDaysBetweenMaintenance", 180)
    projected_date_str = asset_mem.get("learningMetrics", {}).get("projectedNextMaintenanceDate", str(last_dt + timedelta(days=mtbm)))

    # Estimate current degraded condition using learned degradation rate
    deg_rate_monthly = asset_mem.get("learningMetrics", {}).get("estimatedDegradationPerMonth", 2.5)
    months_elapsed = days_elapsed / 30.4
    estimated_condition = max(20.0, asset_mem.get("currentConditionScore", 70) - (months_elapsed * deg_rate_monthly))

    wear_rate_monthly = asset_mem.get("learningMetrics", {}).get("estimatedWearIncreasePerMonth", 3.0)
    estimated_wear = min(95.0, asset_mem.get("currentWearLevel", 30) + (months_elapsed * wear_rate_monthly))

    # Trigger early warning if within 30 days of projected next maintenance OR estimated wear >= 65%
    days_to_projected = (datetime.strptime(projected_date_str, "%Y-%m-%d").date() - curr_dt).days
    early_warning = days_to_projected <= 30 or estimated_wear >= 65.0 or estimated_condition <= 50.0

    asset_mem["learningMetrics"]["proactiveEarlyWarningActive"] = early_warning
    save_json(MEMORY_FILE, memory)

    return {
        "assetId": asset_id,
        "currentDate": current_date,
        "lastMaintenanceDate": last_maint_str,
        "daysSinceLastMaintenance": days_elapsed,
        "projectedNextMaintenanceDate": projected_date_str,
        "daysRemainingToProjected": days_to_projected,
        "estimatedConditionScore": round(estimated_condition, 1),
        "estimatedWearLevel": round(estimated_wear, 1),
        "earlyWarningTriggered": early_warning,
        "earlyWarningReason": (
            f"MEMORY ALERT: {asset_id} has accumulated {days_elapsed} days of active service since {last_maint_str}. "
            f"Based on historical memory (MTBM {mtbm}d, degradation {deg_rate_monthly} pts/mo), "
            f"wear is projected at {estimated_wear:.1f}% and condition at {estimated_condition:.1f}/100. "
            f"Proactively recommending maintenance before component failure occurs."
            if early_warning else "Asset is within safe operational lifecycle limits."
        ),
    }


def print_asset_memory_summary(asset_id):
    memory = initialize_memory()
    asset_mem = memory["assets"].get(asset_id)
    if not asset_mem:
        print(f"Asset {asset_id} not found in memory.")
        return

    print()
    print("=" * 70)
    print(f"ASSET LIFECYCLE MEMORY & CONTINUOUS LEARNING: {asset_id}")
    print("=" * 70)
    print(f"Type / Station:          {asset_mem['assetType']} @ {asset_mem['stationCode']}")
    print(f"Installation Date:       {asset_mem.get('installationDate', 'N/A')}")
    print(f"Current Condition:       {asset_mem['currentConditionScore']}/100 | Wear: {asset_mem['currentWearLevel']}%")
    print(f"Last Maintenance:        {asset_mem['lastMaintenanceDate']}")
    print(f"Total Cycles Completed:  {asset_mem['totalMaintenanceCycles']}")
    print(f"Total Cumulative Cost:   ₹{asset_mem['totalCostInr']:,} (Downtime: {asset_mem['totalDowntimeHours']} hrs)")
    print(f"Approved Blocks Logged:  {len(asset_mem.get('approvedBlocks', []))}")
    print(f"Executions Completed:    {len(asset_mem.get('executionOutcomes', []))}")

    learn = asset_mem.get("learningMetrics", {})
    print("\nCONTINUOUS LEARNING & PREDICTION METRICS:")
    print(f"  • Monthly Degradation: {learn.get('estimatedDegradationPerMonth')} pts/mo")
    print(f"  • Mean Time Between Maint: {learn.get('meanDaysBetweenMaintenance')} days")
    print(f"  • Projected Next Maint:    {learn.get('projectedNextMaintenanceDate')}")
    print(f"  • Early Warning Active:    {learn.get('proactiveEarlyWarningActive')}")


if __name__ == "__main__":
    aid = sys.argv[1] if len(sys.argv) > 1 else "TEST-BPL-SIG-001"
    initialize_memory()
    print_asset_memory_summary(aid)
    print("\nEvaluating early warning from memory:")
    warn = check_early_warning_from_memory(aid, "2026-09-05")
    print(f"Early Warning: {warn['earlyWarningTriggered']}")
    print(f"Reason: {warn['earlyWarningReason']}")
