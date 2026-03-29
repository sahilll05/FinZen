"""
Real-Time News Intelligence Pipeline Service.
Fetches news, analyzes sentiment, scores trust, maps impact.
"""

import requests
import time
from datetime import datetime
from typing import Optional

from app.config import settings
from app.ml.sentiment_analyzer import analyze_sentiment
from app.ml.trust_scoring_model import score_article

# ── TTL Cache ─────────────────────────────────────────────────────────────────
# Keyed by (country_code, query, limit).  Avoids re-running FinBERT on every
# page load while still refreshing data every 5 minutes.
_cache: dict[str, tuple[float, list]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def _cache_key(country_code: str, query: str, limit: int) -> str:
    return f"{country_code}::{query}::{limit}"


def fetch_news_for_country(country_code: str, query: str = "", limit: int = 10) -> list:
    """
    Fetch news articles for a country using NewsAPI (+ GDELT fast-fail fallback).
    Results are cached for 5 minutes to avoid re-running FinBERT on each request.
    """
    key = _cache_key(country_code, query, limit)
    cached_at, cached_articles = _cache.get(key, (0, []))

    if cached_articles and (time.time() - cached_at) < _CACHE_TTL_SECONDS:
        print(f"[News Cache] HIT  — {key}")
        return cached_articles

    print(f"[News Cache] MISS — fetching live data for {key}")
    articles = []

    # ── Stage 1: NewsAPI (primary) ──────────────────────────────────────────
    if settings.NEWS_API_KEY:
        articles += _fetch_from_newsapi(country_code, query, limit)

    # ── Stage 2: Google News API (Free, high limits, real URLs) ────────────
    if len(articles) < limit:
        articles += _fetch_from_google_news(country_code, query, limit - len(articles))

    # ── Stage 3: GDELT fallback — only if we STILL don't have enough ───────
    if len(articles) < limit:
        articles += _fetch_from_gdelt(country_code, limit - len(articles))

    # ── Stage 4: NLP pipeline (FinBERT + trust scoring) ────────────────────
    processed = []
    for article in articles[:limit]:
        processed.append(process_article(article))

    # ── Stage 5: Mock fallback when completely offline ──────────────────────
    if not processed:
        processed = _mock_articles(country_code)

    # Store in TTL cache
    _cache[key] = (time.time(), processed)
    return processed


def process_article(article: dict) -> dict:
    """
    Full NLP processing pipeline for a single article:
    1. Sentiment analysis (FinBERT)
    2. Trust scoring
    3. Entity extraction
    """
    title = article.get("title", "")
    content = article.get("content", article.get("description", ""))
    source = article.get("source", "unknown")

    sentiment = analyze_sentiment(f"{title}. {content}")
    trust = score_article(source, f"{title} {content}")
    entities = _extract_entities(f"{title} {content}")

    return {
        "title": title,
        "source": source,
        "url": article.get("url", ""),
        "sentiment": sentiment["label"],
        "sentiment_score": round(sentiment["score"], 3),
        "trust_score": trust["overall_trust_score"],
        "country": article.get("country", ""),
        "entities": entities,
        "published_at": article.get("publishedAt", str(datetime.utcnow())),
    }


# ── Private helpers ────────────────────────────────────────────────────────────

def _fetch_from_newsapi(country_code: str, query: str = "", limit: int = 10) -> list:
    """Fetch from NewsAPI (100 requests/day on free tier)."""
    try:
        from app.utils.country_data import get_country_info
        country = get_country_info(country_code)
        q = query or f"{country['name']} economy finance"

        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": q,
                "apiKey": settings.NEWS_API_KEY,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": limit,
            },
            timeout=10,
        )

        if resp.status_code == 200:
            data = resp.json()
            result = []
            for a in data.get("articles", []):
                # Skip removed / paywalled articles
                title = a.get("title", "") or ""
                if "[Removed]" in title or not title.strip():
                    continue
                result.append({
                    "title": title,
                    "content": a.get("description", ""),
                    "source": a.get("source", {}).get("name", "unknown"),
                    "url": a.get("url", ""),
                    "publishedAt": a.get("publishedAt", ""),
                    "country": country_code,
                })
            print(f"[NewsAPI] Fetched {len(result)} articles for '{q}'")
            return result
        else:
            print(f"[NewsAPI] Error {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[NewsAPI] Exception: {e}")
    return []


def _fetch_from_google_news(country_code: str, query: str = "", limit: int = 10) -> list:
    """Fallback fetch from Google News RSS (always free, returns real URLs)."""
    try:
        from app.utils.country_data import get_country_info
        import urllib.parse
        import xml.etree.ElementTree as ET

        country = get_country_info(country_code)
        q = query or f"{country['name']} economy finance"
        q_enc = urllib.parse.quote(q)

        url = f"https://news.google.com/rss/search?q={q_enc}&hl=en-US&gl=US&ceid=US:en"

        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            root = ET.fromstring(resp.content)
            result = []

            for item in root.findall('.//item')[:limit]:
                title_elem = item.find('title')
                link_elem = item.find('link')
                pubDate_elem = item.find('pubDate')
                source_elem = item.find('source')

                title = title_elem.text if title_elem is not None else ""
                link = link_elem.text if link_elem is not None else ""
                pubDate = pubDate_elem.text if pubDate_elem is not None else ""
                source_name = source_elem.text if source_elem is not None else "Google News"

                if not title.strip() or not link.strip():
                    continue

                if " - " in title:
                    title = " - ".join(title.split(" - ")[:-1]).strip()

                result.append({
                    "title": title,
                    "content": title,
                    "source": source_name,
                    "url": link,
                    "publishedAt": pubDate,
                    "country": country_code,
                })

            print(f"[GoogleNews] Fetched {len(result)} articles for '{q}'")
            return result
    except Exception as e:
        print(f"[GoogleNews] Error: {e}")
    return []


def _fetch_from_gdelt(country_code: str, limit: int = 10) -> list:
    """
    Fetch from GDELT — free, no key needed.
    Timeout is intentionally SHORT (3s) so a connectivity issue never blocks
    the main response for more than a few seconds.
    """
    try:
        from app.utils.country_data import get_country_info
        country = get_country_info(country_code)

        url = (
            f"https://api.gdeltproject.org/api/v2/doc/doc"
            f"?query={country['name']}%20finance"
            f"&mode=artlist&maxrecords={limit}&format=json"
        )

        resp = requests.get(url, timeout=3)   # ← was 15s, now 3s fast-fail
        if resp.status_code == 200:
            data = resp.json()
            result = []
            for a in data.get("articles", []):
                title = a.get("title", "") or ""
                if not title.strip():
                    continue
                result.append({
                    "title": title,
                    "content": title,
                    "source": a.get("domain", "gdelt"),
                    "url": a.get("url", ""),
                    "publishedAt": a.get("seendate", ""),
                    "country": country_code,
                })
            print(f"[GDELT] Fetched {len(result)} articles")
            return result
    except Exception as e:
        print(f"[GDELT] Skipped (timeout/error): {type(e).__name__}")
    return []


def _mock_articles(country_code: str) -> list:
    """Emergency fallback when ALL external sources are unavailable."""
    from app.utils.country_data import get_country_info
    cinfo = get_country_info(country_code)
    name = cinfo["name"]
    now = str(datetime.utcnow())
    return [
        {
            "title": f"Central Bank of {name} Announces New Economic Framework",
            "source": "Global Financial Times",
            "url": "#",
            "sentiment": "neutral",
            "sentiment_score": 0.55,
            "trust_score": 88.0,
            "country": country_code,
            "entities": [name],
            "published_at": now,
        },
        {
            "title": f"Tech Sector in {name} Sees Unprecedented Growth Amid Capital Inflows",
            "source": "Tech & Economy Insider",
            "url": "#",
            "sentiment": "positive",
            "sentiment_score": 0.82,
            "trust_score": 75.0,
            "country": country_code,
            "entities": ["Tech", name],
            "published_at": now,
        },
        {
            "title": f"Regulatory Scrutiny Increases for {name}'s Leading Crypto Exchanges",
            "source": "Digital Asset Review",
            "url": "#",
            "sentiment": "negative",
            "sentiment_score": -0.65,
            "trust_score": 62.0,
            "country": country_code,
            "entities": ["Crypto", "Regulators"],
            "published_at": now,
        },
    ]


def _extract_entities(text: str) -> list:
    """Simple entity extraction — looks for known tickers/company names."""
    from app.utils.sector_mapping import STOCK_INFO
    text_upper = text.upper()
    entities = [
        ticker for ticker, info in STOCK_INFO.items()
        if ticker in text_upper or info["name"].upper() in text_upper
    ]
    return list(set(entities))


def get_sentiment_for_ticker(ticker: str) -> dict:
    """Get aggregated sentiment for a specific stock ticker."""
    articles = fetch_news_for_country("US", query=ticker, limit=10)

    positive = sum(1 for a in articles if a["sentiment"] == "positive")
    negative = sum(1 for a in articles if a["sentiment"] == "negative")
    neutral  = sum(1 for a in articles if a["sentiment"] == "neutral")
    total    = len(articles)

    avg_score = sum(
        a["sentiment_score"] * (
            1 if a["sentiment"] == "positive"
            else -1 if a["sentiment"] == "negative"
            else 0
        )
        for a in articles
    ) / max(total, 1)

    overall = "positive" if avg_score > 0.1 else "negative" if avg_score < -0.1 else "neutral"

    return {
        "ticker": ticker,
        "overall_sentiment": overall,
        "avg_score": round(avg_score, 3),
        "positive_count": positive,
        "negative_count": negative,
        "neutral_count": neutral,
        "total_articles": total,
    }