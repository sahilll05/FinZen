from pydantic import BaseModel
from typing import List, Dict, Optional


class XRayRequest(BaseModel):
    portfolio_id: int


class ExposureDetail(BaseModel):
    category: str          # "country", "sector", "supply_chain"
    name: str
    exposure_pct: float
    risk_level: str


class XRayResponse(BaseModel):
    portfolio_id: int
    country_exposure: List[ExposureDetail]
    sector_exposure: List[ExposureDetail]
    concentration_risks: List[str]
    hidden_risks: List[str]
    correlation_warning: Optional[str] = None
    overall_risk_score: float
    recommendations: List[str]