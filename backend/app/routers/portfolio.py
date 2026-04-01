from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from appwrite.query import Query
import csv
import io
from datetime import datetime

from app.database import get_db, generate_id
from app.config import settings
from app.services.market_data_service import get_stock_price
from app.utils.sector_mapping import get_stock_info

router = APIRouter()

# Collection IDs from settings
DB_ID = settings.APPWRITE_DATABASE_ID
PORTFOLIOS_COL = settings.APPWRITE_COLLECTION_PORTFOLIOS
HOLDINGS_COL = settings.APPWRITE_COLLECTION_HOLDINGS
USERS_COL = settings.APPWRITE_COLLECTION_USERS

def _get_or_create_demo_user(db):
    """Get or create demo user in Appwrite."""
    try:
        users = db.list_documents(DB_ID, USERS_COL, [Query.limit(1)])
        if users["total"] > 0:
            return users["documents"][0]
        
        # Create demo user
        user_data = {
            "email": "demo@finsight.ai",
            "country_code": "US",
            "created_at": datetime.utcnow().isoformat()
        }
        return db.create_document(DB_ID, USERS_COL, generate_id(), user_data)
    except Exception as e:
        print(f"Error in _get_or_create_demo_user: {e}")
        # Return a mock if collection doesn't exist yet to avoid total crash
        return {"$id": "demo_user_id"}

# ── LIST all portfolios ─────────────────────────────────────────────────────
@router.get("/")
def list_portfolios(db = Depends(get_db)):
    """List all portfolios (Frontend: portfolioAPI.list())."""
    try:
        res = db.list_documents(DB_ID, PORTFOLIOS_COL)
        portfolios = res["documents"]
        
        result = []
        for p in portfolios:
            # Fetch holdings for this portfolio to calculate total invested
            h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", p["$id"])])
            holdings = h_res["documents"]
            
            total_invested = sum(float(h.get("quantity", 0)) * float(h.get("avg_cost", 0)) for h in holdings)
            
            result.append({
                "id": p["$id"],
                "name": p.get("name", "Unnamed"),
                "currency": p.get("currency", "USD"),
                "total_invested": round(total_invested, 2),
                "holdings_count": len(holdings),
                "created_at": p.get("created_at"),
            })
        return result
    except Exception as e:
        print(f"Appwrite Error in list_portfolios: {e}")
        return []

@router.get("/list/all")
def list_portfolios_all(db = Depends(get_db)):
    return list_portfolios(db)

# ── CREATE portfolio ────────────────────────────────────────────────────────
@router.post("/")
def create_portfolio(data: dict, db = Depends(get_db)):
    """Create a new empty portfolio."""
    user = _get_or_create_demo_user(db)
    payload = {
        "user_id": user["$id"],
        "name": data.get("name", "My Portfolio"),
        "currency": data.get("currency", "USD"),
        "created_at": datetime.utcnow().isoformat()
    }
    portfolio = db.create_document(DB_ID, PORTFOLIOS_COL, generate_id(), payload)
    
    return {
        "id": portfolio["$id"],
        "name": portfolio["name"],
        "currency": portfolio["currency"],
        "holdings_count": 0,
        "total_invested": 0,
        "created_at": portfolio["created_at"],
    }

# ── GET single portfolio ────────────────────────────────────────────────────
@router.get("/{portfolio_id}")
def get_portfolio(portfolio_id: str, db = Depends(get_db)):
    """Get portfolio summary."""
    try:
        # Check if portfolio exists
        db.get_document(DB_ID, PORTFOLIOS_COL, portfolio_id)
        return _build_portfolio_summary(portfolio_id, db)
    except Exception:
        raise HTTPException(status_code=404, detail="Portfolio not found")

# ── UPDATE portfolio ────────────────────────────────────────────────────────
@router.put("/{portfolio_id}")
def update_portfolio(portfolio_id: str, data: dict, db = Depends(get_db)):
    """Update portfolio metadata."""
    payload = {}
    if "name" in data: payload["name"] = data["name"]
    if "currency" in data: payload["currency"] = data["currency"]
    
    try:
        portfolio = db.update_document(DB_ID, PORTFOLIOS_COL, portfolio_id, payload)
        return {"id": portfolio["$id"], "name": portfolio["name"], "currency": portfolio["currency"]}
    except Exception:
        raise HTTPException(status_code=404, detail="Portfolio not found")

# ── DELETE portfolio ────────────────────────────────────────────────────────
@router.delete("/{portfolio_id}")
def delete_portfolio(portfolio_id: str, db = Depends(get_db)):
    """Delete portfolio and its holdings."""
    try:
        # Delete holdings first
        h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
        for h in h_res["documents"]:
            db.delete_document(DB_ID, HOLDINGS_COL, h["$id"])
            
        # Delete portfolio
        db.delete_document(DB_ID, PORTFOLIOS_COL, portfolio_id)
        return {"message": "Portfolio deleted"}
    except Exception:
        raise HTTPException(status_code=404, detail="Portfolio not found or deletion failed")

# ── HOLDINGS ────────────────────────────────────────────────────────────────
@router.get("/{portfolio_id}/holdings")
def get_holdings(portfolio_id: str, db = Depends(get_db)):
    """Get all holdings for a portfolio."""
    try:
        h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
        holdings = h_res["documents"]
        
        result = []
        for h in holdings:
            ticker = h.get("ticker", "")
            price = get_stock_price(ticker)
            quantity = float(h.get("quantity", 0))
            avg_cost = float(h.get("avg_cost", 0))
            
            invested = quantity * avg_cost
            market_val = quantity * price if price else invested
            
            result.append({
                "id": h["$id"],
                "ticker": ticker,
                "company_name": h.get("company_name", ""),
                "country": h.get("country", "US"),
                "sector": h.get("sector", "Unknown"),
                "quantity": quantity,
                "avg_cost": avg_cost,
                "current_price": price,
                "market_value": round(market_val, 2),
                "gain_loss": round(market_val - invested, 2),
                "gain_loss_pct": round((market_val - invested) / invested * 100, 2) if invested > 0 else 0,
            })
        return result
    except Exception:
        return []

@router.post("/{portfolio_id}/holdings")
def add_holding(portfolio_id: str, data: dict, db = Depends(get_db)):
    """Add a holding to a portfolio."""
    ticker = data.get("ticker", "").upper()
    stock_info = get_stock_info(ticker)
    
    payload = {
        "portfolio_id": portfolio_id,
        "ticker": ticker,
        "company_name": data.get("company_name") or stock_info.get("name", ticker),
        "country": data.get("country") or stock_info.get("country", "US"),
        "sector": data.get("sector") or stock_info.get("sector", "Unknown"),
        "quantity": float(data.get("quantity", 0)),
        "avg_cost": float(data.get("avg_cost", 0)),
    }
    
    try:
        holding = db.create_document(DB_ID, HOLDINGS_COL, generate_id(), payload)
        return {"id": holding["$id"], "ticker": holding["ticker"], "message": "Holding added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add holding: {e}")

@router.delete("/{portfolio_id}/holdings/{holding_id}")
def delete_holding(portfolio_id: str, holding_id: str, db = Depends(get_db)):
    """Remove a holding."""
    try:
        db.delete_document(DB_ID, HOLDINGS_COL, holding_id)
        return {"message": "Holding deleted"}
    except Exception:
        raise HTTPException(status_code=404, detail="Holding not found")

# ── METRICS & X-RAY & OPTIMIZE ──────────────────────────────────────────────
@router.get("/{portfolio_id}/metrics")
def get_portfolio_metrics(portfolio_id: str, db = Depends(get_db)):
    return _build_portfolio_summary(portfolio_id, db)

@router.post("/{portfolio_id}/optimize")
def optimize_portfolio_endpoint(portfolio_id: str, data: dict, db = Depends(get_db)):
    """Run optimization (Uses Appwrite data)."""
    h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
    holdings = h_res["documents"]
    
    if not holdings:
        raise HTTPException(status_code=404, detail="Empty portfolio")

    from app.services.portfolio_optimizer_service import optimize_portfolio as run_optimizer

    tickers = [h["ticker"] for h in holdings]
    values = [float(h["quantity"]) * float(h["avg_cost"]) for h in holdings]
    total = sum(values)
    weights = [v / total for v in values] if total > 0 else [1 / len(values)] * len(values)

    expected_returns = []
    for h in holdings:
        price = get_stock_price(h["ticker"])
        avg_cost = float(h["avg_cost"])
        ret = (price - avg_cost) / avg_cost if price and avg_cost > 0 else 0.05
        expected_returns.append(ret)

    strategy = data.get("strategy", "moderate")
    max_pos = {"conservative": 20, "moderate": 30, "aggressive": 40}.get(strategy, 30)

    result = run_optimizer(
        tickers=tickers,
        current_weights=weights,
        expected_returns=expected_returns,
        constraints={"max_position_pct": max_pos},
    )
    result["portfolio_id"] = portfolio_id
    return result

@router.get("/{portfolio_id}/xray")
def xray_portfolio_endpoint(portfolio_id: str, db = Depends(get_db)):
    """Appwrite-powered X-Ray."""
    h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
    holdings = h_res["documents"]
    
    if not holdings:
        raise HTTPException(status_code=404, detail="Empty portfolio")

    from app.services.portfolio_xray_service import xray_portfolio

    holdings_data = []
    for h in holdings:
        ticker = h["ticker"]
        price = get_stock_price(ticker)
        avg_cost = float(h["avg_cost"])
        qty = float(h["quantity"])
        
        holdings_data.append({
            "ticker": ticker,
            "company_name": h.get("company_name", ""),
            "country": h.get("country", "US"),
            "sector": h.get("sector", "Unknown"),
            "quantity": qty,
            "avg_cost": avg_cost,
            "current_price": price or avg_cost,
            "market_value": qty * (price or avg_cost),
            "portfolio_id": portfolio_id,
        })
    return xray_portfolio(holdings_data)

# ── HELPERS ──────────────────────────────────────────────────────────────────
def _build_portfolio_summary(portfolio_id: str, db) -> dict:
    """Consolidated summary builder for Appwrite."""
    portfolio = db.get_document(DB_ID, PORTFOLIOS_COL, portfolio_id)
    h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
    holdings = h_res["documents"]

    total_invested = 0
    current_value = 0
    countries = set()
    sectors = set()
    holding_responses = []

    for h in holdings:
        qty = float(h.get("quantity", 0))
        avg = float(h.get("avg_cost", 0))
        ticker = h.get("ticker", "")
        
        invested = qty * avg
        total_invested += invested
        countries.add(h.get("country", "US"))
        sectors.add(h.get("sector", "Unknown"))

        price = get_stock_price(ticker)
        market_val = qty * price if price else invested
        current_value += market_val

        gain_loss = market_val - invested
        gain_loss_pct = (gain_loss / invested * 100) if invested > 0 else 0

        holding_responses.append({
            "id": h["$id"],
            "ticker": ticker,
            "company_name": h.get("company_name", ""),
            "country": h.get("country", "US"),
            "sector": h.get("sector", "Unknown"),
            "quantity": qty,
            "avg_cost": avg,
            "current_price": price,
            "market_value": round(market_val, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2),
        })

    total_gain = current_value - total_invested
    total_gain_pct = (total_gain / total_invested * 100) if total_invested > 0 else 0

    return {
        "portfolio_id": portfolio_id,
        "id": portfolio_id,
        "name": portfolio.get("name"),
        "currency": portfolio.get("currency", "USD"),
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "total_gain_loss": round(total_gain, 2),
        "total_gain_loss_pct": round(total_gain_pct, 2),
        "holdings_count": len(holdings),
        "countries_exposed": list(countries),
        "sectors_exposed": list(sectors),
        "holdings": holding_responses,
    }