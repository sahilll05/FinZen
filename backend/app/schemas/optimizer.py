from pydantic import BaseModel
from typing import List, Optional, Dict


class OptimizationRequest(BaseModel):
    portfolio_id: int
    constraints: Optional[Dict] = {}
    # Example constraints:
    # {
    #   "max_position_pct": 30,       max % per stock
    #   "min_positions": 3,           min number of stocks
    #   "max_sector_pct": 40,         max % per sector
    #   "exclude_sectors": ["Oil"],   sectors to exclude
    #   "max_country_risk": 7.0,      max geo risk score
    #   "target_return": 0.15         target annual return
    # }


class OptimizedHolding(BaseModel):
    ticker: str
    current_weight: float
    optimized_weight: float
    change: float
    reasoning: str


class OptimizationResponse(BaseModel):
    portfolio_id: int
    status: str
    expected_return: float
    expected_risk: float
    sharpe_ratio: float
    allocations: List[OptimizedHolding]
    constraints_applied: List[str]