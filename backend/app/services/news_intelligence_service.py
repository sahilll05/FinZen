"""
Real-Time News Intelligence Pipeline Service.
Fetches news, analyzes sentiment, scores trust, maps impact.
"""

import requests
from typing import List, Optional
from datetime import datetime

from app.config import settings
from app.ml.sentiment_analyzer import analyze_sentiment
from app.ml.trust_scoring_model import score_article


def fetch_news_for_country(country_code: str, query: str = "", limit: int = 10) -> list:
    """
    Fetch news articles for a country using NewsAPI + GDELT fallback.
    """
    articles = []

    # ── Stage 1: Try NewsAPI ──
    if settings.NEWS_API_KEY:
        articles += _fetch_from_newsapi(country_code, query, limit)

    # ── Stage 2: GDELT fallback (always free, no key needed) ──
    if len(articles) < limit:
        articles += _fetch_from_gdelt(country_code, limit - len(articles))

    # ── Stage 3: Process each article through NLP pipeline ──
    processed = []
    for article in articles[:limit]:
        processed_article = process_article(article)
        processed.append(processed_article)

    return processed


def process_article(article: dict) -> dict:
    """
    Full NLP processing pipeline for a single article:
    1. Sentiment analysis (FinBERT)
    2. Trust scoring
    3. Entity extraction (simple)
    """
    title = article.get("title", "")
    content = article.get("content", article.get("description", ""))
    source = article.get("source", "unknown")

    # Stage 3: Sentiment Analysis
    sentiment = analyze_sentiment(f"{title}. {content}")

    # Stage 4: Trust Scoring
    trust = score_article(source, f"{title} {content}")

    # Stage 5: Simple entity extraction
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


def _fetch_from_newsapi(country_code: str, query: str = "", limit: int = 10) -> list:
    """Fetch from NewsAPI (100 requests/day free)."""
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
            articles = []
            for a in data.get("articles", []):
                articles.append({
                    "title": a.get("title", ""),
                    "content": a.get("description", ""),
                    "source": a.get("source", {}).get("name", "unknown"),
                    "url": a.get("url", ""),
                    "publishedAt": a.get("publishedAt", ""),
                    "country": country_code,
                })
            return articles
    except Exception as e:
        print(f"NewsAPI error: {e}")
    return []


def _fetch_from_gdelt(country_code: str, limit: int = 10) -> list:
    """Fetch from GDELT (completely free, no API key needed)."""
    try:
        from app.utils.country_data import get_country_info
        country = get_country_info(country_code)

        url = (
            f"https://api.gdeltproject.org/api/v2/doc/doc"
            f"?query={country['name']}%20finance"
            f"&mode=artlist&maxrecords={limit}&format=json"
        )

        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            articles = []
            for a in data.get("articles", []):
                articles.append({
                    "title": a.get("title", ""),
                    "content": a.get("title", ""),   # GDELT free tier has limited content
                    "source": a.get("domain", "gdelt"),
                    "url": a.get("url", ""),
                    "publishedAt": a.get("seendate", ""),
                    "country": country_code,
                })
            return articles
    except Exception as e:
        print(f"GDELT error: {e}")
    return []


def _extract_entities(text: str) -> list:
    """Simple entity extraction (upgrade to spaCy for production)."""
    # Look for known tickers and company names
    from app.utils.sector_mapping import STOCK_INFO

    entities = []
    text_upper = text.upper()

    for ticker, info in STOCK_INFO.items():
        if ticker in text_upper or info["name"].upper() in text_upper:
            entities.append(ticker)

    return list(set(entities))


def get_sentiment_for_ticker(ticker: str) -> dict:
    """Get aggregated sentiment for a specific ticker."""
    # Fetch news mentioning this ticker
    articles = fetch_news_for_country("US", query=ticker, limit=10)

    positive = sum(1 for a in articles if a["sentiment"] == "positive")
    negative = sum(1 for a in articles if a["sentiment"] == "negative")
    neutral = sum(1 for a in articles if a["sentiment"] == "neutral")
    total = len(articles)

    avg_score = sum(
        a["sentiment_score"] * (1 if a["sentiment"] == "positive" else -1 if a["sentiment"] == "negative" else 0)
        for a in articles
    ) / max(total, 1)

    if avg_score > 0.1:
        overall = "positive"
    elif avg_score < -0.1:
        overall = "negative"
    else:
        overall = "neutral"

    return {
        "ticker": ticker,
        "overall_sentiment": overall,
        "avg_score": round(avg_score, 3),
        "positive_count": positive,
        "negative_count": negative,
        "neutral_count": neutral,
        "total_articles": total,
    }