from pydantic import BaseModel
from typing import List, Optional, Dict


class CausalTraceRequest(BaseModel):
    event: str                    # e.g., "Oil price increase"
    source_country: Optional[str] = None


class CausalLink(BaseModel):
    from_node: str
    to_node: str
    relationship: str
    impact_strength: float        # 0.0 to 1.0
    description: str


class CausalChainResponse(BaseModel):
    event: str
    chain: List[CausalLink]
    total_hops: int
    affected_sectors: List[str]
    affected_stocks: List[str]
    portfolio_impact: Optional[str] = None


class HiddenRiskResponse(BaseModel):
    portfolio_id: int
    hidden_risks: List[Dict]
    total_hidden_exposure: float
    summary: str