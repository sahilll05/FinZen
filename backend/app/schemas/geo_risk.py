from pydantic import BaseModel
from typing import List, Optional, Dict


class CountryRiskRequest(BaseModel):
    country_code: str   # ISO 2-letter e.g., "US", "IR", "IN"


class RiskDimension(BaseModel):
    dimension: str
    score: float        # 0-10 scale
    level: str          # LOW / MODERATE / HIGH / CRITICAL
    drivers: List[str]


class SectorImpact(BaseModel):
    sector: str
    direction: str      # BULLISH / BEARISH / NEUTRAL
    magnitude: str      # e.g., "+20%", "-15%"
    driver: str


class StockRecommendation(BaseModel):
    ticker: str
    sector: str
    signal: str         # BUY / HOLD / AVOID
    expected_return: str
    confidence: float
    reasoning: str


class CountryRiskResponse(BaseModel):
    country_code: str
    country_name: str
    risk_dimensions: List[RiskDimension]
    overall_score: float
    overall_level: str
    sector_impacts: List[SectorImpact]
    recommendations: List[StockRecommendation]


class PortfolioGeoExposure(BaseModel):
    portfolio_id: int
    country_exposures: Dict[str, float]  # country -> % of portfolio
    high_risk_exposure: float            # % in high-risk countries
    risk_summary: str