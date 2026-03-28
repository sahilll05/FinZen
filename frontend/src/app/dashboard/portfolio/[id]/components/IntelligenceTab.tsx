"use client";

import { SoftCard } from '@/components/shared/SoftCard';
import { AlertCircle, BrainCircuit, ShieldAlert, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function IntelligenceTab({ portfolio, holdings }: { portfolio: any, holdings: any[] }) {

  const hasHoldings = holdings.length > 0;

  // Derive sector concentrations from real holdings
  const sectorCounts: Record<string, number> = {};
  holdings.forEach(h => {
    const s = h.sector || 'Unknown';
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });
  const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Technology';

  // Derive country concentrations
  const countryCounts: Record<string, number> = {};
  holdings.forEach(h => {
    const c = h.country || 'Unknown';
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USA';

  const aiInsights = hasHoldings
    ? `Based on the current composition of **${holdings.length} position${holdings.length !== 1 ? 's' : ''}**, the **FinZen ML pipeline** detected the following macro trends:

- Your portfolio has the highest concentration in **${topSector}**, which may make it sensitive to sector-specific shocks (e.g. interest rate hikes, regulatory changes).
- Geographic exposure is primarily towards **${topCountry}**. Consider diversifying to reduce single-country risk.
- Review your allocation periodically — concentration risk in fewer than 5 holdings significantly increases tail-risk exposure.
- Consider adding traditional defensive sectors (Healthcare, Consumer Staples) to reduce maximum drawdown potential during market corrections.`
    : `Your portfolio currently has **no holdings**. Add positions to unlock AI-powered analysis.

The **FinZen ML pipeline** will analyze sector concentrations, geographic exposure, and correlation risk across your holdings once data is available.`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* AI Insights Panel — Full Width */}
      <SoftCard className="p-6 bg-surface border-l-4 border-l-accent-indigo">
        <div className="flex items-center gap-3 mb-6">
          <BrainCircuit className="w-6 h-6 text-accent-indigo animate-pulse" />
          <h3 className="font-display text-xl font-bold text-text-primary">FinZen ML Intelligence</h3>
        </div>

        <div className="prose prose-sm prose-invert max-w-none prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-accent-indigo">
          <ReactMarkdown>{aiInsights}</ReactMarkdown>
        </div>

        <div className="mt-8 pt-6 border-t border-border-light flex gap-4">
           <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary flex items-center gap-2 shadow-xs">
              <Sparkles className="w-3 h-3 text-accent-sage" /> Model: FinZen Composite
           </div>
           <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary shadow-xs">
              Based on {holdings.length} live position{holdings.length !== 1 ? 's' : ''}
           </div>
        </div>
      </SoftCard>

      {/* X-Ray / Hidden Exposures */}
      <h3 className="font-display text-2xl text-text-primary mt-12 mb-4 border-b border-border-light pb-2 flex items-center gap-3">
        <ShieldAlert className="text-accent-rose w-6 h-6" /> Deep X-Ray Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <SoftCard className="p-6 bg-surface border border-accent-rose/30">
          <h4 className="font-sans text-md font-bold text-accent-rose mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Concentration Risk</h4>
          <p className="text-sm text-text-secondary font-sans leading-relaxed mb-4">
            {hasHoldings
              ? `Entity resolution found sector concentration in ${topSector}. Overlapping exposure across ETFs and direct holdings can amplify drawdowns.`
              : 'Add holdings to detect hidden concentration and cross-asset overlaps.'}
          </p>
          {hasHoldings && (
            <ul className="space-y-3">
              {Object.entries(sectorCounts).slice(0, 3).map(([sector, count]) => (
                <li key={sector} className="bg-root p-3 rounded border border-border-light flex justify-between items-center shadow-inner">
                  <span className="text-sm font-bold text-text-primary">{sector}</span>
                  <span className="text-xs font-mono text-accent-rose px-2 py-0.5 bg-accent-rose/10 rounded">{count} position{count !== 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </SoftCard>

        <SoftCard className="p-6 bg-surface border border-accent-amber/30">
          <h4 className="font-sans text-md font-bold text-accent-amber mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Geopolitical Vulnerability</h4>
          <p className="text-sm text-text-secondary font-sans leading-relaxed mb-4">
            {hasHoldings
              ? `Geographic analysis indicates primary exposure to ${topCountry}. Supply chain dependencies and geopolitical tension in this region may impact portfolio performance.`
              : 'Add holdings to unlock geopolitical exposure analysis.'}
          </p>
          {hasHoldings && (() => {
            const totalCountries = Object.keys(countryCounts).length;
            const topPct = Math.round((countryCounts[topCountry] / holdings.length) * 100);
            return (
              <>
                <div className="h-4 w-full bg-elevated rounded-full overflow-hidden border border-border-light mb-2">
                  <div className="h-full bg-accent-amber transition-all" style={{ width: `${topPct}%` }} />
                </div>
                <span className="text-[10px] text-text-dim font-mono font-bold uppercase tracking-widest block">{topPct}% holdings in {topCountry} · {totalCountries} countr{totalCountries !== 1 ? 'ies' : 'y'} total</span>
              </>
            );
          })()}
        </SoftCard>
      </div>
    </div>
  );
}
