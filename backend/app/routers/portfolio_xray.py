"""
Portfolio X-Ray & Hidden Risk Router.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.db_models import Holding
from app.services.portfolio_xray_service import xray_portfolio
from app.services.market_data_service import get_stock_price

router = APIRouter()


@router.get("/analyze/{portfolio_id}")
def analyze_portfolio_xray(portfolio_id: int, db: Session = Depends(get_db)):
    """
    Deep X-Ray analysis of portfolio (by Python DB portfolio_id).
    Reveals hidden risks: supply chain, revenue geography, concentration, correlations.
    """
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
    if not holdings:
        raise HTTPException(status_code=404, detail="Portfolio not found or empty")

    holdings_data = []
    for h in holdings:
        price = get_stock_price(h.ticker)
        holdings_data.append({
            "ticker": h.ticker,
            "company_name": h.company_name,
            "country": h.country,
            "sector": h.sector,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "current_price": price or h.avg_cost,
            "market_value": h.quantity * (price or h.avg_cost),
            "portfolio_id": portfolio_id,
        })

    return xray_portfolio(holdings_data)


@router.post("/analyze/holdings")
def analyze_holdings_direct(body: dict):
    """
    Direct X-Ray analysis using raw holdings from Appwrite (no Python DB needed).
    
    Accepts: { "holdings": [{ "ticker", "quantity", "avg_cost", "sector", "country", "company_name" }] }
    """
    raw_holdings = body.get("holdings", [])
    if not raw_holdings:
        raise HTTPException(status_code=400, detail="No holdings provided")

    holdings_data = []
    for h in raw_holdings:
        ticker = h.get("ticker", "")
        quantity = float(h.get("quantity", 0))
        avg_cost = float(h.get("avg_cost", 0))
        price = get_stock_price(ticker) or avg_cost
        market_value = quantity * price

        holdings_data.append({
            "ticker": ticker,
            "company_name": h.get("company_name", ticker),
            "country": h.get("country", "US"),
            "sector": h.get("sector", "Unknown"),
            "quantity": quantity,
            "avg_cost": avg_cost,
            "current_price": price,
            "market_value": market_value,
            "portfolio_id": h.get("portfolio_id", ""),
        })

    return xray_portfolio(holdings_data)