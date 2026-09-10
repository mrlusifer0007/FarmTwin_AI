"""Generate a SYNTHETIC training dataset for the crop-health classifier.

This is placeholder data, not real field observations. It encodes the
domain logic from the project plan (high NDVI + adequate rainfall +
moderate temperature -> healthy; low NDVI + drought + heat -> stressed)
with random noise on top, so the pipeline (train.py -> prediction.py ->
/api/farms/{id}/health) works end-to-end and produces sensible-looking
results. Swap this file's output for real labeled field data as soon as
you have it — a model trained only on this will not generalize to real
farms, it will just reproduce the rules baked in below.

Usage:
    python generate_dataset.py [--rows 2000] [--out dataset.csv]
"""
import argparse
import numpy as np
import pandas as pd

CROPS = ["Soybean", "Cotton", "Wheat", "Sugarcane", "Rice"]

# Crops differ in typical NDVI ceiling and drought sensitivity - loosely
# representative, not agronomically precise.
CROP_PROFILES = {
    "Soybean": {"ndvi_ceiling": 0.85, "drought_sensitivity": 1.0},
    "Cotton": {"ndvi_ceiling": 0.80, "drought_sensitivity": 0.8},
    "Wheat": {"ndvi_ceiling": 0.78, "drought_sensitivity": 0.6},
    "Sugarcane": {"ndvi_ceiling": 0.88, "drought_sensitivity": 1.2},
    "Rice": {"ndvi_ceiling": 0.90, "drought_sensitivity": 0.5},
}


def generate(n_rows: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    rows = []
    for _ in range(n_rows):
        crop = rng.choice(CROPS)
        profile = CROP_PROFILES[crop]
        crop_age_days = int(rng.integers(10, 150))

        rainfall_7d = max(0.0, rng.normal(30, 25))
        rainfall_30d = max(rainfall_7d, rng.normal(90, 50))
        temperature_avg_7d = rng.normal(29, 5)
        humidity_avg_7d = float(np.clip(rng.normal(55, 15), 10, 100))

        # Water/heat stress score: higher = more stressed conditions.
        drought_score = max(0.0, (40 - rainfall_7d) / 40) * profile["drought_sensitivity"]
        heat_score = max(0.0, (temperature_avg_7d - 32) / 10)
        stress_pressure = np.clip(drought_score + heat_score, 0, 1.5)

        # NDVI responds to stress pressure, crop ceiling, growth stage, and noise.
        growth_factor = np.clip(crop_age_days / 90, 0.2, 1.0)  # young/very old fields skew lower
        base_ndvi = profile["ndvi_ceiling"] * growth_factor
        ndvi_mean = base_ndvi - 0.35 * stress_pressure + rng.normal(0, 0.05)
        ndvi_mean = float(np.clip(ndvi_mean, 0.05, 0.95))

        # Previous NDVI implies ndvi_change; more stress -> more likely declining.
        prior_ndvi = ndvi_mean + rng.normal(0.05 * stress_pressure, 0.06)
        prior_ndvi = float(np.clip(prior_ndvi, 0.05, 0.95))
        ndvi_change_pct = ((ndvi_mean - prior_ndvi) / prior_ndvi) * 100 if prior_ndvi > 0 else 0.0

        # Label from NDVI + stress pressure (matches the plan's 0/1/2 scheme).
        if ndvi_mean >= 0.6 and stress_pressure < 0.4:
            health = 2  # healthy
        elif ndvi_mean < 0.35 or stress_pressure > 0.9:
            health = 0  # stressed
        else:
            health = 1  # moderate

        # A little label noise so the classifier doesn't overfit to a hard rule.
        if rng.random() < 0.05:
            health = int(np.clip(health + rng.choice([-1, 1]), 0, 2))

        rows.append(
            {
                "ndvi_mean": round(ndvi_mean, 4),
                "ndvi_change_pct": round(ndvi_change_pct, 2),
                "rainfall_7d_mm": round(rainfall_7d, 1),
                "rainfall_30d_mm": round(rainfall_30d, 1),
                "temperature_avg_7d_c": round(float(temperature_avg_7d), 2),
                "humidity_avg_7d_pct": round(humidity_avg_7d, 1),
                "crop_type": crop,
                "crop_age_days": crop_age_days,
                "health": health,
            }
        )

    return pd.DataFrame(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=2000)
    parser.add_argument("--out", type=str, default="dataset.csv")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = generate(args.rows, seed=args.seed)
    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} synthetic rows to {args.out}")
    print(df["health"].value_counts().rename({0: "stressed", 1: "moderate", 2: "healthy"}))
