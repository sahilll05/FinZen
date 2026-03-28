"""
Geopolitical Investment Engine Router.
Routes aligned with frontend api.ts geoAPI.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Holding
from app.services.geo_risk_service import analyze_country_risk, analyze_portfolio_geo_exposure, get_globe_data, get_country_stocks

router = APIRouter()


# ── COUNTRY RISK ─────────────────────────────────────────────────────────────
# Frontend: geoAPI.getCountryRisk(code) → GET /geo/risk/{code}
@router.get("/risk/{country_code}")
def get_country_risk(country_code: str):
    """Full geopolitical risk analysis for a country."""
    return analyze_country_risk(country_code.upper())


# Legacy route
@router.get("/country/{country_code}/risk-score")
def get_country_risk_legacy(country_code: str):
    """Full geopolitical risk analysis (legacy route)."""
    return analyze_country_risk(country_code.upper())


# ── SECTOR IMPACTS ────────────────────────────────────────────────────────────
# Frontend: geoAPI.getSectorImpact(code) → GET /geo/sectors/{code}
@router.get("/sectors/{country_code}")
def get_sector_impacts(country_code: str):
    """Get sector impact map for a country's risk profile."""
    result = analyze_country_risk(country_code.upper())
    return {
        "country": country_code.upper(),
        "sector_impacts": result["sector_impacts"],
    }


# Legacy route
@router.get("/country/{country_code}/sectors")
def get_sector_impacts_legacy(country_code: str):
    return get_sector_impacts(country_code)


# ── SECTOR STOCKS ─────────────────────────────────────────────────────────────
# Frontend: geoAPI.getSectorStocks(code) → GET /geo/sectors/{code}/stocks
@router.get("/sectors/{country_code}/stocks")
def get_sector_stocks(country_code: str):
    """Get stocks affected by a country's sector risk."""
    result = analyze_country_risk(country_code.upper())
    # Return sector impacts with example tickers from our mapping
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
# Frontend: geoAPI.getPortfolioExposure(portfolioData) → POST /geo/portfolio/exposure
@router.post("/portfolio/exposure")
def get_portfolio_geo_exposure(body: dict, db: Session = Depends(get_db)):
    """Analyze portfolio's geopolitical risk exposure from portfolio_id or holdings list."""
    # Accept either a portfolio_id integer or an array of holdings
    portfolio_id = body.get("portfolio_id")
    holdings_list = body.get("holdings")

    if portfolio_id:
        holdings = db.query(Holding).filter(Holding.portfolio_id == int(portfolio_id)).all()
        if not holdings:
            raise HTTPException(status_code=404, detail="Portfolio not found or empty")
        holdings_data = [
            {
                "ticker": h.ticker,
                "country": h.country,
                "sector": h.sector,
                "quantity": h.quantity,
                "avg_cost": h.avg_cost,
                "market_value": h.quantity * h.avg_cost,
            }
            for h in holdings
        ]
    elif holdings_list:
        holdings_data = holdings_list
    else:
        raise HTTPException(status_code=400, detail="Provide portfolio_id or holdings list")

    exposure = analyze_portfolio_geo_exposure(holdings_data)
    if portfolio_id:
        exposure["portfolio_id"] = portfolio_id
    return exposure


# ── SIMULATE ──────────────────────────────────────────────────────────────────
# Frontend: geoAPI.simulate(portfolioData) → POST /geo/simulate
@router.post("/simulate")
def simulate_geo_event(body: dict, db: Session = Depends(get_db)):
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
    """Batch endpoint: returns risk score + lat/lng for all globe countries."""
    countries = get_globe_data()
    return {"countries": countries, "total": len(countries)}


@router.get("/country-stocks/{country_code}")
def get_country_stocks_endpoint(country_code: str):
    """Real-time stock index data for a country (via yfinance, 5-min cache)."""
    return get_country_stocks(country_code.upper())