import { useQuery } from '@tanstack/react-query';
import { newsAPI } from '@/lib/api';
import { Article } from '@/types';

export function useNewsFeed(params?: { country?: string; trust_min?: number; limit?: number }) {
  return useQuery({
    queryKey: ['news', params],
    queryFn: () => newsAPI.getFeed(params).then(res => res.data.articles as Article[]),
  });
}

export function useNewsSentiment(ticker: string) {
  return useQuery({
    queryKey: ['news', 'sentiment', ticker],
    queryFn: () => newsAPI.getSentiment(ticker).then(res => res.data),
    enabled: !!ticker,
  });
}
