from pydantic import BaseModel
from typing import List, Optional


class ArticleTrustRequest(BaseModel):
    title: str
    source: str
    content: Optional[str] = ""
    sector: Optional[str] = "general"


class ArticleTrustResponse(BaseModel):
    source: str
    source_accuracy: float
    content_trust_score: float
    overall_trust_score: float
    flags: List[str]


class SourceRanking(BaseModel):
    source_name: str
    accuracy_rate: float
    total_predictions: int
    sector: str
    rank: int