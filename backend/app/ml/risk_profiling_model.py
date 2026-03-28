"""
Dynamic Risk Profiling Model — Random Forest classifier.
Classifies investor risk tolerance into categories.
"""

import os
import numpy as np
import joblib

MODEL_PATH = "trained_models/risk_profiling_model.joblib"
_model = None


def load_model():
    global _model
    if os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
        print("✅ Risk Profiling Random Forest model loaded")
        return True
    print("ℹ️ No trained risk profiling model found. Using rule-based fallback.")
    return False


def predict_risk_profile(features: dict) -> dict:
    """
    Predict investor risk profile.
    
    Features:
        age, annual_income, investment_experience_years,
        investment_goal (encoded), time_horizon_years,
        loss_tolerance_pct, has_emergency_fund (0/1),
        debt_to_income_ratio, country_risk_score
    
    Returns:
        {
            "risk_score": float (0-100),
            "risk_category": str,
            "recommended_allocation": dict,
            "confidence": float
        }
    """
    global _model

    # Encode investment goal
    goal_map = {"preservation": 0, "income": 1, "growth": 2}
    goal_encoded = goal_map.get(features.get("investment_goal", "growth"), 2)

    feature_array = np.array([[
        features.get("age", 30),
        features.get("annual_income", 50000),
        features.get("investment_experience_years", 2),
        goal_encoded,
        features.get("time_horizon_years", 5),
        features.get("loss_tolerance_pct", 15),
        1 if features.get("has_emergency_fund", True) else 0,
        features.get("debt_to_income_ratio", 0.3),
        features.get("country_risk_score", 3.0),
    ]])

    if _model is not None:
        try:
            prediction = _model.predict(feature_array)[0]
            probability = _model.predict_proba(feature_array)[0]
            confidence = float(max(probability))
            risk_score = float(prediction)
        except Exception:
            risk_score = _rule_based_risk(features)
            confidence = 0.7
    else:
        risk_score = _rule_based_risk(features)
        confidence = 0.7

    # Determine category
    if risk_score <= 33:
        category = "Conservative"
        allocation = {"stocks": 30, "bonds": 50, "cash": 20}
    elif risk_score <= 66:
        category = "Moderate"
        allocation = {"stocks": 60, "bonds": 30, "cash": 10}
    else:
        category = "Aggressive"
        allocation = {"stocks": 80, "bonds": 15, "cash": 5}

    return {
        "risk_score": round(risk_score, 1),
        "risk_category": category,
        "recommended_allocation": allocation,
        "confidence": round(confidence, 2),
    }


def _rule_based_risk(features: dict) -> float:
    """Heuristic risk scoring."""
    score = 50.0  # Start at moderate

    age = features.get("age", 30)
    if age < 30:
        score += 15
    elif age > 55:
        score -= 20

    experience = features.get("investment_experience_years", 2)
    score += min(experience * 3, 15)

    goal = features.get("investment_goal", "growth")
    if goal == "growth":
        score += 10
    elif goal == "preservation":
        score -= 15

    horizon = features.get("time_horizon_years", 5)
    score += min(horizon * 2, 15)

    loss_tol = features.get("loss_tolerance_pct", 15)
    score += loss_tol * 0.5

    if not features.get("has_emergency_fund", True):
        score -= 10

    dti = features.get("debt_to_income_ratio", 0.3)
    if dti > 0.5:
        score -= 15

    country_risk = features.get("country_risk_score", 3.0)
    if country_risk > 6:
        score -= 10  # High country risk → more conservative

    return max(0, min(100, score))


load_model()