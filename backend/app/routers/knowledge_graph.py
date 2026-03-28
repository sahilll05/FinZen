"""
Financial Knowledge Graph Router.
"""

from fastapi import APIRouter
from app.services.knowledge_graph_service import get_graph_data, get_neighbors

router = APIRouter()


@router.get("/data")
def get_graph(center: str = None, depth: int = 2):
    """
    Get knowledge graph data for visualization.
    Optionally center around a specific node (ticker, country code).
    """
    return get_graph_data(center_node=center, depth=depth)


@router.get("/neighbors/{node_id}")
def get_node_neighbors(node_id: str):
    """Get all connected nodes for a given entity."""
    return get_neighbors(node_id)