export interface Portfolio { id: string; name: string; currency: string; created_at: string; }
export interface Holding { id: string; ticker: string; company_name: string; quantity: number; avg_price: number; current_price: number; pnl: number; pnl_pct: number; weight: number; }
export interface PortfolioMetrics { total_value: number; total_gain_loss: number; total_gain_loss_pct: number; holdings_count: number; sector_allocation: Record<string, number>; beta: number; sharpe_ratio: number; max_drawdown: number; }

export interface OptimizationResult {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  recommended_trades: Array<{ ticker: string; action: 'buy' | 'sell'; quantity: number }>;
  new_weights: Record<string, number>;
}

export interface XRayResult {
  hidden_risk_score: number;
  concentration_score: number;
  correlation_matrix: Record<string, Record<string, number>>;
  risk_chains: Array<{ event: string; sector: string; affected_holdings: string[]; risk_level: 'medium' | 'high' }>;
}
