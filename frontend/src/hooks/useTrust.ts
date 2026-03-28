import { useMutation, useQuery } from '@tanstack/react-query';
import { trustAPI } from '@/lib/api';
import {
  SourceScoreResponse,
  ArticleScoreResponse,
  ConsensusResponse,
  ConsensusArticleInput,
  SourceScoreUpsertRequest,
} from '@/types/trust';

export function useSourceScore(sourceName: string) {
  return useQuery<SourceScoreResponse>({
    queryKey: ['trust', 'source', sourceName],
    queryFn: () => trustAPI.getSource(sourceName).then(res => res.data),
    enabled: !!sourceName,
  });
}

export function useScoreArticle() {
  return useMutation<
    ArticleScoreResponse,
    Error,
    {
      source: string;
      content: string;
      sentiment: "positive" | "negative" | "neutral";
      timestamp: string; // ISO date string
      peer_articles?: ConsensusArticleInput[];
      sector?: string;
    }
  >({
    mutationFn: (data) => trustAPI.scoreArticle(data as any).then(res => res.data),
  });
}

export function useCalculateConsensus() {
  return useMutation<
    ConsensusResponse,
    Error,
    ConsensusArticleInput[]
  >({
    mutationFn: (articles) => 
      trustAPI.calculateConsensus(articles).then(res => res.data),
  });
}

export function useUpsertSource() {
  return useMutation<
    SourceScoreResponse,
    Error,
    SourceScoreUpsertRequest
  >({
    mutationFn: (data) => trustAPI.upsertSource(data).then(res => res.data),
  });
}
