from pydantic import BaseModel
from typing import List, Dict, Optional


class GraphNode(BaseModel):
    id: str
    label: str
    type: str           # "company", "country", "sector", "event"
    properties: Dict


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str
    weight: float


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int