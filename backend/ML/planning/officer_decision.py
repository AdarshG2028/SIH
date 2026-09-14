#!/usr/bin/env python3
"""
Railway Officer Decision & Maintenance Block Confirmation Module

Allows the Railway Officer to:
1. Accept the recommended maintenance time slot (e.g. OPTION_1)
2. Select an alternative time slot (e.g. OPTION_2)
3. Reject or Defer with operational notes
4. Create the final confirmed maintenance block and persist it into Asset Memory.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ML.src.planning.asset_maintenance_planner import (
    build_plan,
    load_json,
    TASKS_FILE,
    CONSTRAINTS_FILE,
)
from ML.src.planning.asset_memory_store import record_officer_approved_block, save_json


def submit_officer_decision(
    asset_id,
    decision="ACCEPT_RECOMMENDED",
    selected_option_id=None,
    officer_id="OFFICER-DIV-01",
    officer_notes="",
    tasks_source=None,
    constraints_source=None,
):
    """
    Processes an officer decision:
    - decision: "ACCEPT_RECOMMENDED", "SELECT_ALTERNATIVE", "REJECT", "DEFER"
    - selected_option_id: "OPTION_1", "OPTION_2", etc.
    """
    tasks_data = load_json(TASKS_FILE) if tasks_source is None else tasks_source
    constraints = load_json(CONSTRAINTS_FILE) if constraints_source is None else constraints_source

    tasks = tasks_data.get("tasks", []) if isinstance(tasks_data, dict) else tasks_data
    plan = build_plan(asset_id, tasks, constraints)

    options = plan.get("options", [])
    if not options:
        raise ValueError(f"No feasible maintenance options available for asset {asset_id}")

    rec_opt = next((o for o in options if o.get("recommended")), options[0])

    if decision == "ACCEPT_RECOMMENDED":
        chosen_opt = rec_opt
    elif decision == "SELECT_ALTERNATIVE":
        if not selected_option_id:
            chosen_opt = options[1] if len(options) > 1 else rec_opt
        else:
            chosen_opt = next((o for o in options if o.get("optionId") == selected_option_id), None)
            if not chosen_opt:
                raise ValueError(f"Option '{selected_option_id}' not found in feasible options.")
    elif decision in ["REJECT", "DEFER"]:
        return {
            "assetId": asset_id,
            "decision": decision,
            "status": "REJECTED" if decision == "REJECT" else "DEFERRED",
            "officerId": officer_id,
            "officerNotes": officer_notes,
            "timestamp": datetime.now().isoformat(),
            "blockCreated": False,
        }
    else:
        raise ValueError(f"Unknown decision type: {decision}")

    # Create Final Confirmed Maintenance Block
    block_id = f"BLOCK-{plan['sectionId']}-{asset_id}"
    block_record = {
        "blockId": block_id,
        "status": "CONFIRMED",
        "snapshotDate": plan.get("snapshotDate"),
        "sectionId": plan["sectionId"],
        "assetId": asset_id,
        "department": plan["department"],
        "priority": plan["priority"],
        "criticalityScore": plan["criticalityScore"],
        "allocatedDate": plan.get("snapshotDate"),
        "startTime": chosen_opt["startTime"],
        "endTime": chosen_opt["endTime"],
        "durationHours": chosen_opt["durationHours"],
        "trafficLevel": chosen_opt["trafficLevel"],
        "trafficScore": chosen_opt["trafficScore"],
        "weatherSuitable": chosen_opt["weatherSuitable"],
        "teamAvailable": chosen_opt["teamAvailable"],
        "score": chosen_opt["score"],
        "selectedOptionId": chosen_opt["optionId"],
        "isRecommendedOption": chosen_opt["optionId"] == rec_opt["optionId"],
        "description": plan["description"],
        "officerApproval": {
            "officerId": officer_id,
            "decision": decision,
            "approvedAt": datetime.now().isoformat(),
            "officerNotes": officer_notes or "Approved optimal low-traffic maintenance window",
        },
        "mlRiskAtApproval": plan.get("mlRisk"),
    }

    # Record into confirmed blocks file and Asset Memory
    record_officer_approved_block(block_record)

    return block_record


def print_confirmed_block(block):
    print()
    print("=" * 70)
    print("FINAL APPROVED MAINTENANCE BLOCK")
    print("=" * 70)
    print(f"Block ID:         {block['blockId']}")
    print(f"Asset ID:         {block['assetId']} ({block['department']} @ {block['sectionId']})")
    print(f"Status:           {block['status']}")
    print(f"Allocated Window: {block['allocatedDate']} from {block['startTime']} → {block['endTime']} ({block['durationHours']} hrs)")
    print(f"Selected Option:  {block['selectedOptionId']} (Recommended Option: {block['isRecommendedOption']})")
    print(f"Traffic Profile:  {block['trafficLevel']} (Score: {block['trafficScore']})")
    print(f"Weather Suitable: {block['weatherSuitable']} | Teams Available: {block['teamAvailable']}")
    print(f"Priority:         {block['priority']} (Criticality Score: {block['criticalityScore']})")
    print(f"Description:      {block['description']}")

    oa = block.get("officerApproval", {})
    print(f"\nOFFICER APPROVAL AUDIT:")
    print(f"  Approved By:    {oa.get('officerId')}")
    print(f"  Decision Type:  {oa.get('decision')}")
    print(f"  Approval Time:  {oa.get('approvedAt')}")
    print(f"  Officer Notes:  {oa.get('officerNotes')}")


if __name__ == "__main__":
    aid = sys.argv[1] if len(sys.argv) > 1 else "TEST-BPL-SIG-001"
    # Example: Officer chooses alternative OPTION_2
    opt = sys.argv[2] if len(sys.argv) > 2 else "OPTION_2"
    print(f"Submitting officer decision for {aid} choosing {opt}...")
    blk = submit_officer_decision(
        asset_id=aid,
        decision="SELECT_ALTERNATIVE",
        selected_option_id=opt,
        officer_id="SR-DEN-BPL-01",
        officer_notes="Selected Option 2 to allow earlier freight pass-through before track possession",
    )
    print_confirmed_block(blk)
