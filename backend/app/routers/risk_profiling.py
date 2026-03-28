"""
Dynamic Risk Profiling Router.
Routes aligned with frontend api.ts riskAPI.
"""

from fastapi import APIRouter
from app.schemas.risk_profile import RiskProfileRequest, RiskProfileResponse
from app.services.risk_profiling_service import create_risk_profile

router = APIRouter()

# Stored in-memory for demo (no user auth)
_demo_profile: dict = {}


# Frontend: riskAPI.submitProfile(answers) → POST /risk-profile/profile
@router.post("/profile")
def submit_profile(request: RiskProfileRequest):
    """
    Create/update a dynamic risk profile.

    Example body:
    {
        "age": 30,
        "annual_income": 80000,
        "investment_experience_years": 3,
        "country": "US",
        "investment_goal": "growth",
        "time_horizon_years": 10,
        "loss_tolerance_pct": 20,
        "has_emergency_fund": true,
        "debt_to_income_ratio": 0.25
    }
    """
    global _demo_profile
    result = create_risk_profile(request.model_dump())
    _demo_profile = result
    return result


# Frontend: riskAPI.getMyProfile() → GET /risk-profile/profile/me
@router.get("/profile/me")
def get_my_profile():
    """Get the current user's risk profile."""
    if not _demo_profile:
        return {
            "risk_score": 55.0,
            "risk_category": "Moderate",
            "recommended_allocation": {"stocks": 60, "bonds": 30, "cash": 10},
            "country_adjustment": "Standard",
            "behavioral_notes": ["Complete the risk questionnaire for a personalized profile."],
            "confidence": 0.5,
        }
    return _demo_profile


# Legacy route
@router.post("/create", response_model=RiskProfileResponse)
def create_profile_legacy(request: RiskProfileRequest):
    """Create a dynamic risk profile (legacy route)."""
    return create_risk_profile(request.model_dump())