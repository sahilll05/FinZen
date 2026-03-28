"use client";

import { useEffect, useState, useRef } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { newsAPI } from '@/lib/api';

interface NewsArticle {
  title: string;
  source: string;
  url?: string;
  sentiment: string;
  sentiment_score: number;
  trust_score: number;
  country: string;
  published_at?: string;
  entities?: string[];
}

const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', EU: '🇪🇺', CN: '🇨🇳', JP: '🇯🇵',
  DE: '🇩🇪', IN: '🇮🇳', RU: '🇷🇺', TW: '🇹🇼', AU: '🇦🇺',
};

const REGIONS: Record<string, string[]> = {
  'All Regions': [],
  'Americas': ['US', 'CA', 'BR', 'MX'],
  'Europe': ['GB', 'DE', 'FR', 'EU', 'RU'],
  'Asia': ['CN', 'JP', 'IN', 'TW', 'KR'],
  'Middle East': ['SA', 'AE', 'IR', 'IL'],
};

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trustMin, setTrustMin] = useState(0);
  const [activeRegion, setActiveRegion] = useState('All Regions');
  const [displayTrust, setDisplayTrust] = useState(0);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trustMin, activeRegion]);

  const loadNews = async () => {
    setIsLoading(true);
    try {
      // Pick country based on region filter
      const regionCountries = REGIONS[activeRegion] || [];
      const country = regionCountries.length > 0 ? regionCountries[0] : 'US';

      const res = await newsAPI.getFeed({
        country,
        trust_min: trustMin,
        limit: 12,
      });
      setArticles(res.data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const trustBadge = (score: number) => {
    if (score >= 80) return { label: '✓ VERIFIED', cls: 'bg-accent-sage-light text-accent-sage border-accent-sage/20' };
    if (score >= 60) return { label: '~ RELIABLE', cls: 'bg-accent-amber-light text-accent-amber border-accent-amber/20' };
    return { label: '! UNVERIFIED', cls: 'bg-accent-rose-light text-accent-rose border-accent-rose/20' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between pb-6 border-b border-border-light">
        <h1 className="font-display text-4xl text-text-primary">Intelligence Feed</h1>
        <div className="flex items-center gap-4">
          <div className="bg-surface border border-border-base rounded-lg h-10 px-4 flex items-center shadow-xs">
            <span className="text-xs font-semibold mr-4 text-text-secondary">Trust Min:</span>
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="100"
              value={displayTrust}
              onChange={(e) => setDisplayTrust(Number(e.target.value))}
              onMouseUp={() => setTrustMin(displayTrust)}
              onTouchEnd={() => setTrustMin(displayTrust)}
              className="w-24 accent-accent-indigo"
            />
            <span className="font-mono font-bold text-accent-indigo ml-4 text-sm">{displayTrust}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {Object.keys(REGIONS).map(r => (
          <span
            key={r}
            onClick={() => setActiveRegion(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors shadow-xs ${
              r === activeRegion
                ? 'bg-surface border-text-primary text-text-primary'
                : 'bg-root text-text-secondary border-border-light hover:border-border-strong'
            }`}
          >
            {r}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="break-inside-avoid h-48 bg-surface animate-pulse rounded-2xl border border-border-light mb-6" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-24 text-text-secondary">
          <p className="text-xl mb-2 font-display">No articles found.</p>
          <p className="text-sm">Try lowering the trust minimum or changing the region filter.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {articles.map((n, i) => {
            const badge = trustBadge(n.trust_score);
            const flag = COUNTRY_FLAG[n.country?.toUpperCase()] || '🌐';
            const timeStr = n.published_at ? timeAgo(n.published_at) : '';
            return (
              <SoftCard
                key={i}
                className="break-inside-avoid bg-surface/90 backdrop-blur-sm border-border-base shadow-sm hover:shadow-md hover:border-border-strong relative min-h-[160px] flex flex-col justify-between p-6 mb-6"
              >
                <div className="absolute top-6 right-6">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest shadow-xs border ${badge.cls}`}>
                    {badge.label} {Math.round(n.trust_score)}
                  </span>
                </div>

                <div className="pr-24">
                  <h3
                    onClick={() => n.url && window.open(n.url, '_blank')}
                    className={`text-lg font-bold text-text-primary leading-snug mb-4 font-sans transition-colors ${n.url ? 'hover:text-accent-indigo cursor-pointer' : ''}`}
                  >
                    {n.title}
                  </h3>
                  {n.entities && n.entities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {n.entities.slice(0, 4).map(e => (
                        <span key={e} className="text-[10px] bg-elevated border border-border-light px-1.5 py-0.5 rounded font-mono text-text-secondary">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border-light inline-flex w-full">
                  <span className="text-lg drop-shadow-sm">{flag}</span>
                  <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wide">{n.source}</span>
                  {timeStr && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border-strong" />
                      <span className="text-xs text-text-dim font-mono">{timeStr}</span>
                    </>
                  )}
                  <span
                    className={`ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shadow-xs ${
                      n.sentiment === 'negative'
                        ? 'bg-accent-rose-light text-accent-rose border-accent-rose/20'
                        : n.sentiment === 'positive'
                        ? 'bg-accent-sage-light text-accent-sage border-accent-sage/20'
                        : 'bg-elevated text-text-secondary border-border-strong'
                    }`}
                  >
                    {n.sentiment}
                  </span>
                </div>
              </SoftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
