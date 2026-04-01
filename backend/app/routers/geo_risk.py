from fastapi import APIRouter, Depends, HTTPException
from appwrite.query import Query

from app.database import get_db
from app.config import settings
from app.services.geo_risk_service import analyze_country_risk, analyze_portfolio_geo_exposure, get_globe_data, get_country_stocks

router = APIRouter()

DB_ID = settings.APPWRITE_DATABASE_ID
HOLDINGS_COL = settings.APPWRITE_COLLECTION_HOLDINGS

# ── COUNTRY RISK ─────────────────────────────────────────────────────────────
@router.get("/risk/{country_code}")
def get_country_risk(country_code: str):
    """Full geopolitical risk analysis for a country."""
    return analyze_country_risk(country_code.upper())

@router.get("/country/{country_code}/risk-score")
def get_country_risk_legacy(country_code: str):
    return analyze_country_risk(country_code.upper())

# ── SECTOR IMPACTS ────────────────────────────────────────────────────────────
@router.get("/sectors/{country_code}")
def get_sector_impacts(country_code: str):
    """Get sector impact map for a country's risk profile."""
    result = analyze_country_risk(country_code.upper())
    return {
        "country": country_code.upper(),
        "sector_impacts": result["sector_impacts"],
    }

@router.get("/country/{country_code}/sectors")
def get_sector_impacts_legacy(country_code: str):
    return get_sector_impacts(country_code)

# ── SECTOR STOCKS ─────────────────────────────────────────────────────────────
@router.get("/sectors/{country_code}/stocks")
def get_sector_stocks(country_code: str):
    """Get stocks affected by a country's sector risk."""
    result = analyze_country_risk(country_code.upper())
    from app.utils.sector_mapping import STOCK_INFO
    sector_stocks: dict = {}
    for ticker, info in STOCK_INFO.items():
        sec = info.get("sector", "")
        if sec not in sector_stocks:
            sector_stocks[sec] = []
        if len(sector_stocks[sec]) < 3:
            sector_stocks[sec].append({"ticker": ticker, "name": info.get("name", ticker)})

    return {
        "country": country_code.upper(),
        "sector_impacts": result["sector_impacts"],
        "sector_stocks": sector_stocks,
    }

# ── PORTFOLIO EXPOSURE ────────────────────────────────────────────────────────
@router.post("/portfolio/exposure")
def get_portfolio_geo_exposure(body: dict, db = Depends(get_db)):
    """Analyze portfolio's geopolitical risk exposure."""
    portfolio_id = body.get("portfolio_id")
    holdings_list = body.get("holdings")

    if portfolio_id:
        try:
            h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", str(portfolio_id))])
            holdings = h_res["documents"]
            if not holdings:
                raise HTTPException(status_code=404, detail="Portfolio not found or empty")
            
            holdings_data = [
                {
                    "ticker": h.get("ticker"),
                    "country": h.get("country", "US"),
                    "sector": h.get("sector", "Unknown"),
                    "quantity": float(h.get("quantity", 0)),
                    "avg_cost": float(h.get("avg_cost", 0)),
                    "market_value": float(h.get("quantity", 0)) * float(h.get("avg_cost", 0)),
                }
                for h in holdings
            ]
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Appwrite error: {e}")
    elif holdings_list:
        holdings_data = holdings_list
    else:
        raise HTTPException(status_code=400, detail="Provide portfolio_id or holdings list")

    exposure = analyze_portfolio_geo_exposure(holdings_data)
    if portfolio_id:
        exposure["portfolio_id"] = str(portfolio_id)
    return exposure

# ── SIMULATE ──────────────────────────────────────────────────────────────────
@router.post("/simulate")
def simulate_geo_event(body: dict, db = Depends(get_db)):
    """Simulate a geopolitical event's impact on portfolio."""
    return get_portfolio_geo_exposure(body, db)

# ── RECENT EVENTS ─────────────────────────────────────────────────────────────
@router.get("/events/recent")
def get_recent_events(country: str = "US"):
    """Get recent geopolitical events affecting a country."""
    from app.services.news_intelligence_service import fetch_news_for_country
    articles = fetch_news_for_country(country.upper(), query=f"geopolitical {country}", limit=5)
    return {"country": country.upper(), "events": articles}

# ── GLOBE DATA ───────────────────────────────────────────────────────────────
@router.get("/globe-data")
def get_globe_data_endpoint():
    """Batch endpoint: returns risk score + lat/lng for all countries."""
    countries = get_globe_data()
    return {"countries": countries, "total": len(countries)}

@router.get("/country-stocks/{country_code}")
def get_country_stocks_endpoint(country_code: str):
    """Real-time stock index data for a country."""
    return get_country_stocks(country_code.upper())

@router.delete("/cache/stocks")
def clear_stock_cache():
    """Clear the in-memory cache."""
    from app.utils.cache import clear_cache
    clear_cache()
    return {"message": "In-memory cache cleared successfully"}

@router.get("/debug/yfinance")
def debug_yfinance():
    import yfinance as yf
    import sys
    return {
        "version": getattr(yf, "__version__", "unknown"),
        "executable": sys.executable,
        "path": sys.path
    }