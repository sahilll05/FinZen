"""
Geopolitical Risk Model — XGBoost classifier.
Predicts risk scores (0-10) for each of 6 risk dimensions.

Uses trained model if available, falls back to rule-based scoring.
"""

import os
import numpy as np
import joblib

MODEL_PATH = "trained_models/geo_risk_model.joblib"
_model = None


def load_model():
    global _model
    if os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
        print("✅ Geo Risk XGBoost model loaded")
        return True
    print("ℹ️ No trained geo risk model found. Using rule-based fallback.")
    return False


def predict_risk_scores(features: dict) -> dict:
    """
    Predict 6 risk dimension scores for a country.
    
    Input features:
        - gdelt_event_count: int (recent events involving country)
        - gdelt_avg_tone: float (average tone, negative = hostile)
        - conflict_count: int (ACLED conflict events)
        - inflation_rate: float
        - gdp_growth: float
        - currency_volatility: float
        - sanctions_count: int
        - political_stability_index: float
        - press_freedom_index: float
        - trade_openness: float
    
    Returns dict with 6 risk dimensions (0-10 each).
    """
    global _model

    if _model is not None:
        try:
            feature_array = np.array([[
                features.get("gdelt_event_count", 50),
                features.get("gdelt_avg_tone", -1.0),
                features.get("conflict_count", 5),
                features.get("inflation_rate", 3.0),
                features.get("gdp_growth", 2.0),
                features.get("currency_volatility", 5.0),
                features.get("sanctions_count", 0),
                features.get("political_stability_index", 0.0),
                features.get("press_freedom_index", 50.0),
                features.get("trade_openness", 50.0),
            ]])
            predictions = _model.predict(feature_array)
            return {
                "war_risk": float(np.clip(predictions[0][0], 0, 10)),
                "sanctions_risk": float(np.clip(predictions[0][1], 0, 10)),
                "regulatory_risk": float(np.clip(predictions[0][2], 0, 10)),
                "economic_risk": float(np.clip(predictions[0][3], 0, 10)),
                "political_risk": float(np.clip(predictions[0][4], 0, 10)),
                "currency_risk": float(np.clip(predictions[0][5], 0, 10)),
            }
        except Exception as e:
            print(f"Model prediction error: {e}")

    # ── Rule-based fallback ──
    return _rule_based_scoring(features)


def _rule_based_scoring(features: dict) -> dict:
    """Heuristic scoring when no trained model available."""
    conflict = features.get("conflict_count", 5)
    tone = features.get("gdelt_avg_tone", -1.0)
    inflation = features.get("inflation_rate", 3.0)
    sanctions = features.get("sanctions_count", 0)
    volatility = features.get("currency_volatility", 5.0)
    stability = features.get("political_stability_index", 0.0)

    war_risk = min(10, max(0, conflict * 0.5 + abs(min(tone, 0)) * 2))
    sanctions_risk = min(10, sanctions * 2.5)
    regulatory_risk = min(10, max(0, 5 - stability * 2))
    economic_risk = min(10, max(0, inflation * 0.3 + max(0, -features.get("gdp_growth", 2)) * 2))
    political_risk = min(10, max(0, 5 - stability * 2.5))
    currency_risk = min(10, volatility)

    return {
        "war_risk": round(war_risk, 1),
        "sanctions_risk": round(sanctions_risk, 1),
        "regulatory_risk": round(regulatory_risk, 1),
        "economic_risk": round(economic_risk, 1),
        "political_risk": round(political_risk, 1),
        "currency_risk": round(currency_risk, 1),
    }


# Try to load model on import
load_model()