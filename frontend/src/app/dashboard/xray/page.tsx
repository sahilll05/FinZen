"use client";

import { useEffect, useState, useCallback } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { portfolioAPI } from '@/lib/api';
import { portfolioService } from '@/services/portfolioService';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, TrendingUp, Globe2, Layers, ChevronDown } from 'lucide-react';

interface XRayData {
  concentration_risk: {
    top_holding_pct: number;
    top_holding: string;
    herfindahl_index: number;
  };
  supply_chain_risk: Record<string, number>;
  revenue_geography: Record<string, number>;
  country_exposure: Array<{ name: string; exposure_pct: number; risk_level: string }>;
  sector_exposure: Array<{ name: string; exposure_pct: number; risk_level: string }>;
  hidden_risks: string[];
  correlation_warning: string | null;
  overall_risk_score: number;
  recommendations: string[];
}

const REGION_FLAGS: Record<string, string> = {
  US: '🇺🇸', CN: '🇨🇳', EU: '🇪🇺', JP: '🇯🇵', GB: '🇬🇧', IN: '🇮🇳',
  Taiwan: '🇹🇼', Germany: '🇩🇪', India: '🇮🇳', China: '🇨🇳', Europe: '🌍',
  Japan: '🇯🇵', 'South Korea': '🇰🇷', Other: '🌐', Asia: '🌏',
};

function riskColor(level: string): string {
  const l = level?.toUpperCase() || '';
  if (l === 'HIGH' || l === 'CRITICAL') return 'var(--accent-rose)';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'var(--accent-amber)';
  return 'var(--accent-sage)';
}

function riskBg(level: string): string {
  const l = level?.toUpperCase() || '';
  if (l === 'HIGH' || l === 'CRITICAL') return 'bg-accent-rose-light border-accent-rose/20 text-accent-rose';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'bg-accent-amber-light border-accent-amber/20 text-accent-amber';
  return 'bg-accent-sage-light border-accent-sage/20 text-accent-sage';
}

export default function XRayPage() {
  const { user } = useAuthStore();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [holdings, setHoldings] = useState<any[]>([]);
  const [xrayData, setXrayData] = useState<XRayData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load Appwrite portfolios (real user data)
  useEffect(() => {
    if (!user) return;
    setIsLoadingPortfolios(true);
    portfolioService.listPortfolios(user.id)
      .then(res => {
        const pList = res.data as any[];
        setPortfolios(pList);
        if (pList.length > 0) {
          setSelectedPortfolioId(pList[0].$id);
          loadHoldingsAndXray(pList[0].$id);
        } else {
          setIsLoadingPortfolios(false);
        }
      })
      .catch(() => { setIsLoadingPortfolios(false); });
  }, [user]);

  const loadHoldingsAndXray = useCallback(async (portfolioId: string) => {
    setIsLoading(true);
    setError('');
    setXrayData(null);

    try {
      // Fetch real holdings from Appwrite
      const holdingsRes = await portfolioService.getHoldings(portfolioId);
      const rawHoldings = holdingsRes.data as any[];
      setHoldings(rawHoldings);
      setIsLoadingPortfolios(false);

      if (rawHoldings.length === 0) {
        setError('This portfolio has no holdings. Add some positions to run X-Ray analysis.');
        setIsLoading(false);
        return;
      }

      // Send to backend direct endpoint (no Python DB ID needed)
      const xrayRes = await portfolioAPI.xrayDirect(rawHoldings.map(h => ({
        ticker: h.ticker,
        quantity: h.quantity,
        avg_cost: h.avg_cost,
        sector: (h.sector && h.sector !== 'Unknown') ? h.sector : 'Unclassified',
        country: h.country || 'US',
        company_name: h.company_name || h.ticker,
        portfolio_id: portfolioId,
      })));
      setXrayData(xrayRes.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '';
      if (detail.includes('No holdings')) {
        setError('Add holdings to this portfolio to run X-Ray analysis.');
      } else {
        setError(detail || 'Backend unavailable. Start the Python server on port 8000.');
      }
      setXrayData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectPortfolio = (p: any) => {
    setSelectedPortfolioId(p.$id);
    setShowDropdown(false);
    loadHoldingsAndXray(p.$id);
  };

  const selectedPortfolio = portfolios.find(p => p.$id === selectedPortfolioId);
  const overallRisk = xrayData?.overall_risk_score ?? 0;
  const riskLevel = overallRisk >= 60 ? 'HIGH' : overallRisk >= 30 ? 'MEDIUM' : 'LOW';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-border-light">
        <div>
          <h1 className="font-display text-4xl text-text-primary mb-2">Portfolio X-Ray</h1>
          <p className="font-sans text-sm text-text-secondary">
            Decompose hidden risk factors, supply chains, revenue geography, and macro sensitivities.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {lastUpdated && (
            <span className="text-[10px] text-text-dim font-mono">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {/* Overall Risk Badge */}
          {xrayData && (
            <div className={`px-4 py-2 rounded-xl border text-sm font-bold font-mono ${riskBg(riskLevel)}`}>
              Overall Risk: {overallRisk.toFixed(0)}
            </div>
          )}
          {/* Portfolio Switcher */}
          {isLoadingPortfolios ? (
            <div className="w-40 h-10 bg-elevated animate-pulse rounded-lg" />
          ) : portfolios.length > 0 ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-text-dim font-semibold uppercase tracking-widest mb-1">Active Context</span>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(v => !v)}
                  className="flex items-center gap-2 bg-elevated border border-border-strong px-4 py-2 rounded-xl text-sm font-bold text-text-primary hover:bg-surface transition-all shadow-xs"
                >
                  <span className="max-w-[180px] truncate">{selectedPortfolio?.name || 'Select Portfolio'}</span>
                  <span className="text-[10px] font-mono text-text-dim bg-root px-1.5 py-0.5 rounded border border-border-light">{holdings.length} pos</span>
                  <ChevronDown className="w-4 h-4 text-text-dim" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-11 w-60 bg-surface border border-border-strong rounded-xl shadow-2xl z-50 overflow-hidden">
                    {portfolios.map(p => (
                      <button
                        key={p.$id}
                        onClick={() => handleSelectPortfolio(p)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-elevated transition-colors border-b border-border-light/50 last:border-0 ${p.$id === selectedPortfolioId ? 'text-accent-indigo font-bold bg-elevated' : 'text-text-primary'}`}
                      >
                        {p.name}
                        <span className="block text-[10px] text-text-dim font-mono mt-0.5">{p.currency}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-text-dim">No portfolios found</span>
          )}
          {/* Refresh */}
          <button
            onClick={() => selectedPortfolioId && loadHoldingsAndXray(selectedPortfolioId)}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-border-base bg-surface hover:bg-elevated transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 text-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="min-h-[480px] bg-surface animate-pulse rounded-2xl border border-border-light" />
          <div className="min-h-[480px] bg-surface animate-pulse rounded-2xl border border-border-light" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-surface border border-border-light rounded-2xl">
          <AlertTriangle className="w-12 h-12 text-accent-amber mb-4 opacity-70" />
          <p className="text-lg font-semibold text-text-primary mb-2">Analysis Unavailable</p>
          <p className="text-sm text-text-secondary max-w-md">{error}</p>
        </div>
      ) : xrayData ? (
        <div className="space-y-8">
          {/* Top stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SoftCard className="p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary block mb-2">Holdings</span>
              <span className="font-mono text-3xl font-bold text-text-primary">{holdings.length}</span>
            </SoftCard>
            <SoftCard className="p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary block mb-2">Sector HHI</span>
              <span className="font-mono text-3xl font-bold text-text-primary">{xrayData.concentration_risk.herfindahl_index?.toFixed(3)}</span>
              <span className="text-[10px] text-text-dim block mt-1">{xrayData.concentration_risk.herfindahl_index > 0.25 ? '⚠ Concentrated' : '✓ Diversified'}</span>
            </SoftCard>
            <SoftCard className="p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary block mb-2">Top Holding</span>
              <span className="font-mono text-2xl font-bold text-text-primary">{xrayData.concentration_risk.top_holding}</span>
              <span className="text-[10px] font-mono text-accent-rose block mt-1">{xrayData.concentration_risk.top_holding_pct?.toFixed(0)}% weight</span>
            </SoftCard>
            <SoftCard className="p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary block mb-2">Hidden Risks</span>
              <span className={`font-mono text-3xl font-bold ${xrayData.hidden_risks.length > 0 ? 'text-accent-rose' : 'text-accent-sage'}`}>{xrayData.hidden_risks.length}</span>
              <span className="text-[10px] text-text-dim block mt-1">{xrayData.hidden_risks.length > 0 ? 'Detected' : 'All clear'}</span>
            </SoftCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left — Factor Decomposition */}
            <SoftCard className="flex flex-col p-8 bg-surface border-border-strong shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-indigo-light/20 blur-[80px] rounded-full mix-blend-multiply pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-5 h-5 text-accent-indigo" />
                <h3 className="font-display text-2xl font-semibold text-text-primary">Deep Factor Decomposition</h3>
              </div>
              <p className="text-text-secondary text-sm mb-6 font-sans border-b border-border-light pb-4">Quantitative risk breakdown across all dimensions of your portfolio.</p>

              <div className="space-y-5 relative z-10">
                {/* Concentration Risk */}
                <div className="bg-root p-4 rounded-xl border border-border-light shadow-inner">
                  <div className="flex justify-between items-center text-sm font-bold mb-3">
                    <span>Top Holding Concentration</span>
                    <span className="font-mono text-accent-rose">{xrayData.concentration_risk.top_holding_pct?.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-elevated rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(xrayData.concentration_risk.top_holding_pct || 0, 100)}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full bg-accent-rose"
                    />
                  </div>
                  {xrayData.concentration_risk.top_holding && (
                    <p className="text-xs text-text-secondary mt-2">Largest position: <span className="font-mono font-bold text-text-primary">{xrayData.concentration_risk.top_holding}</span></p>
                  )}
                </div>

                {/* Sector Exposure Bars */}
                {xrayData.sector_exposure.length > 0 && (
                  <div className="bg-root p-4 rounded-xl border border-border-light shadow-inner">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Sector Exposure
                    </h4>
                    <div className="space-y-3">
                      {xrayData.sector_exposure.map(s => (
                        <div key={s.name}>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-semibold text-text-primary">{s.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${riskBg(s.risk_level)}`}>{s.risk_level}</span>
                              <span className="font-mono text-text-secondary">{s.exposure_pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(s.exposure_pct, 100)}%` }}
                              transition={{ duration: 0.8 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: riskColor(s.risk_level) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hidden Risks */}
                {xrayData.hidden_risks.length > 0 && (
                  <div className="bg-accent-amber-light/30 border border-accent-amber/20 rounded-xl p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-accent-amber mb-3">⚠️ Hidden Risks Found</h4>
                    <ul className="space-y-2 text-sm text-text-body">
                      {xrayData.hidden_risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-accent-amber mt-0.5 shrink-0">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Correlation Warning */}
                {xrayData.correlation_warning && (
                  <div className="bg-accent-rose-light/20 border border-accent-rose/20 rounded-xl p-4">
                    <p className="text-xs text-accent-rose font-semibold">{xrayData.correlation_warning}</p>
                  </div>
                )}
              </div>
            </SoftCard>

            {/* Right — Geography + Recommendations */}
            <div className="space-y-6">
              <SoftCard className="flex flex-col bg-surface shadow-lg border-border-strong p-8 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-2">
                  <Globe2 className="w-5 h-5 text-accent-teal" />
                  <h3 className="font-display text-2xl font-semibold text-text-primary">Look-Through Exposure</h3>
                </div>
                <p className="text-sm font-sans text-text-secondary mb-6 border-b border-border-light pb-4 leading-relaxed">
                  Revenue geography parsed beyond corporate domicile — where your companies actually earn money.
                </p>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-72">
                  {Object.entries(xrayData.revenue_geography).length > 0 ? (
                    Object.entries(xrayData.revenue_geography)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([region, pct]) => {
                        const isHighRisk = typeof pct === 'number' && (pct as number) > 25 && ['CN', 'China', 'RU'].includes(region);
                        return (
                          <div key={region} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isHighRisk ? 'border-accent-rose/30 bg-accent-rose-light/10' : 'border-border-light bg-root'}`}>
                            {isHighRisk && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent-rose rounded-l-xl" />}
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{REGION_FLAGS[region] || '🌐'}</span>
                              <div>
                                <span className="font-bold text-text-primary text-sm block">{region}</span>
                                {isHighRisk && <span className="text-[10px] text-accent-rose font-bold uppercase">Elevated Risk</span>}
                              </div>
                            </div>
                            <span className={`font-mono font-black text-2xl px-3 py-1 rounded-lg border ${isHighRisk ? 'text-accent-rose border-accent-rose/30' : 'text-text-primary border-border-strong'}`}>
                              {typeof pct === 'number' ? `${(pct as number).toFixed(0)}%` : pct}
                            </span>
                          </div>
                        );
                      })
                  ) : xrayData.supply_chain_risk && Object.keys(xrayData.supply_chain_risk).length > 0 ? (
                    <div className="bg-root p-5 rounded-xl border border-border-light">
                      <h4 className="font-bold text-text-primary mb-3 text-sm">Supply Chain Exposure</h4>
                      {Object.entries(xrayData.supply_chain_risk)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([country, pct]) => (
                          <div key={country} className="flex justify-between items-center py-2 border-b border-border-light/50 last:border-0">
                            <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                              {REGION_FLAGS[country] || '🌐'} {country}
                            </span>
                            <span className="font-mono text-sm text-text-secondary">{(pct as number).toFixed(1)}%</span>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="text-center py-8 text-text-secondary text-sm">
                      <Globe2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No geographic data — tickers not in known database
                    </div>
                  )}
                </div>
              </SoftCard>

              {/* Recommendations */}
              {xrayData.recommendations.length > 0 && (
                <SoftCard className="p-6 bg-accent-indigo-light/10 border-accent-indigo/20 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-indigo" />
                  <h3 className="font-semibold text-text-primary ml-3 mb-3">💡 Recommendations</h3>
                  <ul className="space-y-2 ml-3">
                    {xrayData.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="text-accent-indigo">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </SoftCard>
              )}
            </div>
          </div>
        </div>
      ) : portfolios.length === 0 && !isLoadingPortfolios ? (
        <div className="text-center py-24 text-text-secondary bg-surface border border-border-light rounded-2xl">
          <p className="text-xl mb-2 font-display">No Portfolios Found</p>
          <p className="text-sm">Create a portfolio and add holdings to run X-Ray analysis.</p>
        </div>
      ) : null}
    </div>
  );
}
