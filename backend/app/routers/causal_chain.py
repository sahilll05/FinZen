"""
Causal Chain Reasoning Engine Router.
"""

from fastapi import APIRouter, Depends
from appwrite.query import Query

from app.database import get_db
from app.config import settings
from app.schemas.causal import CausalTraceRequest
from app.services.causal_chain_service import trace_causal_chain, get_hidden_risks, get_graph_data

router = APIRouter()

DB_ID = settings.APPWRITE_DATABASE_ID
HOLDINGS_COL = settings.APPWRITE_COLLECTION_HOLDINGS


@router.post("/trace")
def trace_chain(request: CausalTraceRequest):
    """
    Trace a causal chain from an event through the knowledge graph.
    
    Example events:
    - "Middle East Conflict"
    - "Oil Price Increase"
    - "Fed Rate Hike"
    - "Taiwan Conflict"
    - "High Inflation"
    - "US Sanctions"
    """
    return trace_causal_chain(request.event)


@router.get("/chains/active")
def get_active_chains():
    """Get currently relevant causal chains."""
    common_events = [
        "Middle East Conflict",
        "Fed Rate Hike",
        "High Inflation",
    ]
    chains = [trace_causal_chain(e) for e in common_events if trace_causal_chain(e).get("total_hops", 0) > 0]
    return {"active_chains": chains}


@router.get("/portfolio/{portfolio_id}/hidden-risk")
def get_portfolio_hidden_risks(portfolio_id: str, db = Depends(get_db)):
    """Find hidden risks in portfolio via causal chain analysis."""
    try:
        h_res = db.list_documents(DB_ID, HOLDINGS_COL, [Query.equal("portfolio_id", portfolio_id)])
        holdings = h_res["documents"]
        if not holdings:
            return {"message": "Portfolio not found or empty"}

        tickers = [h["ticker"] for h in holdings]
        result = get_hidden_risks(tickers)
        result["portfolio_id"] = portfolio_id
        return result
    except Exception as e:
        return {"error": str(e)}


@router.get("/graph")
def get_full_graph():
    """Get the complete causal knowledge graph data for visualization."""
    return get_graph_data()