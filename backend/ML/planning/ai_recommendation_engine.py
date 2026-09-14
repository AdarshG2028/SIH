#!/usr/bin/env python3
"""
Railway Proactive AI Maintenance Recommendation Engine

Autonomously scans all railway assets using the predictive ML model and physical health metrics.
Identifies high-risk assets before failures or human reports occur, and formulates:
1. Explainable rationale (why this asset needs repair now)
2. Feasible working time slots (considering train traffic, weather, and technician availability)
3. Officer/employee approval package
"""

import sys
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parents[3]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.features.live_feature_extractor import predict_asset_failure_risk, TASKS_FILE
from ML.src.planning.asset_maintenance_planner import build_plan, load_json, CONSTRAINTS_FILE

OUTPUT_FILE = BASE_DIR / "data" / "processed" / "ai_maintenance_recommendations.json"


def generate_proactive_recommendations(data_source=None, snapshot_date=None):
    """
    Scans assets and generates proactive recommendations for any asset requiring attention.
    """
    if data_source is None:
        tasks_data = load_json(TASKS_FILE)
    else:
        tasks_data = data_source

    constraints = load_json(CONSTRAINTS_FILE)

    assets = tasks_data.get("assets", [])
    tasks = tasks_data.get("tasks", [])
    if not snapshot_date:
        snapshot_date = tasks_data.get("snapshot_date", datetime.now().strftime("%Y-%m-%d"))

    recommendations = []

    for asset in assets:
        asset_id = asset.get("asset_id")
        try:
            risk = predict_asset_failure_risk(asset_id, tasks_data, snapshot_date)
        except Exception as e:
            continue

        prob = risk["predicted_probability"]
        diag = risk["diagnostic_metrics"]
        context = risk["context"]
        unresolved = context.get("unresolved_failures", [])

        # Recommendation Trigger Criteria:
        # 1. High/Critical ML probability (>= 0.40)
        # 2. OR Condition score severely degraded (< 50)
        # 3. OR Wear level high (> 65%)
        # 4. OR Multiple defects (>= 3)
        # 5. OR Any unresolved failure event
        is_high_risk = (
            prob >= 0.40
            or diag["condition_score"] < 50
            or diag["wear_level"] >= 65
            or diag["defect_count"] >= 3
            or len(unresolved) > 0
        )

        if not is_high_risk:
            continue

        # Formulate grounded, transparent explainability reasons
        reasons = []
        if prob >= 0.40:
            reasons.append(f"Model predicts elevated failure likelihood of {risk['risk_score']}% ({risk['risk_level']}) within 30 days")
        if diag["condition_score"] < 50:
            reasons.append(f"Asset health condition degraded to {diag['condition_score']}/100")
        if diag["wear_level"] >= 65:
            reasons.append(f"Physical wear level reached critical threshold at {diag['wear_level']}%")
        if diag["defect_count"] >= 3:
            reasons.append(f"{diag['defect_count']} active defects recorded in recent track/component inspection")
        if unresolved:
            reasons.append(f"Unresolved {unresolved[0].get('severity', '')} failure event: {unresolved[0].get('failure_type', 'Fault')}")
        if diag.get("near_end_of_life"):
            reasons.append("Asset is operating near end of operational lifespan")

        # Urgency Level
        if prob >= 0.50 or diag["condition_score"] <= 40 or unresolved:
            urgency = "URGENT"
            action_prompt = "Immediate maintenance block recommended within 24–48 hours."
        elif prob >= 0.40 or diag["wear_level"] >= 70:
            urgency = "HIGH"
            action_prompt = "Schedule maintenance block within 7 days."
        else:
            urgency = "MEDIUM"
            action_prompt = "Schedule preventive maintenance block within 14–30 days."

        # Generate feasible working time slots for this asset
        # Ensure task entry exists in tasks list for planner lookup
        task_entry = next((t for t in tasks if t.get("assetId") == asset_id), None)
        if not task_entry:
            task_entry = {
                "taskId": f"PROACTIVE-TASK-{asset_id}",
                "department": "Signalling" if "sig" in asset_id.lower() else ("OHE" if "ohe" in asset_id.lower() else "Track"),
                "sectionId": asset.get("station_code", "BPL"),
                "assetId": asset_id,
                "taskType": "Preventive",
                "description": f"AI recommended maintenance for {asset_id}",
                "criticalityScore": round(prob * 100.0, 1),
                "dueDate": snapshot_date,
                "status": "pending",
            }
            planner_tasks = tasks + [task_entry]
        else:
            planner_tasks = tasks

        try:
            options_plan = build_plan(asset_id, planner_tasks, constraints)
            feasible_options = options_plan.get("options", [])
            recommended_option = options_plan.get("recommendedOption")
        except Exception:
            feasible_options = []
            recommended_option = None

        rec_entry = {
            "recommendationId": f"AI-REC-{asset_id}",
            "assetId": asset_id,
            "assetType": asset.get("asset_type"),
            "sectionId": asset.get("station_code"),
            "urgency": urgency,
            "actionPrompt": action_prompt,
            "mlFailureRisk": {
                "probability": prob,
                "riskScore": risk["risk_score"],
                "riskLevel": risk["risk_level"],
                "recommendedAction": risk["recommended_action"],
            },
            "healthMetrics": {
                "conditionScore": diag["condition_score"],
                "wearLevel": diag["wear_level"],
                "defectCount": diag["defect_count"],
                "unresolvedFailures": len(unresolved),
            },
            "explainability": reasons,
            "recommendedOptionId": recommended_option,
            "feasibleTimeSlots": feasible_options,
            "status": "PENDING_OFFICER_REVIEW",
            "createdAt": datetime.now().isoformat(),
        }

        recommendations.append(rec_entry)

    recommendations.sort(
        key=lambda x: (
            1 if x["urgency"] == "URGENT" else (2 if x["urgency"] == "HIGH" else 3),
            -x["mlFailureRisk"]["probability"],
        )
    )

    output = {
        "generatedAt": datetime.now().isoformat(),
        "snapshotDate": snapshot_date,
        "totalAssetsScanned": len(assets),
        "totalRecommendations": len(recommendations),
        "recommendations": recommendations,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    return output


def print_recommendations(output):
    recs = output.get("recommendations", [])
    print()
    print("=" * 70)
    print("PROACTIVE AI RAILWAY MAINTENANCE RECOMMENDATIONS")
    print("=" * 70)
    print(f"Snapshot Date: {output['snapshotDate']}")
    print(f"Assets Monitored: {output['totalAssetsScanned']} | Proactive Recommendations: {output['totalRecommendations']}")
    print()

    for idx, rec in enumerate(recs, start=1):
        print("-" * 70)
        print(f"[{idx}] {rec['recommendationId']} — Asset: {rec['assetId']} ({rec['assetType']} @ {rec['sectionId']})")
        print(f"    Urgency: {rec['urgency']} | ML Risk: {rec['mlFailureRisk']['riskLevel']} ({rec['mlFailureRisk']['riskScore']}%)")
        print(f"    Action: {rec['actionPrompt']}")
        print("    Why the AI recommends this:")
        for r in rec["explainability"]:
            print(f"      • {r}")

        slots = rec.get("feasibleTimeSlots", [])
        if slots:
            rec_slot = next((s for s in slots if s["optionId"] == rec["recommendedOptionId"]), slots[0])
            print(f"    Optimal Working Time Slot:")
            print(f"      ★ {rec_slot['optionId']}: {rec_slot['startTime']} → {rec_slot['endTime']} (Traffic: {rec_slot['trafficLevel']}, Score: {rec_slot['score']})")
            alts = [s for s in slots if s["optionId"] != rec_slot["optionId"]]
            if alts:
                alt_strs = [f"{s['optionId']} ({s['startTime']}→{s['endTime']})" for s in alts[:2]]
                print(f"      Alternatives: {', '.join(alt_strs)}")
        print()


if __name__ == "__main__":
    out = generate_proactive_recommendations()
    print_recommendations(out)
    print(f"Recommendations saved to: {OUTPUT_FILE}")
