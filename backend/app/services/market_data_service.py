"""
Market Data Service — fetches stock prices using yfinance.
"""

import yfinance as yf
from typing import List, Dict, Optional
from functools import lru_cache
import time

# Simple in-memory cache with expiry
_price_cache: Dict[str, dict] = {}
_cache_ttl = 300  # 5 minutes


def get_stock_price(ticker: str) -> Optional[float]:
    """Get current stock price for a ticker."""
    now = time.time()

    # Check cache
    if ticker in _price_cache and (now - _price_cache[ticker]["time"]) < _cache_ttl:
        return _price_cache[ticker]["price"]

    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        if price:
            _price_cache[ticker] = {"price": price, "time": now}
            return price
    except Exception as e:
        print(f"⚠️ Could not fetch price for {ticker}: {e}")

    return None


def get_stock_history(ticker: str, period: str = "1y") -> list:
    """Get historical prices for a ticker."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        return [
            {
                "date": str(date.date()),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"]),
            }
            for date, row in hist.iterrows()
        ]
    except Exception as e:
        print(f"⚠️ History error for {ticker}: {e}")
        return []


def get_stock_info(ticker: str) -> dict:
    """Get detailed stock info."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        return {
            "ticker": ticker,
            "name": info.get("longName", ticker),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "country": info.get("country", "Unknown"),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", None),
            "dividend_yield": info.get("dividendYield", None),
            "52w_high": info.get("fiftyTwoWeekHigh", None),
            "52w_low": info.get("fiftyTwoWeekLow", None),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "beta": info.get("beta", 1.0),
        }
    except Exception as e:
        return {"ticker": ticker, "name": ticker, "error": str(e)}


def get_multiple_prices(tickers: List[str]) -> Dict[str, Optional[float]]:
    """Get prices for multiple tickers."""
    return {ticker: get_stock_price(ticker) for ticker in tickers}