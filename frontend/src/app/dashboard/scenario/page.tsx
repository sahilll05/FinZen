"use client";

import { useEffect, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { Button } from '@/components/ui/button';
import { scenarioAPI, portfolioAPI } from '@/lib/api';

interface Portfolio {
  id: string;
  name: string;
}

interface StockImpact {
  ticker: string;
  current_value: number;
  scenario_value: number;
  change_pct: number;
  impact_driver: string;
}

interface ScenarioResult {
  scenario_name: string;
  description: string;
  portfolio_id: number;
  current_portfolio_value: number;
  scenario_portfolio_value: number;
  total_impact_pct: number;
  stock_impacts: StockImpact[];
  historical_precedent?: string;
  hedging_suggestions: string[];
}

const PRESET_SCENARIOS = [
  { name: 'oil_shock', label: 'Global Oil Supply Shock ($150/bbl)', icon: '🛢️' },
  { name: 'recession', label: 'US Treasury Yield Spike (+150bps)', icon: '📉' },
  { name: 'war', label: 'Taiwan Straits Blockade', icon: '⚔️' },
  { name: 'tech_crash', label: 'Generative AI Bubble Burst', icon: '💻' },
  { name: 'pandemic', label: '1987 Black Monday Replay', icon: '🦠' },
];

export default function ScenarioSimulatorPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<Set<string>>(new Set());
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0].name);
  const [severity, setSeverity] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    portfolioAPI.list()
      .then(res => {
        const data: Portfolio[] = res.data;
        setPortfolios(data);
        if (data.length > 0) setSelectedPortfolioIds(new Set([data[0].id]));
      })
      .catch(() => {});
  }, []);

  const handleSimulate = async () => {
    const pid = Array.from(selectedPortfolioIds)[0];
    if (!pid) { setError('Select a portfolio first.'); return; }

    setIsRunning(true);
    setError('');
    setResult(null);

    try {
      const res = await scenarioAPI.simulate({
        portfolio_id: pid,
        scenarios: [{ name: selectedScenario, params: { severity_multiplier: severity } }],
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation failed. Ensure backend is running and portfolio has holdings.');
    } finally {
      setIsRunning(false);
    }
  };

  const togglePortfolio = (id: string) => {
    setSelectedPortfolioIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between pb-6 border-b border-border-light">
        <div>
          <h1 className="font-display text-4xl text-text-primary mb-2">Scenario Sandbox</h1>
          <p className="font-sans text-sm text-text-secondary">Stochastic shock modeling and historical event replays.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <SoftCard className="lg:col-span-1 border border-border-strong shadow-lg relative overflow-hidden bg-surface py-10 px-8">
          <div className="absolute right-[-20%] top-[-10%] opacity-20 blur-3xl w-64 h-64 bg-accent-indigo-light rounded-full pointer-events-none mix-blend-multiply" />
          <h3 className="font-display text-3xl font-semibold text-text-primary mb-8 border-b border-border-light pb-4">Simulation Engine</h3>

          <div className="space-y-8 relative z-10">
            <div className="bg-root p-5 rounded-xl border border-border-light shadow-inner">
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Select Shock Vector</label>
              <select
                value={selectedScenario}
                onChange={e => setSelectedScenario(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-lg p-3.5 text-sm font-semibold text-text-primary focus:ring-2 focus:ring-accent-indigo outline-none shadow-xs"
              >
                {PRESET_SCENARIOS.map(s => (
                  <option key={s.name} value={s.name}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-root p-5 rounded-xl border border-border-light shadow-inner">
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Severity Multiplier (x)</label>
              <div className="flex items-center gap-5 border border-border-base bg-surface rounded-lg p-4 shadow-xs">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  className="flex-1 accent-accent-rose h-2 bg-border-light rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-mono font-black text-accent-rose text-2xl truncate border-l border-border-light pl-4 w-20 text-right">
                  {severity}x
                </span>
              </div>
            </div>

            <div className="bg-root p-5 rounded-xl border border-border-light shadow-inner">
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Target Portfolios</label>
              <div className="space-y-3 max-h-48 overflow-y-auto bg-surface p-3 rounded-lg border border-border-base shadow-xs pr-2">
                {portfolios.length > 0 ? portfolios.map(p => (
                  <label key={p.id} className="flex items-center gap-4 p-3 hover:bg-root rounded-md border border-transparent hover:border-border-strong transition-colors cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedPortfolioIds.has(p.id)}
                      onChange={() => togglePortfolio(p.id)}
                      className="accent-accent-indigo w-5 h-5 cursor-pointer"
                    />
                    <span className="text-[15px] font-semibold text-text-primary font-sans group-hover:text-accent-indigo transition-colors truncate">
                      {p.name}
                    </span>
                  </label>
                )) : (
                  <p className="text-sm text-text-secondary p-3">No portfolios found. Create one first.</p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-accent-rose bg-accent-rose-light border border-accent-rose/20 px-4 py-2 rounded-lg">{error}</p>
            )}

            <Button
              onClick={handleSimulate}
              disabled={isRunning || selectedPortfolioIds.size === 0}
              className="w-full font-sans text-lg font-bold h-14 shadow-indigo mt-10 group relative overflow-hidden rounded-xl tracking-wide disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isRunning ? 'Running Simulation...' : 'Execute Simulation'}
                {!isRunning && <span className="text-accent-indigo-light opacity-80 font-mono text-xs font-normal border border-accent-indigo-light/30 px-1.5 py-0.5 rounded ml-2">⌘E</span>}
              </span>
              <div className="absolute inset-0 bg-accent-indigo-mid transform translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </div>
        </SoftCard>

        {/* Results */}
        <div className="lg:col-span-2 flex flex-col">
          {result ? (
            <SoftCard className="flex-1 bg-surface shadow-lg border-border-strong p-10 overflow-y-auto">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border-light">
                <div>
                  <h3 className="font-display text-3xl text-text-primary mb-2">{result.scenario_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                  <p className="text-sm text-text-secondary">{result.description}</p>
                </div>
                <div className={`text-4xl font-mono font-black px-6 py-3 rounded-xl border-2 shadow-md ${
                  result.total_impact_pct < 0 ? 'text-accent-rose border-accent-rose/30 bg-accent-rose-light' : 'text-accent-sage border-accent-sage/30 bg-accent-sage-light'
                }`}>
                  {result.total_impact_pct >= 0 ? '+' : ''}{result.total_impact_pct.toFixed(1)}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-root p-6 rounded-xl border border-border-light shadow-inner text-center">
                  <span className="text-xs uppercase font-bold text-text-secondary tracking-widest block mb-2">Current Value</span>
                  <span className="text-2xl font-mono font-bold text-text-primary">${result.current_portfolio_value.toLocaleString()}</span>
                </div>
                <div className="bg-root p-6 rounded-xl border border-border-light shadow-inner text-center">
                  <span className="text-xs uppercase font-bold text-text-secondary tracking-widest block mb-2">Scenario Value</span>
                  <span className={`text-2xl font-mono font-bold ${result.scenario_portfolio_value < result.current_portfolio_value ? 'text-accent-rose' : 'text-accent-sage'}`}>
                    ${result.scenario_portfolio_value.toLocaleString()}
                  </span>
                </div>
              </div>

              {result.stock_impacts.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-4">Stock-Level Impacts</h4>
                  <div className="space-y-3">
                    {result.stock_impacts.map(si => (
                      <div key={si.ticker} className="flex items-center justify-between p-4 bg-root rounded-xl border border-border-light">
                        <div>
                          <span className="font-bold text-text-primary font-mono">{si.ticker}</span>
                          <p className="text-xs text-text-secondary mt-0.5">{si.impact_driver}</p>
                        </div>
                        <span className={`font-mono font-bold ${si.change_pct < 0 ? 'text-accent-rose' : 'text-accent-sage'}`}>
                          {si.change_pct >= 0 ? '+' : ''}{si.change_pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.hedging_suggestions.length > 0 && (
                <div className="bg-accent-indigo-light/20 border border-accent-indigo/20 rounded-xl p-6">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-accent-indigo mb-3">Hedging Suggestions</h4>
                  <ul className="space-y-2 text-sm text-text-body">
                    {result.hedging_suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-accent-indigo mt-0.5">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SoftCard>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-surface/50 border border-border-light rounded-[2rem] shadow-inner text-center relative overflow-hidden min-h-[600px]">
              <div className="w-28 h-28 mb-8 rounded-[2rem] bg-root border-[6px] border-surface flex items-center justify-center shadow-md relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 border-[4px] border-accent-indigo border-t-transparent border-l-transparent rounded-[2rem] transform rotate-45 opacity-30 group-hover:rotate-180 transition-transform duration-1000" />
                <span className="text-5xl opacity-80 drop-shadow-md pb-1">⚡️</span>
              </div>
              <h2 className="font-display text-4xl text-text-primary mb-6 drop-shadow-sm leading-tight">Ready for computation.</h2>
              <p className="text-text-secondary max-w-lg mb-12 leading-relaxed font-sans text-base">
                Select parameters to run the Monte Carlo simulation. The engine will evaluate non-linear derivative exposures and cross-asset contagion risks.
              </p>
              <div className="w-full max-w-md border-t border-border-light pt-10">
                <span className="text-xs font-semibold uppercase tracking-widest text-text-dim block mb-6">Quick Presets</span>
                <div className="grid grid-cols-2 gap-5">
                  {PRESET_SCENARIOS.slice(0, 2).map(s => (
                    <SoftCard
                      key={s.name}
                      className="p-5 bg-surface cursor-pointer hover:border-accent-indigo border border-border-light shadow-xs hover:shadow-md transition-all"
                      onClick={() => { setSelectedScenario(s.name); }}
                    >
                      <span className="text-[10px] font-mono font-bold text-accent-indigo bg-accent-indigo-light px-2 py-0.5 border border-accent-indigo/20 rounded block mb-3 w-fit tracking-widest shadow-xs">PRESET</span>
                      <span className="text-sm font-bold text-text-primary font-sans leading-snug truncate block text-left">{s.label}</span>
                    </SoftCard>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
