"""
Portfolio Intelligence Service.
Builds structured, provenance-aware intelligence output from holdings.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List


def _valid_sector(value: Any) -> bool:
    if value is None:
        return False
    s = str(value).strip().lower()
    return bool(s) and s not in {"unknown", "unclassified"}


def _valid_country(value: Any) -> bool:
    if value is None:
        return False
    c = str(value).strip().lower()
    return bool(c) and c != "unknown"


def _confidence_from_coverage(coverage_pct: float) -> str:
    if coverage_pct >= 80:
        return "HIGH"
    if coverage_pct >= 60:
        return "MEDIUM"
    return "LOW"


def build_portfolio_intelligence(holdings: List[Dict[str, Any]]) -> Dict[str, Any]:
    holdings = holdings or []
    total_positions = len(holdings)

    complete_meta_count = 0
    sector_counts: Dict[str, int] = {}
    country_counts: Dict[str, int] = {}

    for h in holdings:
        sector = h.get("sector") if _valid_sector(h.get("sector")) else "Unclassified"
        country = h.get("country") if _valid_country(h.get("country")) else "US"

        if _valid_sector(h.get("sector")) and _valid_country(h.get("country")):
            complete_meta_count += 1

        sector_counts[sector] = sector_counts.get(sector, 0) + 1
        country_counts[country] = country_counts.get(country, 0) + 1

    coverage_pct = (complete_meta_count / total_positions * 100) if total_positions > 0 else 0.0
    confidence = _confidence_from_coverage(coverage_pct)
    reliability_gate_passed = total_positions > 0 and coverage_pct >= 60

    top_sector = max(sector_counts.items(), key=lambda x: x[1])[0] if sector_counts else "Unclassified"
    top_sector_count = sector_counts.get(top_sector, 0)
    top_country = max(country_counts.items(), key=lambda x: x[1])[0] if country_counts else "US"
    top_country_count = country_counts.get(top_country, 0)

    claims: List[Dict[str, Any]] = []
    recommendations: List[str] = []

    if reliability_gate_passed:
        sector_pct = (top_sector_count / total_positions * 100) if total_positions else 0
        country_pct = (top_country_count / total_positions * 100) if total_positions else 0

        claims = [
            {
                "id": "sector_concentration",
                "title": "Sector Concentration",
                "statement": f"Highest concentration is in {top_sector} ({top_sector_count}/{total_positions} positions).",
                "confidence": confidence,
                "evidence": {
                    "type": "distribution",
                    "value": {
                        "top_sector": top_sector,
                        "top_sector_count": top_sector_count,
                        "top_sector_pct": round(sector_pct, 1),
                    },
                    "source": "holdings_snapshot",
                },
            },
            {
                "id": "country_concentration",
                "title": "Geographic Concentration",
                "statement": f"Primary exposure is to {top_country} ({top_country_count}/{total_positions} positions).",
                "confidence": confidence,
                "evidence": {
                    "type": "distribution",
                    "value": {
                        "top_country": top_country,
                        "top_country_count": top_country_count,
                        "top_country_pct": round(country_pct, 1),
                    },
                    "source": "holdings_snapshot",
                },
            },
            {
                "id": "small_portfolio_tail_risk",
                "title": "Portfolio Breadth",
                "statement": "Portfolios with fewer than 5 holdings may have elevated concentration risk.",
                "confidence": "MEDIUM",
                "evidence": {
                    "type": "rule",
                    "value": {"holdings_count": total_positions, "rule": "holdings_count < 5"},
                    "source": "heuristic_policy_v1",
                },
            },
        ]

        recommendations = [
            "Reduce concentration by increasing diversification across sectors.",
            "Review country exposure and rebalance if a single region dominates.",
            "Consider adding defensive sectors to reduce drawdown sensitivity.",
        ]
    else:
        claims = [
            {
                "id": "insufficient_metadata",
                "title": "Insufficient Reliable Metadata",
                "statement": "Current metadata coverage is below the reliability threshold for high-confidence intelligence.",
                "confidence": "LOW",
                "evidence": {
                    "type": "coverage",
                    "value": {
                        "metadata_coverage_pct": round(coverage_pct, 1),
                        "complete_metadata_positions": complete_meta_count,
                        "total_positions": total_positions,
                        "threshold_pct": 60,
                    },
                    "source": "quality_gate_v1",
                },
            }
        ]

        recommendations = [
            "Ensure holdings have valid ticker, sector, and country metadata.",
            "Sync and enrich holdings before relying on intelligence recommendations.",
            "Use Overview/Holdings metrics for decisions until coverage improves.",
        ]

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "engine": "portfolio_intelligence_heuristic_v1",
        "mode": "heuristic",
        "data_sources": ["holdings_snapshot", "market_fundamentals_enrichment"],
        "quality": {
            "confidence": confidence,
            "metadata_coverage_pct": round(coverage_pct, 1),
            "complete_metadata_positions": complete_meta_count,
            "total_positions": total_positions,
            "reliability_gate_passed": reliability_gate_passed,
            "reliability_threshold_pct": 60,
        },
        "summary": {
            "top_sector": top_sector,
            "top_country": top_country,
        },
        "claims": claims,
        "recommendations": recommendations,
    }
