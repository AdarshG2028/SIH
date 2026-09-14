"""
Railway Predictive Maintenance
Real-Time ML Inference

Loads the trained Random Forest pipeline and predicts
maintenance risk for a new asset feature vector.
"""

from pathlib import Path
import json
import sys

import joblib
import pandas as pd


# ============================================================
# CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "best_predictive_maintenance_model.joblib"
)


# ============================================================
# REQUIRED FEATURES
# ============================================================

REQUIRED_FEATURES = [
    "asset_type",
    "station_code",
    "asset_age_years",
    "expected_life_years",
    "initial_condition_score",
    "condition_score",
    "wear_level",
    "defect_count",
    "inspection_status",
    "condition_change",
    "total_train_passages",
    "avg_train_passages",
    "usage_index",
    "cumulative_usage",
    "maintenance_count",
    "total_maintenance_cost",
    "total_downtime",
    "avg_downtime",
    "failure_count",
    "avg_failure_downtime",
    "high_critical_failure_count",
    "maintenance_interval_days",
    "maintenance_priority",
    "asset_age_at_snapshot",
    "life_used_ratio",
    "remaining_life_years",
    "days_since_maintenance",
    "maintenance_count_90d",
    "maintenance_count_180d",
    "maintenance_count_365d",
    "failure_count_90d",
    "failure_count_180d",
    "failure_count_365d",
    "days_since_last_failure",
    "maintenance_cost_90d",
    "maintenance_cost_180d",
    "maintenance_cost_365d",
    "severe_failure_count_90d",
    "severe_failure_count_180d",
    "severe_failure_count_365d",
    "condition_decline",
    "wear_defect_risk",
    "usage_per_day_estimate",
    "maintenance_pressure",
    "failure_pressure",
    "recent_maintenance_activity",
    "recent_failure_activity",
    "life_remaining_ratio",
    "near_end_of_life",
    "condition_usage_risk",
    "wear_usage_risk",
]


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    print(f"Loading model: {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)

    print("Model loaded successfully.")

    return model


# ============================================================
# VALIDATE INPUT
# ============================================================

def validate_input(data):
    if not isinstance(data, dict):
        raise ValueError(
            "Input must be a JSON object/dictionary."
        )

    missing = [
        feature
        for feature in REQUIRED_FEATURES
        if feature not in data
    ]

    if missing:
        raise ValueError(
            "Missing required features:\n"
            + "\n".join(f"- {x}" for x in missing)
        )

    return True


# ============================================================
# PREDICT RISK
# ============================================================

def predict_risk(data):
    validate_input(data)

    model = load_model()

    # Keep exactly the features expected by the trained model.
    input_data = {
        feature: data[feature]
        for feature in REQUIRED_FEATURES
    }

    X = pd.DataFrame([input_data])

    # Model prediction probability
    probability = float(
        model.predict_proba(X)[0][1]
    )

    predicted_class = int(
        probability >= 0.50
    )

    # --------------------------------------------------------
    # Risk classification
    #
    # These levels follow the project's risk scoring config:
    # LOW      < 0.20
    # MEDIUM   0.20 - 0.39
    # HIGH     0.40 - 0.59
    # CRITICAL >= 0.60
    # --------------------------------------------------------

    if probability < 0.20:
        risk_level = "LOW"
        recommended_action = (
            "Continue routine monitoring"
        )

    elif probability < 0.40:
        risk_level = "MEDIUM"
        recommended_action = (
            "Schedule inspection within 30 days"
        )

    elif probability < 0.60:
        risk_level = "HIGH"
        recommended_action = (
            "Schedule inspection within 7 days"
        )

    else:
        risk_level = "CRITICAL"
        recommended_action = (
            "Schedule immediate inspection"
        )

    result = {
        "prediction": {
            "predicted_probability": round(
                probability,
                6
            ),
            "predicted_class": predicted_class,
            "risk_probability": round(
                probability,
                6
            ),
            "risk_score": round(
                probability * 100,
                2
            ),
            "risk_level": risk_level,
            "recommended_action": recommended_action,
        }
    }

    return result


# ============================================================
# COMMAND LINE INTERFACE
# ============================================================

def main():

    print("=" * 70)
    print("RAILWAY PREDICTIVE MAINTENANCE — ML INFERENCE")
    print("=" * 70)

    # --------------------------------------------------------
    # JSON input from command line
    #
    # Example:
    #
    # python src/models/predict.py input.json
    # --------------------------------------------------------

    if len(sys.argv) != 2:
        print(
            "\nUsage:"
        )

        print(
            "python src/models/predict.py input.json"
        )

        sys.exit(1)

    input_file = Path(sys.argv[1])

    if not input_file.exists():
        print(
            f"\nInput file not found: {input_file}"
        )
        sys.exit(1)

    try:

        with open(
            input_file,
            "r"
        ) as f:

            data = json.load(f)

        result = predict_risk(data)

        print("\n" + "=" * 70)
        print("PREDICTION RESULT")
        print("=" * 70)

        print(
            json.dumps(
                result,
                indent=2
            )
        )

    except Exception as e:

        print(
            "\nPrediction failed:"
        )

        print(str(e))

        sys.exit(1)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()
