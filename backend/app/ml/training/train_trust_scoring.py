"""
Training script for Trust Scoring XGBoost Model.

Run: python -m app.ml.training.train_trust_scoring
"""

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import os


def generate_synthetic_data(n_samples=3000):
    np.random.seed(42)

    data = {
        "source_historical_accuracy": np.random.uniform(20, 100, n_samples),
        "article_length": np.random.randint(50, 5000, n_samples),
        "has_citations": np.random.randint(0, 2, n_samples),
        "sentiment_extremity": np.random.uniform(0, 1, n_samples),
        "cross_source_agreement": np.random.uniform(0, 1, n_samples),
        "author_credibility": np.random.uniform(0, 100, n_samples),
        "recency_hours": np.random.uniform(0, 168, n_samples),
        "hype_word_count": np.random.randint(0, 20, n_samples),
    }

    df = pd.DataFrame(data)

    # Target: trust score 0-100
    df["trust_score"] = np.clip(
        df["source_historical_accuracy"] * 0.4
        + df["cross_source_agreement"] * 30
        + df["has_citations"] * 10
        + df["author_credibility"] * 0.15
        - df["hype_word_count"] * 3
        - df["sentiment_extremity"] * 10
        + np.random.normal(0, 5, n_samples),
        0, 100,
    )

    return df


def train():
    print("=" * 60)
    print("🔧 Training Trust Scoring XGBoost Model")
    print("=" * 60)

    df = generate_synthetic_data()

    feature_cols = [
        "source_historical_accuracy", "article_length", "has_citations",
        "sentiment_extremity", "cross_source_agreement", "author_credibility",
        "recency_hours", "hype_word_count",
    ]

    X = df[feature_cols].values
    y = df["trust_score"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
    print("Training...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"✅ Model trained! MAE: {mae:.3f} (on 0-100 scale)")

    os.makedirs("trained_models", exist_ok=True)
    joblib.dump(model, "trained_models/trust_scoring_model.joblib")
    print("💾 Saved to trained_models/trust_scoring_model.joblib")


if __name__ == "__main__":
    train()