"use client";

import { SoftCard } from '@/components/shared/SoftCard';
import { AlertCircle, BrainCircuit, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function IntelligenceTab({ portfolio, holdings }: { portfolio: any, holdings: any[] }) {

  const riskScore = 68; // Dummy, calculate from backend normally

  const aiInsights = `
  Based on the current composition of ${holdings.length} assets, the **FinZen ML pipeline** detected the following macro trends:
  
  - You are heavily exposed to technology, making this portfolio susceptible to interest rate hikes.
  - The recent inclusion of emerging market equities increases your tail risk, but adds valuable diversification against USD depreciation.
  - Consider adding traditional defensive sectors (Healthcare, Consumer Staples) to reduce maximum drawdown potential during market corrections.
  `;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Level Intelligence KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Overall Risk Score */}
        <SoftCard className="p-6 bg-surface flex flex-col items-center justify-center text-center border-t-4 border-t-accent-amber">
          <Activity className="w-8 h-8 text-accent-amber mb-4 opacity-80" />
          <h3 className="font-sans text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">Portfolio Risk Score</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-6xl text-text-primary">{riskScore}</span>
            <span className="text-sm font-sans font-bold text-text-dim">/ 100</span>
          </div>
          <p className="text-xs text-text-secondary mt-4 max-w-[200px]">Classified as <strong>Moderate-High Risk</strong>. Volatility profile resembles highly aggressive growth funds.</p>
        </SoftCard>

        {/* AI Insights Panel */}
        <SoftCard className="p-6 bg-surface lg:col-span-2 border-l-4 border-l-accent-indigo">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-6 h-6 text-accent-indigo animate-pulse" />
            <h3 className="font-display text-xl font-bold text-text-primary">FinZen ML Intelligence</h3>
          </div>
          
          <div className="prose prose-sm prose-invert max-w-none prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-accent-indigo">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </div>

          <div className="mt-8 pt-6 border-t border-border-light flex gap-4">
             <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary flex items-center gap-2 shadow-xs">
                <Sparkles className="w-3 h-3 text-accent-sage" /> Model: GPT-4o-Ensemble
             </div>
             <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary shadow-xs">
                Confidence: 94.2%
             </div>
          </div>
        </SoftCard>

      </div>

      {/* X-Ray / Hidden Exposures */}
      <h3 className="font-display text-2xl text-text-primary mt-12 mb-4 border-b border-border-light pb-2 flex items-center gap-3">
        <ShieldAlert className="text-accent-rose w-6 h-6" /> Deep X-Ray Analysis
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <SoftCard className="p-6 bg-surface border border-accent-rose/30">
          <h4 className="font-sans text-md font-bold text-accent-rose mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Critical Concentration Risk</h4>
          <p className="text-sm text-text-secondary font-sans leading-relaxed mb-4">
            Our entity resolution engine found hidden cross-pollination across 3 of your ETFs and 2 individual stock holdings.
          </p>
          <ul className="space-y-3">
            <li className="bg-root p-3 rounded border border-border-light flex justify-between items-center shadow-inner">
              <span className="text-sm font-bold text-text-primary">Apple Inc. (AAPL)</span>
              <span className="text-xs font-mono text-accent-rose px-2 py-0.5 bg-accent-rose/10 rounded">Actual Exposure: 14.2% (vs 8.0% direct)</span>
            </li>
            <li className="bg-root p-3 rounded border border-border-light flex justify-between items-center shadow-inner">
              <span className="text-sm font-bold text-text-primary">NVIDIA Corp. (NVDA)</span>
              <span className="text-xs font-mono text-accent-rose px-2 py-0.5 bg-accent-rose/10 rounded">Actual Exposure: 11.5% (vs 5.0% direct)</span>
            </li>
          </ul>
        </SoftCard>

        <SoftCard className="p-6 bg-surface border border-accent-amber/30">
          <h4 className="font-sans text-md font-bold text-accent-amber mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Geopolitical Vulnerability</h4>
          <p className="text-sm text-text-secondary font-sans leading-relaxed mb-4">
            Supply chain analysis indicates severe over-reliance on standard Tier-1 manufacturers located in high-tension regions.
          </p>
          <div className="h-4 w-full bg-elevated rounded-full overflow-hidden border border-border-light mb-2">
            <div className="h-full bg-accent-amber transition-all" style={{ width: '42%' }} />
          </div>
          <span className="text-[10px] text-text-dim font-mono font-bold uppercase tracking-widest block">42% Revenue Derived from At-Risk Geographies</span>
        </SoftCard>
      </div>
    </div>
  );
}
