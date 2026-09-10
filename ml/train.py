"""Train the crop-health classifier (Phase 5).

Input features (mirrors the plan's ML section):
  ndvi_mean, ndvi_change_pct, rainfall_7d_mm, rainfall_30d_mm,
  temperature_avg_7d_c, humidity_avg_7d_pct, crop_type, crop_age_days
Output: health in {0: stressed, 1: moderate, 2: healthy}

Usage:
    python train.py [--data dataset.csv] [--out model.pkl]
"""
import argparse
import json

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

FEATURE_COLUMNS = [
    "ndvi_mean",
    "ndvi_change_pct",
    "rainfall_7d_mm",
    "rainfall_30d_mm",
    "temperature_avg_7d_c",
    "humidity_avg_7d_pct",
    "crop_age_days",
]
CATEGORICAL_COLUMNS = ["crop_type"]
LABEL_COLUMN = "health"
HEALTH_LABELS = {0: "stressed", 1: "moderate", 2: "healthy"}


def build_features(df: pd.DataFrame, dummy_columns=None) -> pd.DataFrame:
    """One-hot encode crop_type. If dummy_columns is given (inference time),
    align to that exact column set so the model always sees the same shape."""
    encoded = pd.get_dummies(df, columns=CATEGORICAL_COLUMNS, prefix="croptype")
    feature_cols = FEATURE_COLUMNS + [c for c in encoded.columns if c.startswith("croptype_")]

    if dummy_columns is not None:
        for col in dummy_columns:
            if col not in encoded.columns:
                encoded[col] = 0
        return encoded[dummy_columns]

    return encoded[feature_cols], feature_cols


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=str, default="dataset.csv")
    parser.add_argument("--out", type=str, default="model.pkl")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = pd.read_csv(args.data)
    X, feature_columns = build_features(df)
    y = df[LABEL_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.seed, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200, max_depth=8, min_samples_leaf=5, random_state=args.seed
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {acc:.3f}\n")
    print(
        classification_report(
            y_test, y_pred, target_names=[HEALTH_LABELS[i] for i in sorted(HEALTH_LABELS)]
        )
    )

    importances = sorted(
        zip(feature_columns, model.feature_importances_), key=lambda x: -x[1]
    )
    print("Feature importances:")
    for name, imp in importances:
        print(f"  {name}: {imp:.3f}")

    bundle = {
        "model": model,
        "feature_columns": feature_columns,
        "health_labels": HEALTH_LABELS,
        "test_accuracy": acc,
    }
    joblib.dump(bundle, args.out)
    print(f"\nSaved model bundle to {args.out}")

    # Small human-readable sidecar, handy for the README / sanity checks.
    with open(args.out.replace(".pkl", "_metrics.json"), "w") as f:
        json.dump({"test_accuracy": acc, "n_train": len(X_train), "n_test": len(X_test)}, f, indent=2)


if __name__ == "__main__":
    main()
