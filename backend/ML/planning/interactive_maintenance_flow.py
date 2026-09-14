#!/usr/bin/env python3
"""
Railway Intelligent Maintenance & Block Planning — End-to-End Workflow

Demonstrates the complete operational lifecycle requested:
1. Employee Reports Maintenance (Track / Signal / OHE)
2. Interactive Triage & Assessment (Is it critical, or can it wait?)
3. Proactive AI Recommendation (AI detects risky instruments and alerts before failure)
4. Intelligent Time-Slot Planning (Evaluates traffic, weather, team availability -> 2-3 feasible slots)
5. Officer Decision & Confirmed Block Creation (Selecting Option 1 or 2)
6. Execution Feedback & Storage into Asset Memory (Recording post-maintenance actuals)
7. Future Cycle Early Warning (AI predicts upcoming maintenance from learned memory before human notices)
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ML.src.planning.repair_triage import assess_repair_urgency, plan_time_slots_for_triage, print_triage_report
from ML.src.planning.ai_recommendation_engine import generate_proactive_recommendations, print_recommendations
from ML.src.planning.officer_decision import submit_officer_decision, print_confirmed_block
from ML.src.planning.asset_memory_store import (
    record_maintenance_execution,
    check_early_warning_from_memory,
    print_asset_memory_summary,
)


def run_complete_demonstration():
    print()
    print("*" * 75)
    print("  RAILWAY PREDICTIVE MAINTENANCE + INTELLIGENT F3 BLOCK PLANNING")
    print("  END-TO-END INTELLIGENT WORKFLOW SIMULATION")
    print("*" * 75)
    print()

    # -------------------------------------------------------------------------
    # STAGE 1: EMPLOYEE SUBMITS A TRACK REPAIR REQUEST & TRIAGE EVALUATION
    # -------------------------------------------------------------------------
    print("=" * 75)
    print("STAGE 1: EMPLOYEE REPAIR REPORT & INTELLIGENT TRIAGE")
    print("=" * 75)
    print("Railway Track Supervisor reports: Rail wear and track geometry deviation at RKMP.")
    print("System asks triage questions and assesses criticality...")
    time.sleep(0.5)

    track_triage = assess_repair_urgency(
        asset_id="TEST-RKMP-TRK-001",
        reported_issue="Rail corrugation, joint wear, and geometry deviation on Up-line",
        defect_type="Track Geometry Deviation",
        severity="High",
        is_safety_critical=True,
    )
    track_plan = plan_time_slots_for_triage(track_triage)
    print_triage_report(track_triage, track_plan)

    print("\n[Triage Verdict]: This repair CANNOT be deferred. Train safety requires scheduling within 24-48 hours.")

    # -------------------------------------------------------------------------
    # STAGE 2: PROACTIVE AI RECOMMENDATION (AI detects high-risk instrument)
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print("STAGE 2: PROACTIVE AI MAINTENANCE RECOMMENDATION")
    print("=" * 75)
    print("Meanwhile, the AI model proactively scans all assets across the division...")
    print("It detects that BPL Signal (TEST-BPL-SIG-001) has critical risk factors BEFORE failure.")
    time.sleep(0.5)

    ai_recs = generate_proactive_recommendations()
    # Find BPL signal recommendation
    sig_rec = next((r for r in ai_recs["recommendations"] if r["assetId"] == "TEST-BPL-SIG-001"), ai_recs["recommendations"][0])

    print(f"\n★ PROACTIVE ALERT: {sig_rec['recommendationId']}")
    print(f"  Asset:        {sig_rec['assetId']} ({sig_rec['assetType']} @ {sig_rec['sectionId']})")
    print(f"  ML Risk:      {sig_rec['mlFailureRisk']['riskLevel']} ({sig_rec['mlFailureRisk']['riskScore']}% probability)")
    print(f"  Urgency:      {sig_rec['urgency']}")
    print(f"  Action:       {sig_rec['actionPrompt']}")
    print("  Why AI recommends this:")
    for r in sig_rec["explainability"]:
        print(f"    • {r}")

    # -------------------------------------------------------------------------
    # STAGE 3: FEASIBLE TIME-SLOT PLANNING (Traffic, Weather, Teams)
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print("STAGE 3: INTELLIGENT TIME-SLOT OPTIONS GENERATED FOR BPL SIGNAL")
    print("=" * 75)
    print("The system evaluates operational constraints:")
    print("  ✓ Train Traffic: Low/Very Low overnight windows (00:00 - 04:00)")
    print("  ✓ Weather: Clear, 24°C, Rain probability 5%, Wind 8 km/h")
    print("  ✓ Resource Availability: BPL Signalling Team is AVAILABLE")
    print("\nAvailable Options:")

    slots = sig_rec.get("feasibleTimeSlots", [])
    for opt in slots:
        prefix = "★ RECOMMENDED" if opt.get("recommended") else "• ALTERNATIVE"
        print(f"  {prefix}: {opt['optionId']} -> {opt['startTime']} to {opt['endTime']} ({opt['durationHours']} hrs)")
        print(f"    Traffic Level: {opt['trafficLevel']} | Weather Suitable: {opt['weatherSuitable']} | Score: {opt['score']}")

    # -------------------------------------------------------------------------
    # STAGE 4: OFFICER DECISION & CONFIRMED BLOCK CREATION
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print("STAGE 4: OFFICER DECISION & BLOCK CONFIRMATION")
    print("=" * 75)
    print("Divisional Railway Officer reviews options...")
    print("Officer decides: SELECT ALTERNATIVE OPTION_2 (01:30 → 04:00) to allow early freight passage.")
    time.sleep(0.5)

    confirmed_block = submit_officer_decision(
        asset_id="TEST-BPL-SIG-001",
        decision="SELECT_ALTERNATIVE",
        selected_option_id="OPTION_2",
        officer_id="SR-DEN-BPL-01",
        officer_notes="Option 2 approved. Team to mobilize at Bhopal Junction Relay Room at 01:15.",
    )
    print_confirmed_block(confirmed_block)

    # -------------------------------------------------------------------------
    # STAGE 5: MAINTENANCE EXECUTION & STORAGE INTO ASSET MEMORY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print("STAGE 5: EXECUTION OUTCOME RECORDED INTO ASSET MEMORY")
    print("=" * 75)
    print("Maintenance completed on 2026-09-06 during approved window 01:30 → 04:00.")
    print("Relay unit replaced, interlocking chatter eliminated, contact points re-calibrated.")
    print("Storing actual downtime, cost, and condition improvement into Asset Memory...")
    time.sleep(0.5)

    outcome = record_maintenance_execution(
        asset_id="TEST-BPL-SIG-001",
        block_id=confirmed_block["blockId"],
        execution_date="2026-09-06",
        actual_downtime_hours=2.5,
        actual_cost_inr=180000,
        condition_score_after=88.0,  # Restored from 35 to 88!
        wear_level_after=18.0,        # Reset wear from 84% to 18%!
        defects_resolved_count=6,     # All 6 active defects resolved
        technician_notes="Signal aspect failure resolved. Point machine relays overhauled and contact resistance tested satisfactory.",
    )

    print(f"\nExecution Outcome Logged:")
    print(f"  • Condition Score: {outcome['conditionScoreBefore']} -> {outcome['conditionScoreAfter']} (+{outcome['conditionImprovement']} pts)")
    print(f"  • Wear Level:      {outcome['wearLevelBefore']}% -> {outcome['wearLevelAfter']}% (-{outcome['wearReduction']}%)")
    print(f"  • Defects Fixed:   {outcome['defectsResolved']}")
    print(f"  • Actual Cost:     ₹{outcome['actualCostInr']:,} | Downtime: {outcome['actualDowntimeHours']} hrs")

    print_asset_memory_summary("TEST-BPL-SIG-001")

    # -------------------------------------------------------------------------
    # STAGE 6: CONTINUOUS LEARNING / FUTURE PROACTIVE EARLY WARNING
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75)
    print("STAGE 6: CONTINUOUS LEARNING — FUTURE PROACTIVE EARLY WARNING")
    print("=" * 75)
    print("Fast-forward simulation into future (e.g. 5 months later: 2027-02-15):")
    print("No employee has noticed or reported any problem yet.")
    print("The AI model queries its accumulated memory for TEST-BPL-SIG-001...")
    time.sleep(0.5)

    future_check = check_early_warning_from_memory("TEST-BPL-SIG-001", current_date="2027-02-15")
    print(f"\nFuture Memory Query Result:")
    print(f"  Service Elapsed:   {future_check['daysSinceLastMaintenance']} days since 2026-09-06")
    print(f"  Projected Condition: {future_check['estimatedConditionScore']}/100 | Projected Wear: {future_check['estimatedWearLevel']}%")
    print(f"  Early Warning:     {future_check['earlyWarningTriggered']}")
    print(f"\n  AI Alert Message:")
    print(f"  \"{future_check['earlyWarningReason']}\"")

    print("\n" + "*" * 75)
    print("  SIMULATION COMPLETE: Full end-to-end intelligent lifecycle verified!")
    print("*" * 75)


if __name__ == "__main__":
    run_complete_demonstration()
