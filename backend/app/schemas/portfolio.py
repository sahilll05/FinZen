from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class HoldingCreate(BaseModel):
    ticker: str
    company_name: Optional[str] = ""
    country: Optional[str] = "US"
    sector: Optional[str] = ""
    quantity: float
    avg_cost: float


class HoldingResponse(BaseModel):
    id: int
    ticker: str
    company_name: str
    country: str
    sector: str
    quantity: float
    avg_cost: float
    current_price: Optional[float] = None
    market_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None

    class Config:
        from_attributes = True


class PortfolioUpload(BaseModel):
    """For uploading a portfolio via JSON."""
    name: Optional[str] = "My Portfolio"
    currency: Optional[str] = "USD"
    holdings: List[HoldingCreate]


class PortfolioSummary(BaseModel):
    portfolio_id: int
    name: str
    total_invested: float
    current_value: float
    total_gain_loss: float
    total_gain_loss_pct: float
    holdings_count: int
    countries_exposed: List[str]
    sectors_exposed: List[str]
    holdings: List[HoldingResponse]