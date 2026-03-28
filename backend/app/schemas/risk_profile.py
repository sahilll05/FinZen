from pydantic import BaseModel
from typing import Optional, List


class RiskProfileRequest(BaseModel):
    age: int
    annual_income: float
    investment_experience_years: int
    country: str
    investment_goal: str           # "growth", "income", "preservation"
    time_horizon_years: int
    loss_tolerance_pct: float      # max acceptable loss %
    has_emergency_fund: bool
    debt_to_income_ratio: float


class RiskProfileResponse(BaseModel):
    risk_score: float              # 0-100
    risk_category: str             # Conservative / Moderate / Aggressive
    recommended_allocation: dict   # {"stocks": 60, "bonds": 30, "cash": 10}
    country_adjustment: str
    behavioral_notes: List[str]
    confidence: float