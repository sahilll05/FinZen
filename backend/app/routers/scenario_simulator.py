from fastapi import APIRouter, Depends, HTTPException
from appwrite.query import Query
import logging

from app.database import get_db
from app.config import settings
from app.services.scenario_simulator_service import simulate_scenario, get_available_scenarios
from app.services.market_data_service import get_stock_price
from app.services.causal_chain_service import trace_causal_chain
from app.services.geo_risk_service import analyze_portfolio_geo_exposure
from app.services.portfolio_optimizer_service import optimize_portfolio as run_optimizer

logger = logging.getLogger(__name__)
router = APIRouter()

DB_ID = settings.APPWRITE_DATABASE_ID
HOLDINGS_COL = settings.APPWRITE_COLLECTION_HOLDINGS

@router.get("/available")
def list_scenarios():
    """List all available predefined scenarios."""
    return get_available_scenarios()

# ── SIMULATE ──────────────────────────────────────────────────────────────────
@router.post("/simulate")
def run_scenario(body: dict, db = Depends(get_db)):
    """Simulate scenario(s) on a portfolio."""
    portfolio_id = body.get("portfolio_id")
    if not portfolio_id:
        raise HTTPException(status_code=400, detail="portfolio_id is required")

    # Support both array scenarios and single scenario_name
    scenarios = body.get("scenarios", [])
    if not scenarios:
        scenario_name = body.get("scenario_name", "recession")
        params = body.get("params", body.get("custom_params", {}))
        scenarios = [{"name": scenario_name, "params": params}]

    try:
        # Fetch holdings from Appwrite
        h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", str(portfolio_id))])
        holdings = h_res["documents"]
        
        if not holdings:
             # Try direct holdings fallback if provided
             holdings_data = body.get("holdings", [])
             if not holdings_data:
                raise HTTPException(status_code=404, detail="Portfolio empty or not found")
        else:
            holdings_data = []
            for h in holdings:
                ticker = h.get("ticker", "")
                avg_cost = float(h.get("avg_cost", 0))
                price = get_stock_price(ticker) or avg_cost
                holdings_data.append({
                    "ticker": ticker,
                    "sector": h.get("sector", "Unknown"),
                    "country": h.get("country", "US"),
                    "quantity": float(h.get("quantity", 0)),
                    "avg_cost": avg_cost,
                    "current_price": price,
                    "portfolio_id": str(portfolio_id),
                })

        CAUSAL_MAP = {
            "oil_shock": "Oil Price Increase",
            "recession": "High Inflation",
            "war": "Middle East Conflict",
            "tech_crash": "Tech Sector Decline",
            "pandemic": "Consumer Spending Drop"
        }

        results = []
        for sc in scenarios:
            sc_name = sc.get("name", "recession")
            sc_params = sc.get("params", {})
            result = simulate_scenario(holdings_data, sc_name, sc_params)
            
            # Causal Chain
            event_name = CAUSAL_MAP.get(sc_name)
            if event_name:
                result["causal_chain"] = trace_causal_chain(event_name)
            
            # Geo Risk
            result["geo_risk"] = analyze_portfolio_geo_exposure(holdings_data)
            results.append(result)

        if len(results) == 1: return results[0]
        return {"scenarios": results}

    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulate/holdings")
def run_scenario_direct(body: dict):
    """Direct scenario simulation using raw holdings list."""
    return run_scenario(body, get_db())

# ── OPTIMIZE ─────────────────────────────────────────────────────────────────
@router.post("/optimize/direct")
def optimize_portfolio_direct(body: dict):
    """Optimize portfolio using raw holdings list."""
    try:
        raw_holdings = body.get("holdings", [])
        if not raw_holdings:
            raise HTTPException(status_code=400, detail="No holdings provided")

        tickers = []
        current_weights = []
        expected_returns = []
        total_value = 0

        for h in raw_holdings:
            val = float(h.get("quantity", 0)) * float(h.get("avg_cost", 0))
            total_value += val

        from app.services.market_data_service import get_historical_returns_1y
        for h in raw_holdings:
            ticker = h.get("ticker", "")
            tickers.append(ticker)
            val = float(h.get("quantity", 0)) * float(h.get("avg_cost", 0))
            current_weights.append(val / total_value if total_value > 0 else 0)
            expected_returns.append(get_historical_returns_1y(ticker))

        return run_optimizer(
            tickers=tickers,
            current_weights=current_weights,
            expected_returns=expected_returns,
            constraints=body.get("constraints", {"max_position_pct": 30})
        )
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/portfolio/{portfolio_id}/optimize")
def optimize_portfolio_legacy(portfolio_id: str, db = Depends(get_db)):
    """Optimize based on Appwrite portfolio ID."""
    h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
    holdings = h_res["documents"]
    if not holdings:
        raise HTTPException(status_code=404, detail="Empty portfolio")
    
    return optimize_portfolio_direct({"holdings": holdings})