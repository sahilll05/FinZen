"use client";

import { useEffect, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { AreaChart } from '@/components/charts/AreaChart';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { motion } from 'framer-motion';
import { riskAPI, geoAPI } from '@/lib/api';
import { portfolioService } from '@/services/portfolioService';
import { useAuthStore } from '@/store/authStore';
import { ChevronDown, Info } from 'lucide-react';

type IndicatorType = 'VIX' | 'MOVE';

interface RiskProfile {
  risk_score: number;
  risk_category: string;
  recommended_allocation: Record<string, number>;
  country_adjustment: string;
  behavioral_notes: string[];
  confidence: number;
}

interface RiskFactor {
  label: string;
  val: number;
  color: string;
}

/** Generate a pseudo-timeseries from a base value with noise */
function generateTimeSeries(baseVal: number, length = 20): Array<{ date: string; value: number }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return Array.from({ length }).map((_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (length - i));
    const noise = (Math.random() - 0.4) * baseVal * 0.3;
    const trend = (i / length) * baseVal * 0.2;
    return {
      date: months[d.getMonth()],
      value: Math.max(5, Math.round(baseVal * 0.6 + trend + noise)),
    };
  });
}

export default function RiskProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [indicator, setIndicator] = useState<IndicatorType>('VIX');

  // Portfolio switching
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [portfolioHoldings, setPortfolioHoldings] = useState<any[]>([]);
  const [showPortfolioDropdown, setShowPortfolioDropdown] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  // Separate chart data per indicator
  const [vixData, setVixData] = useState<Array<{ date: string; value: number }>>([]);
  const [moveData, setMoveData] = useState<Array<{ date: string; value: number }>>([]);

  useEffect(() => {
    if (user) {
      loadPortfolios();
    }
    loadRiskData();
  }, [user]);

  const loadPortfolios = async () => {
    if (!user) return;
    try {
      const res = await portfolioService.listPortfolios(user.id);
      const pList = res.data as any[];
      setPortfolios(pList);
      if (pList.length > 0) {
        setSelectedPortfolioId(pList[0].$id);
        loadPortfolioHoldings(pList[0].$id);
      }
    } catch {
      setPortfolios([]);
    }
  };

  const loadPortfolioHoldings = async (portfolioId: string) => {
    setIsLoadingPortfolio(true);
    try {
      const res = await portfolioService.getHoldings(portfolioId);
      setPortfolioHoldings(res.data as any[]);
    } catch {
      setPortfolioHoldings([]);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  const handleSelectPortfolio = (p: any) => {
    setSelectedPortfolioId(p.$id);
    setShowPortfolioDropdown(false);
    loadPortfolioHoldings(p.$id);
  };

  const loadRiskData = async () => {
    setIsLoading(true);

    // Load risk profile from backend
    try {
      const profileRes = await riskAPI.getMyProfile();
      setProfile(profileRes.data);
    } catch {
      setProfile({
        risk_score: 55,
        risk_category: 'Moderate',
        recommended_allocation: { stocks: 60, bonds: 30, cash: 10 },
        country_adjustment: 'Standard',
        behavioral_notes: ['Complete the risk questionnaire for a personalized profile.'],
        confidence: 0.5,
      });
    }

    // Load geo risk factors for major macro indicators
    const countries = [
      { code: 'US', label: 'Market Volatility' },
      { code: 'CN', label: 'Geopolitical Tension' },
      { code: 'JP', label: 'Liquidity Constraint' },
      { code: 'GB', label: 'Interest Rate Sensitivity' },
      { code: 'DE', label: 'Credit Spreads' },
    ];

    const factors: RiskFactor[] = [];
    await Promise.allSettled(
      countries.map(async (c) => {
        try {
          const res = await geoAPI.getCountryRisk(c.code);
          const score = res.data.overall_score * 10; // 0-10 → 0-100
          factors.push({
            label: c.label,
            val: Math.round(Math.min(score, 100)),
            color: score >= 70 ? 'var(--accent-rose)' : score >= 40 ? 'var(--accent-amber)' : 'var(--accent-sage)',
          });
        } catch {
          factors.push({
            label: c.label,
            val: 50,
            color: 'var(--accent-amber)',
          });
        }
      })
    );
    setRiskFactors(factors);

    // Generate time-series data for each indicator
    const avgVolatility = factors.find(f => f.label === 'Market Volatility')?.val || 50;
    const avgRateSensitivity = factors.find(f => f.label === 'Interest Rate Sensitivity')?.val || 45;

    setVixData(generateTimeSeries(avgVolatility, 18));
    setMoveData(generateTimeSeries(avgRateSensitivity * 0.8, 18));

    setIsLoading(false);
  };

  /** Compute portfolio-adjusted macro factors by overlaying real holdings data */
  const getPortfolioAdjustedFactors = (): RiskFactor[] => {
    if (portfolioHoldings.length === 0) return riskFactors;

    // Sector → macro factor mapping
    const sectorRiskMap: Record<string, { factor: string; multiplier: number }> = {
      'Technology': { factor: 'Market Volatility', multiplier: 1.3 },
      'Finance': { factor: 'Credit Spreads', multiplier: 1.2 },
      'Banking': { factor: 'Credit Spreads', multiplier: 1.2 },
      'Energy': { factor: 'Geopolitical Tension', multiplier: 1.25 },
      'Healthcare': { factor: 'Market Volatility', multiplier: 0.8 },
      'Consumer': { factor: 'Liquidity Constraint', multiplier: 0.9 },
      'Real Estate': { factor: 'Interest Rate Sensitivity', multiplier: 1.4 },
      'Utilities': { factor: 'Interest Rate Sensitivity', multiplier: 1.2 },
    };

    const factorBoosts: Record<string, number> = {};
    portfolioHoldings.forEach(h => {
      const sector = h.sector || '';
      for (const [key, { factor, multiplier }] of Object.entries(sectorRiskMap)) {
        if (sector.toLowerCase().includes(key.toLowerCase())) {
          factorBoosts[factor] = Math.max(factorBoosts[factor] || 0, multiplier);
        }
      }
    });

    return riskFactors.map(f => {
      const boost = factorBoosts[f.label] ?? 1.0;
      const adjusted = Math.round(Math.min(f.val * boost, 100));
      return {
        ...f,
        val: adjusted,
        color: adjusted >= 70 ? 'var(--accent-rose)' : adjusted >= 40 ? 'var(--accent-amber)' : 'var(--accent-sage)',
      };
    });
  };

  const displayFactors = getPortfolioAdjustedFactors();

  const systemicScore =
    displayFactors.length > 0
      ? (displayFactors.reduce((s, f) => s + f.val, 0) / displayFactors.length / 10).toFixed(1)
      : '5.0';

  const scoreColor =
    Number(systemicScore) >= 7 ? 'text-accent-rose bg-accent-rose-light border-accent-rose/20'
    : Number(systemicScore) >= 4 ? 'text-accent-amber bg-accent-amber-light border-accent-amber/20'
    : 'text-accent-sage bg-accent-sage-light border-accent-sage/20';

  const selectedPortfolio = portfolios.find(p => p.$id === selectedPortfolioId);
  const chartData = indicator === 'VIX' ? vixData : moveData;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-border-light">
        <div>
          <h1 className="font-display text-4xl text-text-primary mb-2">Composite Risk Profile</h1>
          <p className="font-sans text-sm text-text-secondary">Cross-asset correlation matrix and real-time distress indicators.</p>
        </div>
        <div className="flex items-end gap-6 flex-wrap">
          {/* Global Systemic Risk Score */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Global Systemic Risk</span>
              <div className="group relative">
                <Info className="w-3 h-3 text-text-dim cursor-help" />
                <div className="absolute right-0 bottom-5 w-64 bg-elevated border border-border-strong rounded-lg p-3 text-xs text-text-secondary shadow-xl z-50 hidden group-hover:block">
                  <p className="font-bold text-text-primary mb-1">What is Global Systemic Risk?</p>
                  <p>An aggregate 0–10 score averaging live geopolitical risk assessments across 5 major economies (US, China, Japan, UK, Germany). Higher = more systemic stress.</p>
                </div>
              </div>
            </div>
            <span className={`text-4xl font-mono font-bold drop-shadow-sm border px-3 py-1 rounded shadow-xs ${scoreColor}`}>
              {isLoading ? '...' : systemicScore}
            </span>
          </div>

          {/* Portfolio Switcher */}
          {portfolios.length > 0 && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1">Analyzing Portfolio</span>
              <div className="relative">
                <button
                  onClick={() => setShowPortfolioDropdown(v => !v)}
                  className="flex items-center gap-2 bg-elevated border border-border-strong px-3 py-2 rounded-lg text-sm font-bold text-text-primary hover:bg-surface transition-colors shadow-xs"
                >
                  <span className="max-w-[160px] truncate">{selectedPortfolio?.name || 'Select Portfolio'}</span>
                  <ChevronDown className="w-4 h-4 text-text-dim" />
                </button>
                {showPortfolioDropdown && (
                  <div className="absolute right-0 top-10 w-56 bg-surface border border-border-strong rounded-lg shadow-2xl z-50 overflow-hidden">
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Macro Factors + Risk Profile */}
        <div className="lg:col-span-1 space-y-6">
          <SoftCard className="bg-surface shadow-xs pt-8">
            <div className="flex justify-between items-end mb-6 pb-2 border-b border-border-light/50">
              <h3 className="font-semibold text-text-primary text-xl font-display">Macro Factor Exposures</h3>
              {portfolioHoldings.length > 0 && (
                <span className="text-[10px] text-accent-sage font-mono font-bold bg-accent-sage/10 px-2 py-0.5 rounded border border-accent-sage/20">
                  Portfolio-adjusted
                </span>
              )}
            </div>
            <div className="space-y-6">
              {isLoading || isLoadingPortfolio ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-full h-12 bg-elevated animate-pulse rounded-lg" />
                ))
              ) : (
                displayFactors.map((r, i) => (
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: i * 0.1 }} key={r.label} className="w-full">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-semibold text-text-primary tracking-wide shadow-[0_1px_2px_rgba(28,25,23,0.05)] bg-root px-2 py-1 rounded border border-border-base">{r.label}</span>
                      <span className="font-mono text-xs font-bold px-1" style={{ color: r.color }}>{r.val}</span>
                    </div>
                    <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border-base shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${r.val}%` }}
                        transition={{ duration: 1, delay: i * 0.1 + 0.5 }}
                        className="h-full rounded-r-none relative"
                        style={{ backgroundColor: r.color }}
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </SoftCard>

          <SoftCard className="bg-gradient-to-br from-surface to-root border border-border-strong shadow-md py-8">
            <h3 className="font-semibold text-text-primary text-xl mb-6 font-display border-b border-border-light/50 pb-2">
              {profile ? 'Risk Profile' : 'Value at Risk (VaR)'}
            </h3>
            {profile ? (
              <div className="space-y-4">
                <div className="bg-elevated p-5 rounded-xl border border-border-base text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2 border-b border-border-light/50 pb-1">
                    Risk Category
                  </span>
                  <span className="font-mono text-[22px] font-bold text-text-primary block">{profile.risk_category}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-elevated p-5 rounded-xl border border-border-base text-center shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2">Risk Score</span>
                    <AnimatedNumber value={profile.risk_score} className="font-mono text-[22px] font-bold text-accent-rose drop-shadow-sm block" />
                  </div>
                  <div className="bg-elevated p-5 rounded-xl border border-border-base text-center shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2">Confidence</span>
                    <AnimatedNumber value={profile.confidence * 100} suffix="%" className="font-mono text-[22px] font-bold text-accent-sage drop-shadow-sm block" />
                  </div>
                </div>
                {profile.recommended_allocation && (
                  <div className="bg-elevated p-4 rounded-xl border border-border-base shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-3">Recommended Allocation</span>
                    <div className="flex gap-3">
                      {Object.entries(profile.recommended_allocation).map(([k, v]) => (
                        <div key={k} className="flex-1 text-center">
                          <span className="text-lg font-mono font-bold text-text-primary block">{v}%</span>
                          <span className="text-[10px] text-text-secondary uppercase tracking-wider">{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-elevated p-5 rounded-xl border border-border-base text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2 border-b border-border-light/50 pb-1">95% Daily VaR</span>
                  <AnimatedNumber value={245000} prefix="$" className="font-mono text-[22px] font-bold text-accent-rose drop-shadow-sm block" />
                </div>
                <div className="bg-elevated p-5 rounded-xl border border-border-base text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2 border-b border-border-light/50 pb-1">Max Drawdown</span>
                  <AnimatedNumber value={18.4} suffix="%" className="font-mono text-[22px] font-bold text-accent-rose drop-shadow-sm block" />
                </div>
              </div>
            )}
          </SoftCard>
        </div>

        {/* Right column — Stress Indicator Chart + Insights */}
        <div className="lg:col-span-2 space-y-6">
          <SoftCard className="h-[460px] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-border-light pb-4">
              <div>
                <h3 className="font-semibold text-text-primary text-xl font-display">Stress Indicator Time-Series</h3>
                <p className="text-xs text-text-dim mt-1">
                  {indicator === 'VIX'
                    ? 'VIX Proxy — Equity market implied volatility (fear gauge), derived from geo-political stress index.'
                    : 'MOVE Proxy — Bond market rate volatility indicator, derived from interest rate sensitivity.'}
                </p>
              </div>
              <div className="flex gap-2 bg-root p-1 rounded-md border border-border-base shadow-xs">
                <button
                  onClick={() => setIndicator('VIX')}
                  className={`px-4 py-1.5 rounded text-xs font-bold tracking-wide transition-all ${indicator === 'VIX' ? 'bg-surface border border-accent-rose/30 text-accent-rose shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'}`}
                >
                  VIX Proxy
                </button>
                <button
                  onClick={() => setIndicator('MOVE')}
                  className={`px-4 py-1.5 rounded text-xs font-bold tracking-wide transition-all ${indicator === 'MOVE' ? 'bg-surface border border-accent-indigo/30 text-accent-indigo shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'}`}
                >
                  MOVE Proxy
                </button>
              </div>
            </div>
            <div className="flex-1 border border-border-light rounded-xl overflow-hidden shadow-inner p-3 bg-root">
              {isLoading ? (
                <div className="w-full h-full bg-elevated animate-pulse rounded-lg" />
              ) : (
                <AreaChart data={chartData} />
              )}
            </div>
          </SoftCard>

          {profile && profile.behavioral_notes.length > 0 && (
            <SoftCard className="bg-surface relative overflow-hidden shadow-md">
              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-accent-amber" />
              <div className="ml-6 py-2">
                <h3 className="font-semibold text-text-primary text-xl mb-3 font-display">Risk Insights</h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {profile.behavioral_notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-2 border-l-2 border-border-light pl-4 font-sans leading-relaxed">
                      <span>→</span> {n}
                    </li>
                  ))}
                </ul>
                {portfolioHoldings.length > 0 && (
                  <div className="mt-4 p-3 bg-elevated rounded-lg border border-border-light">
                    <p className="text-xs text-text-secondary">
                      <span className="font-bold text-text-primary">Portfolio: </span>
                      {selectedPortfolio?.name} · {portfolioHoldings.length} holding{portfolioHoldings.length !== 1 ? 's' : ''} analyzed.
                      {portfolioHoldings.length > 0 && ` Macro factors adjusted based on sector & country exposure.`}
                    </p>
                  </div>
                )}
                {profile.country_adjustment && profile.country_adjustment !== 'Standard' && (
                  <p className="mt-4 text-xs text-text-dim">Country adjustment: {profile.country_adjustment}</p>
                )}
              </div>
            </SoftCard>
          )}
        </div>
      </div>
    </div>
  );
}
