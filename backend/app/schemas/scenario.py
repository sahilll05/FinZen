from pydantic import BaseModel
from typing import List, Optional, Dict


class ScenarioRequest(BaseModel):
    portfolio_id: int
    scenario_name: str              # "oil_shock", "recession", "war", "custom"
    custom_params: Optional[Dict] = {}
    # custom_params example:
    # {"oil_change_pct": 30, "usd_change_pct": -10, "affected_country": "IR"}


class StockImpact(BaseModel):
    ticker: str
    current_value: float
    scenario_value: float
    change_pct: float
    impact_driver: str


class ScenarioResponse(BaseModel):
    scenario_name: str
    description: str
    portfolio_id: int
    current_portfolio_value: float
    scenario_portfolio_value: float
    total_impact_pct: float
    stock_impacts: List[StockImpact]
    historical_precedent: Optional[str] = None
    hedging_suggestions: List[str]