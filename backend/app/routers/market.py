from datetime import datetime, timezone
from fastapi import APIRouter, Query
from typing import List, Dict, Optional, Tuple
import yfinance as yf
import requests
import time
from app.config import settings

router = APIRouter()

_QUOTE_CACHE: Dict[str, Dict[str, object]] = {}
_CACHE_TTL_SECONDS = 30

_YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json,text/plain,*/*",
}


def _alpha_candidate_symbols(raw_ticker: str) -> List[str]:
    ticker = raw_ticker.strip().upper()
    if not ticker:
        return []

    symbols = [ticker]
    if ticker.endswith(".NS"):
        base = ticker[:-3]
        symbols.extend([base, f"{base}.NSE", f"{base}.BSE"])
    elif ticker.endswith(".BO"):
        base = ticker[:-3]
        symbols.extend([base, f"{base}.BSE", f"{base}.NSE"])
    elif "." not in ticker:
        symbols.extend([f"{ticker}.NSE", f"{ticker}.BSE"])

    seen = set()
    deduped = []
    for s in symbols:
        if s not in seen:
            seen.add(s)
            deduped.append(s)
    return deduped


def _fetch_alpha_vantage_quote(raw_ticker: str) -> Tuple[Optional[dict], Optional[str]]:
    api_key = settings.ALPHA_VANTAGE_API_KEY
    if not api_key:
        return None, None

    for symbol in _alpha_candidate_symbols(raw_ticker):
        try:
            url = "https://www.alphavantage.co/query"
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": api_key,
            }
            resp = requests.get(url, params=params, timeout=10)
            if not resp.ok:
                continue

            data = resp.json() if resp.text else {}
            if data.get("Information") or data.get("Note"):
                return {"error": "alpha_vantage_rate_limited"}, symbol

            q = data.get("Global Quote") or {}
            price_raw = q.get("05. price")
            prev_raw = q.get("08. previous close")

            if not price_raw:
                continue

            price = float(price_raw)
            prev = float(prev_raw) if prev_raw else price
            change = price - prev
            change_pct = (change / prev) * 100 if prev > 0 else 0.0

            return {
                "price": price,
                "change": change,
                "change_pct": change_pct,
            }, symbol
        except Exception:
            continue

    return None, None


def _candidate_symbols(raw_ticker: str) -> List[str]:
    ticker = raw_ticker.strip().upper()
    if not ticker:
        return []
    if "." in ticker:
        return [ticker]
    # For MVP, try India suffixes when exchange suffix is missing.
    return [ticker, f"{ticker}.NS", f"{ticker}.BO"]


def _resolve_symbol(raw_ticker: str) -> str:
    candidates = _candidate_symbols(raw_ticker)
    for symbol in candidates:
        quote, resolved = _fetch_quote(symbol)
        if quote is not None and not quote.get("error"):
            return resolved or symbol
    # Keep user input when resolution fails.
    return (raw_ticker or "").strip().upper()


def _fetch_quote(symbol: str) -> Tuple[Optional[dict], Optional[str]]:
    try:
        t = yf.Ticker(symbol)
        hist = t.history(period="2d")
        if not hist.empty:
            current_price = float(hist["Close"].iloc[-1])
            if len(hist) > 1:
                prev_close = float(hist["Close"].iloc[-2])
            else:
                prev_close = float(hist["Open"].iloc[-1])

            change = current_price - prev_close
            change_pct = (change / prev_close) * 100 if prev_close > 0 else 0.0

            return {
                "price": current_price,
                "change": change,
                "change_pct": change_pct,
            }, symbol

        # Fallback path when history endpoint is empty/unavailable.
        fi = getattr(t, "fast_info", None) or {}
        current_price = fi.get("lastPrice") or fi.get("regularMarketPrice")
        prev_close = fi.get("previousClose")

        if current_price is None:
            info = t.info or {}
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
            prev_close = prev_close or info.get("previousClose")

        if current_price is None:
            return None, None

        current_price = float(current_price)
        prev_close_val = float(prev_close) if prev_close is not None else current_price
        change = current_price - prev_close_val
        change_pct = (change / prev_close_val) * 100 if prev_close_val > 0 else 0.0

        return {
            "price": current_price,
            "change": change,
            "change_pct": change_pct,
        }, symbol
    except Exception:
        pass

    # Fallback: query Yahoo chart API directly (still Yahoo Finance source).
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d"
        resp = requests.get(url, headers=_YAHOO_HEADERS, timeout=10)
        if resp.status_code == 429:
            return {"error": "rate_limited"}, symbol
        if not resp.ok:
            return None, None

        data = resp.json()
        result = (((data or {}).get("chart") or {}).get("result") or [None])[0]
        if not result:
            return None, None

        quote = (result.get("indicators") or {}).get("quote") or []
        quote = quote[0] if quote else {}
        closes = [v for v in (quote.get("close") or []) if v is not None]

        if not closes:
            meta = result.get("meta") or {}
            p = meta.get("regularMarketPrice")
            if p is None:
                return None, None
            price = float(p)
            prev = float(meta.get("previousClose") or price)
        else:
            price = float(closes[-1])
            prev = float(closes[-2]) if len(closes) > 1 else price

        change = price - prev
        change_pct = (change / prev) * 100 if prev > 0 else 0.0

        return {
            "price": price,
            "change": change,
            "change_pct": change_pct,
        }, symbol
    except Exception:
        return None, None

@router.post("/quotes/batch")
def batch_quotes(tickers: List[str]) -> Dict[str, dict]:
    """
    Fetches real-time price quotes and day change % for a batch of tickers using yfinance.
    Used by the frontend dashboard & portfolio views.
    """
    results = {}
    if not tickers:
        return results
        
    now_utc = datetime.now(timezone.utc).isoformat()
    now_ts = time.time()

    for raw_ticker in tickers:
        candidates = _candidate_symbols(raw_ticker)
        quote = None
        resolved_symbol = None

        # Serve fresh cache first to reduce outbound quote pressure.
        fresh_cached = None
        for symbol in candidates:
            item = _QUOTE_CACHE.get(symbol)
            if item and (now_ts - float(item.get("cached_at", 0))) <= _CACHE_TTL_SECONDS:
                fresh_cached = (symbol, item)
                break
        if fresh_cached:
            symbol, item = fresh_cached
            results[raw_ticker] = {
                "price": item.get("price"),
                "change": item.get("change", 0.0),
                "change_pct": item.get("change_pct", 0.0),
                "resolved_ticker": symbol,
                "as_of_utc": item.get("as_of_utc", now_utc),
                "source": "yfinance_cache",
            }
            continue

        for symbol in candidates:
            quote, resolved_symbol = _fetch_quote(symbol)
            if quote is not None:
                break

        if quote is not None:
            # If we got rate-limited, serve cached quote if available.
            if quote.get("error") == "rate_limited":
                cache_key = resolved_symbol or raw_ticker
                cached = _QUOTE_CACHE.get(cache_key)
                if cached:
                    results[raw_ticker] = {
                        "price": cached.get("price"),
                        "change": cached.get("change", 0.0),
                        "change_pct": cached.get("change_pct", 0.0),
                        "resolved_ticker": cache_key,
                        "as_of_utc": cached.get("as_of_utc", now_utc),
                        "source": "yfinance_cache",
                        "stale": True,
                    }
                    continue

                results[raw_ticker] = {
                    "price": None,
                    "change": 0.0,
                    "change_pct": 0.0,
                    "resolved_ticker": resolved_symbol,
                    "as_of_utc": now_utc,
                    "source": "yfinance",
                    "error": "rate_limited",
                }
                continue

            cache_key = resolved_symbol or raw_ticker
            _QUOTE_CACHE[cache_key] = {
                "price": quote.get("price"),
                "change": quote.get("change", 0.0),
                "change_pct": quote.get("change_pct", 0.0),
                "as_of_utc": now_utc,
                "cached_at": now_ts,
            }
            results[raw_ticker] = {
                **quote,
                "resolved_ticker": resolved_symbol,
                "as_of_utc": now_utc,
                "source": "yfinance",
            }
        else:
            # Fallback to Alpha Vantage when Yahoo is unavailable.
            alpha_quote, alpha_symbol = _fetch_alpha_vantage_quote(raw_ticker)
            if alpha_quote is not None:
                if alpha_quote.get("error") == "alpha_vantage_rate_limited":
                    results[raw_ticker] = {
                        "price": None,
                        "change": 0.0,
                        "change_pct": 0.0,
                        "resolved_ticker": alpha_symbol,
                        "as_of_utc": now_utc,
                        "source": "alpha_vantage",
                        "error": "rate_limited",
                    }
                    continue

                cache_key = alpha_symbol or raw_ticker
                _QUOTE_CACHE[cache_key] = {
                    "price": alpha_quote.get("price"),
                    "change": alpha_quote.get("change", 0.0),
                    "change_pct": alpha_quote.get("change_pct", 0.0),
                    "as_of_utc": now_utc,
                    "cached_at": now_ts,
                }
                results[raw_ticker] = {
                    **alpha_quote,
                    "resolved_ticker": alpha_symbol,
                    "as_of_utc": now_utc,
                    "source": "alpha_vantage",
                }
                continue

            # Serve a fresh-enough cached quote before declaring unavailable.
            cached = None
            for symbol in candidates:
                item = _QUOTE_CACHE.get(symbol)
                if item and (now_ts - float(item.get("cached_at", 0))) <= _CACHE_TTL_SECONDS:
                    cached = (symbol, item)
                    break
            if cached:
                symbol, item = cached
                results[raw_ticker] = {
                    "price": item.get("price"),
                    "change": item.get("change", 0.0),
                    "change_pct": item.get("change_pct", 0.0),
                    "resolved_ticker": symbol,
                    "as_of_utc": item.get("as_of_utc", now_utc),
                    "source": "yfinance_cache",
                    "stale": True,
                }
                continue

            # Return explicit unavailable quote rather than fake prices.
            results[raw_ticker] = {
                "price": None,
                "change": 0.0,
                "change_pct": 0.0,
                "resolved_ticker": None,
                "as_of_utc": now_utc,
                "source": "yfinance",
                "error": "quote_unavailable",
            }
            
    return results


@router.get("/quote/{ticker}")
def get_quote(ticker: str) -> dict:
    quotes = batch_quotes([ticker])
    return quotes.get(ticker, {"price": None, "change": 0.0, "change_pct": 0.0, "error": "quote_unavailable"})


@router.get("/history/{ticker}")
def get_history(ticker: str, period: str = "1mo") -> list:
    symbol = _resolve_symbol(ticker)
    try:
        hist = yf.Ticker(symbol).history(period=period)
        if hist.empty:
            return []
        return [
            {
                "date": str(index.date()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]),
            }
            for index, row in hist.iterrows()
        ]
    except Exception:
        return []


@router.get("/fundamentals/{ticker}")
def get_fundamentals(ticker: str) -> dict:
    symbol = _resolve_symbol(ticker)
    try:
        t = yf.Ticker(symbol)
        info = t.info or {}
        return {
            "ticker": ticker.upper(),
            "resolved_ticker": symbol,
            "name": info.get("longName") or info.get("shortName") or symbol,
            "sector": info.get("sector") or "Unclassified",
            "country": info.get("country") or "US",
            "exchange": info.get("exchange") or info.get("fullExchangeName") or "Unknown",
            "currency": info.get("currency") or "USD",
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
        }
    except Exception:
        return {
            "ticker": ticker.upper(),
            "resolved_ticker": symbol,
            "name": symbol,
            "sector": "Unclassified",
            "country": "US",
            "exchange": "Unknown",
            "currency": "USD",
        }


@router.get("/search")
def search_symbols(q: str = Query(..., min_length=1)) -> list:
    query = q.strip()
    if not query:
        return []
    try:
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        resp = requests.get(
            url,
            params={"q": query, "quotesCount": 10, "newsCount": 0},
            headers=_YAHOO_HEADERS,
            timeout=10,
        )
        if not resp.ok:
            return []
        payload = resp.json() if resp.text else {}
        quotes = payload.get("quotes") or []
        results = []
        for item in quotes:
            symbol = item.get("symbol")
            if not symbol:
                continue
            results.append(
                {
                    "symbol": symbol,
                    "shortname": item.get("shortname") or item.get("longname") or symbol,
                    "exchange": item.get("exchDisp") or item.get("exchange") or "Unknown",
                    "type": item.get("quoteType") or "EQUITY",
                }
            )

        q_upper = query.upper()

        def _rank(entry: dict) -> tuple:
            sym = str(entry.get("symbol", "")).upper()
            exch = str(entry.get("exchange", "")).upper()

            exact = 0 if sym == q_upper else 1
            india = 0 if (sym.endswith(".NS") or sym.endswith(".BO") or exch in {"NSE", "BSE"}) else 1
            equity = 0 if str(entry.get("type", "")).upper() == "EQUITY" else 1
            return (exact, india, equity, sym)

        results.sort(key=_rank)
        return results
    except Exception:
        return []
