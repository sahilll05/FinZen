from fastapi import APIRouter, Depends, HTTPException
from appwrite.query import Query
from typing import List

from app.database import get_db
from app.config import settings
from app.services.portfolio_xray_service import xray_portfolio
from app.services.market_data_service import get_stock_price, get_stock_info
from app.services.portfolio_intelligence_service import build_portfolio_intelligence
from app.services.intelligence_audit_service import log_intelligence_audit

router = APIRouter()

DB_ID = settings.APPWRITE_DATABASE_ID
HOLDINGS_COL = settings.APPWRITE_COLLECTION_HOLDINGS

@router.get("/analyze/{portfolio_id}")
def analyze_portfolio_xray(portfolio_id: str, db = Depends(get_db)):
    """Deep X-Ray analysis of portfolio via Appwrite."""
    try:
        h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", str(portfolio_id))])
        holdings = h_res["documents"]
        
        if not holdings:
            raise HTTPException(status_code=404, detail="Portfolio not found or empty")

        holdings_data = []
        for h in holdings:
            ticker = h.get("ticker", "")
            qty = float(h.get("quantity", 0))
            avg_cost = float(h.get("avg_cost", 0))
            price = get_stock_price(ticker) or avg_cost
            
            holdings_data.append({
                "ticker": ticker,
                "company_name": h.get("company_name", ticker),
                "country": h.get("country", "US"),
                "sector": h.get("sector", "Unknown"),
                "quantity": qty,
                "avg_cost": avg_cost,
                "current_price": price,
                "market_value": qty * price,
                "portfolio_id": str(portfolio_id),
            })

        return xray_portfolio(holdings_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/holdings")
def analyze_holdings_direct(body: dict):
    """Direct X-Ray analysis using raw holdings list."""
    raw_holdings = body.get("holdings", [])
    if not raw_holdings:
        raise HTTPException(status_code=400, detail="No holdings provided")

    holdings_data = []
    for h in raw_holdings:
        ticker = h.get("ticker", "")
        quantity = float(h.get("quantity", 0))
        avg_cost = float(h.get("avg_cost", 0))
        price = get_stock_price(ticker) or avg_cost
        
        holdings_data.append({
            "ticker": ticker,
            "company_name": h.get("company_name", ticker),
            "country": h.get("country", "US"),
            "sector": h.get("sector", "Unknown"),
            "quantity": quantity,
            "avg_cost": avg_cost,
            "current_price": price,
            "market_value": quantity * price,
            "portfolio_id": h.get("portfolio_id", ""),
        })

    return xray_portfolio(holdings_data)

@router.post("/intelligence/holdings")
def get_portfolio_intelligence_direct(body: dict):
    """Structured portfolio intelligence with Appwrite support."""
    raw_holdings = body.get("holdings", []) or []
    client_context = body.get("client_context", {}) or {}

    enriched = []
    for h in raw_holdings:
        ticker = str(h.get("ticker", "")).upper().strip()
        if not ticker: continue

        stock_info = get_stock_info(ticker)
        enriched.append({
            "ticker": ticker,
            "company_name": h.get("company_name") or stock_info.get("name", ticker),
            "country": h.get("country") or stock_info.get("country", "US"),
            "sector": h.get("sector") or stock_info.get("sector", "Unclassified"),
            "quantity": float(h.get("quantity", 0)),
            "avg_cost": float(h.get("avg_cost", 0)),
        })

    report = build_portfolio_intelligence(enriched)
    claims = report.get("claims", [])
    
    audit_event = {
        "event": "intelligence_report_generated",
        "engine": report.get("engine"),
        "quality": report.get("quality"),
        "claim_ids": [c.get("id") for c in claims],
        "input_snapshot": enriched,
        "client_context": client_context,
    }

    audit_id = log_intelligence_audit(audit_event)
    report["audit"] = {"audit_id": audit_id}
    return report
