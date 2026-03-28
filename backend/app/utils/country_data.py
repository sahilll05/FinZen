"""
Country data — risk baselines, names, sectors, etc.
This is the data layer that powers the Geopolitical Engine.
"""

COUNTRY_INFO = {
    "US": {
        "name": "United States",
        "region": "North America",
        "currency": "USD",
        "markets": ["NYSE", "NASDAQ"],
        "language": "English",
        "base_risk": {
            "war_risk": 2.0,
            "sanctions_risk": 1.0,
            "regulatory_risk": 3.0,
            "economic_risk": 3.0,
            "political_risk": 3.5,
            "currency_risk": 1.5,
        },
        "key_risk_factors": ["Fed rates", "election cycle", "trade war"],
    },
    "IR": {
        "name": "Iran",
        "region": "Middle East",
        "currency": "IRR",
        "markets": ["TSE", "IFB"],
        "language": "Persian",
        "base_risk": {
            "war_risk": 7.2,
            "sanctions_risk": 8.5,
            "regulatory_risk": 6.0,
            "economic_risk": 5.5,
            "political_risk": 5.0,
            "currency_risk": 8.0,
        },
        "key_risk_factors": ["Sanctions", "war risk", "inflation", "currency collapse"],
    },
    "IN": {
        "name": "India",
        "region": "South Asia",
        "currency": "INR",
        "markets": ["BSE", "NSE"],
        "language": "Hindi, English",
        "base_risk": {
            "war_risk": 4.0,
            "sanctions_risk": 1.5,
            "regulatory_risk": 4.0,
            "economic_risk": 3.5,
            "political_risk": 3.0,
            "currency_risk": 3.5,
        },
        "key_risk_factors": ["Modi policies", "Pakistan tensions", "monsoon", "IT sector"],
    },
    "CN": {
        "name": "China",
        "region": "East Asia",
        "currency": "CNY",
        "markets": ["SSE", "SZSE"],
        "language": "Chinese",
        "base_risk": {
            "war_risk": 5.0,
            "sanctions_risk": 4.0,
            "regulatory_risk": 7.0,
            "economic_risk": 5.0,
            "political_risk": 5.5,
            "currency_risk": 4.0,
        },
        "key_risk_factors": ["Taiwan risk", "tech crackdowns", "property crisis"],
    },
    "GB": {
        "name": "United Kingdom",
        "region": "Europe",
        "currency": "GBP",
        "markets": ["LSE"],
        "language": "English",
        "base_risk": {
            "war_risk": 1.5,
            "sanctions_risk": 1.0,
            "regulatory_risk": 3.0,
            "economic_risk": 3.5,
            "political_risk": 3.0,
            "currency_risk": 2.5,
        },
        "key_risk_factors": ["Brexit", "BoE policy", "recession risk"],
    },
    "PK": {
        "name": "Pakistan",
        "region": "South Asia",
        "currency": "PKR",
        "markets": ["PSX"],
        "language": "Urdu, English",
        "base_risk": {
            "war_risk": 6.0,
            "sanctions_risk": 2.5,
            "regulatory_risk": 5.0,
            "economic_risk": 7.0,
            "political_risk": 7.0,
            "currency_risk": 7.5,
        },
        "key_risk_factors": ["Political instability", "IMF conditions", "forex"],
    },
    "RU": {
        "name": "Russia",
        "region": "Eastern Europe",
        "currency": "RUB",
        "markets": ["MOEX"],
        "language": "Russian",
        "base_risk": {
            "war_risk": 8.5,
            "sanctions_risk": 9.0,
            "regulatory_risk": 6.0,
            "economic_risk": 6.0,
            "political_risk": 5.0,
            "currency_risk": 7.0,
        },
        "key_risk_factors": ["Sanctions", "war in Ukraine", "commodity dependency"],
    },
    "TR": {
        "name": "Turkey",
        "region": "Middle East / Europe",
        "currency": "TRY",
        "markets": ["BIST"],
        "language": "Turkish",
        "base_risk": {
            "war_risk": 4.5,
            "sanctions_risk": 2.0,
            "regulatory_risk": 5.0,
            "economic_risk": 7.5,
            "political_risk": 5.5,
            "currency_risk": 8.5,
        },
        "key_risk_factors": ["Inflation 80%+", "currency crisis", "political risk"],
    },
    "DE": {
        "name": "Germany",
        "region": "Europe",
        "currency": "EUR",
        "markets": ["XETRA"],
        "language": "German",
        "base_risk": {
            "war_risk": 1.0,
            "sanctions_risk": 1.0,
            "regulatory_risk": 3.0,
            "economic_risk": 3.0,
            "political_risk": 2.0,
            "currency_risk": 2.0,
        },
        "key_risk_factors": ["Energy dependency", "ECB policy", "manufacturing slowdown"],
    },
    "JP": {
        "name": "Japan",
        "region": "East Asia",
        "currency": "JPY",
        "markets": ["TSE"],
        "language": "Japanese",
        "base_risk": {
            "war_risk": 2.0,
            "sanctions_risk": 1.0,
            "regulatory_risk": 2.5,
            "economic_risk": 3.5,
            "political_risk": 2.0,
            "currency_risk": 4.0,
        },
        "key_risk_factors": ["BoJ policy", "China tensions", "aging population"],
    },
}


def get_country_info(code: str) -> dict:
    """Get info for a country code. Falls back to generic."""
    code = code.upper()
    if code in COUNTRY_INFO:
        return COUNTRY_INFO[code]
    return {
        "name": code,
        "region": "Unknown",
        "currency": "USD",
        "markets": [],
        "language": "English",
        "base_risk": {
            "war_risk": 3.0,
            "sanctions_risk": 3.0,
            "regulatory_risk": 3.0,
            "economic_risk": 3.0,
            "political_risk": 3.0,
            "currency_risk": 3.0,
        },
        "key_risk_factors": ["Unknown region"],
    }


def get_risk_level(score: float) -> str:
    if score <= 2.5:
        return "LOW"
    elif score <= 5.0:
        return "MODERATE"
    elif score <= 7.5:
        return "HIGH"
    else:
        return "CRITICAL"