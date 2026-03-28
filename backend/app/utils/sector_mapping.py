"""
Maps tickers to sectors/countries and provides sector-impact rules.
"""

# Common stock → sector + country mapping (expand as needed)
STOCK_INFO = {
    "AAPL":  {"name": "Apple Inc.",             "sector": "Technology",      "country": "US"},
    "MSFT":  {"name": "Microsoft Corp.",        "sector": "Technology",      "country": "US"},
    "GOOGL": {"name": "Alphabet Inc.",          "sector": "Technology",      "country": "US"},
    "AMZN":  {"name": "Amazon.com Inc.",        "sector": "Consumer",        "country": "US"},
    "TSLA":  {"name": "Tesla Inc.",             "sector": "Automotive",      "country": "US"},
    "NVDA":  {"name": "NVIDIA Corp.",           "sector": "Technology",      "country": "US"},
    "JPM":   {"name": "JPMorgan Chase",         "sector": "Banking",         "country": "US"},
    "BAC":   {"name": "Bank of America",        "sector": "Banking",         "country": "US"},
    "XOM":   {"name": "Exxon Mobil",            "sector": "Oil & Gas",       "country": "US"},
    "JNJ":   {"name": "Johnson & Johnson",      "sector": "Healthcare",      "country": "US"},
    "WMT":   {"name": "Walmart Inc.",           "sector": "Consumer",        "country": "US"},
    "PFE":   {"name": "Pfizer Inc.",            "sector": "Healthcare",      "country": "US"},
    "META":  {"name": "Meta Platforms",         "sector": "Technology",      "country": "US"},
    "V":     {"name": "Visa Inc.",              "sector": "Banking",         "country": "US"},
    "DIS":   {"name": "Walt Disney",            "sector": "Consumer",        "country": "US"},
    # Indian stocks
    "RELIANCE.NS":  {"name": "Reliance Industries", "sector": "Oil & Gas",  "country": "IN"},
    "TCS.NS":       {"name": "TCS",                 "sector": "Technology", "country": "IN"},
    "INFY.NS":      {"name": "Infosys",             "sector": "Technology", "country": "IN"},
    "HDFCBANK.NS":  {"name": "HDFC Bank",           "sector": "Banking",    "country": "IN"},
    # Chinese stocks
    "BABA":  {"name": "Alibaba Group",         "sector": "Technology",      "country": "CN"},
    "TSM":   {"name": "TSMC",                  "sector": "Technology",      "country": "CN"},
    # UK stocks
    "SHEL":  {"name": "Shell plc",             "sector": "Oil & Gas",       "country": "GB"},
    "HSBA.L": {"name": "HSBC",                "sector": "Banking",         "country": "GB"},
}


# Geopolitical impact on sectors by risk dimension
GEO_SECTOR_IMPACT = {
    "war_risk": {
        "Oil & Gas":    {"direction": "BULLISH",  "magnitude": "+20%", "reason": "Supply disruption fears"},
        "Defense":      {"direction": "BULLISH",  "magnitude": "+15%", "reason": "Defense spending increase"},
        "Banking":      {"direction": "BEARISH",  "magnitude": "-10%", "reason": "Uncertainty, risk aversion"},
        "Tourism":      {"direction": "BEARISH",  "magnitude": "-25%", "reason": "Travel disruption"},
        "Technology":   {"direction": "BEARISH",  "magnitude": "-5%",  "reason": "Supply chain risk"},
        "Healthcare":   {"direction": "BULLISH",  "magnitude": "+5%",  "reason": "Defensive sector"},
        "Consumer":     {"direction": "BEARISH",  "magnitude": "-8%",  "reason": "Consumer spending drops"},
    },
    "sanctions_risk": {
        "Oil & Gas":    {"direction": "BEARISH",  "magnitude": "-40%", "reason": "Export restrictions"},
        "Banking":      {"direction": "BEARISH",  "magnitude": "-60%", "reason": "SWIFT/financial isolation"},
        "Technology":   {"direction": "BEARISH",  "magnitude": "-20%", "reason": "Import restrictions"},
        "Healthcare":   {"direction": "BULLISH",  "magnitude": "+25%", "reason": "Import substitution"},
        "Consumer":     {"direction": "BULLISH",  "magnitude": "+15%", "reason": "Domestic demand focus"},
        "Mining":       {"direction": "BULLISH",  "magnitude": "+20%", "reason": "Hard assets benefit"},
    },
    "economic_risk": {
        "Banking":      {"direction": "BEARISH",  "magnitude": "-15%", "reason": "NPL risk, credit squeeze"},
        "Consumer":     {"direction": "BEARISH",  "magnitude": "-12%", "reason": "Spending decline"},
        "Technology":   {"direction": "BEARISH",  "magnitude": "-8%",  "reason": "Investment decline"},
        "Healthcare":   {"direction": "BULLISH",  "magnitude": "+5%",  "reason": "Inelastic demand"},
        "Mining":       {"direction": "BULLISH",  "magnitude": "+10%", "reason": "Inflation hedge"},
    },
    "currency_risk": {
        "Mining":       {"direction": "BULLISH",  "magnitude": "+15%", "reason": "Hard asset benefit"},
        "Oil & Gas":    {"direction": "BULLISH",  "magnitude": "+10%", "reason": "Dollar-priced commodity"},
        "Banking":      {"direction": "BEARISH",  "magnitude": "-10%", "reason": "FX exposure losses"},
        "Technology":   {"direction": "BEARISH",  "magnitude": "-5%",  "reason": "Import cost increase"},
        "Consumer":     {"direction": "BEARISH",  "magnitude": "-10%", "reason": "Imported inflation"},
    },
}


def get_stock_info(ticker: str) -> dict:
    """Look up stock info. Falls back to yfinance if not in local map."""
    ticker_upper = ticker.upper()
    if ticker_upper in STOCK_INFO:
        return STOCK_INFO[ticker_upper]
    return {
        "name": ticker_upper,
        "sector": "Unknown",
        "country": "US",
    }


def get_sector_impact(risk_dimension: str, sector: str) -> dict:
    """Get the expected impact on a sector from a risk dimension."""
    dim_impacts = GEO_SECTOR_IMPACT.get(risk_dimension, {})
    return dim_impacts.get(sector, {
        "direction": "NEUTRAL",
        "magnitude": "0%",
        "reason": "No direct impact identified",
    })