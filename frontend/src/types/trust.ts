// Trust Scoring Engine Types

export interface SourceScoreResponse {
  id: number;
  source_name: string;
  sector: string | null;
  accuracy_score: number;
  total_articles: number;
  last_updated: string;
}

export interface ConsensusArticleInput {
  source: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface OutlierInfo {
  source: string;
  is_outlier: boolean;
  reason: string;
}

export interface ConsensusResponse {
  consensus_score: number;
  agreement_level: string;
  consensus_sentiment: string;
  outliers: OutlierInfo[];
}

export interface ArticleScoreBreakdown {
  source_score: number;
  consensus_score: number;
  recency_score: number;
  sentiment_score: number;
}

export interface ArticleScoreResponse {
  trust_score: number;
  is_outlier: boolean;
  breakdown: ArticleScoreBreakdown;
  agreement_level: string;
}

export interface SourceScoreUpsertRequest {
  source_name: string;
  sector?: string;
  accuracy_score: number;
  total_articles?: number;
}
