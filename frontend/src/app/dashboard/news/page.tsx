"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
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
  CA: '🇨🇦', FR: '🇫🇷', SA: '🇸🇦', AE: '🇦🇪', BR: '🇧🇷',
};

const REGIONS: Record<string, string[]> = {
  'All Regions': [],
  'Americas': ['US', 'CA', 'BR', 'MX'],
  'Europe': ['GB', 'DE', 'FR', 'EU', 'RU'],
  'Asia': ['CN', 'JP', 'IN', 'TW', 'KR'],
  'Middle East': ['SA', 'AE', 'IR', 'IL'],
};

const TOPICS = [
  { label: 'All Topics', query: '' },
  { label: 'Markets', query: 'stock market finance' },
  { label: 'Crypto', query: 'cryptocurrency bitcoin crypto' },
  { label: 'Tech', query: 'technology AI fintech' },
  { label: 'Macro', query: 'interest rates inflation GDP' },
  { label: 'Energy', query: 'oil gas energy commodities' },
  { label: 'Banking', query: 'bank central bank Fed' },
];

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return '';
  }
}

function ExternalLinkIcon() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="inline-block ml-1.5 opacity-60"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trustMin, setTrustMin] = useState(0);
  const [activeRegion, setActiveRegion] = useState('All Regions');
  const [activeTopic, setActiveTopic] = useState('All Topics');
  const [displayTrust, setDisplayTrust] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const regionCountries = REGIONS[activeRegion] || [];
      const country = regionCountries.length > 0 ? regionCountries[0] : 'US';

      // Combine topic query + user search
      const topicQuery = TOPICS.find(t => t.label === activeTopic)?.query || '';
      const combinedQuery = [topicQuery, searchQuery].filter(Boolean).join(' ');

      const res = await newsAPI.getFeed({
        country,
        trust_min: trustMin,
        limit: 12,
        query: combinedQuery || undefined,
      });
      setArticles(res.data.articles || []);
    } catch (e: any) {
      setError('Could not load news. Check that the backend is running.');
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeRegion, activeTopic, trustMin, searchQuery]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Debounce search input
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchQuery(val), 500);
  };

  const openArticle = (url?: string) => {
    if (url && url !== '#' && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const isClickable = (url?: string) => !!(url && url !== '#' && url.startsWith('http'));

  const trustBadge = (score: number) => {
    if (score >= 80) return { label: '✓ VERIFIED', cls: 'bg-accent-sage-light text-accent-sage border-accent-sage/20' };
    if (score >= 60) return { label: '~ RELIABLE', cls: 'bg-accent-amber-light text-accent-amber border-accent-amber/20' };
    return { label: '! UNVERIFIED', cls: 'bg-accent-rose-light text-accent-rose border-accent-rose/20' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border-light">
        <div>
          <h1 className="font-display text-4xl text-text-primary">Intelligence Feed</h1>
          <p className="text-sm text-text-secondary mt-1">Live financial news from global sources via NewsAPI</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search news..."
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              className="pl-8 pr-3 h-9 text-sm rounded-lg bg-surface border border-border-base text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-indigo/60 w-48 transition-all"
            />
          </div>
          {/* Trust slider */}
          <div className="bg-surface border border-border-base rounded-lg h-9 px-4 flex items-center gap-3 shadow-xs">
            <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">Trust Min:</span>
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="100"
              value={displayTrust}
              onChange={e => setDisplayTrust(Number(e.target.value))}
              onMouseUp={() => setTrustMin(displayTrust)}
              onTouchEnd={() => setTrustMin(displayTrust)}
              className="w-20 accent-accent-indigo"
            />
            <span className="font-mono font-bold text-accent-indigo text-xs w-6 text-right">{displayTrust}</span>
          </div>
          {/* Refresh */}
          <button
            onClick={loadNews}
            disabled={isLoading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-base bg-surface text-text-secondary hover:text-text-primary hover:border-border-strong transition-all disabled:opacity-40"
            title="Refresh news"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Region filters */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(REGIONS).map(r => (
          <button
            key={r}
            onClick={() => setActiveRegion(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all shadow-xs ${
              r === activeRegion
                ? 'bg-text-primary text-surface border-text-primary'
                : 'bg-root text-text-secondary border-border-light hover:border-border-strong hover:text-text-primary'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Topic filters */}
      <div className="flex flex-wrap gap-2">
        {TOPICS.map(t => (
          <button
            key={t.label}
            onClick={() => setActiveTopic(t.label)}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-all ${
              t.label === activeTopic
                ? 'bg-accent-indigo text-white border-accent-indigo'
                : 'bg-elevated text-text-secondary border-border-light hover:border-accent-indigo/40 hover:text-accent-indigo'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-accent-rose/20 bg-accent-rose-light text-accent-rose text-sm px-4 py-3">
          ⚠ {error}
        </div>
      )}

      {/* News Grid */}
      {isLoading ? (
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="break-inside-avoid h-48 bg-surface animate-pulse rounded-2xl border border-border-light mb-6" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-24 text-text-secondary">
          <div className="text-4xl mb-4">📰</div>
          <p className="text-xl mb-2 font-display">No articles found.</p>
          <p className="text-sm">Try lowering the trust minimum, changing the region, or clearing search filters.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {articles.map((n, i) => {
            const badge = trustBadge(n.trust_score);
            const flag = COUNTRY_FLAG[n.country?.toUpperCase()] || '🌐';
            const timeStr = n.published_at ? timeAgo(n.published_at) : '';
            const clickable = isClickable(n.url);

            return (
              <SoftCard
                key={i}
                onClick={() => openArticle(n.url)}
                className={`break-inside-avoid bg-surface/90 backdrop-blur-sm border-border-base shadow-sm relative min-h-[160px] flex flex-col justify-between p-6 mb-6 group transition-all duration-200 ${
                  clickable
                    ? 'hover:shadow-lg hover:border-accent-indigo/40 cursor-pointer'
                    : 'hover:shadow-md hover:border-border-strong'
                }`}
              >
                {/* Trust badge */}
                <div className="absolute top-5 right-5">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest shadow-xs border ${badge.cls}`}>
                    {badge.label} {Math.round(n.trust_score)}
                  </span>
                </div>

                {/* Title */}
                <div className="pr-24">
                  <h3 className={`text-base font-bold leading-snug mb-3 font-sans transition-colors ${
                    clickable ? 'text-text-primary group-hover:text-accent-indigo' : 'text-text-primary'
                  }`}>
                    {n.title}
                    {clickable && <ExternalLinkIcon />}
                  </h3>

                  {/* Entity tags */}
                  {n.entities && n.entities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {n.entities.slice(0, 4).map(e => (
                        <span key={e} className="text-[10px] bg-elevated border border-border-light px-1.5 py-0.5 rounded font-mono text-text-secondary">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2.5 pt-3 border-t border-border-light mt-auto">
                  <span className="text-base drop-shadow-sm">{flag}</span>
                  <span className="text-[11px] font-mono font-semibold text-text-secondary uppercase tracking-wide truncate max-w-[140px]">
                    {n.source}
                  </span>
                  {timeStr && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border-strong flex-shrink-0" />
                      <span className="text-[11px] text-text-dim font-mono">{timeStr}</span>
                    </>
                  )}
                  <span
                    className={`ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shadow-xs flex-shrink-0 ${
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

                {/* "Open article" subtle hint for clickable items */}
                {clickable && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-indigo/0 via-accent-indigo/40 to-accent-indigo/0 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </SoftCard>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!isLoading && articles.length > 0 && (
        <p className="text-center text-xs text-text-dim pt-4">
          Showing {articles.length} articles · Powered by <span className="font-semibold text-text-secondary">NewsAPI</span> + <span className="font-semibold text-text-secondary">GDELT</span>
        </p>
      )}
    </div>
  );
}
