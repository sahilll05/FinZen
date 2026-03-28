"""
Scenario Simulator Service.
Monte Carlo simulation + predefined scenarios.
"""

import numpy as np
from typing import List, Dict, Optional
from app.services.market_data_service import get_stock_price
from app.utils.sector_mapping import get_stock_info


# Predefined scenarios with impact multipliers
PREDEFINED_SCENARIOS = {
    "oil_shock": {
        "name": "Oil Price Shock (+50%)",
        "description": "Major oil supply disruption causes 50% price increase",
        "sector_impacts": {
            "Oil & Gas": +0.30,
            "Automotive": -0.15,
            "Technology": -0.05,
            "Banking": -0.08,
            "Healthcare": -0.03,
            "Consumer": -0.10,
            "Mining": +0.10,
        },
        "historical_precedent": "Similar to 1973 Oil Crisis: S&P 500 fell ~15% over 12 months",
    },
    "recession": {
        "name": "Global Recession",
        "description": "GDP contracts 3%, unemployment rises to 8%",
        "sector_impacts": {
            "Oil & Gas": -0.20,
            "Banking": -0.25,
            "Technology": -0.15,
            "Consumer": -0.20,
            "Healthcare": -0.05,
            "Mining": -0.15,
            "Automotive": -0.30,
        },
        "historical_precedent": "Similar to 2008 GFC: S&P 500 fell ~50% peak-to-trough",
    },
    "war": {
        "name": "Major Regional Conflict",
        "description": "Armed conflict in major trade region disrupts supply chains",
        "sector_impacts": {
            "Oil & Gas": +0.25,
            "Banking": -0.15,
            "Technology": -0.20,
            "Consumer": -0.10,
            "Healthcare": +0.05,
            "Mining": +0.15,
            "Automotive": -0.20,
        },
        "historical_precedent": "Russia-Ukraine 2022: Global markets fell 10-20% initially",
    },
    "tech_crash": {
        "name": "Tech Sector Crash",
        "description": "AI bubble bursts, tech stocks drop 40%",
        "sector_impacts": {
            "Technology": -0.40,
            "Consumer": -0.10,
            "Banking": -0.10,
            "Healthcare": +0.05,
            "Oil & Gas": 0.0,
            "Mining": 0.0,
        },
        "historical_precedent": "Similar to 2000 Dotcom crash: NASDAQ fell ~78%",
    },
    "pandemic": {
        "name": "Global Pandemic",
        "description": "New pandemic causes lockdowns worldwide",
        "sector_impacts": {
            "Technology": +0.15,
            "Healthcare": +0.25,
            "Consumer": -0.15,
            "Banking": -0.15,
            "Oil & Gas": -0.30,
            "Automotive": -0.25,
            "Mining": -0.10,
        },
        "historical_precedent": "COVID-19 2020: S&P 500 fell 34% in 33 days, recovered in 5 months",
    },
}


def simulate_scenario(
    holdings: List[dict],
    scenario_name: str,
    custom_params: Dict = {},
) -> dict:
    """
    Simulate the impact of a scenario on a portfolio.
    """
    # Get scenario definition
    if scenario_name in PREDEFINED_SCENARIOS:
        scenario = PREDEFINED_SCENARIOS[scenario_name]
    elif scenario_name == "custom":
        scenario = _build_custom_scenario(custom_params)
    else:
        scenario = PREDEFINED_SCENARIOS.get("recession")  # Default

    # Calculate impact on each holding
    stock_impacts = []
    current_total = 0
    scenario_total = 0

    for h in holdings:
        ticker = h.get("ticker", "")
        info = get_stock_info(ticker)
        sector = h.get("sector", info.get("sector", "Unknown"))
        quantity = h.get("quantity", 0)
        price = h.get("current_price") or h.get("avg_cost", 100)
        current_value = quantity * price

        # Get sector impact multiplier
        impact_pct = scenario["sector_impacts"].get(sector, -0.05)

        scenario_value = current_value * (1 + impact_pct)

        stock_impacts.append({
            "ticker": ticker,
            "current_value": round(current_value, 2),
            "scenario_value": round(scenario_value, 2),
            "change_pct": round(impact_pct * 100, 2),
            "impact_driver": f"{sector} sector: {scenario['sector_impacts'].get(sector, 'minimal')} impact",
        })

        current_total += current_value
        scenario_total += scenario_value

    total_impact = ((scenario_total - current_total) / max(current_total, 1)) * 100

    # Hedging suggestions
    hedging = _generate_hedging_suggestions(scenario_name, stock_impacts)

    return {
        "scenario_name": scenario["name"],
        "description": scenario["description"],
        "portfolio_id": holdings[0].get("portfolio_id", 0) if holdings else 0,
        "current_portfolio_value": round(current_total, 2),
        "scenario_portfolio_value": round(scenario_total, 2),
        "total_impact_pct": round(total_impact, 2),
        "stock_impacts": stock_impacts,
        "historical_precedent": scenario.get("historical_precedent", ""),
        "hedging_suggestions": hedging,
    }


def _build_custom_scenario(params: dict) -> dict:
    """Build a custom scenario from parameters."""
    sector_impacts = {}
    if params.get("oil_change_pct"):
        oil_pct = params["oil_change_pct"] / 100
        sector_impacts["Oil & Gas"] = oil_pct * 0.5
        sector_impacts["Automotive"] = -abs(oil_pct) * 0.3
        sector_impacts["Consumer"] = -abs(oil_pct) * 0.2
    if params.get("interest_rate_change"):
        rate_chg = params["interest_rate_change"]
        sector_impacts["Banking"] = rate_chg * 0.1
        sector_impacts["Technology"] = -rate_chg * 0.15

    # Default impact for unspecified sectors
    for sector in ["Technology", "Banking", "Healthcare", "Consumer", "Mining", "Oil & Gas", "Automotive"]:
        if sector not in sector_impacts:
            sector_impacts[sector] = -0.05  # Slight negative default

    return {
        "name": "Custom Scenario",
        "description": f"User-defined scenario with parameters: {params}",
        "sector_impacts": sector_impacts,
        "historical_precedent": "Custom scenario — no historical precedent",
    }


def _generate_hedging_suggestions(scenario_name: str, impacts: list) -> list:
    """Generate hedging suggestions based on scenario."""
    suggestions = []

    if scenario_name == "oil_shock":
        suggestions.append("Consider adding oil ETFs (USO) or energy stocks as a hedge")
        suggestions.append("Reduce airline and transportation exposure")
    elif scenario_name == "recession":
        suggestions.append("Increase allocation to defensive sectors (Healthcare, Utilities)")
        suggestions.append("Consider adding Treasury bonds or gold")
        suggestions.append("Build cash reserves for buying opportunities")
    elif scenario_name == "war":
        suggestions.append("Add defense sector ETFs (ITA, XAR)")
        suggestions.append("Increase gold allocation (GLD)")
        suggestions.append("Reduce emerging market exposure")
    elif scenario_name == "tech_crash":
        suggestions.append("Diversify away from tech — increase Healthcare, Consumer Staples")
        suggestions.append("Consider value stocks over growth stocks")
    elif scenario_name == "pandemic":
        suggestions.append("Add healthcare and biotech positions")
        suggestions.append("Increase remote-work tech exposure (Zoom, Slack, etc.)")

    # General suggestions based on most impacted stocks
    worst_impacted = sorted(impacts, key=lambda x: x["change_pct"])[:3]
    for stock in worst_impacted:
        if stock["change_pct"] < -15:
            suggestions.append(f"Consider reducing {stock['ticker']} — {stock['change_pct']}% expected impact")

    return suggestions


def get_available_scenarios() -> list:
    """Return list of available predefined scenarios."""
    return [
        {"id": key, "name": val["name"], "description": val["description"]}
        for key, val in PREDEFINED_SCENARIOS.items()
    ]