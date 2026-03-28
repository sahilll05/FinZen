"""
Training script for Geopolitical Risk XGBoost Model.

Run: python -m app.ml.training.train_geo_risk

Generates synthetic training data and trains the model.
In production, replace with real GDELT + ACLED + World Bank data.
"""

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.multioutput import MultiOutputRegressor
import joblib
import os


def generate_synthetic_data(n_samples=5000):
    """Generate synthetic geopolitical data for training."""
    np.random.seed(42)

    data = {
        "gdelt_event_count": np.random.randint(0, 500, n_samples),
        "gdelt_avg_tone": np.random.uniform(-8, 4, n_samples),
        "conflict_count": np.random.randint(0, 50, n_samples),
        "inflation_rate": np.random.uniform(0, 80, n_samples),
        "gdp_growth": np.random.uniform(-10, 15, n_samples),
        "currency_volatility": np.random.uniform(0, 10, n_samples),
        "sanctions_count": np.random.randint(0, 5, n_samples),
        "political_stability_index": np.random.uniform(-3, 2, n_samples),
        "press_freedom_index": np.random.uniform(0, 100, n_samples),
        "trade_openness": np.random.uniform(10, 100, n_samples),
    }

    df = pd.DataFrame(data)

    # Generate correlated target scores (6 risk dimensions)
    df["war_risk"] = np.clip(
        df["conflict_count"] * 0.15 + abs(np.minimum(df["gdelt_avg_tone"], 0)) * 0.8
        + np.random.normal(0, 0.5, n_samples), 0, 10
    )
    df["sanctions_risk"] = np.clip(
        df["sanctions_count"] * 2.0 + np.random.normal(0, 0.5, n_samples), 0, 10
    )
    df["regulatory_risk"] = np.clip(
        5 - df["political_stability_index"] * 1.5 + np.random.normal(0, 0.5, n_samples), 0, 10
    )
    df["economic_risk"] = np.clip(
        df["inflation_rate"] * 0.08 + np.maximum(-df["gdp_growth"], 0) * 0.5
        + np.random.normal(0, 0.5, n_samples), 0, 10
    )
    df["political_risk"] = np.clip(
        5 - df["political_stability_index"] * 1.8
        - df["press_freedom_index"] * 0.02 + np.random.normal(0, 0.5, n_samples), 0, 10
    )
    df["currency_risk"] = np.clip(
        df["currency_volatility"] + np.random.normal(0, 0.5, n_samples), 0, 10
    )

    return df


def train():
    print("=" * 60)
    print("🔧 Training Geopolitical Risk XGBoost Model")
    print("=" * 60)

    df = generate_synthetic_data()

    feature_cols = [
        "gdelt_event_count", "gdelt_avg_tone", "conflict_count",
        "inflation_rate", "gdp_growth", "currency_volatility",
        "sanctions_count", "political_stability_index",
        "press_freedom_index", "trade_openness",
    ]
    target_cols = [
        "war_risk", "sanctions_risk", "regulatory_risk",
        "economic_risk", "political_risk", "currency_risk",
    ]

    X = df[feature_cols].values
    y = df[target_cols].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = MultiOutputRegressor(
        XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
        )
    )

    print("Training...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"✅ Model trained! MAE: {mae:.3f} (on 0-10 scale)")

    os.makedirs("trained_models", exist_ok=True)
    joblib.dump(model, "trained_models/geo_risk_model.joblib")
    print("💾 Model saved to trained_models/geo_risk_model.joblib")


if __name__ == "__main__":
    train()