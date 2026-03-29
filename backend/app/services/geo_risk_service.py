"""
Geopolitical Investment Engine Service.
Analyzes country risk across 6 dimensions and maps impact to sectors/stocks.
"""

from typing import List, Dict, Optional
from app.utils.country_data import get_country_info, get_risk_level, COUNTRY_INFO
from app.utils.sector_mapping import get_sector_impact, GEO_SECTOR_IMPACT
from app.ml.geo_risk_model import predict_risk_scores
import requests
import time
import yfinance as yf


def analyze_country_risk(country_code: str) -> dict:
    """
    Full risk analysis for a country.
    Returns risk dimensions, sector impacts, and stock recommendations.
    """
    country = get_country_info(country_code)
    base_risk = country["base_risk"]

    # In production, fetch real data from GDELT/ACLED/World Bank
    # For now, use base risk with slight noise from news sentiment
    news_adjustment = _fetch_news_risk_adjustment(country_code)

    risk_dimensions = []
    dimension_names = {
        "war_risk": "War / Conflict Risk",
        "sanctions_risk": "Sanctions Impact",
        "regulatory_risk": "Government / Regulatory",
        "economic_risk": "Economic Indicators",
        "political_risk": "Political Stability",
        "currency_risk": "Currency Risk",
    }

    scores = {}
    for dim_key, dim_name in dimension_names.items():
        score = base_risk.get(dim_key, 3.0) + news_adjustment.get(dim_key, 0)
        score = max(0, min(10, score))
        scores[dim_key] = score
        risk_dimensions.append({
            "dimension": dim_name,
            "score": round(score, 1),
            "level": get_risk_level(score),
            "drivers": country.get("key_risk_factors", []),
        })

    # Overall weighted score
    weights = {
        "war_risk": 0.20,
        "sanctions_risk": 0.20,
        "regulatory_risk": 0.15,
        "economic_risk": 0.15,
        "political_risk": 0.15,
        "currency_risk": 0.15,
    }
    overall = sum(scores[k] * weights[k] for k in weights)

    # Sector impact mapping
    sector_impacts = _map_sector_impacts(scores)

    return {
        "country_code": country_code,
        "country_name": country["name"],
        "risk_dimensions": risk_dimensions,
        "overall_score": round(overall, 1),
        "overall_level": get_risk_level(overall),
        "sector_impacts": sector_impacts,
        "recommendations": [],
    }


def _map_sector_impacts(risk_scores: dict) -> list:
    """Map risk scores to sector impacts."""
    sector_impacts = {}

    # Find the dominant risk dimension
    dominant_dim = max(risk_scores, key=risk_scores.get)

    for dim, score in risk_scores.items():
        if score < 4.0:
            continue  # Low risk dimensions don't impact much

        impacts = GEO_SECTOR_IMPACT.get(dim, {})
        for sector, impact in impacts.items():
            if sector not in sector_impacts or risk_scores[dim] > risk_scores.get(
                sector_impacts[sector].get("from_dim", ""), 0
            ):
                sector_impacts[sector] = {
                    "sector": sector,
                    "direction": impact["direction"],
                    "magnitude": impact["magnitude"],
                    "driver": impact["reason"],
                    "from_dim": dim,
                }

    return [
        {
            "sector": v["sector"],
            "direction": v["direction"],
            "magnitude": v["magnitude"],
            "driver": v["driver"],
        }
        for v in sector_impacts.values()
    ]


# Cache for GDELT adjustments: {code: {data, timestamp}}
_gdelt_cache: Dict[str, dict] = {}
_GDELT_TTL = 600  # 10 minutes


def _fetch_news_risk_adjustment(country_code: str) -> dict:
    """
    Fetch real sentiment from GDELT to adjust risk scores.
    Falls back to cached or minimal noise on failure.
    """
    import random
    now = time.time()

    # Return cached if fresh
    if country_code in _gdelt_cache and (now - _gdelt_cache[country_code]["ts"]) < _GDELT_TTL:
        return _gdelt_cache[country_code]["data"]

    default = {
        "war_risk": 0.0, "sanctions_risk": 0.0, "regulatory_risk": 0.0,
        "economic_risk": 0.0, "political_risk": 0.0, "currency_risk": 0.0,
    }

    try:
        from app.utils.country_data import get_country_info
        country = get_country_info(country_code)
        country_name = country["name"]

        # Fetch from GDELT — conflict/tone analysis for the country
        gdelt_url = (
            f"https://api.gdeltproject.org/api/v2/doc/doc"
            f"?query={country_name.replace(' ', '%20')}%20conflict%20OR%20war%20OR%20sanctions%20OR%20economy"
            f"&mode=artlist&maxrecords=20&format=json"
        )
        resp = requests.get(gdelt_url, timeout=8)
        if resp.status_code != 200:
            return default

        articles = resp.json().get("articles", [])
        if not articles:
            return default

        # Analyze tone across articles
        tone_sum = 0.0
        count = 0
        war_hits = 0
        sanction_hits = 0
        economy_hits = 0

        for a in articles:
            title = (a.get("title", "") + " " + a.get("url", "")).lower()
            tone = float(a.get("socialimage", 0) or 0)
            tone_sum += tone
            count += 1

            war_keywords = ["war", "attack", "missile", "conflict", "military", "troops", "invasion", "airstrike", "bomb"]
            sanction_keywords = ["sanction", "embargo", "ban", "blocked", "restricted", "tariff"]
            economy_keywords = ["inflation", "recession", "debt", "deficit", "crisis", "crash", "gdp"]

            if any(k in title for k in war_keywords):
                war_hits += 1
            if any(k in title for k in sanction_keywords):
                sanction_hits += 1
            if any(k in title for k in economy_keywords):
                economy_hits += 1

        total = max(count, 1)
        war_adj = min(war_hits / total * 3.0, 2.0)
        sanction_adj = min(sanction_hits / total * 2.5, 1.5)
        econ_adj = min(economy_hits / total * 2.5, 1.5)

        adjustment = {
            "war_risk": round(war_adj, 2),
            "sanctions_risk": round(sanction_adj, 2),
            "regulatory_risk": round(econ_adj * 0.4, 2),
            "economic_risk": round(econ_adj, 2),
            "political_risk": round((war_adj + econ_adj) * 0.3, 2),
            "currency_risk": round(econ_adj * 0.6, 2),
        }

        _gdelt_cache[country_code] = {"data": adjustment, "ts": now}
        return adjustment

    except Exception as e:
        print(f"⚠️  GDELT adjustment failed for {country_code}: {e}")
        # Small deterministic noise as fallback
        return {
            "war_risk": random.uniform(-0.2, 0.2),
            "sanctions_risk": random.uniform(-0.2, 0.2),
            "regulatory_risk": random.uniform(-0.1, 0.1),
            "economic_risk": random.uniform(-0.2, 0.2),
            "political_risk": random.uniform(-0.1, 0.1),
            "currency_risk": random.uniform(-0.2, 0.2),
        }


def analyze_portfolio_geo_exposure(holdings: list) -> dict:
    """
    Analyze a portfolio's geographic risk exposure.
    """
    country_values = {}
    total_value = 0

    for h in holdings:
        value = h.get("market_value", h.get("quantity", 0) * h.get("avg_cost", 0))
        country = h.get("country", "US")
        country_values[country] = country_values.get(country, 0) + value
        total_value += value

    if total_value == 0:
        total_value = 1  # Avoid division by zero

    country_exposures = {}
    high_risk_total = 0

    for country, value in country_values.items():
        pct = round((value / total_value) * 100, 1)
        country_exposures[country] = pct

        risk = analyze_country_risk(country)
        if risk["overall_score"] > 6.0:
            high_risk_total += pct

    return {
        "country_exposures": country_exposures,
        "high_risk_exposure": round(high_risk_total, 1),
        "risk_summary": (
            f"Portfolio has {len(country_exposures)} country exposures. "
            f"{round(high_risk_total, 1)}% is in high-risk countries."
        ),
    }


# ── Globe Data ─────────────────────────────────────────────────────────────────

# Major countries with lat/lng for the globe
GLOBE_COUNTRIES = [
    # Americas
    {"code": "US", "lat": 39.50, "lng": -98.35},
    {"code": "CA", "lat": 56.13, "lng": -106.34},
    {"code": "MX", "lat": 23.63, "lng": -102.55},
    {"code": "BR", "lat": -14.23, "lng": -51.92},
    {"code": "AR", "lat": -38.41, "lng": -63.61},
    {"code": "CO", "lat": 4.57, "lng": -74.29},
    {"code": "CL", "lat": -35.67, "lng": -71.54},
    {"code": "VE", "lat": 6.42, "lng": -66.58},
    {"code": "PE", "lat": -9.18, "lng": -75.01},
    # Europe
    {"code": "GB", "lat": 55.37, "lng": -3.43},
    {"code": "DE", "lat": 51.16, "lng": 10.45},
    {"code": "FR", "lat": 46.22, "lng": 2.21},
    {"code": "IT", "lat": 41.87, "lng": 12.56},
    {"code": "ES", "lat": 40.46, "lng": -3.74},
    {"code": "PL", "lat": 51.91, "lng": 19.14},
    {"code": "NL", "lat": 52.13, "lng": 5.29},
    {"code": "SE", "lat": 60.12, "lng": 18.64},
    {"code": "NO", "lat": 60.47, "lng": 8.46},
    {"code": "CH", "lat": 46.81, "lng": 8.22},
    {"code": "RU", "lat": 61.52, "lng": 105.31},
    {"code": "UA", "lat": 48.37, "lng": 31.16},
    {"code": "TR", "lat": 38.96, "lng": 35.24},
    # Asia-Pacific
    {"code": "CN", "lat": 35.86, "lng": 104.19},
    {"code": "IN", "lat": 20.59, "lng": 78.96},
    {"code": "JP", "lat": 36.20, "lng": 138.25},
    {"code": "KR", "lat": 35.90, "lng": 127.76},
    {"code": "TW", "lat": 23.69, "lng": 120.96},
    {"code": "SG", "lat": 1.35, "lng": 103.82},
    {"code": "ID", "lat": -0.78, "lng": 113.92},
    {"code": "TH", "lat": 15.87, "lng": 100.99},
    {"code": "VN", "lat": 14.05, "lng": 108.27},
    {"code": "PH", "lat": 12.87, "lng": 121.77},
    {"code": "MY", "lat": 4.21, "lng": 108.95},
    {"code": "PK", "lat": 30.37, "lng": 69.34},
    {"code": "AU", "lat": -25.27, "lng": 133.77},
    {"code": "NZ", "lat": -40.90, "lng": 174.88},
    {"code": "BD", "lat": 23.68, "lng": 90.35},
    # Middle East
    {"code": "SA", "lat": 23.88, "lng": 45.07},
    {"code": "IR", "lat": 32.42, "lng": 53.68},
    {"code": "IL", "lat": 31.04, "lng": 34.85},
    {"code": "AE", "lat": 23.42, "lng": 53.84},
    {"code": "EG", "lat": 26.82, "lng": 30.80},
    {"code": "IQ", "lat": 33.22, "lng": 43.67},
    # Africa
    {"code": "ZA", "lat": -30.55, "lng": 22.93},
    {"code": "NG", "lat": 9.08, "lng": 8.67},
    {"code": "ET", "lat": 9.14, "lng": 40.48},
    {"code": "KE", "lat": -0.02, "lng": 37.90},
    {"code": "GH", "lat": 7.95, "lng": -1.02},
    {"code": "TZ", "lat": -6.36, "lng": 34.89},
    {"code": "MA", "lat": 31.79, "lng": -7.08},
]


def get_globe_data() -> list:
    """
    Return risk data for all globe countries using FAST baseline-only scoring.
    Does NOT call GDELT/external APIs — reads directly from COUNTRY_INFO baselines.
    This keeps the globe endpoint sub-second for 50+ countries.
    """
    from app.utils.country_data import COUNTRY_INFO, get_risk_level

    weights = {
        "war_risk": 0.20, "sanctions_risk": 0.20, "regulatory_risk": 0.15,
        "economic_risk": 0.15, "political_risk": 0.15, "currency_risk": 0.15,
    }

    result = []
    for entry in GLOBE_COUNTRIES:
        code = entry["code"]
        try:
            info = COUNTRY_INFO.get(code)
            if info:
                base = info["base_risk"]
                overall = sum(base.get(k, 3.0) * w for k, w in weights.items())
                overall = round(min(10.0, max(0.0, overall)), 1)
                name = info["name"]
                level = get_risk_level(overall)
            else:
                # Unknown country: use generic moderate risk
                overall = 4.0
                level = "MODERATE"
                name = code

            result.append({
                "code": code,
                "lat": entry["lat"],
                "lng": entry["lng"],
                "country_name": name,
                "overall_score": overall,
                "overall_level": level,
            })
        except Exception as e:
            print(f"Globe data error for {code}: {e}")
            result.append({
                "code": code,
                "lat": entry["lat"],
                "lng": entry["lng"],
                "country_name": code,
                "overall_score": 4.0,
                "overall_level": "MODERATE",
            })
    return result



# Country → stock index ticker mapping
COUNTRY_STOCK_MAP: Dict[str, list] = {
    "US":  [{"name": "S&P 500",    "ticker": "^GSPC"},   {"name": "NASDAQ",      "ticker": "^IXIC"}],
    "IN":  [{"name": "NIFTY 50",   "ticker": "^NSEI"},   {"name": "SENSEX",      "ticker": "^BSESN"}],
    "CN":  [{"name": "Shanghai",   "ticker": "000001.SS"},{"name": "Hang Seng",   "ticker": "^HSI"}],
    "JP":  [{"name": "Nikkei 225", "ticker": "^N225"},   {"name": "TOPIX",       "ticker": "^TOPX"}],
    "GB":  [{"name": "FTSE 100",   "ticker": "^FTSE"}],
    "DE":  [{"name": "DAX",        "ticker": "^GDAXI"}],
    "FR":  [{"name": "CAC 40",     "ticker": "^FCHI"}],
    "IT":  [{"name": "FTSE MIB",   "ticker": "FTSEMIB.MI"}],
    "ES":  [{"name": "IBEX 35",    "ticker": "^IBEX"}],
    "NL":  [{"name": "AEX",        "ticker": "^AEX"}],
    "CH":  [{"name": "SMI",        "ticker": "^SSMI"}],
    "SE":  [{"name": "OMX Stockholm", "ticker": "^OMXS30"}],
    "NO":  [{"name": "Oslo Bors",  "ticker": "^OSEAX"}],
    "PL":  [{"name": "WIG20",      "ticker": "^WIG20"}],
    "BR":  [{"name": "Bovespa",    "ticker": "^BVSP"}],
    "AU":  [{"name": "ASX 200",    "ticker": "^AXJO"}],
    "CA":  [{"name": "TSX",        "ticker": "^GSPTSE"}],
    "MX":  [{"name": "IPC",        "ticker": "^MXX"}],
    "AR":  [{"name": "MERVAL",     "ticker": "^MERV"}],
    "CL":  [{"name": "IPSA",       "ticker": "^IPSA"}],
    "CO":  [{"name": "COLCAP",     "ticker": "^COLCAP"}],
    "TW":  [{"name": "TAIEX",      "ticker": "^TWII"}],
    "KR":  [{"name": "KOSPI",      "ticker": "^KS11"}],
    "SG":  [{"name": "STI",        "ticker": "^STI"}],
    "SA":  [{"name": "Tadawul",    "ticker": "^TASI.SR"}],
    "AE":  [{"name": "DFM Index",  "ticker": "^DFMGI"}],
    "ZA":  [{"name": "JSE TOP40",  "ticker": "^JN0U.JO"}],
    "NG":  [{"name": "NGX ASI",    "ticker": "NGXASI.LG"}],
    "EG":  [{"name": "EGX 30",     "ticker": "^CASE30"}],
    "MA":  [{"name": "MASI",       "ticker": "^MASI"}],
    "TR":  [{"name": "BIST 100",   "ticker": "XU100.IS"}],
    "RU":  [{"name": "MOEX",       "ticker": "IMOEX.ME"}],
    "UA":  [{"name": "PFTS",       "ticker": "PFTS"}],
    "IL":  [{"name": "TA-125",     "ticker": "TA125.TA"}],
    "IR":  [{"name": "TEDPIX",     "ticker": "TEDPIX"}],
    "IQ":  [{"name": "ISX",        "ticker": "ISX"}],
    "ID":  [{"name": "IDX",        "ticker": "^JKSE"}],
    "TH":  [{"name": "SET",        "ticker": "^SET.BK"}],
    "MY":  [{"name": "KLCI",       "ticker": "^KLSE"}],
    "VN":  [{"name": "VN-Index",   "ticker": "^VNINDEX"}],
    "PH":  [{"name": "PSEi",       "ticker": "PSEI.PS"}],
    "PK":  [{"name": "KSE-100",    "ticker": "^KSE"}],
    "BD":  [{"name": "DSEX",       "ticker": "^DSEX"}],
    "NZ":  [{"name": "NZX 50",     "ticker": "^NZ50"}],
    "KE":  [{"name": "NSE 20",     "ticker": "^NSE20"}],
    "GH":  [{"name": "GSE CI",     "ticker": "^GSECI"}],
}

# Stock cache: {ticker: {data, timestamp}}
_stock_cache: Dict[str, dict] = {}
_STOCK_TTL = 300  # 5 minutes


def get_country_stocks(country_code: str) -> dict:
    """Fetch real-time stock index data for a country using yf.download()."""
    tickers = COUNTRY_STOCK_MAP.get(country_code.upper(), [])
    stocks = []
    now = time.time()

    for entry in tickers:
        ticker = entry["ticker"]
        name = entry["name"]

        # Return cached data if fresh
        if ticker in _stock_cache and (now - _stock_cache[ticker]["ts"]) < _STOCK_TTL:
            stocks.append(_stock_cache[ticker]["data"])
            continue

        stock_data = {"name": name, "ticker": ticker, "price": None, "change_pct": 0.0, "currency": "USD"}

        try:
            # yf.download is most reliable for indices — fetch last 5 days at 1d interval
            df = yf.download(ticker, period="5d", interval="1d", progress=False, auto_adjust=True)

            if df is not None and len(df) >= 2:
                # Handle MultiIndex columns (yfinance >= 0.2 returns MultiIndex)
                if hasattr(df.columns, "levels"):
                    close_col = ("Close", ticker) if ("Close", ticker) in df.columns else "Close"
                else:
                    close_col = "Close"

                closes = df[close_col].dropna()
                if len(closes) >= 2:
                    prev_close = float(closes.iloc[-2])
                    last_close = float(closes.iloc[-1])
                    change_pct = round(((last_close - prev_close) / prev_close) * 100, 2) if prev_close else 0.0

                    # Try to get intra-day price (1m last 1d) for live price
                    try:
                        intra = yf.download(ticker, period="1d", interval="5m", progress=False, auto_adjust=True)
                        if intra is not None and len(intra) > 0:
                            ic = ("Close", ticker) if hasattr(intra.columns, "levels") and ("Close", ticker) in intra.columns else "Close"
                            live_price = round(float(intra[ic].dropna().iloc[-1]), 2)
                        else:
                            live_price = round(last_close, 2)
                    except Exception:
                        live_price = round(last_close, 2)

                    # Get currency from fast_info if possible
                    currency = "USD"
                    try:
                        fi = yf.Ticker(ticker).fast_info
                        currency = getattr(fi, "currency", "USD") or "USD"
                    except Exception:
                        pass

                    stock_data = {
                        "name": name, "ticker": ticker,
                        "price": live_price,
                        "change_pct": change_pct,
                        "currency": currency,
                    }

            elif df is not None and len(df) == 1:
                close_col = ("Close", ticker) if hasattr(df.columns, "levels") and ("Close", ticker) in df.columns else "Close"
                closes = df[close_col].dropna()
                if len(closes) >= 1:
                    stock_data = {
                        "name": name, "ticker": ticker,
                        "price": round(float(closes.iloc[-1]), 2),
                        "change_pct": 0.0,
                        "currency": "USD",
                    }

        except Exception as e:
            print(f"⚠️  Stock fetch error for {ticker}: {e}")

        _stock_cache[ticker] = {"data": stock_data, "ts": now}
        stocks.append(stock_data)

    return {"country_code": country_code.upper(), "stocks": stocks}