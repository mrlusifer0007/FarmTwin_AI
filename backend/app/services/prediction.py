"""Loads the trained crop-health model (ml/model.pkl) and scores a farm's
current features. See ml/train.py for how the bundle is built and
ml/generate_dataset.py for the (synthetic, placeholder) training data.
"""
import os
import threading
from typing import Dict, Optional

import joblib
import pandas as pd

_MODEL_PATH = os.getenv(
    "HEALTH_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "model.pkl"),
)

_lock = threading.Lock()
_bundle: Optional[Dict] = None


class ModelNotAvailableError(RuntimeError):
    """Raised when model.pkl hasn't been trained/found yet."""


def _load_bundle() -> Dict:
    global _bundle
    if _bundle is not None:
        return _bundle
    with _lock:
        if _bundle is not None:
            return _bundle
        path = os.path.abspath(_MODEL_PATH)
        if not os.path.exists(path):
            raise ModelNotAvailableError(
                f"No trained model found at '{path}'. Run ml/generate_dataset.py "
                "then ml/train.py first, or set HEALTH_MODEL_PATH."
            )
        _bundle = joblib.load(path)
        return _bundle


def predict_health(
    ndvi_mean: float,
    ndvi_change_pct: float,
    rainfall_7d_mm: float,
    rainfall_30d_mm: float,
    temperature_avg_7d_c: float,
    humidity_avg_7d_pct: float,
    crop_type: str,
    crop_age_days: int,
) -> Dict:
    bundle = _load_bundle()
    model = bundle["model"]
    feature_columns = bundle["feature_columns"]
    health_labels = bundle["health_labels"]

    row = pd.DataFrame(
        [
            {
                "ndvi_mean": ndvi_mean,
                "ndvi_change_pct": ndvi_change_pct,
                "rainfall_7d_mm": rainfall_7d_mm,
                "rainfall_30d_mm": rainfall_30d_mm,
                "temperature_avg_7d_c": temperature_avg_7d_c,
                "humidity_avg_7d_pct": humidity_avg_7d_pct,
                "crop_age_days": crop_age_days,
                "crop_type": crop_type,
            }
        ]
    )
    encoded = pd.get_dummies(row, columns=["crop_type"], prefix="croptype")
    for col in feature_columns:
        if col not in encoded.columns:
            encoded[col] = 0
    X = encoded[feature_columns]

    pred_class = int(model.predict(X)[0])
    proba = model.predict_proba(X)[0]
    confidence = float(max(proba))

    return {
        "health_score": pred_class,
        "health_label": health_labels[pred_class],
        "confidence": round(confidence, 3),
    }
