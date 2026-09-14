"""
Railway Predictive Maintenance
Live ML Feature Builder + Inference

Prototype version:
- Reads the latest available snapshot for an asset
- Extracts the exact 51 features expected by predict.py
- Runs the trained Random Forest pipeline
- Returns risk probability, score, level and action

Usage:
    python src/features/build_live_features.py AST000001
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

DATASET_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "enhanced_temporal_ml_dataset.csv"
)

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "best_predictive_maintenance_model.joblib"
)


# ============================================================
# EXACT 51 MODEL FEATURES
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
# LOAD DATASET
# ============================================================

def load_dataset():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n{DATASET_PATH}"
        )

    print(f"Loading feature dataset: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    if "snapshot_date" in df.columns:
        df["snapshot_date"] = pd.to_datetime(
            df["snapshot_date"],
            errors="coerce"
        )

    print(
        f"Dataset loaded: "
        f"{len(df):,} rows, "
        f"{len(df.columns)} columns"
    )

    return df


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found:\n{MODEL_PATH}"
        )

    print(f"Loading model: {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)

    print("Model loaded successfully.")

    return model


# ============================================================
# BUILD FEATURES
# ============================================================

def build_features(asset_id):
    df = load_dataset()

    asset_df = df[
        df["asset_id"].astype(str) == str(asset_id)
    ].copy()

    if asset_df.empty:
        raise ValueError(
            f"Asset not found in dataset: {asset_id}"
        )

    # Use latest available snapshot.
    if "snapshot_date" in asset_df.columns:
        asset_df = asset_df.sort_values(
            "snapshot_date"
        )

    row = asset_df.iloc[-1]

    missing = [
        feature
        for feature in REQUIRED_FEATURES
        if feature not in row.index
    ]

    if missing:
        raise ValueError(
            "Missing model features:\n"
            + "\n".join(
                f"- {feature}"
                for feature in missing
            )
        )

    features = {}

    for feature in REQUIRED_FEATURES:
        value = row[feature]

        # Convert pandas/numpy values into normal
        # Python values where possible.
        if pd.isna(value):
            value = 0

        features[feature] = value

    return features, row


# ============================================================
# PREDICT
# ============================================================

def predict(features):
    model = load_model()

    X = pd.DataFrame(
        [features],
        columns=REQUIRED_FEATURES
    )

    probability = float(
        model.predict_proba(X)[0][1]
    )

    predicted_class = int(
        probability >= 0.50
    )

    # Risk classification
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

    return {
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


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print(
        "RAILWAY PREDICTIVE MAINTENANCE"
        " — LIVE FEATURE BUILDER"
    )
    print("=" * 70)

    if len(sys.argv) != 2:
        print("\nUsage:")
        print(
            "python "
            "src/features/build_live_features.py "
            "AST000001"
        )
        sys.exit(1)

    asset_id = sys.argv[1]

    try:

        print(f"\nAsset requested: {asset_id}")

        features, row = build_features(
            asset_id
        )

        print(
            f"Snapshot used: "
            f"{row.get('snapshot_date', 'N/A')}"
        )

        print(
            f"Features prepared: "
            f"{len(features)}"
        )

        result = predict(features)

        output = {
            "asset_id": asset_id,
            "snapshot_date": str(
                row.get(
                    "snapshot_date",
                    ""
                )
            ),
            "features": features,
            "prediction": result,
        }

        print("\n" + "=" * 70)
        print("ML PREDICTION")
        print("=" * 70)

        print(
            json.dumps(
                output,
                indent=2,
                default=str
            )
        )

    except Exception as e:

        print("\nPrediction failed:")
        print(str(e))

        sys.exit(1)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()
