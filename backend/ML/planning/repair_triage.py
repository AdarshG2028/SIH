#!/usr/bin/env python3
"""
Railway Intelligent Repair Triage & Assessment Module

Evaluates incoming maintenance reports and asks/assesses key operational questions:
1. What is the asset and nature of defect?
2. What is the severity and safety criticality?
3. What is the asset's underlying ML failure risk and physical condition?
4. Is it urgent/important or can it be deferred / done at any time?
5. What time slots are feasible to execute this repair?
"""

import sys
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.features.live_feature_extractor import predict_asset_failure_risk, TASKS_FILE
from ML.src.planning.asset_maintenance_planner import (
    build_plan,
    load_json,
    CONSTRAINTS_FILE,
    OUTPUT_FILE,
)


def assess_repair_urgency(
    asset_id,
    reported_issue,
    defect_type="Wear & Tear",
    severity="Medium",
    is_safety_critical=False,
    estimated_duration_hours=None,
    snapshot_date=None,
):
    """
    Performs multi-factor triage assessing:
    - ML failure risk & current wear/condition
    - Defect severity & safety criticality
    - Deferability (Can it wait, or must a block be scheduled immediately?)
    - Recommended duration and technician crew
    """
    # 1. Fetch live ML risk and diagnostic condition
    ml_risk = None
    try:
        ml_risk = predict_asset_failure_risk(asset_id, snapshot_date=snapshot_date)
    except Exception as e:
        ml_risk = {
            "predicted_probability": 0.35,
            "risk_score": 35.0,
            "risk_level": "MEDIUM",
            "recommended_action": "Evaluate manually",
            "diagnostic_metrics": {
                "condition_score": 60.0,
                "wear_level": 50.0,
                "defect_count": 1,
                "days_since_last_failure": 9999.0,
                "unresolved_failures_count": 0,
            },
        }

    diagnostics = ml_risk.get("diagnostic_metrics", {})
    condition_score = diagnostics.get("condition_score", 60.0)
    wear_level = diagnostics.get("wear_level", 40.0)
    defects = diagnostics.get("defect_count", 0)
    unresolved_fails = diagnostics.get("unresolved_failures_count", 0)
    ml_prob = ml_risk.get("predicted_probability", 0.35)

    # 2. Score Severity & Criticality
    severity_norm = str(severity).lower()
    if severity_norm in ["critical", "emergency"]:
        sev_score = 100.0
    elif severity_norm in ["high", "severe"]:
        sev_score = 80.0
    elif severity_norm in ["medium", "moderate"]:
        sev_score = 55.0
    else:
        sev_score = 30.0

    safety_score = 100.0 if is_safety_critical else 30.0

    # 3. Calculate Overall Importance Score (0 to 100)
    # Severity (30%), Safety (25%), ML Risk (20%), Wear/Condition (15%), Defects/Faults (10%)
    condition_risk_factor = max(0.0, 100.0 - condition_score)
    importance_score = (
        sev_score * 0.30
        + safety_score * 0.25
        + (ml_prob * 100.0) * 0.20
        + ((wear_level * 0.5 + condition_risk_factor * 0.5)) * 0.15
        + min(100.0, (defects * 10.0 + unresolved_fails * 40.0)) * 0.10
    )
    importance_score = round(min(100.0, max(10.0, importance_score)), 1)

    # 4. Determine Deferability & Importance Category
    if importance_score >= 80.0 or is_safety_critical or severity_norm == "critical":
        importance_level = "CRITICAL"
        deferability = "CANNOT_DEFER"
        deferral_rationale = (
            "CRITICAL: High risk to train operations. Postponing this repair could cause "
            "unplanned track closure, signal failure, or derailment risk. Immediate block required."
        )
        recommended_timeframe = "Within 24 to 48 hours"
        due_days = 1

    elif importance_score >= 65.0 or severity_norm == "high":
        importance_level = "HIGH"
        deferability = "SHORT_TERM_DEFERRABLE"
        deferral_rationale = (
            "HIGH PRIORITY: Repair must be scheduled within 3 to 7 days. Component wear "
            "or defect is accelerating under current train traffic."
        )
        recommended_timeframe = "Within 3 to 7 days"
        due_days = 5

    elif importance_score >= 45.0:
        importance_level = "MEDIUM"
        deferability = "FLEXIBLE_DEFERRABLE"
        deferral_rationale = (
            "MODERATE: Can be safely deferred to the next scheduled section block window "
            "without operational disruption."
        )
        recommended_timeframe = "Within 14 to 30 days"
        due_days = 15

    else:
        importance_level = "LOW"
        deferability = "DEFERRABLE_AT_ANY_TIME"
        deferral_rationale = (
            "LOW / ROUTINE: Asset condition is sound. Repair or inspection can be performed "
            "at any convenient low-traffic window or routine cycle."
        )
        recommended_timeframe = "Routine cycle (30+ days)"
        due_days = 30

    # 5. Determine department & required duration
    asset_type = ml_risk.get("asset_type", "Track")
    if "sig" in asset_id.lower() or asset_type.lower() == "signal":
        department = "Signalling"
        default_duration = 2.5
    elif "ohe" in asset_id.lower() or asset_type.lower() == "ohe":
        department = "OHE"
        default_duration = 3.0
    else:
        department = "Track"
        default_duration = 2.5 if severity_norm in ["critical", "high"] else 3.0

    duration = float(estimated_duration_hours) if estimated_duration_hours else default_duration

    # 6. Extract Section from asset_id or data source
    section_id = ml_risk.get("station_code", "BPL")

    triage_result = {
        "assetId": asset_id,
        "reportedIssue": reported_issue,
        "defectType": defect_type,
        "reportedSeverity": severity,
        "isSafetyCritical": is_safety_critical,
        "department": department,
        "sectionId": section_id,
        "estimatedDurationHours": duration,
        "triageAssessment": {
            "importanceScore": importance_score,
            "importanceLevel": importance_level,
            "deferability": deferability,
            "deferralRationale": deferral_rationale,
            "recommendedTimeframe": recommended_timeframe,
            "dueInDays": due_days,
        },
        "mlPredictiveSignals": {
            "mlFailureProbability": round(ml_prob, 4),
            "mlRiskScore": round(ml_prob * 100.0, 1),
            "mlRiskLevel": ml_risk.get("risk_level", "MEDIUM"),
            "conditionScore": condition_score,
            "wearLevel": wear_level,
            "defectCount": defects,
            "unresolvedFailures": unresolved_fails,
        },
    }

    return triage_result


def plan_time_slots_for_triage(triage_result):
    """
    Given a triage result, generates feasible working time slots
    using operational constraints (traffic, weather, teams).
    """
    asset_id = triage_result["assetId"]
    section_id = triage_result["sectionId"]
    duration = triage_result["estimatedDurationHours"]
    priority = triage_result["triageAssessment"]["importanceLevel"]

    constraints = load_json(CONSTRAINTS_FILE)

    # Create temporary task structure for planner
    temp_task = {
        "taskId": f"TRIAGE-TASK-{asset_id}",
        "assetId": asset_id,
        "sectionId": section_id,
        "department": triage_result["department"],
        "criticalityScore": triage_result["triageAssessment"]["importanceScore"],
        "description": triage_result["reportedIssue"],
        "dueDate": (
            datetime.now().strftime("%Y-%m-%d")
            if triage_result["triageAssessment"]["dueInDays"] <= 1
            else "2026-09-07"
        ),
        "durationHours": duration,
        "status": "pending",
    }

    # Load tasks and append or replace temp task
    tasks_data = load_json(TASKS_FILE)
    tasks = tasks_data.get("tasks", []) if isinstance(tasks_data, dict) else tasks_data
    # Filter out existing task for same asset if any, use our triaged version
    tasks = [t for t in tasks if t.get("assetId") != asset_id]
    tasks.append(temp_task)

    plan = build_plan(asset_id, tasks, constraints)
    return plan


def print_triage_report(triage_result, plan=None):
    print()
    print("=" * 70)
    print("RAILWAY REPAIR TRIAGE & OPERATIONAL ASSESSMENT")
    print("=" * 70)
    print()
    print(f"Asset:             {triage_result['assetId']}")
    print(f"Section / Station: {triage_result['sectionId']}")
    print(f"Department:        {triage_result['department']}")
    print(f"Reported Issue:    {triage_result['reportedIssue']}")
    print(f"Defect Type:       {triage_result['defectType']}")
    print(f"Severity:          {triage_result['reportedSeverity']} (Safety Critical: {triage_result['isSafetyCritical']})")

    t = triage_result["triageAssessment"]
    print()
    print("-" * 70)
    print("TRIAGE ASSESSMENT:")
    print("-" * 70)
    print(f"Importance Level:  {t['importanceLevel']} (Score: {t['importanceScore']}/100)")
    print(f"Deferability:      {t['deferability']}")
    print(f"Recommended Window: {t['recommendedTimeframe']}")
    print(f"Operational Assessment:\n  {t['deferralRationale']}")

    s = triage_result["mlPredictiveSignals"]
    print()
    print("-" * 70)
    print("PREDICTIVE ML SIGNALS & ASSET HEALTH:")
    print("-" * 70)
    print(f"ML Failure Risk:   {s['mlRiskLevel']} ({s['mlRiskScore']}% probability)")
    print(f"Condition Score:   {s['conditionScore']}/100")
    print(f"Wear Level:        {s['wearLevel']}%")
    print(f"Active Defects:    {s['defectCount']}")
    print(f"Unresolved Faults: {s['unresolvedFailures']}")

    if plan and plan.get("options"):
        print()
        print("=" * 70)
        print("FEASIBLE WORKING TIME SLOTS FOR REPAIR:")
        print("=" * 70)
        rec = next((opt for opt in plan["options"] if opt.get("recommended")), plan["options"][0])
        print(f"\nRECOMMENDED TIME SLOT:")
        print(f"  ★ {rec['optionId']}: {rec['startTime']} → {rec['endTime']} ({rec['durationHours']} hrs)")
        print(f"    Traffic: {rec['trafficLevel']} | Weather Suitable: {rec['weatherSuitable']} | Score: {rec['score']}")
        for r in rec["reasons"]:
            print(f"      ✓ {r}")

        print(f"\nALTERNATIVE TIME OPTIONS:")
        for opt in plan["options"]:
            if opt["optionId"] == rec["optionId"]:
                continue
            print(f"  • {opt['optionId']}: {opt['startTime']} → {opt['endTime']} (Traffic: {opt['trafficLevel']}, Score: {opt['score']})")


def interactive_cli():
    print()
    print("=" * 70)
    print("RAILWAY MAINTENANCE TRIAGE & PLANNING INTERFACE")
    print("=" * 70)
    print()
    asset_id = input("Enter Asset ID (e.g. TEST-BPL-SIG-001, TEST-RKMP-TRK-001): ").strip()
    if not asset_id:
        asset_id = "TEST-BPL-SIG-001"

    print(f"Selected: {asset_id}")
    reported_issue = input("Enter defect description / repair required: ").strip()
    if not reported_issue:
        reported_issue = "Track surface irregular wear and geometry defect"

    defect_type = input("Defect Type [Geometry / Wear & Tear / Aspect Failure / Joint Defect]: ").strip() or "Geometry"
    severity = input("Reported Severity [Critical / High / Medium / Low]: ").strip() or "High"
    safety_input = input("Is this safety-critical (affects train movement directly)? [y/N]: ").strip().lower()
    is_safety_critical = safety_input in ["y", "yes", "true", "1"]

    print("\nRunning intelligent triage and predictive assessment...")
    triage = assess_repair_urgency(
        asset_id=asset_id,
        reported_issue=reported_issue,
        defect_type=defect_type,
        severity=severity,
        is_safety_critical=is_safety_critical,
    )

    plan = plan_time_slots_for_triage(triage)
    print_triage_report(triage, plan)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        interactive_cli()
    else:
        # Default test run
        asset = sys.argv[1] if len(sys.argv) > 1 else "TEST-BPL-SIG-001"
        print(f"Triaging repair request for {asset}...")
        res = assess_repair_urgency(
            asset_id=asset,
            reported_issue="Interlocking relay chatter and aspect signal delay",
            defect_type="Signal Aspect Failure",
            severity="Critical",
            is_safety_critical=True,
        )
        slots = plan_time_slots_for_triage(res)
        print_triage_report(res, slots)
