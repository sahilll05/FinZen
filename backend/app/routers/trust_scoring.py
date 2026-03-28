"""
Information Trust Scoring Engine Router.
"""

from fastapi import APIRouter
from app.schemas.trust import ArticleTrustRequest, ArticleTrustResponse, SourceRanking
from app.services.trust_scoring_service import score_news_article, get_source_rankings, get_consensus_estimate

router = APIRouter()


@router.post("/article/score", response_model=ArticleTrustResponse)
def score_article(request: ArticleTrustRequest):
    """Score a news article for trustworthiness."""
    result = score_news_article(
        source=request.source,
        title=request.title,
        content=request.content,
        sector=request.sector,
    )
    return {
        "source": request.source,
        **result,
    }


@router.get("/source/{source_name}/accuracy")
def get_source_accuracy(source_name: str):
    """Get historical accuracy for a specific source."""
    from app.ml.trust_scoring_model import SOURCE_BASELINE
    source_lower = source_name.lower()
    accuracy = SOURCE_BASELINE.get(source_lower, 50)
    return {
        "source": source_name,
        "accuracy_rate": accuracy,
        "reliability": "HIGH" if accuracy > 75 else "MODERATE" if accuracy > 50 else "LOW",
    }


@router.get("/sources/ranking")
def get_rankings(sector: str = "general"):
    """Get ranked list of news sources by sector accuracy."""
    return get_source_rankings(sector)