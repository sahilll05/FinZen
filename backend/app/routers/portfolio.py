"""
Portfolio Router — Full CRUD + xray + optimize + metrics.
Aligned with frontend api.ts expectations.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import csv
import io

from app.database import get_db
from app.models.db_models import Portfolio, Holding, User
from app.schemas.portfolio import PortfolioUpload, PortfolioSummary, HoldingCreate
from app.services.market_data_service import get_stock_price
from app.utils.sector_mapping import get_stock_info

router = APIRouter()


def _get_or_create_demo_user(db: Session):
    """Get or create demo user (no auth in MVP)."""
    user = db.query(User).first()
    if not user:
        user = User(email="demo@finsight.ai", country_code="US")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# ── LIST all portfolios ─────────────────────────────────────────────────────
@router.get("/")
def list_portfolios(db: Session = Depends(get_db)):
    """List all portfolios (frontend: portfolioAPI.list())."""
    portfolios = db.query(Portfolio).all()
    result = []
    for p in portfolios:
        holdings = db.query(Holding).filter(Holding.portfolio_id == p.id).all()
        total_invested = sum(h.quantity * h.avg_cost for h in holdings)
        result.append({
            "id": str(p.id),
            "name": p.name,
            "currency": p.currency or "USD",
            "total_invested": round(total_invested, 2),
            "holdings_count": len(holdings),
            "created_at": str(p.created_at),
        })
    return result


@router.get("/list/all")
def list_portfolios_all(db: Session = Depends(get_db)):
    """Alias for list (legacy route)."""
    return list_portfolios(db)


# ── CREATE portfolio ────────────────────────────────────────────────────────
@router.post("/")
def create_portfolio(data: dict, db: Session = Depends(get_db)):
    """Create a new empty portfolio (frontend: portfolioAPI.create())."""
    user = _get_or_create_demo_user(db)
    portfolio = Portfolio(
        user_id=user.id,
        name=data.get("name", "My Portfolio"),
        currency=data.get("currency", "USD"),
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return {
        "id": str(portfolio.id),
        "name": portfolio.name,
        "currency": portfolio.currency,
        "holdings_count": 0,
        "total_invested": 0,
        "created_at": str(portfolio.created_at),
    }


# ── GET single portfolio ────────────────────────────────────────────────────
@router.get("/{portfolio_id}")
def get_portfolio(portfolio_id: str, db: Session = Depends(get_db)):
    """Get portfolio summary (frontend: portfolioAPI.get(id))."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return _build_portfolio_summary(pid, db)


# ── UPDATE portfolio ────────────────────────────────────────────────────────
@router.put("/{portfolio_id}")
def update_portfolio(portfolio_id: str, data: dict, db: Session = Depends(get_db)):
    """Update portfolio (frontend: portfolioAPI.update(id, data))."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if "name" in data:
        portfolio.name = data["name"]
    if "currency" in data:
        portfolio.currency = data["currency"]
    db.commit()
    return {"id": str(portfolio.id), "name": portfolio.name, "currency": portfolio.currency}


# ── DELETE portfolio ────────────────────────────────────────────────────────
@router.delete("/{portfolio_id}")
def delete_portfolio(portfolio_id: str, db: Session = Depends(get_db)):
    """Delete portfolio and all its holdings."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.query(Holding).filter(Holding.portfolio_id == pid).delete()
    db.delete(portfolio)
    db.commit()
    return {"message": "Portfolio deleted"}


# ── HOLDINGS ────────────────────────────────────────────────────────────────
@router.get("/{portfolio_id}/holdings")
def get_holdings(portfolio_id: str, db: Session = Depends(get_db)):
    """Get all holdings for a portfolio."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    holdings = db.query(Holding).filter(Holding.portfolio_id == pid).all()
    result = []
    for h in holdings:
        price = get_stock_price(h.ticker)
        invested = h.quantity * h.avg_cost
        market_val = h.quantity * price if price else invested
        result.append({
            "id": str(h.id),
            "ticker": h.ticker,
            "company_name": h.company_name,
            "country": h.country,
            "sector": h.sector,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "current_price": price,
            "market_value": round(market_val, 2),
            "gain_loss": round(market_val - invested, 2),
            "gain_loss_pct": round((market_val - invested) / invested * 100, 2) if invested > 0 else 0,
        })
    return result


@router.post("/{portfolio_id}/holdings")
def add_holding(portfolio_id: str, data: dict, db: Session = Depends(get_db)):
    """Add a holding to a portfolio."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    ticker = data.get("ticker", "").upper()
    stock_info = get_stock_info(ticker)
    holding = Holding(
        portfolio_id=pid,
        ticker=ticker,
        company_name=data.get("company_name") or stock_info.get("name", ticker),
        country=data.get("country") or stock_info.get("country", "US"),
        sector=data.get("sector") or stock_info.get("sector", "Unknown"),
        quantity=float(data.get("quantity", 0)),
        avg_cost=float(data.get("avg_cost", 0)),
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return {"id": str(holding.id), "ticker": holding.ticker, "message": "Holding added"}


@router.delete("/{portfolio_id}/holdings/{holding_id}")
def delete_holding(portfolio_id: str, holding_id: str, db: Session = Depends(get_db)):
    """Remove a holding from a portfolio."""
    try:
        hid = int(holding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid holding ID")
    holding = db.query(Holding).filter(Holding.id == hid).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    db.delete(holding)
    db.commit()
    return {"message": "Holding deleted"}


# ── METRICS ─────────────────────────────────────────────────────────────────
@router.get("/{portfolio_id}/metrics")
def get_portfolio_metrics(portfolio_id: str, db: Session = Depends(get_db)):
    """Get portfolio performance metrics."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    return _build_portfolio_summary(pid, db)


# ── OPTIMIZE ─────────────────────────────────────────────────────────────────
@router.post("/{portfolio_id}/optimize")
def optimize_portfolio_endpoint(portfolio_id: str, data: dict, db: Session = Depends(get_db)):
    """Run portfolio optimization."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    holdings = db.query(Holding).filter(Holding.portfolio_id == pid).all()
    if not holdings:
        raise HTTPException(status_code=404, detail="Portfolio not found or empty")

    from app.services.portfolio_optimizer_service import optimize_portfolio as run_optimizer

    tickers = [h.ticker for h in holdings]
    values = [h.quantity * h.avg_cost for h in holdings]
    total = sum(values)
    weights = [v / total for v in values] if total > 0 else [1 / len(values)] * len(values)

    expected_returns = []
    for h in holdings:
        price = get_stock_price(h.ticker)
        if price and h.avg_cost > 0:
            ret = (price - h.avg_cost) / h.avg_cost
        else:
            ret = 0.05
        expected_returns.append(ret)

    strategy = data.get("strategy", "moderate")
    max_pos = {"conservative": 20, "moderate": 30, "aggressive": 40}.get(strategy, 30)

    result = run_optimizer(
        tickers=tickers,
        current_weights=weights,
        expected_returns=expected_returns,
        constraints={"max_position_pct": max_pos},
    )
    result["portfolio_id"] = pid
    return result


# ── X-RAY ────────────────────────────────────────────────────────────────────
@router.get("/{portfolio_id}/xray")
def xray_portfolio_endpoint(portfolio_id: str, db: Session = Depends(get_db)):
    """Deep X-Ray analysis of portfolio hidden risks."""
    try:
        pid = int(portfolio_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    holdings = db.query(Holding).filter(Holding.portfolio_id == pid).all()
    if not holdings:
        raise HTTPException(status_code=404, detail="Portfolio not found or empty")

    from app.services.portfolio_xray_service import xray_portfolio

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
            "portfolio_id": pid,
        })
    return xray_portfolio(holdings_data)


# ── UPLOAD (legacy) ──────────────────────────────────────────────────────────
@router.post("/upload")
def upload_portfolio(portfolio_data: PortfolioUpload, db: Session = Depends(get_db)):
    """Upload a portfolio via JSON."""
    user = _get_or_create_demo_user(db)
    portfolio = Portfolio(
        user_id=user.id,
        name=portfolio_data.name,
        currency=portfolio_data.currency,
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    for h in portfolio_data.holdings:
        stock_info = get_stock_info(h.ticker)
        holding = Holding(
            portfolio_id=portfolio.id,
            ticker=h.ticker.upper(),
            company_name=h.company_name or stock_info.get("name", h.ticker),
            country=h.country or stock_info.get("country", "US"),
            sector=h.sector or stock_info.get("sector", "Unknown"),
            quantity=h.quantity,
            avg_cost=h.avg_cost,
        )
        db.add(holding)
    db.commit()
    return _build_portfolio_summary(portfolio.id, db)


@router.post("/upload-csv")
def upload_portfolio_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload portfolio via CSV."""
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    user = _get_or_create_demo_user(db)
    portfolio = Portfolio(user_id=user.id, name=file.filename or "CSV Upload")
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)

    for row in reader:
        ticker = row.get("ticker", "").strip().upper()
        if not ticker:
            continue
        stock_info = get_stock_info(ticker)
        holding = Holding(
            portfolio_id=portfolio.id,
            ticker=ticker,
            company_name=stock_info.get("name", ticker),
            country=row.get("country", stock_info.get("country", "US")).strip(),
            sector=row.get("sector", stock_info.get("sector", "Unknown")).strip(),
            quantity=float(row.get("quantity", 0)),
            avg_cost=float(row.get("avg_cost", 0)),
        )
        db.add(holding)
    db.commit()
    return _build_portfolio_summary(portfolio.id, db)


def _build_portfolio_summary(portfolio_id: int, db: Session) -> dict:
    """Build a full portfolio summary with current prices."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()

    total_invested = 0
    current_value = 0
    countries = set()
    sectors = set()
    holding_responses = []

    for h in holdings:
        invested = h.quantity * h.avg_cost
        total_invested += invested
        countries.add(h.country)
        sectors.add(h.sector)

        price = get_stock_price(h.ticker)
        market_val = h.quantity * price if price else invested
        current_value += market_val

        gain_loss = market_val - invested
        gain_loss_pct = (gain_loss / invested * 100) if invested > 0 else 0

        holding_responses.append({
            "id": str(h.id),
            "ticker": h.ticker,
            "company_name": h.company_name,
            "country": h.country,
            "sector": h.sector,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "current_price": price,
            "market_value": round(market_val, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2),
        })

    total_gain = current_value - total_invested
    total_gain_pct = (total_gain / total_invested * 100) if total_invested > 0 else 0

    return {
        "portfolio_id": str(portfolio_id),
        "id": str(portfolio_id),
        "name": portfolio.name,
        "currency": portfolio.currency or "USD",
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "total_gain_loss": round(total_gain, 2),
        "total_gain_loss_pct": round(total_gain_pct, 2),
        "holdings_count": len(holdings),
        "countries_exposed": list(countries),
        "sectors_exposed": list(sectors),
        "holdings": holding_responses,
    }