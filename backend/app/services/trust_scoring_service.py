"""
Information Trust Scoring Engine Service.
"""

from app.ml.trust_scoring_model import score_article, SOURCE_BASELINE
from typing import List


def score_news_article(source: str, title: str, content: str = "", sector: str = "general") -> dict:
    """Score a single article for trustworthiness."""
    full_text = f"{title} {content}"
    return score_article(source, full_text, sector)


def get_source_rankings(sector: str = "general") -> list:
    """Get ranked list of news sources by reliability."""
    rankings = []
    for i, (source, accuracy) in enumerate(
        sorted(SOURCE_BASELINE.items(), key=lambda x: x[1], reverse=True)
    ):
        rankings.append({
            "source_name": source.title(),
            "accuracy_rate": accuracy,
            "total_predictions": 100 + i * 20,  # Placeholder
            "sector": sector,
            "rank": i + 1,
        })
    return rankings


def get_consensus_estimate(ticker: str, articles: list) -> dict:
    """
    Calculate trust-weighted consensus from multiple articles.
    High-trust sources get more weight.
    """
    if not articles:
        return {
            "ticker": ticker,
            "consensus_sentiment": "neutral",
            "weighted_score": 0.0,
            "source_count": 0,
        }

    total_weight = 0
    weighted_sentiment = 0

    for article in articles:
        trust = article.get("trust_score", 50)
        sentiment_score = article.get("sentiment_score", 0)

        # Map sentiment: positive = +1, negative = -1, neutral = 0
        if article.get("sentiment") == "positive":
            val = 1
        elif article.get("sentiment") == "negative":
            val = -1
        else:
            val = 0

        weighted_sentiment += val * trust
        total_weight += trust

    if total_weight == 0:
        avg = 0
    else:
        avg = weighted_sentiment / total_weight

    if avg > 0.2:
        consensus = "positive"
    elif avg < -0.2:
        consensus = "negative"
    else:
        consensus = "neutral"

    return {
        "ticker": ticker,
        "consensus_sentiment": consensus,
        "weighted_score": round(avg, 3),
        "source_count": len(articles),
    }