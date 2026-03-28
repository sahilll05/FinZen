import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioAPI } from '@/lib/api';
import { OptimizationResult, XRayResult } from '@/types';

export function usePortfolioOptimize(portfolioId: string) {
  return useMutation({
    mutationFn: (strategy: 'conservative' | 'moderate' | 'aggressive') => 
      portfolioAPI.optimize(portfolioId, { strategy }).then(res => res.data as OptimizationResult)
  });
}

export function usePortfolioXRay(portfolioId: string) {
  return useQuery({
    queryKey: ['portfolio', portfolioId, 'xray'],
    queryFn: () => portfolioAPI.xray(portfolioId).then(res => res.data as XRayResult),
    enabled: !!portfolioId,
  });
}
