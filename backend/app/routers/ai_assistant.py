"""
AI Financial Assistant Router.
Aligned with frontend api.ts aiAPI.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, Any
from pydantic import BaseModel

from app.database import get_db
from app.models.db_models import Holding
from app.services.ai_assistant_service import chat

router = APIRouter()

# In-memory conversation history (demo)
_conversations: dict = {}


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    portfolio_id: Optional[Any] = None   # can be int or string
    country: Optional[str] = "US"
    context: Optional[Any] = None        # extra context from frontend


class ChatResponse(BaseModel):
    response: str
    sources: list
    confidence: float
    conversation_id: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat with the AI Financial Assistant.
    Frontend sends: { message, conversation_id?, portfolio_id?, context? }
    """
    portfolio_context = ""

    # Try to load portfolio context
    if request.portfolio_id:
        try:
            pid = int(request.portfolio_id)
            holdings = db.query(Holding).filter(Holding.portfolio_id == pid).all()
            if holdings:
                portfolio_context = "User's portfolio:\n"
                for h in holdings:
                    portfolio_context += (
                        f"- {h.ticker} ({h.company_name}): {h.quantity} shares @ ${h.avg_cost}, "
                        f"Country: {h.country}, Sector: {h.sector}\n"
                    )
        except (ValueError, TypeError):
            pass

    # Add extra context from frontend
    if request.context:
        portfolio_context += f"\nExtra context: {request.context}"

    result = chat(
        message=request.message,
        portfolio_context=portfolio_context,
        country=request.country or "US",
    )

    # Store conversation
    conv_id = request.conversation_id or f"conv_{len(_conversations) + 1}"
    if conv_id not in _conversations:
        _conversations[conv_id] = []
    _conversations[conv_id].append({"role": "user", "content": request.message})
    _conversations[conv_id].append({"role": "ai", "content": result["response"]})

    return {
        **result,
        "conversation_id": conv_id,
    }


@router.get("/conversations")
def get_conversations():
    """Get all conversations."""
    return [
        {"id": conv_id, "message_count": len(messages), "preview": messages[-1]["content"][:80] + "..." if messages else ""}
        for conv_id, messages in _conversations.items()
    ]


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    """Get a specific conversation."""
    if conversation_id not in _conversations:
        return {"id": conversation_id, "messages": []}
    return {"id": conversation_id, "messages": _conversations[conversation_id]}