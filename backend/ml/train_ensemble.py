"""Multi-Model ML Ensemble Training Pipeline for Crop Health & Risk Prediction.

Uses Scikit-Learn (Random Forest, Gradient Boosting) + XGBoost & LightGBM (if installed)
to train an ensemble risk model for climate stress and crop health score prediction.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Try importing XGBoost & LightGBM with graceful fallbacks
try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import lightgbm as lgb
    HAS_LGB = True
except ImportError:
    HAS_LGB = False


def generate_synthetic_crop_dataset(n_samples=1000):
    np.random.seed(42)
    ndvi_mean = np.random.uniform(0.15, 0.88, n_samples)
    rainfall_7d = np.random.uniform(0, 120, n_samples)
    temp_7d = np.random.uniform(18, 42, n_samples)
    humidity_7d = np.random.uniform(25, 95, n_samples)
    crop_age = np.random.randint(10, 140, n_samples)
    
    # Target: Crop Health Score (0-100)
    # Higher NDVI + moderate temp + good rain = higher health
    health_score = (
        ndvi_mean * 60 + 
        np.where((temp_7d >= 22) & (temp_7d <= 32), 20, 5) + 
        np.where((rainfall_7d >= 15) & (rainfall_7d <= 60), 20, 5) -
        np.where(humidity_7d > 85, 10, 0)
    )
    health_score = np.clip(health_score + np.random.normal(0, 3, n_samples), 10, 99)

    df = pd.DataFrame({
        "ndvi_mean": ndvi_mean,
        "rainfall_7d_mm": rainfall_7d,
        "temperature_avg_7d_c": temp_7d,
        "humidity_avg_7d_pct": humidity_7d,
        "crop_age_days": crop_age,
        "health_score": health_score
    })
    return df


def train_ensemble():
    print("Generating synthetic agricultural training dataset...")
    df = generate_synthetic_crop_dataset(1500)
    
    X = df[["ndvi_mean", "rainfall_7d_mm", "temperature_avg_7d_c", "humidity_avg_7d_pct", "crop_age_days"]]
    y = df["health_score"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    models = {}
    print("\nTraining Ensemble Models:")
    
    # 1. Random Forest (Scikit-Learn)
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    models["RandomForest"] = (rf, r2_score(y_test, rf_pred))
    print(f"  [Scikit-Learn] Random Forest R2: {models['RandomForest'][1]:.4f}")
    
    # 2. Gradient Boosting (Scikit-Learn)
    gb = GradientBoostingRegressor(n_estimators=100, random_state=42)
    gb.fit(X_train, y_train)
    gb_pred = gb.predict(X_test)
    models["GradientBoosting"] = (gb, r2_score(y_test, gb_pred))
    print(f"  [Scikit-Learn] Gradient Boosting R2: {models['GradientBoosting'][1]:.4f}")
    
    # 3. XGBoost (if available)
    if HAS_XGB:
        xgb_model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.05, random_state=42)
        xgb_model.fit(X_train, y_train)
        xgb_pred = xgb_model.predict(X_test)
        models["XGBoost"] = (xgb_model, r2_score(y_test, xgb_pred))
        print(f"  [XGBoost] XGBRegressor R2: {models['XGBoost'][1]:.4f}")
    else:
        print("  [XGBoost] Skipped (package not installed, using Scikit-Learn fallback)")

    # 4. LightGBM (if available)
    if HAS_LGB:
        lgb_model = lgb.LGBMRegressor(n_estimators=100, learning_rate=0.05, random_state=42, verbose=-1)
        lgb_model.fit(X_train, y_train)
        lgb_pred = lgb_model.predict(X_test)
        models["LightGBM"] = (lgb_model, r2_score(y_test, lgb_pred))
        print(f"  [LightGBM] LGBMRegressor R2: {models['LightGBM'][1]:.4f}")
    else:
        print("  [LightGBM] Skipped (package not installed, using Scikit-Learn fallback)")

    # Save best performing model bundle
    best_name, (best_model, best_r2) = max(models.items(), key=lambda x: x[1][1])
    print(f"\nBest Model selected: {best_name} with R2 score {best_r2:.4f}")
    
    out_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(out_dir, "model.pkl")
    
    bundle = {
        "model": best_model,
        "model_type": best_name,
        "features": list(X.columns),
        "r2_score": best_r2,
        "ensemble_members": list(models.keys())
    }
    
    joblib.dump(bundle, model_path)
    print(f"Ensemble model bundle saved to {model_path}")

if __name__ == "__main__":
    train_ensemble()
