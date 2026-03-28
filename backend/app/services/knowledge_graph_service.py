"""
Financial Knowledge Graph Service.
In-memory graph using NetworkX (upgrade to Neo4j for production).
"""

import networkx as nx
from typing import Dict, List
from app.utils.sector_mapping import STOCK_INFO
from app.utils.country_data import COUNTRY_INFO

_kg = nx.DiGraph()


def _build_knowledge_graph():
    """Build the knowledge graph from static data + relationships."""
    global _kg

    # Add company nodes
    for ticker, info in STOCK_INFO.items():
        _kg.add_node(ticker, type="company", name=info["name"],
                     sector=info["sector"], country=info["country"])

    # Add country nodes
    for code, info in COUNTRY_INFO.items():
        _kg.add_node(code, type="country", name=info["name"],
                     region=info["region"], currency=info["currency"])

    # Add sector nodes
    sectors = set(info["sector"] for info in STOCK_INFO.values())
    for sector in sectors:
        _kg.add_node(sector, type="sector", name=sector)

    # Company → Sector relationships
    for ticker, info in STOCK_INFO.items():
        _kg.add_edge(ticker, info["sector"], relationship="BELONGS_TO", weight=1.0)
        _kg.add_edge(ticker, info["country"], relationship="OPERATES_IN", weight=1.0)

    # Inter-company relationships
    _kg.add_edge("AAPL", "TSM", relationship="DEPENDS_ON", weight=0.8,
                 description="Apple depends on TSMC for chip manufacturing")
    _kg.add_edge("NVDA", "TSM", relationship="DEPENDS_ON", weight=0.9,
                 description="NVIDIA's GPUs manufactured by TSMC")
    _kg.add_edge("AAPL", "AMZN", relationship="COMPETES_WITH", weight=0.3,
                 description="Compete in cloud and digital services")
    _kg.add_edge("MSFT", "GOOGL", relationship="COMPETES_WITH", weight=0.7,
                 description="Compete in cloud, AI, and productivity")
    _kg.add_edge("JPM", "BAC", relationship="COMPETES_WITH", weight=0.8,
                 description="Major US banking competitors")

    # Country → Country relationships
    _kg.add_edge("US", "CN", relationship="TRADE_TENSION", weight=0.7)
    _kg.add_edge("IN", "PK", relationship="GEOPOLITICAL_TENSION", weight=0.6)
    _kg.add_edge("US", "IR", relationship="SANCTIONS", weight=0.95)
    _kg.add_edge("US", "RU", relationship="SANCTIONS", weight=0.90)


_build_knowledge_graph()


def get_graph_data(center_node: str = None, depth: int = 2) -> dict:
    """Get graph data centered around a node, or the full graph."""
    if center_node and center_node in _kg:
        # Get subgraph around the center node
        nodes_in_range = set()
        nodes_in_range.add(center_node)

        current_nodes = {center_node}
        for _ in range(depth):
            next_nodes = set()
            for node in current_nodes:
                next_nodes.update(_kg.successors(node))
                next_nodes.update(_kg.predecessors(node))
            nodes_in_range.update(next_nodes)
            current_nodes = next_nodes

        subgraph = _kg.subgraph(nodes_in_range)
    else:
        subgraph = _kg

    nodes = []
    for node in subgraph.nodes:
        data = subgraph.nodes[node]
        nodes.append({
            "id": node,
            "label": data.get("name", node),
            "type": data.get("type", "unknown"),
            "properties": {k: v for k, v in data.items() if k not in ["type", "name"]},
        })

    links = []
    for u, v, data in subgraph.edges(data=True):
        links.append({
            "source": u,
            "target": v,
            "relationship": data.get("relationship", "RELATED"),
            "weight": data.get("weight", 0.5),
        })

    return {
        "nodes": nodes,
        "links": links,
        "total_nodes": len(nodes),
        "total_edges": len(links),
    }


def get_neighbors(node_id: str) -> dict:
    """Get all neighbors of a node."""
    if node_id not in _kg:
        return {"node": node_id, "neighbors": [], "message": "Node not found"}

    neighbors = []
    for succ in _kg.successors(node_id):
        edge = _kg.edges[node_id, succ]
        neighbors.append({
            "node": succ,
            "direction": "outgoing",
            "relationship": edge.get("relationship", "RELATED"),
            "weight": edge.get("weight", 0.5),
        })

    for pred in _kg.predecessors(node_id):
        edge = _kg.edges[pred, node_id]
        neighbors.append({
            "node": pred,
            "direction": "incoming",
            "relationship": edge.get("relationship", "RELATED"),
            "weight": edge.get("weight", 0.5),
        })

    return {"node": node_id, "neighbors": neighbors}