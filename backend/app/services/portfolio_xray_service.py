"""
Portfolio X-Ray & Hidden Risk Detection Service.
Reveals hidden risks that standard views miss.
"""

from typing import List, Dict
from app.utils.sector_mapping import get_stock_info
from app.services.geo_risk_service import analyze_country_risk
from app.services.causal_chain_service import get_hidden_risks


# Known supply chain dependencies (simplified)
SUPPLY_CHAIN_DEPS = {
    "AAPL": {"Taiwan": 0.60, "China": 0.25, "US": 0.15},
    "MSFT": {"US": 0.70, "India": 0.15, "China": 0.15},
    "TSLA": {"China": 0.40, "US": 0.40, "Germany": 0.20},
    "NVDA": {"Taiwan": 0.70, "US": 0.20, "South Korea": 0.10},
    "GOOGL": {"US": 0.80, "India": 0.10, "Europe": 0.10},
    "AMZN": {"US": 0.70, "China": 0.20, "India": 0.10},
    "JPM": {"US": 0.80, "UK": 0.10, "Europe": 0.10},
}

# Revenue geographic breakdown
REVENUE_GEO = {
    "AAPL": {"US": 0.42, "China": 0.19, "Europe": 0.25, "Japan": 0.08, "Other": 0.06},
    "MSFT": {"US": 0.50, "Europe": 0.25, "Asia": 0.15, "Other": 0.10},
    "GOOGL": {"US": 0.48, "Europe": 0.30, "Asia": 0.15, "Other": 0.07},
    "AMZN": {"US": 0.62, "Europe": 0.22, "Asia": 0.10, "Other": 0.06},
}


def xray_portfolio(holdings: List[dict]) -> dict:
    """
    Perform deep X-Ray analysis on portfolio.
    """
    country_exposure = {}
    sector_exposure = {}
    concentration_risks = []
    hidden_risks = []
    total_value = 0

    tickers = []

    for h in holdings:
        ticker = h.get("ticker", "")
        tickers.append(ticker)
        value = h.get("market_value", h.get("quantity", 0) * h.get("avg_cost", 0))
        total_value += value
        country = h.get("country", "US")
        sector = h.get("sector", "Unknown")

        # Country exposure
        country_exposure[country] = country_exposure.get(country, 0) + value
        # Sector exposure
        sector_exposure[sector] = sector_exposure.get(sector, 0) + value

    if total_value == 0:
        total_value = 1

    # ── Build exposure details ──
    country_details = []
    for country, value in sorted(country_exposure.items(), key=lambda x: x[1], reverse=True):
        pct = round((value / total_value) * 100, 1)
        risk = analyze_country_risk(country)
        country_details.append({
            "category": "country",
            "name": country,
            "exposure_pct": pct,
            "risk_level": risk["overall_level"],
        })

    sector_details = []
    for sector, value in sorted(sector_exposure.items(), key=lambda x: x[1], reverse=True):
        pct = round((value / total_value) * 100, 1)
        risk_level = "HIGH" if pct > 40 else "MODERATE" if pct > 25 else "LOW"
        sector_details.append({
            "category": "sector",
            "name": sector,
            "exposure_pct": pct,
            "risk_level": risk_level,
        })

        if pct > 35:
            concentration_risks.append(
                f"⚠️ {sector} sector concentration: {pct}% — consider diversifying"
            )

    # ── Calculate concentration index (HHI) ──
    hhi = 0
    top_holding_pct = 0
    top_holding_name = ""
    for h in holdings:
        pct = (h.get("market_value", 0) / (total_value or 1))
        hhi += pct ** 2
        if pct * 100 > top_holding_pct:
            top_holding_pct = pct * 100
            top_holding_name = h.get("ticker", "")

    concentration_risk = {
        "top_holding_pct": top_holding_pct,
        "top_holding": top_holding_name,
        "herfindahl_index": hhi
    }

    # ── Supply chain analysis ──
    supply_chain_countries = {}
    for h in holdings:
        ticker = h["ticker"]
        deps = SUPPLY_CHAIN_DEPS.get(ticker, {})
        weight = h.get("market_value", 0) / total_value
        for country, dep_pct in deps.items():
            supply_chain_countries[country] = supply_chain_countries.get(country, 0) + (dep_pct * weight)

    for country, total_dep in supply_chain_countries.items():
        if total_dep > 0.20:  # If >20% portfolio depends on this country
            hidden_risks.append(
                f"🔗 Supply chain: {round(total_dep * 100, 0)}% of your portfolio's supply chain deeply depends on {country}"
            )

    # ── Revenue geography analysis ──
    revenue_countries = {}
    for h in holdings:
        ticker = h["ticker"]
        rev_geo = REVENUE_GEO.get(ticker, {})
        weight = h.get("market_value", 0) / total_value
        for country, rev_pct in rev_geo.items():
            revenue_countries[country] = revenue_countries.get(country, 0) + (rev_pct * weight)

    # Normalize to nice dict for frontend
    frontend_revenue_geography = {
        k: round(v * 100, 2) for k, v in revenue_countries.items() if v > 0.01
    }

    for country, total_rev in revenue_countries.items():
        if country != "US" and total_rev > 0.20:
            hidden_risks.append(
                f"💰 Revenue: Over {round(total_rev*100, 0)}% of your portfolio's revenue relies on {country}"
            )

    # ── Causal chain hidden risks ──
    causal_risks = get_hidden_risks(tickers)
    for risk in causal_risks.get("hidden_risks", [])[:5]:
        hidden_risks.append(f"⛓️ {risk['description']}")

    # ── Correlation warning ──
    correlation_warning = None
    if len(sector_exposure) <= 2:
        correlation_warning = (
            "⚠️ Low sector diversification. During market stress, correlations spike to 0.9+ — "
            "your portfolio may lose more than expected."
        )

    # ── Recommendations ──
    recommendations = []
    if len(country_exposure) == 1:
        recommendations.append("Diversify internationally to reduce single-country risk")
    if any(d["exposure_pct"] > 30 for d in sector_details):
        recommendations.append("Reduce sector concentration — no sector should exceed 30%")
    if hidden_risks:
        recommendations.append("Review hidden supply chain and revenue exposures")

    # Overall risk score
    overall_risk = min(100, sum(d["exposure_pct"] for d in country_details if d["risk_level"] in ["HIGH", "CRITICAL"]))

    return {
        "portfolio_id": holdings[0].get("portfolio_id", 0) if holdings else 0,
        "concentration_risk": concentration_risk,
        "revenue_geography": frontend_revenue_geography,
        "supply_chain_risk": {k: round(v*100, 2) for k, v in supply_chain_countries.items()},
        "country_exposure": country_details,
        "sector_exposure": sector_details,
        "hidden_risks": hidden_risks,
        "correlation_warning": correlation_warning,
        "overall_risk_score": round(overall_risk, 1),
        "recommendations": recommendations,
    }