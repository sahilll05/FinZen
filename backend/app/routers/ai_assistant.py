from fastapi import APIRouter, Depends
from appwrite.query import Query
from typing import Optional, Any
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.services.ai_assistant_service import chat

router = APIRouter()

DB_ID = settings.APPWRITE_DATABASE_ID
HOLDINGS_COL = settings.APPWRITE_COLLECTION_HOLDINGS

# In-memory conversation history (demo)
_conversations: dict = {}

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    portfolio_id: Optional[Any] = None   
    country: Optional[str] = "US"
    context: Optional[Any] = None        

class ChatResponse(BaseModel):
    response: str
    sources: list
    confidence: float
    conversation_id: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(request: ChatRequest, db = Depends(get_db)):
    """Chat with the AI Financial Assistant using portfolio context from Appwrite."""
    portfolio_context = ""

    if request.portfolio_id:
        try:
            h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", str(request.portfolio_id))])
            holdings = h_res["documents"]
            if holdings:
                portfolio_context = "User's portfolio:\n"
                for h in holdings:
                    portfolio_context += (
                        f"- {h.get('ticker')} ({h.get('company_name')}): {h.get('quantity')} shares @ ${h.get('avg_cost')}, "
                        f"Country: {h.get('country')}, Sector: {h.get('sector')}\n"
                    )
        except Exception as e:
            print(f"AI Assistant Context Fetch Error: {e}")

    if request.context:
        portfolio_context += f"\nExtra context: {request.context}"

    result = chat(
        message=request.message,
        portfolio_context=portfolio_context,
        country=request.country or "US",
    )

    conv_id = request.conversation_id or f"conv_{len(_conversations) + 1}"
    if conv_id not in _conversations:
        _conversations[conv_id] = []
    _conversations[conv_id].append({"role": "user", "content": request.message})
    _conversations[conv_id].append({"role": "ai", "content": result["response"]})

    return {**result, "conversation_id": conv_id}

@router.get("/conversations")
def get_conversations():
    return [
        {"id": conv_id, "message_count": len(messages), "preview": messages[-1]["content"][:80] + "..." if messages else ""}
        for conv_id, messages in _conversations.items()
    ]

@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    if conversation_id not in _conversations:
        return {"id": conversation_id, "messages": []}
    return {"id": conversation_id, "messages": _conversations[conversation_id]}