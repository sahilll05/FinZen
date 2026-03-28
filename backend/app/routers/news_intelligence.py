"""
Real-Time News Intelligence Pipeline Router.
"""

from fastapi import APIRouter
from app.services.news_intelligence_service import fetch_news_for_country, get_sentiment_for_ticker

router = APIRouter()


@router.get("/feed")
def get_news_feed(country: str = "US", trust_min: float = 0, limit: int = 10):
    """
    Get trust-scored news feed for a country.
    Filters by minimum trust score.
    """
    articles = fetch_news_for_country(country.upper(), limit=limit)

    # Filter by trust minimum
    if trust_min > 0:
        articles = [a for a in articles if a.get("trust_score", 0) >= trust_min]

    return {
        "country": country.upper(),
        "total_articles": len(articles),
        "articles": articles,
    }


@router.get("/sentiment/{ticker}")
def get_ticker_sentiment(ticker: str):
    """Get aggregated sentiment analysis for a stock ticker."""
    return get_sentiment_for_ticker(ticker.upper())


@router.post("/article/impact")
def predict_article_impact(title: str, content: str = "", country: str = "US"):
    """Predict stock/sector impact of a news article."""
    from app.services.news_intelligence_service import process_article
    article = {"title": title, "content": content, "source": "user_input", "url": "", "country": country}
    processed = process_article(article)
    return {
        "article": processed,
        "predicted_impacts": f"Sentiment: {processed['sentiment']} (confidence: {processed['sentiment_score']})",
    }