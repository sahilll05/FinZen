"""
Country data — risk baselines, names, sectors, etc.
This is the data layer that powers the Geopolitical Engine.
"""

COUNTRY_INFO = {
    # ── Americas ──────────────────────────────────────────────────────────────
    "US": {
        "name": "United States", "region": "Americas", "currency": "USD",
        "markets": ["NYSE", "NASDAQ"], "language": "English",
        "base_risk": {
            "war_risk": 2.0, "sanctions_risk": 1.0, "regulatory_risk": 3.0,
            "economic_risk": 3.0, "political_risk": 3.5, "currency_risk": 1.5,
        },
        "key_risk_factors": ["Fed rates", "election cycle", "trade war"],
    },
    "CA": {
        "name": "Canada", "region": "Americas", "currency": "CAD",
        "markets": ["TSX"], "language": "English, French",
        "base_risk": {
            "war_risk": 1.0, "sanctions_risk": 1.0, "regulatory_risk": 2.5,
            "economic_risk": 2.5, "political_risk": 2.0, "currency_risk": 2.0,
        },
        "key_risk_factors": ["commodity prices", "US trade exposure", "housing bubble"],
    },
    "MX": {
        "name": "Mexico", "region": "Americas", "currency": "MXN",
        "markets": ["BMV"], "language": "Spanish",
        "base_risk": {
            "war_risk": 3.5, "sanctions_risk": 1.5, "regulatory_risk": 4.5,
            "economic_risk": 4.5, "political_risk": 5.0, "currency_risk": 4.0,
        },
        "key_risk_factors": ["drug cartels", "AMLO policies", "US dependency", "inflation"],
    },
    "BR": {
        "name": "Brazil", "region": "Americas", "currency": "BRL",
        "markets": ["B3"], "language": "Portuguese",
        "base_risk": {
            "war_risk": 2.0, "sanctions_risk": 1.0, "regulatory_risk": 5.0,
            "economic_risk": 5.0, "political_risk": 5.5, "currency_risk": 5.0,
        },
        "key_risk_factors": ["inflation", "political turmoil", "deforestation sanctions", "public debt"],
    },
    "AR": {
        "name": "Argentina", "region": "Americas", "currency": "ARS",
        "markets": ["BCBA"], "language": "Spanish",
        "base_risk": {
            "war_risk": 1.5, "sanctions_risk": 2.0, "regulatory_risk": 6.0,
            "economic_risk": 8.5, "political_risk": 7.0, "currency_risk": 9.0,
        },
        "key_risk_factors": ["hyperinflation", "IMF debt", "currency controls", "default risk"],
    },

    # ── Europe ────────────────────────────────────────────────────────────────
    "GB": {
        "name": "United Kingdom", "region": "Europe", "currency": "GBP",
        "markets": ["LSE"], "language": "English",
        "base_risk": {
            "war_risk": 1.5, "sanctions_risk": 1.0, "regulatory_risk": 3.0,
            "economic_risk": 3.5, "political_risk": 3.0, "currency_risk": 2.5,
        },
        "key_risk_factors": ["Brexit", "BoE policy", "recession risk"],
    },
    "DE": {
        "name": "Germany", "region": "Europe", "currency": "EUR",
        "markets": ["XETRA"], "language": "German",
        "base_risk": {
            "war_risk": 1.0, "sanctions_risk": 1.0, "regulatory_risk": 3.0,
            "economic_risk": 3.0, "political_risk": 2.0, "currency_risk": 2.0,
        },
        "key_risk_factors": ["energy dependency", "ECB policy", "manufacturing slowdown"],
    },
    "FR": {
        "name": "France", "region": "Europe", "currency": "EUR",
        "markets": ["Euronext"], "language": "French",
        "base_risk": {
            "war_risk": 1.5, "sanctions_risk": 1.0, "regulatory_risk": 3.5,
            "economic_risk": 3.5, "political_risk": 4.0, "currency_risk": 2.0,
        },
        "key_risk_factors": ["social unrest", "pension reform", "ECB dependency"],
    },
    "RU": {
        "name": "Russia", "region": "Europe", "currency": "RUB",
        "markets": ["MOEX"], "language": "Russian",
        "base_risk": {
            "war_risk": 8.5, "sanctions_risk": 9.0, "regulatory_risk": 6.0,
            "economic_risk": 6.0, "political_risk": 5.0, "currency_risk": 7.0,
        },
        "key_risk_factors": ["sanctions", "war in Ukraine", "commodity dependency"],
    },
    "UA": {
        "name": "Ukraine", "region": "Europe", "currency": "UAH",
        "markets": ["PFTS"], "language": "Ukrainian",
        "base_risk": {
            "war_risk": 9.5, "sanctions_risk": 2.0, "regulatory_risk": 5.5,
            "economic_risk": 8.0, "political_risk": 6.0, "currency_risk": 7.5,
        },
        "key_risk_factors": ["active war zone", "infrastructure damage", "refugee crisis"],
    },
    "TR": {
        "name": "Turkey", "region": "Europe", "currency": "TRY",
        "markets": ["BIST"], "language": "Turkish",
        "base_risk": {
            "war_risk": 4.5, "sanctions_risk": 2.0, "regulatory_risk": 5.0,
            "economic_risk": 7.5, "political_risk": 5.5, "currency_risk": 8.5,
        },
        "key_risk_factors": ["inflation 80%+", "currency crisis", "political risk"],
    },
    "PL": {
        "name": "Poland", "region": "Europe", "currency": "PLN",
        "markets": ["WSE"], "language": "Polish",
        "base_risk": {
            "war_risk": 3.0, "sanctions_risk": 1.0, "regulatory_risk": 3.5,
            "economic_risk": 3.5, "political_risk": 3.0, "currency_risk": 3.0,
        },
        "key_risk_factors": ["Ukraine border risk", "EU rule-of-law tensions", "energy transition"],
    },
    "IT": {
        "name": "Italy", "region": "Europe", "currency": "EUR",
        "markets": ["Borsa Italiana"], "language": "Italian",
        "base_risk": {
            "war_risk": 1.0, "sanctions_risk": 1.0, "regulatory_risk": 4.0,
            "economic_risk": 5.0, "political_risk": 5.0, "currency_risk": 2.5,
        },
        "key_risk_factors": ["public debt 150% GDP", "political instability", "banking stress"],
    },

    # ── Asia ──────────────────────────────────────────────────────────────────
    "CN": {
        "name": "China", "region": "Asia", "currency": "CNY",
        "markets": ["SSE", "SZSE"], "language": "Chinese",
        "base_risk": {
            "war_risk": 5.0, "sanctions_risk": 4.0, "regulatory_risk": 7.0,
            "economic_risk": 5.0, "political_risk": 5.5, "currency_risk": 4.0,
        },
        "key_risk_factors": ["Taiwan risk", "tech crackdowns", "property crisis"],
    },
    "IN": {
        "name": "India", "region": "Asia", "currency": "INR",
        "markets": ["BSE", "NSE"], "language": "Hindi, English",
        "base_risk": {
            "war_risk": 4.0, "sanctions_risk": 1.5, "regulatory_risk": 4.0,
            "economic_risk": 3.5, "political_risk": 3.0, "currency_risk": 3.5,
        },
        "key_risk_factors": ["Modi policies", "Pakistan tensions", "monsoon", "IT sector"],
    },
    "JP": {
        "name": "Japan", "region": "Asia", "currency": "JPY",
        "markets": ["TSE"], "language": "Japanese",
        "base_risk": {
            "war_risk": 2.0, "sanctions_risk": 1.0, "regulatory_risk": 2.5,
            "economic_risk": 3.5, "political_risk": 2.0, "currency_risk": 4.0,
        },
        "key_risk_factors": ["BoJ policy", "China tensions", "aging population"],
    },
    "KR": {
        "name": "South Korea", "region": "Asia", "currency": "KRW",
        "markets": ["KRX"], "language": "Korean",
        "base_risk": {
            "war_risk": 5.5, "sanctions_risk": 1.5, "regulatory_risk": 2.5,
            "economic_risk": 3.0, "political_risk": 3.5, "currency_risk": 3.0,
        },
        "key_risk_factors": ["North Korea risk", "tech export controls", "K-chip dependency"],
    },
    "TW": {
        "name": "Taiwan", "region": "Asia", "currency": "TWD",
        "markets": ["TWSE"], "language": "Mandarin",
        "base_risk": {
            "war_risk": 7.0, "sanctions_risk": 2.0, "regulatory_risk": 2.5,
            "economic_risk": 3.0, "political_risk": 5.0, "currency_risk": 2.5,
        },
        "key_risk_factors": ["China invasion risk", "semiconductor dominance", "US/China tensions"],
    },
    "SG": {
        "name": "Singapore", "region": "Asia", "currency": "SGD",
        "markets": ["SGX"], "language": "English",
        "base_risk": {
            "war_risk": 1.5, "sanctions_risk": 1.0, "regulatory_risk": 2.0,
            "economic_risk": 2.5, "political_risk": 1.5, "currency_risk": 1.5,
        },
        "key_risk_factors": ["China dependency", "regional trade flows"],
    },
    "ID": {
        "name": "Indonesia", "region": "Asia", "currency": "IDR",
        "markets": ["IDX"], "language": "Indonesian",
        "base_risk": {
            "war_risk": 2.5, "sanctions_risk": 1.0, "regulatory_risk": 4.5,
            "economic_risk": 4.0, "political_risk": 4.0, "currency_risk": 4.0,
        },
        "key_risk_factors": ["commodity dependence", "political transition", "currency volatility"],
    },
    "TH": {
        "name": "Thailand", "region": "Asia", "currency": "THB",
        "markets": ["SET"], "language": "Thai",
        "base_risk": {
            "war_risk": 2.0, "sanctions_risk": 1.0, "regulatory_risk": 4.0,
            "economic_risk": 4.0, "political_risk": 5.5, "currency_risk": 3.5,
        },
        "key_risk_factors": ["military politics", "tourism dependency", "export reliance"],
    },
    "VN": {
        "name": "Vietnam", "region": "Asia", "currency": "VND",
        "markets": ["HOSE"], "language": "Vietnamese",
        "base_risk": {
            "war_risk": 2.0, "sanctions_risk": 1.5, "regulatory_risk": 4.5,
            "economic_risk": 3.5, "political_risk": 3.0, "currency_risk": 3.5,
        },
        "key_risk_factors": ["US-China supply chain shift", "manufacturing boom", "currency controls"],
    },
    "PH": {
        "name": "Philippines", "region": "Asia", "currency": "PHP",
        "markets": ["PSE"], "language": "Filipino, English",
        "base_risk": {
            "war_risk": 3.0, "sanctions_risk": 1.0, "regulatory_risk": 4.5,
            "economic_risk": 4.5, "political_risk": 5.0, "currency_risk": 4.0,
        },
        "key_risk_factors": ["South China Sea tensions", "typhoon risk", "remittance dependency"],
    },
    "MY": {
        "name": "Malaysia", "region": "Asia", "currency": "MYR",
        "markets": ["Bursa Malaysia"], "language": "Malay",
        "base_risk": {
            "war_risk": 1.5, "sanctions_risk": 1.0, "regulatory_risk": 3.5,
            "economic_risk": 3.5, "political_risk": 4.0, "currency_risk": 3.5,
        },
        "key_risk_factors": ["palm oil dependency", "coalition politics", "tech supply chain"],
    },
    "PK": {
        "name": "Pakistan", "region": "Asia", "currency": "PKR",
        "markets": ["PSX"], "language": "Urdu, English",
        "base_risk": {
            "war_risk": 6.0, "sanctions_risk": 2.5, "regulatory_risk": 5.0,
            "economic_risk": 7.0, "political_risk": 7.0, "currency_risk": 7.5,
        },
        "key_risk_factors": ["political instability", "IMF conditions", "forex crisis"],
    },

    # ── Middle East & Africa ──────────────────────────────────────────────────
    "SA": {
        "name": "Saudi Arabia", "region": "Middle East", "currency": "SAR",
        "markets": ["Tadawul"], "language": "Arabic",
        "base_risk": {
            "war_risk": 4.5, "sanctions_risk": 2.0, "regulatory_risk": 4.0,
            "economic_risk": 3.5, "political_risk": 3.5, "currency_risk": 2.0,
        },
        "key_risk_factors": ["oil dependency", "Yemen war", "Vision 2030 execution"],
    },
    "IR": {
        "name": "Iran", "region": "Middle East", "currency": "IRR",
        "markets": ["TSE"], "language": "Persian",
        "base_risk": {
            "war_risk": 7.2, "sanctions_risk": 8.5, "regulatory_risk": 6.0,
            "economic_risk": 5.5, "political_risk": 5.0, "currency_risk": 8.0,
        },
        "key_risk_factors": ["sanctions", "war risk", "inflation", "currency collapse"],
    },
    "IL": {
        "name": "Israel", "region": "Middle East", "currency": "ILS",
        "markets": ["TASE"], "language": "Hebrew",
        "base_risk": {
            "war_risk": 7.5, "sanctions_risk": 2.0, "regulatory_risk": 3.0,
            "economic_risk": 4.0, "political_risk": 6.5, "currency_risk": 3.5,
        },
        "key_risk_factors": ["Gaza conflict", "Iran threat", "judicial reform crisis"],
    },
    "EG": {
        "name": "Egypt", "region": "Middle East", "currency": "EGP",
        "markets": ["EGX"], "language": "Arabic",
        "base_risk": {
            "war_risk": 4.0, "sanctions_risk": 1.5, "regulatory_risk": 5.0,
            "economic_risk": 7.5, "political_risk": 5.5, "currency_risk": 7.0,
        },
        "key_risk_factors": ["USD shortage", "IMF conditions", "regional spillover"],
    },
    "ZA": {
        "name": "South Africa", "region": "Africa", "currency": "ZAR",
        "markets": ["JSE"], "language": "Zulu, English",
        "base_risk": {
            "war_risk": 3.0, "sanctions_risk": 1.0, "regulatory_risk": 5.0,
            "economic_risk": 6.0, "political_risk": 5.5, "currency_risk": 5.5,
        },
        "key_risk_factors": ["load shedding", "unemployment 35%", "ANC governance"],
    },
    "NG": {
        "name": "Nigeria", "region": "Africa", "currency": "NGN",
        "markets": ["NGX"], "language": "English",
        "base_risk": {
            "war_risk": 5.5, "sanctions_risk": 1.5, "regulatory_risk": 5.5,
            "economic_risk": 6.5, "political_risk": 6.0, "currency_risk": 7.0,
        },
        "key_risk_factors": ["terrorism (Boko Haram)", "oil theft", "FX crisis", "inflation"],
    },
    "AU": {
        "name": "Australia", "region": "Asia-Pacific", "currency": "AUD",
        "markets": ["ASX"], "language": "English",
        "base_risk": {
            "war_risk": 1.5, "sanctions_risk": 1.0, "regulatory_risk": 2.5,
            "economic_risk": 2.5, "political_risk": 2.0, "currency_risk": 2.5,
        },
        "key_risk_factors": ["China relations", "commodity exports", "housing market"],
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