"""
Causal Chain Reasoning Engine Router.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Holding
from app.schemas.causal import CausalTraceRequest
from app.services.causal_chain_service import trace_causal_chain, get_hidden_risks, get_graph_data

router = APIRouter()


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
    chains = []
    for event in common_events:
        result = trace_causal_chain(event)
        if result["total_hops"] > 0:
            chains.append(result)
    return {"active_chains": chains}


@router.get("/portfolio/{portfolio_id}/hidden-risk")
def get_portfolio_hidden_risks(portfolio_id: int, db: Session = Depends(get_db)):
    """Find hidden risks in portfolio via causal chain analysis."""
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
    if not holdings:
        return {"message": "Portfolio not found or empty"}

    tickers = [h.ticker for h in holdings]
    result = get_hidden_risks(tickers)
    result["portfolio_id"] = portfolio_id
    return result


@router.get("/graph")
def get_full_graph():
    """Get the complete causal knowledge graph data for visualization."""
    return get_graph_data()