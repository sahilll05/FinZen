"use client";

import { useEffect, useState } from 'react';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { SoftCard } from '@/components/shared/SoftCard';
import { ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';
import { AreaChart } from '@/components/charts/AreaChart';
import { PieChart } from '@/components/charts/PieChart';
import { portfolioAPI, newsAPI, geoAPI } from '@/lib/api';

interface KPI {
  label: string;
  value: number;
  type: 'currency' | 'score' | 'geo';
  change: number;
}

interface NewsItem {
  title: string;
  source: string;
  trust_score: number;
  sentiment: string;
  published_at?: string;
}

interface GeoHotspot {
  country_code: string;
  country_name: string;
  overall_score: number;
  flag: string;
}

const HOTSPOT_COUNTRIES = ['TW', 'RU', 'CN', 'IR'];
const FLAGS: Record<string, string> = { TW: '🇹🇼', RU: '🇷🇺', CN: '🇨🇳', IR: '🇮🇷', US: '🇺🇸' };

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch { return ''; }
}

export default function DashboardOverviewPage() {
  const [kpis, setKpis] = useState<KPI[]>([
    { label: 'Total Value', value: 0, type: 'currency', change: 0 },
    { label: "Day's P&L", value: 0, type: 'currency', change: 0 },
    { label: 'Risk Score', value: 0, type: 'score', change: 0 },
    { label: 'Geo Exposure', value: 0, type: 'geo', change: 0 },
  ]);
  const [allocation, setAllocation] = useState<{ name: string; value: number }[]>([]);
  const [performance, setPerformance] = useState<{ date: string; value: number }[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [hotspots, setHotspots] = useState<GeoHotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);

    // Load portfolios for KPIs
    try {
      const portfolioRes = await portfolioAPI.list();
      const portfolios = portfolioRes.data;
      let totalValue = 0;
      const sectorMap: Record<string, number> = {};

      if (portfolios.length > 0) {
        // Get detailed metrics for first portfolio
        try {
          const detailRes = await portfolioAPI.get(portfolios[0].id);
          const detail = detailRes.data;
          totalValue = detail.current_value || detail.total_invested || 0;
          const gainLoss = detail.total_gain_loss || 0;
          const gainPct = detail.total_gain_loss_pct || 0;

          // Build sector allocation
          if (detail.holdings) {
            for (const h of detail.holdings) {
              const sec = h.sector || 'Other';
              sectorMap[sec] = (sectorMap[sec] || 0) + (h.market_value || h.quantity * h.avg_cost);
            }
          }

          setKpis([
            { label: 'Total Value', value: totalValue, type: 'currency', change: gainPct },
            { label: "Day's P&L", value: gainLoss, type: 'currency', change: gainPct },
            { label: 'Risk Score', value: 42, type: 'score', change: -2 },
            { label: 'Portfolios', value: portfolios.length, type: 'geo', change: 0 },
          ]);
        } catch {
          // Use aggregate from list
          totalValue = portfolios.reduce((s: number, p: any) => s + (p.total_invested || 0), 0);
          setKpis([
            { label: 'Total Value', value: totalValue, type: 'currency', change: 0 },
            { label: "Day's P&L", value: 0, type: 'currency', change: 0 },
            { label: 'Risk Score', value: 42, type: 'score', change: -2 },
            { label: 'Portfolios', value: portfolios.length, type: 'geo', change: 0 },
          ]);
        }

        // Sector allocation
        const totalSector = Object.values(sectorMap).reduce((a, b) => a + b, 0);
        if (totalSector > 0) {
          setAllocation(
            Object.entries(sectorMap).map(([name, val]) => ({
              name,
              value: Math.round((val / totalSector) * 100),
            }))
          );
        }

        // Mock performance trend (real would need historical data)
        const base = totalValue || 1000000;
        setPerformance([
          { date: 'Jan', value: base * 0.92 },
          { date: 'Feb', value: base * 0.95 },
          { date: 'Mar', value: base * 0.93 },
          { date: 'Apr', value: base * 0.97 },
          { date: 'May', value: base * 0.99 },
          { date: 'Jun', value: base },
        ]);
      } else {
        setPerformance([
          { date: 'Jan', value: 1200000 }, { date: 'Feb', value: 1220000 },
          { date: 'Mar', value: 1215000 }, { date: 'Apr', value: 1245000 },
          { date: 'May', value: 1280000 }, { date: 'Jun', value: 1245000 },
        ]);
        setAllocation([
          { name: 'Technology', value: 35 }, { name: 'Healthcare', value: 20 },
          { name: 'Energy', value: 15 }, { name: 'Finance', value: 30 },
        ]);
      }
    } catch {
      // Fallback mock
      setPerformance([
        { date: 'Jan', value: 1200000 }, { date: 'Feb', value: 1220000 },
        { date: 'Mar', value: 1215000 }, { date: 'Apr', value: 1245000 },
        { date: 'May', value: 1280000 }, { date: 'Jun', value: 1245000 },
      ]);
      setAllocation([
        { name: 'Technology', value: 35 }, { name: 'Healthcare', value: 20 },
        { name: 'Energy', value: 15 }, { name: 'Finance', value: 30 },
      ]);
    }

    // Load news feed
    try {
      const newsRes = await newsAPI.getFeed({ country: 'US', limit: 3 });
      setNews((newsRes.data.articles || []).slice(0, 2));
    } catch { setNews([]); }

    // Load geo hotspots
    const spots: GeoHotspot[] = [];
    await Promise.allSettled(
      HOTSPOT_COUNTRIES.map(async (code) => {
        try {
          const res = await geoAPI.getCountryRisk(code);
          spots.push({
            country_code: code,
            country_name: res.data.country_name,
            overall_score: res.data.overall_score,
            flag: FLAGS[code] || '🌐',
          });
        } catch {}
      })
    );
    spots.sort((a, b) => b.overall_score - a.overall_score);
    setHotspots(spots.slice(0, 3));

    setIsLoading(false);
  };

  const CHART_COLORS = ['#4338ca', '#0f766e', '#d97706', '#be123c', '#7c3aed', '#15803d'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <SoftCard key={i} className="flex flex-col justify-between hover:-translate-y-1 transition-transform border border-border-light shadow-xs hover:shadow-sm h-[140px] p-5 bg-gradient-to-br from-surface to-surface">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary w-full truncate">{kpi.label}</h3>
              <AnimatedNumber
                value={kpi.value}
                prefix={kpi.type === 'currency' ? '$' : ''}
                className="text-[28px] font-bold font-mono text-text-primary tracking-tight block drop-shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between w-full mt-auto pt-3 border-t border-border-light/50">
              <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-xs ${kpi.change >= 0 ? 'bg-accent-sage-light text-accent-sage border border-accent-sage/20' : 'bg-accent-rose-light text-accent-rose border border-accent-rose/20'}`}>
                {kpi.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(kpi.change).toFixed(1)}{kpi.type === 'currency' ? '%' : ''}
              </span>
              <div className="w-16 h-6 bg-root rounded border border-border-light overflow-hidden flex items-end opacity-70">
                <div className="w-1/4 h-1/3 bg-border-strong rounded-t-sm" />
                <div className="w-1/4 h-2/3 bg-border-strong rounded-t-sm ml-px" />
                <div className="w-1/4 h-1/2 bg-border-strong rounded-t-sm ml-px" />
                <div className="w-1/4 h-full bg-accent-indigo rounded-t-sm ml-px" />
              </div>
            </div>
          </SoftCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SoftCard className="h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-semibold text-text-primary font-sans">Portfolio Performance</h3>
              <div className="flex bg-elevated rounded-md p-1 border border-border-base shadow-xs">
                {['1W', '1M', '3M', '1Y'].map(t => (
                  <button key={t} className={`px-4 py-1.5 text-xs font-semibold rounded transition-all ${t === '1Y' ? 'bg-surface shadow-xs text-accent-indigo border border-border-base' : 'text-text-secondary hover:text-text-primary hover:bg-border-light/50'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="w-full h-[300px]">
              <AreaChart data={performance} />
            </div>
          </SoftCard>
        </div>

        <div>
          <SoftCard className="h-full min-h-[400px] flex flex-col">
            <h3 className="text-lg font-semibold text-text-primary font-sans mb-8">Sector Allocation</h3>
            <div className="w-full h-[220px] mb-8 relative">
              {allocation.length > 0 ? (
                <>
                  <PieChart data={allocation} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <span className="text-2xl font-bold text-text-primary font-mono drop-shadow-sm border-b border-border-light/30">{allocation.length}</span>
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest mt-1">Sectors</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">No allocation data</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm w-full mx-auto mt-auto border-t border-border-light pt-6">
              {allocation.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-xs border border-border-light" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-text-secondary font-medium tracking-wide">{item.name}</span>
                </div>
              ))}
            </div>
          </SoftCard>
        </div>
      </div>

      {/* News + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SoftCard className="h-full min-h-[300px]">
          <h3 className="text-lg font-semibold text-text-primary font-sans mb-6">Intelligence Feed</h3>
          <div className="space-y-4">
            {news.length > 0 ? news.map((n, i) => {
              const isVerified = n.trust_score >= 80;
              const accentColor = isVerified ? 'accent-sage' : 'accent-amber';
              return (
                <div key={i} className="border border-border-light rounded-xl p-4 group cursor-pointer hover:shadow-md transition-all hover:border-border-strong bg-root relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-${accentColor}`} />
                  <div className="flex items-center justify-between mb-3 border-b border-border-light pb-2 ml-2">
                    <span className={`bg-${accentColor}-light text-${accentColor} px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider shadow-xs border border-${accentColor}/20`}>
                      {isVerified ? '✓ VERIFIED' : '~ RELIABLE'} {Math.round(n.trust_score)}
                    </span>
                    <span className="text-xs text-text-secondary font-mono tracking-tight">
                      {n.source} · {n.published_at ? timeAgo(n.published_at) : ''}
                    </span>
                  </div>
                  <h4 className="font-semibold text-text-primary group-hover:text-accent-indigo transition-colors mb-2 text-balance leading-snug ml-2">{n.title}</h4>
                </div>
              );
            }) : (
              <div className="text-sm text-text-secondary text-center py-8">
                {isLoading ? 'Loading news...' : 'Start backend to see live news'}
              </div>
            )}
          </div>
        </SoftCard>

        <SoftCard className="h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary font-sans">Geopolitical Hotspots</h3>
            <div className="w-10 h-10 rounded-full bg-accent-teal-light flex items-center justify-center border border-accent-teal/10 shadow-xs">
              <Globe className="w-5 h-5 text-accent-teal" />
            </div>
          </div>
          <div className="space-y-4 px-1">
            {hotspots.length > 0 ? hotspots.map((h) => {
              const color = h.overall_score >= 7 ? 'accent-rose' : h.overall_score >= 4 ? 'accent-amber' : 'accent-sage';
              return (
                <div key={h.country_code} className="flex items-center justify-between p-4 border border-border-light rounded-xl bg-root shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${color}`} />
                  <div className="flex items-center gap-4 ml-2">
                    <span className="text-3xl drop-shadow-md">{h.flag}</span>
                    <span className="font-semibold text-text-primary text-sm tracking-wide">{h.country_name}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-mono text-text-primary font-bold text-sm">
                      {h.overall_score.toFixed(1)} <span className="text-[10px] text-text-secondary">/10</span>
                    </span>
                    <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden border border-border-light shadow-inner">
                      <div className={`h-full bg-${color} relative`} style={{ width: `${h.overall_score * 10}%` }} />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-sm text-text-secondary text-center py-8">
                {isLoading ? 'Loading hotspots...' : 'Start backend to see live data'}
              </div>
            )}
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
