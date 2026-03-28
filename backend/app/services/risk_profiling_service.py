"""
Dynamic Risk Profiling Service.
"""

from app.ml.risk_profiling_model import predict_risk_profile
from app.services.geo_risk_service import analyze_country_risk


def create_risk_profile(profile_data: dict) -> dict:
    """Create a dynamic risk profile for an investor."""
    # Get country risk score
    country_code = profile_data.get("country", "US")
    country_risk = analyze_country_risk(country_code)
    country_risk_score = country_risk["overall_score"]

    # Add country risk to features
    features = {**profile_data, "country_risk_score": country_risk_score}

    # Get ML prediction
    result = predict_risk_profile(features)

    # Country adjustment note
    if country_risk_score > 6:
        country_adj = f"Risk profile adjusted DOWN due to high country risk ({country_code}: {country_risk_score}/10)"
    elif country_risk_score < 3:
        country_adj = f"Stable country ({country_code}: {country_risk_score}/10) — no adjustment needed"
    else:
        country_adj = f"Moderate country risk ({country_code}: {country_risk_score}/10)"

    # Behavioral notes
    notes = []
    if profile_data.get("age", 30) > 55:
        notes.append("Age suggests more conservative allocation")
    if profile_data.get("loss_tolerance_pct", 15) > 30:
        notes.append("High loss tolerance — ensure this matches actual behavior during drawdowns")
    if not profile_data.get("has_emergency_fund", True):
        notes.append("⚠️ No emergency fund — consider building 6-month expenses before investing aggressively")
    if profile_data.get("debt_to_income_ratio", 0.3) > 0.5:
        notes.append("⚠️ High debt-to-income ratio — consider paying down debt first")

    return {
        "risk_score": result["risk_score"],
        "risk_category": result["risk_category"],
        "recommended_allocation": result["recommended_allocation"],
        "country_adjustment": country_adj,
        "behavioral_notes": notes,
        "confidence": result["confidence"],
    }