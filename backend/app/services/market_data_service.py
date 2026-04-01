"""
Market Data Service — fetches stock prices using Alpha Vantage (Real-time) and yfinance (Historical/Fallback).
"""

import os
import yfinance as yf
from typing import List, Dict, Optional
import time
from dotenv import load_dotenv
from app.utils.cache import get_cache_json, set_cache_json

# Load env for API keys
load_dotenv()

ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# Cache TTLs
_PRICE_TTL = 300       # 5 minutes for live prices
_INFO_TTL = 3600      # 1 hour for stock info
_HISTORY_TTL = 86400  # 1 day for historical data


def get_stock_price(ticker: str) -> Optional[float]:
    """Get current stock price for a ticker. Prioritizes Alpha Vantage for real-time."""
    cache_key = f"price:{ticker}"
    cached_price = get_cache_json(cache_key)
    if cached_price is not None:
        return cached_price

    # Try Alpha Vantage first for real-time
    if ALPHA_VANTAGE_API_KEY:
        try:
            from alpha_vantage.timeseries import TimeSeries
            ts = TimeSeries(key=ALPHA_VANTAGE_API_KEY, output_format='json')
            data, _ = ts.get_quote_endpoint(symbol=ticker)
            price = float(data.get('05. price'))
            if price:
                set_cache_json(cache_key, price, _PRICE_TTL)
                return price
        except Exception as e:
            print(f"⚠️ Alpha Vantage fetch failed for {ticker}: {e}. Falling back to yfinance.")

    # Fallback to yfinance
    try:
        stock = yf.Ticker(ticker)
        # Fast info is quicker than .info
        price = stock.fast_info.get("last_price") or stock.info.get("currentPrice") or stock.info.get("regularMarketPrice")
        if price:
            set_cache_json(cache_key, price, _PRICE_TTL)
            return price
    except Exception as e:
        print(f"⚠️ Could not fetch price for {ticker} via yfinance: {e}")

    return None


def get_stock_history(ticker: str, period: str = "1y") -> list:
    """Get historical prices for a ticker using yfinance."""
    cache_key = f"history:{ticker}:{period}"
    cached_history = get_cache_json(cache_key)
    if cached_history:
        return cached_history

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


def get_historical_returns_1y(ticker: str) -> float:
    """Get 1-year historical return for an asset."""
    cache_key = f"return_1y:{ticker}"
    cached_return = get_cache_json(cache_key)
    if cached_return is not None:
        return cached_return

    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1y")
        if len(hist) < 2:
            return 0.08  # Default 8% if no data
        
        start_price = hist['Close'].iloc[0]
        end_price = hist['Close'].iloc[-1]
        
        if start_price == 0:
            return 0.08
            
        ret = (end_price - start_price) / start_price
        set_cache_json(cache_key, ret, _HISTORY_TTL)
        return ret
    except Exception as e:
        print(f"⚠️ Return calculation error for {ticker}: {e}")
        return 0.08


def get_stock_info(ticker: str) -> dict:
    """Get detailed stock info using yfinance."""
    cache_key = f"info:{ticker}"
    cached_info = get_cache_json(cache_key)
    if cached_info:
        return cached_info

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
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice") or stock.fast_info.get("last_price"),
            "beta": info.get("beta", 1.0),
        }
    except Exception as e:
        return {"ticker": ticker, "name": ticker, "error": str(e)}


def get_multiple_prices(tickers: List[str]) -> Dict[str, Optional[float]]:
    """Get prices for multiple tickers."""
    return {ticker: get_stock_price(ticker) for ticker in tickers}