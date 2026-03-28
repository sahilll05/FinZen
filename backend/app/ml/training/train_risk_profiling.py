"""
Training script for Dynamic Risk Profiling Random Forest Model.

Run: python -m app.ml.training.train_risk_profiling
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import os


def generate_synthetic_data(n_samples=3000):
    np.random.seed(42)

    data = {
        "age": np.random.randint(18, 75, n_samples),
        "annual_income": np.random.uniform(10000, 500000, n_samples),
        "investment_experience_years": np.random.randint(0, 30, n_samples),
        "investment_goal": np.random.randint(0, 3, n_samples),  # 0=preservation, 1=income, 2=growth
        "time_horizon_years": np.random.randint(1, 30, n_samples),
        "loss_tolerance_pct": np.random.uniform(0, 50, n_samples),
        "has_emergency_fund": np.random.randint(0, 2, n_samples),
        "debt_to_income_ratio": np.random.uniform(0, 1.5, n_samples),
        "country_risk_score": np.random.uniform(0, 10, n_samples),
    }

    df = pd.DataFrame(data)

    # Target: risk score 0-100
    df["risk_score"] = np.clip(
        50
        + (30 - df["age"]) * 0.3
        + df["investment_experience_years"] * 1.2
        + df["investment_goal"] * 8
        + df["time_horizon_years"] * 0.8
        + df["loss_tolerance_pct"] * 0.5
        + df["has_emergency_fund"] * 5
        - df["debt_to_income_ratio"] * 15
        - df["country_risk_score"] * 2
        + np.random.normal(0, 5, n_samples),
        0, 100,
    )

    return df


def train():
    print("=" * 60)
    print("🔧 Training Risk Profiling Random Forest Model")
    print("=" * 60)

    df = generate_synthetic_data()

    feature_cols = [
        "age", "annual_income", "investment_experience_years",
        "investment_goal", "time_horizon_years", "loss_tolerance_pct",
        "has_emergency_fund", "debt_to_income_ratio", "country_risk_score",
    ]

    X = df[feature_cols].values
    y = df["risk_score"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    print("Training...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"✅ Model trained! MAE: {mae:.3f} (on 0-100 scale)")

    os.makedirs("trained_models", exist_ok=True)
    joblib.dump(model, "trained_models/risk_profiling_model.joblib")
    print("💾 Saved to trained_models/risk_profiling_model.joblib")


if __name__ == "__main__":
    train()