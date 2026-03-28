"use client";

import { useEffect, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { AreaChart } from '@/components/charts/AreaChart';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { motion } from 'framer-motion';
import { riskAPI, geoAPI } from '@/lib/api';

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

export default function RiskProfilePage() {
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = async () => {
    setIsLoading(true);

    // Load risk profile
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

    // Load geo risk factors for major markets
    const factors: RiskFactor[] = [];
    const countries = [
      { code: 'US', label: 'Market Volatility' },
      { code: 'CN', label: 'Geopolitical Tension' },
      { code: 'JP', label: 'Liquidity Constraint' },
      { code: 'GB', label: 'Interest Rate Sensitivity' },
      { code: 'DE', label: 'Credit Spreads' },
    ];

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
    setIsLoading(false);
  };

  const systemicScore = riskFactors.length > 0
    ? (riskFactors.reduce((s, f) => s + f.val, 0) / riskFactors.length / 10).toFixed(1)
    : '5.0';

  const scoreColor =
    Number(systemicScore) >= 7 ? 'text-accent-rose bg-accent-rose-light border-accent-rose/20'
    : Number(systemicScore) >= 4 ? 'text-accent-amber bg-accent-amber-light border-accent-amber/20'
    : 'text-accent-sage bg-accent-sage-light border-accent-sage/20';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between pb-6 border-b border-border-light">
        <div>
          <h1 className="font-display text-4xl text-text-primary mb-2">Composite Risk Profile</h1>
          <p className="font-sans text-sm text-text-secondary">Cross-asset correlation matrix and real-time distress indicators.</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1">Global Systemic Risk</span>
          <span className={`text-4xl font-mono font-bold drop-shadow-sm border px-3 py-1 rounded shadow-xs ${scoreColor}`}>
            {isLoading ? '...' : systemicScore}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <SoftCard className="bg-surface shadow-xs pt-8">
            <h3 className="font-semibold text-text-primary text-xl mb-6 pb-2 border-b border-border-light/50 w-full inline-block font-display">Macro Factor Exposures</h3>
            <div className="space-y-6">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-full h-12 bg-elevated animate-pulse rounded-lg" />
                ))
              ) : (
                riskFactors.map((r, i) => (
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

        <div className="lg:col-span-2 space-y-6">
          <SoftCard className="h-[460px] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-border-light pb-4">
              <h3 className="font-semibold text-text-primary text-xl font-display">Stress Indicator Time-Series</h3>
              <div className="flex gap-2 bg-root p-1 rounded-md border border-border-base shadow-xs">
                <button className="px-4 py-1.5 bg-surface border border-accent-rose/30 text-accent-rose rounded shadow-sm text-xs font-bold tracking-wide">VIX Proxy</button>
                <button className="px-4 py-1.5 border border-transparent hover:bg-surface/50 text-text-secondary hover:text-text-primary rounded text-xs font-semibold transition-colors">MOVE Proxy</button>
              </div>
            </div>
            <div className="flex-1 border border-border-light rounded-xl overflow-hidden shadow-inner p-3 bg-root">
              <AreaChart data={
                riskFactors.length > 0
                  ? riskFactors.map((f, i) => ({ date: f.label.split(' ')[0], value: f.val }))
                  : [
                    { date: 'Q1', value: 12 }, { date: 'Q2', value: 18 }, { date: 'Q3', value: 34 }, { date: 'Q4', value: 28 },
                    { date: 'Q1b', value: 42 }, { date: 'Q2b', value: 68 }, { date: 'Q3b', value: 55 }, { date: 'Q4b', value: 85 },
                  ]
              } />
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
