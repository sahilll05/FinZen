export interface RiskDimension {
  war: number;
  sanctions: number;
  economic: number;
  political: number;
  currency: number;
  regulatory: number;
}

export interface CountryRisk {
  country: string;
  risk_score: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  dimensions: RiskDimension;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface SectorImpact {
  sector: string;
  impact: "bullish" | "bearish" | "neutral";
  strength: number; // 0-1
  rationale: string;
}

export interface SectorImpactResponse {
  country: string;
  event_type: string;
  sector_impacts: SectorImpact[];
  timestamp: string;
}

export interface StockImpact {
  ticker: string;
  company_name: string;
  sector: string;
  impact: "bullish" | "bearish" | "neutral";
  expected_impact_percent: number;
  confidence: number;
}

export interface StockImpactResponse {
  country: string;
  affected_stocks: StockImpact[];
  summary: string;
}
