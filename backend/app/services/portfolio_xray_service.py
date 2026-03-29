import yfinance as yf
from typing import List, Dict
from app.utils.sector_mapping import get_stock_info
from app.services.geo_risk_service import analyze_country_risk
from app.services.causal_chain_service import get_hidden_risks


def xray_portfolio(holdings: List[dict]) -> dict:
    """
    Perform deep X-Ray analysis on portfolio using REAL yfinance fundamental data.
    """
    country_exposure = {}
    sector_exposure = {}
    concentration_risks = []
    hidden_risks = []
    total_value = 0

    tickers = []
    # Real quantitative accumulators
    total_beta = 0.0
    total_pe = 0.0
    total_yield = 0.0
    valid_beta_value = 0.0
    valid_pe_value = 0.0
    valid_yield_value = 0.0

    for h in holdings:
        ticker = h.get("ticker", "").strip()
        tickers.append(ticker)
        value = h.get("market_value", h.get("quantity", 0) * h.get("avg_cost", 0))
        total_value += value
        
        # Override dummy data with actual yfinance info
        try:
            info = yf.Ticker(ticker).info
            # Use real fundamental country and sector if available
            country = info.get("country", h.get("country", "US"))
            sector = info.get("sector", h.get("sector", "Unknown"))
            
            # Fetch real quantitative info
            beta = info.get("beta")
            if beta is not None:
                total_beta += beta * value
                valid_beta_value += value
                
            pe = info.get("trailingPE") or info.get("forwardPE")
            if pe is not None:
                total_pe += pe * value
                valid_pe_value += value
                
            div_yield = info.get("dividendYield") or info.get("trailingAnnualDividendYield")
            if div_yield is not None:
                total_yield += div_yield * value
                valid_yield_value += value
                
        except Exception as e:
            # Fallback to provided basic info if fetching fails
            country = h.get("country", "US")
            sector = h.get("sector", "Unknown")

        # Country exposure mapping
        country_exposure[country] = country_exposure.get(country, 0) + value
        # Sector exposure
        sector_exposure[sector] = sector_exposure.get(sector, 0) + value

    if total_value == 0:
        total_value = 1

    # ── Normalize Quantitative Metrics ──
    avg_beta = round(total_beta / valid_beta_value, 2) if valid_beta_value > 0 else 1.0
    avg_pe = round(total_pe / valid_pe_value, 2) if valid_pe_value > 0 else 0.0
    avg_yield_pct = round((total_yield / valid_yield_value) * 100, 2) if valid_yield_value > 0 else 0.0

    quant_metrics = {
        "portfolio_beta": avg_beta,
        "trailing_pe": avg_pe,
        "dividend_yield_pct": avg_yield_pct
    }

    # Add quantitative hidden risks
    if avg_beta > 1.3:
        hidden_risks.append(f"📈 High Volatility: Portfolio beta is {avg_beta}, indicating extreme sensitivity to market swings.")
    elif avg_beta < 0.7:
        hidden_risks.append(f"🛡️ Defensive Tilt: Low portfolio beta ({avg_beta}) may underperform during bull runs.")
        
    if avg_pe > 30:
        hidden_risks.append(f"📊 Valuation Risk: Average P/E is {avg_pe}, suggesting an overvalued high-growth concentration.")
        
    if avg_yield_pct > 6.0:
        hidden_risks.append(f"💰 Yield Trap Warning: Unusually high dividend yield ({avg_yield_pct}%) means dividend cuts could occur in downturns.")

    # ── Build exposure details ──
    country_details = []
    geographic_distribution = {}
    for country, value in sorted(country_exposure.items(), key=lambda x: x[1], reverse=True):
        pct = round((value / total_value) * 100, 1)
        geographic_distribution[country] = pct
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
                f"⚠️ {sector} concentration: {pct}% — consider diversifying"
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

    # ── Causal chain hidden risks ──
    causal_risks = get_hidden_risks(tickers)
    for risk in causal_risks.get("hidden_risks", [])[:3]:
        hidden_risks.append(f"⛓️ {risk['description']}")

    # ── Correlation warning ──
    correlation_warning = None
    if len(sector_exposure) <= 2:
        correlation_warning = (
            "⚠️ Low sector diversification. During market stress, cross-correlations spike to 0.9+ — "
            "your portfolio loses protective benefits."
        )

    # ── Recommendations ──
    recommendations = []
    if len(country_exposure) == 1:
        recommendations.append("Diversify internationally to reduce single-country geographic risk.")
    if any(d["exposure_pct"] > 30 for d in sector_details):
        recommendations.append("Reduce sector concentration — rebalance so no single sector exceeds 30%.")
    if avg_pe > 25:
        recommendations.append("Consider hedging with value or defensive stocks to offset high-growth P/E valuations.")

    # Overall risk score (aggregate high geographic, beta, and concentration)
    overall_risk = min(100, sum(d["exposure_pct"] for d in country_details if d["risk_level"] in ["HIGH", "CRITICAL"]))
    if avg_beta > 1.2:
        overall_risk = min(100, overall_risk + 20)
    if hhi > 0.3:
        overall_risk = min(100, overall_risk + 15)

    return {
        "portfolio_id": holdings[0].get("portfolio_id", 0) if holdings else 0,
        "concentration_risk": concentration_risk,
        "quantitative_metrics": quant_metrics,
        "geographic_distribution": geographic_distribution,
        "country_exposure": country_details,
        "sector_exposure": sector_details,
        "hidden_risks": hidden_risks,
        "correlation_warning": correlation_warning,
        "overall_risk_score": round(overall_risk, 1),
        "recommendations": recommendations,
    }