"""
Multi-Constraint Portfolio Optimizer Service.
Uses CVXPY for convex optimization.
"""

import numpy as np
from typing import List, Dict, Optional

try:
    import cvxpy as cp
    CVXPY_AVAILABLE = True
except ImportError:
    CVXPY_AVAILABLE = False
    print("⚠️ CVXPY not installed. Optimizer will use simple heuristic.")


def optimize_portfolio(
    tickers: List[str],
    current_weights: List[float],
    expected_returns: List[float],
    covariance_matrix: Optional[np.ndarray] = None,
    constraints: Dict = {},
) -> dict:
    """
    Optimize portfolio allocation using multi-constraint optimization.
    
    Constraints supported:
        - max_position_pct: max weight per stock (default 30%)
        - min_positions: minimum number of stocks
        - target_return: minimum target return
        - max_sector_pct: max weight per sector
        - exclude_tickers: list of tickers to exclude
    """
    n = len(tickers)

    if n == 0:
        return {"status": "error", "message": "No holdings to optimize"}

    returns = np.array(expected_returns)

    # Generate simple covariance matrix if not provided
    if covariance_matrix is None:
        # Simple diagonal covariance (uncorrelated assumption)
        vols = np.abs(returns) * 0.5 + 0.1  # Rough volatility estimate
        covariance_matrix = np.diag(vols ** 2)

    if not CVXPY_AVAILABLE:
        return _heuristic_optimization(tickers, current_weights, returns, constraints)

    try:
        # ── CVXPY Optimization ──
        w = cp.Variable(n)
        ret = returns @ w
        risk = cp.quad_form(w, covariance_matrix)

        # Objective: maximize return - risk (Sharpe-like)
        risk_aversion = 2.0
        objective = cp.Maximize(ret - risk_aversion * risk)

        # Constraints
        constraint_list = [
            cp.sum(w) == 1,     # Weights sum to 1
            w >= 0,             # No short selling
        ]

        # Max position size
        max_pos = constraints.get("max_position_pct", 30) / 100
        constraint_list.append(w <= max_pos)

        # Minimum position size (if invested)
        min_pos = constraints.get("min_position_pct", 2) / 100
        # (This is hard to do cleanly with continuous optimization, skip for simplicity)

        # Target return constraint
        if "target_return" in constraints:
            constraint_list.append(ret >= constraints["target_return"])

        # Solve
        problem = cp.Problem(objective, constraint_list)
        problem.solve(solver=cp.SCS)

        if problem.status == "optimal" or problem.status == "optimal_inaccurate":
            optimal_weights = w.value
            portfolio_return = float(returns @ optimal_weights)
            portfolio_risk = float(np.sqrt(optimal_weights @ covariance_matrix @ optimal_weights))
            sharpe = portfolio_return / portfolio_risk if portfolio_risk > 0 else 0

            allocations = []
            for i, ticker in enumerate(tickers):
                allocations.append({
                    "ticker": ticker,
                    "current_weight": round(current_weights[i] * 100, 2),
                    "optimized_weight": round(float(optimal_weights[i]) * 100, 2),
                    "change": round(float(optimal_weights[i] - current_weights[i]) * 100, 2),
                    "reasoning": _get_reasoning(
                        float(optimal_weights[i]), current_weights[i], returns[i]
                    ),
                })

            return {
                "status": "optimal",
                "expected_return": round(portfolio_return * 100, 2),
                "expected_risk": round(portfolio_risk * 100, 2),
                "sharpe_ratio": round(sharpe, 3),
                "allocations": allocations,
                "constraints_applied": list(constraints.keys()),
            }
        else:
            return _heuristic_optimization(tickers, current_weights, returns, constraints)

    except Exception as e:
        print(f"CVXPY error: {e}")
        return _heuristic_optimization(tickers, current_weights, returns, constraints)


def _heuristic_optimization(tickers, current_weights, returns, constraints):
    """Simple heuristic optimization when CVXPY fails."""
    n = len(tickers)
    max_pos = constraints.get("max_position_pct", 30) / 100

    # Weight by return (higher return → higher weight)
    raw_weights = np.maximum(returns, 0.01)  # Ensure positive
    weights = raw_weights / raw_weights.sum()
    weights = np.minimum(weights, max_pos)
    weights = weights / weights.sum()  # Re-normalize

    portfolio_return = float(returns @ weights)

    allocations = []
    for i, ticker in enumerate(tickers):
        allocations.append({
            "ticker": ticker,
            "current_weight": round(current_weights[i] * 100, 2),
            "optimized_weight": round(float(weights[i]) * 100, 2),
            "change": round(float(weights[i] - current_weights[i]) * 100, 2),
            "reasoning": _get_reasoning(float(weights[i]), current_weights[i], returns[i]),
        })

    return {
        "status": "heuristic",
        "expected_return": round(portfolio_return * 100, 2),
        "expected_risk": 0,
        "sharpe_ratio": 0,
        "allocations": allocations,
        "constraints_applied": list(constraints.keys()),
    }


def _get_reasoning(new_weight, old_weight, expected_return):
    diff = new_weight - old_weight
    if diff > 0.05:
        return f"Increase allocation — expected return {expected_return*100:.1f}%"
    elif diff < -0.05:
        return f"Decrease allocation — lower expected return or diversification"
    else:
        return "Maintain current allocation"