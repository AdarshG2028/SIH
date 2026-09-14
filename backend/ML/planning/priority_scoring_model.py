#!/usr/bin/env python3
"""
SIH Prototype: Maintenance Priority Scoring Model

Conforms to SIH Section 2 Specification:
Produces a transparent, explainable priority score (0–100) based on:
- Asset criticality
- Safety impact
- Urgency
- Overdue days
- Asset physical condition
- Historical failure frequency
- Importance of asset for train operations
- Predictive ML failure risk probability (when available)

Outputs:
- priority_score (0–100)
- priority_level (Critical / High / Medium / Low)
- major_contributing_factors (list of explainable drivers)
"""

from typing import Dict, Any, List, Tuple


def calculate_maintenance_priority(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates the 0–100 maintenance priority score for an individual task.
    """
    score = 0.0
    contributing_factors = []

    # 1. Asset Criticality (Max 25 pts)
    crit = str(task.get("criticality") or task.get("criticalityScore", "Medium")).lower()
    if crit in ["critical", "emergency"] or (isinstance(crit, (int, float)) and crit >= 85):
        score += 25.0
        contributing_factors.append("+25 pts: Critical asset category directly affecting mainline running")
    elif crit in ["high", "severe"] or (isinstance(crit, (int, float)) and crit >= 70):
        score += 18.0
        contributing_factors.append("+18 pts: High asset criticality rating")
    elif crit in ["medium", "moderate"]:
        score += 10.0
        contributing_factors.append("+10 pts: Moderate asset criticality")
    else:
        score += 5.0

    # 2. Safety Impact (Max 25 pts)
    safety = str(task.get("safety_impact") or task.get("safetyImpact", "Low")).lower()
    if any(k in safety for k in ["derailment", "flaw", "fissure", "arcing", "red aspect", "wrong-route", "hazard"]):
        score += 25.0
        contributing_factors.append("+25 pts: Severe safety hazard (risk of derailment, signal failure, or pantograph entanglement)")
    elif any(k in safety for k in ["caution", "speed restriction", "delay", "chatter", "wear"]):
        score += 15.0
        contributing_factors.append("+15 pts: Operational safety precaution (speed restriction / caution order required)")
    else:
        score += 5.0

    # 3. Overdue Days & Urgency (Max 25 pts)
    overdue_days = int(task.get("overdue_days") or task.get("overdueDays", 0))
    urgency = str(task.get("urgency", "Flexible")).lower()
    
    if overdue_days > 0:
        overdue_pts = min(20.0, overdue_days * 4.0)
        score += overdue_pts
        contributing_factors.append(f"+{overdue_pts:.0f} pts: Overdue by {overdue_days} day(s) beyond mandated inspection schedule")
    
    if urgency in ["urgent", "immediate"]:
        score += 5.0
        contributing_factors.append("+5 pts: High operational urgency requested by field department")

    # 4. Asset Health & Condition (Max 15 pts)
    condition = task.get("asset_condition") or task.get("condition_score") or task.get("conditionScore")
    if condition is not None:
        try:
            cond_val = float(condition)
            if cond_val < 50:
                score += 15.0
                contributing_factors.append(f"+15 pts: Severely degraded physical condition score ({cond_val:.0f}/100)")
            elif cond_val < 70:
                score += 10.0
                contributing_factors.append(f"+10 pts: Deteriorating asset condition score ({cond_val:.0f}/100)")
        except (ValueError, TypeError):
            pass
    else:
        # Default mild condition penalty if unknown
        score += 5.0

    # 5. Predictive ML Failure Likelihood / Operation Importance (Max 10 pts)
    ml_prob = task.get("ml_probability") or task.get("predicted_probability")
    if ml_prob is not None:
        try:
            prob_val = float(ml_prob)
            if prob_val >= 0.50:
                score += 10.0
                contributing_factors.append(f"+10 pts: AI Ensemble predicts elevated failure probability of {prob_val*100:.1f}%")
            elif prob_val >= 0.35:
                score += 6.0
                contributing_factors.append(f"+6 pts: AI model flags moderate failure likelihood ({prob_val*100:.1f}%)")
        except (ValueError, TypeError):
            pass
    else:
        score += 5.0

    final_score = round(min(100.0, max(10.0, score)), 1)

    # Classify Priority Level
    if final_score >= 80.0:
        priority_level = "Critical"
    elif final_score >= 65.0:
        priority_level = "High"
    elif final_score >= 45.0:
        priority_level = "Medium"
    else:
        priority_level = "Low"

    return {
        "task_id": task.get("task_id") or task.get("taskId"),
        "priority_score": final_score,
        "priority_level": priority_level,
        "major_contributing_factors": contributing_factors,
        "raw_task_reference": {
            "department": task.get("department"),
            "task_type": task.get("task_type") or task.get("taskType"),
            "location": task.get("location") or task.get("sectionId"),
            "due_date": task.get("due_date") or task.get("dueDate"),
            "overdue_days": overdue_days
        }
    }


def score_tasks_batch(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks a list of tasks by priority_score in descending order.
    """
    scored = [calculate_maintenance_priority(t) for t in tasks]
    scored.sort(key=lambda x: x["priority_score"], reverse=True)
    return scored


def test_priority_model():
    sample_task = {
        "task_id": "TMS-TRK-2026-002",
        "department": "Engineering",
        "asset_id": "TEST-RKMP-TRK-001",
        "task_type": "Rail Weld Defect Rectification",
        "criticality": "Critical",
        "urgency": "Urgent",
        "overdue_days": 5,
        "safety_impact": "Ultrasonic flaw detection detected rail head fissure defect",
        "asset_condition": 41.0,
        "ml_probability": 0.495
    }
    res = calculate_maintenance_priority(sample_task)
    print("Priority Model Test Result:")
    print(f"  Task:   {res['task_id']}")
    print(f"  Score:  {res['priority_score']}/100")
    print(f"  Level:  {res['priority_level']}")
    print("  Factors:")
    for f in res["major_contributing_factors"]:
        print(f"    • {f}")


if __name__ == "__main__":
    test_priority_model()
