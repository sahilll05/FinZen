from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    message: str
    portfolio_id: Optional[int] = None
    country: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    confidence: float