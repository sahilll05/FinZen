"""
Causal Chain Reasoning Engine Service.
Uses NetworkX to model and traverse causal relationships.
"""

import networkx as nx
from typing import List, Dict, Optional

# ── Build the knowledge graph (in-memory with NetworkX) ──
_graph = nx.DiGraph()


def _init_graph():
    """Initialize the causal knowledge graph with known relationships."""
    global _graph

    # Geopolitical events → commodity impacts
    _graph.add_edge("Middle East Conflict", "Oil Price Increase", weight=0.85,
                    relationship="CAUSES", description="Regional instability disrupts oil supply")
    _graph.add_edge("Oil Price Increase", "Airline Costs Rise", weight=0.90,
                    relationship="INCREASES", description="Fuel is 30% of airline costs")
    _graph.add_edge("Airline Costs Rise", "Tourism Decline", weight=0.70,
                    relationship="REDUCES", description="Higher ticket prices reduce travel")
    _graph.add_edge("Tourism Decline", "Hotel Revenue Drop", weight=0.75,
                    relationship="REDUCES", description="Fewer tourists, lower occupancy")
    _graph.add_edge("Hotel Revenue Drop", "REIT Exposure", weight=0.60,
                    relationship="AFFECTS", description="Hotel REITs see revenue decline")
    _graph.add_edge("REIT Exposure", "Banking Sector Risk", weight=0.50,
                    relationship="AFFECTS", description="Banks hold REIT debt exposure")

    # Sanctions chain
    _graph.add_edge("US Sanctions", "SWIFT Restrictions", weight=0.95,
                    relationship="CAUSES", description="Financial system isolation")
    _graph.add_edge("SWIFT Restrictions", "Banking Collapse", weight=0.80,
                    relationship="CAUSES", description="Cannot process international payments")
    _graph.add_edge("US Sanctions", "Oil Export Block", weight=0.90,
                    relationship="CAUSES", description="Direct oil embargo")
    _graph.add_edge("Oil Export Block", "Government Revenue Drop", weight=0.85,
                    relationship="REDUCES", description="Oil is major revenue source")
    _graph.add_edge("Government Revenue Drop", "Currency Depreciation", weight=0.80,
                    relationship="CAUSES", description="Less FX reserves, weaker currency")

    # Tech supply chain
    _graph.add_edge("Taiwan Conflict", "Semiconductor Shortage", weight=0.90,
                    relationship="CAUSES", description="TSMC produces 60% of world chips")
    _graph.add_edge("Semiconductor Shortage", "Tech Sector Decline", weight=0.85,
                    relationship="REDUCES", description="Cannot produce devices")
    _graph.add_edge("Tech Sector Decline", "AAPL Revenue Drop", weight=0.70,
                    relationship="AFFECTS", description="Apple depends on Taiwan chips")
    _graph.add_edge("Tech Sector Decline", "NVDA Revenue Drop", weight=0.75,
                    relationship="AFFECTS", description="NVIDIA supply chain disruption")

    # Interest rate chain
    _graph.add_edge("Fed Rate Hike", "Bond Yields Rise", weight=0.90,
                    relationship="CAUSES", description="Direct monetary policy effect")
    _graph.add_edge("Bond Yields Rise", "Stock Valuations Drop", weight=0.70,
                    relationship="REDUCES", description="Higher discount rate for DCF")
    _graph.add_edge("Bond Yields Rise", "Banking Profit Up", weight=0.65,
                    relationship="INCREASES", description="Net interest margin expansion")
    _graph.add_edge("Stock Valuations Drop", "Tech Growth Sell-off", weight=0.75,
                    relationship="CAUSES", description="Growth stocks most rate-sensitive")

    # Inflation chain
    _graph.add_edge("High Inflation", "Consumer Spending Drop", weight=0.70,
                    relationship="REDUCES", description="Purchasing power declines")
    _graph.add_edge("High Inflation", "Gold Price Increase", weight=0.75,
                    relationship="CAUSES", description="Inflation hedge demand")
    _graph.add_edge("High Inflation", "Currency Depreciation", weight=0.65,
                    relationship="CAUSES", description="Real value of currency falls")
    _graph.add_edge("Consumer Spending Drop", "Retail Sector Decline", weight=0.80,
                    relationship="REDUCES", description="Lower revenues for retailers")

    # Map events to affected tickers
    _graph.add_edge("Tech Sector Decline", "MSFT", weight=0.50,
                    relationship="AFFECTS", description="Major tech company")
    _graph.add_edge("Banking Sector Risk", "JPM", weight=0.60,
                    relationship="AFFECTS", description="Major US bank")
    _graph.add_edge("Banking Sector Risk", "BAC", weight=0.55,
                    relationship="AFFECTS", description="Major US bank")
    _graph.add_edge("Oil Price Increase", "XOM", weight=0.80,
                    relationship="BENEFITS", description="Higher oil prices benefit producers")
    _graph.add_edge("Retail Sector Decline", "WMT", weight=0.60,
                    relationship="AFFECTS", description="Major retailer")
    _graph.add_edge("Retail Sector Decline", "AMZN", weight=0.50,
                    relationship="AFFECTS", description="E-commerce exposure")


_init_graph()


def trace_causal_chain(event: str, max_hops: int = 6) -> dict:
    """
    Trace causal chain from an event through the knowledge graph.
    """
    if event not in _graph:
        # Try to find a similar event
        matches = [n for n in _graph.nodes if event.lower() in n.lower()]
        if matches:
            event = matches[0]
        else:
            return {
                "event": event,
                "chain": [],
                "total_hops": 0,
                "affected_sectors": [],
                "affected_stocks": [],
                "message": "Event not found in knowledge graph",
            }

    # BFS traversal
    chain = []
    visited = set()
    queue = [(event, 0)]
    affected_sectors = set()
    affected_stocks = set()

    while queue:
        node, depth = queue.pop(0)
        if depth >= max_hops or node in visited:
            continue
        visited.add(node)

        for successor in _graph.successors(node):
            edge_data = _graph.edges[node, successor]
            chain.append({
                "from_node": node,
                "to_node": successor,
                "relationship": edge_data.get("relationship", "AFFECTS"),
                "impact_strength": edge_data.get("weight", 0.5),
                "description": edge_data.get("description", ""),
            })

            # Detect if successor is a stock ticker
            if successor.isupper() and len(successor) <= 5:
                affected_stocks.add(successor)
            elif "sector" in successor.lower() or "decline" in successor.lower():
                affected_sectors.add(successor)

            queue.append((successor, depth + 1))

    return {
        "event": event,
        "chain": chain,
        "total_hops": len(chain),
        "affected_sectors": list(affected_sectors),
        "affected_stocks": list(affected_stocks),
    }


def get_hidden_risks(portfolio_tickers: List[str]) -> dict:
    """
    Find hidden risks by tracing backward from portfolio holdings.
    """
    hidden_risks = []

    for ticker in portfolio_tickers:
        if ticker in _graph:
            # Find all predecessors (what affects this stock)
            for pred in _graph.predecessors(ticker):
                edge = _graph.edges[pred, ticker]
                # Trace further back
                for pred2 in _graph.predecessors(pred):
                    edge2 = _graph.edges[pred2, pred]
                    hidden_risks.append({
                        "stock": ticker,
                        "risk_path": f"{pred2} → {pred} → {ticker}",
                        "risk_type": edge2.get("relationship", "UNKNOWN"),
                        "impact_strength": edge.get("weight", 0.5) * edge2.get("weight", 0.5),
                        "description": f"{pred2} can affect {ticker} through {pred}",
                    })

    total_exposure = sum(r["impact_strength"] for r in hidden_risks) / max(len(portfolio_tickers), 1)

    return {
        "hidden_risks": hidden_risks,
        "total_hidden_exposure": round(total_exposure * 100, 1),
        "summary": f"Found {len(hidden_risks)} hidden risk paths across {len(portfolio_tickers)} holdings",
    }


def get_graph_data() -> dict:
    """Return the full graph for visualization."""
    nodes = []
    for node in _graph.nodes:
        node_type = "event"
        if node.isupper() and len(node) <= 5:
            node_type = "stock"
        elif "sector" in node.lower():
            node_type = "sector"
        nodes.append({
            "id": node,
            "label": node,
            "type": node_type,
            "properties": {},
        })

    edges = []
    for u, v, data in _graph.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "relationship": data.get("relationship", "RELATED"),
            "weight": data.get("weight", 0.5),
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
    }