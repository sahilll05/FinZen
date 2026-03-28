"""
Scenario Simulator Router.
Routes aligned with frontend api.ts scenarioAPI.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Holding
from app.services.scenario_simulator_service import simulate_scenario, get_available_scenarios
from app.services.market_data_service import get_stock_price

router = APIRouter()


@router.get("/available")
def list_scenarios():
    """List all available predefined scenarios."""
    return get_available_scenarios()


# Frontend: scenarioAPI.simulate({ portfolio_id, scenarios }) → POST /scenario/simulate
@router.post("/simulate")
def run_scenario(body: dict, db: Session = Depends(get_db)):
    """
    Simulate scenario(s) on a portfolio.

    Frontend sends: { portfolio_id: "1", scenarios: [{ name: "...", params: {} }] }
    Also accepts legacy: { portfolio_id: 1, scenario_name: "oil_shock" }
    """
    portfolio_id = body.get("portfolio_id")
    if not portfolio_id:
        raise HTTPException(status_code=400, detail="portfolio_id is required")

    try:
        pid = int(portfolio_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid portfolio_id")

    # Support both array scenarios and single scenario_name
    scenarios = body.get("scenarios", [])
    if not scenarios:
        scenario_name = body.get("scenario_name", "recession")
        custom_params = body.get("custom_params", {})
        scenarios = [{"name": scenario_name, "params": custom_params}]

    holdings = db.query(Holding).filter(Holding.portfolio_id == pid).all()
    if not holdings:
        raise HTTPException(status_code=404, detail="Portfolio not found or empty")

    holdings_data = []
    for h in holdings:
        price = get_stock_price(h.ticker)
        holdings_data.append({
            "ticker": h.ticker,
            "sector": h.sector,
            "quantity": h.quantity,
            "avg_cost": h.avg_cost,
            "current_price": price or h.avg_cost,
            "portfolio_id": pid,
        })

    # Run first scenario (or all and return list)
    results = []
    for sc in scenarios:
        sc_name = sc.get("name", "recession")
        sc_params = sc.get("params", sc.get("custom_params", {}))
        result = simulate_scenario(holdings_data, sc_name, sc_params)
        results.append(result)

    if len(results) == 1:
        return results[0]
    return {"scenarios": results}


@router.post("/portfolio/{portfolio_id}/optimize")
def optimize_portfolio(portfolio_id: int, max_position_pct: float = 30, db: Session = Depends(get_db)):
    """Optimize portfolio allocation."""
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
    if not holdings:
        raise HTTPException(status_code=404, detail="Portfolio not found")

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

    result = run_optimizer(
        tickers=tickers,
        current_weights=weights,
        expected_returns=expected_returns,
        constraints={"max_position_pct": max_position_pct},
    )
    result["portfolio_id"] = portfolio_id
    return result