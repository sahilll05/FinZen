from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class NewsArticleResponse(BaseModel):
    title: str
    source: str
    url: str
    sentiment: str
    sentiment_score: float
    trust_score: float
    country: str
    entities: List[str]
    published_at: Optional[str] = None


class NewsFeedResponse(BaseModel):
    country: str
    total_articles: int
    articles: List[NewsArticleResponse]


class SentimentResult(BaseModel):
    ticker: str
    overall_sentiment: str
    avg_score: float
    positive_count: int
    negative_count: int
    neutral_count: int
    total_articles: int