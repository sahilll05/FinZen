"use client";

import { useEffect, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { Button } from '@/components/ui/button';
import { scenarioAPI } from '@/lib/api';
import { portfolioService } from '@/services/portfolioService';
import { useAuthStore } from '@/store/authStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Portfolio {
  $id: string;
  name: string;
  currency?: string;
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
  current_portfolio_value: number;
  scenario_portfolio_value: number;
  total_impact_pct: number;
  stock_impacts: StockImpact[];
  historical_precedent?: string;
  hedging_suggestions: string[];
}

const PRESET_SCENARIOS = [
  { name: 'oil_shock', label: 'Global Oil Shock', icon: '🛢️', drivers: ['Oil prices ↑', 'Inflation ↑', 'Energy ↑'], story: 'Oil supply disruption → input cost spike → manufacturing hit → consumer spending drops → portfolio reprices' },
  { name: 'recession', label: 'Global Recession', icon: '📉', drivers: ['GDP contracts ↓', 'Unemployment ↑', 'Credit tightens'], story: 'Economic contraction → earnings collapse → risk-off rotation → broad equity selloff 25-50%' },
  { name: 'war', label: 'Major Conflict', icon: '⚔️', drivers: ['Supply chains ↓', 'Energy prices ↑', 'Defense ↑'], story: 'Trade halts → global supply chain freezes → commodity surge → portfolio hit depends on sector mix' },
  { name: 'tech_crash', label: 'Tech Crash', icon: '💥', drivers: ['AI bubble ↓', 'Valuations ↓', 'Value rotates ↑'], story: 'Rate shock deflates AI valuations → NASDAQ-style correction → tech-heavy portfolios devastated' },
  { name: 'pandemic', label: 'Global Pandemic', icon: '🦠', drivers: ['Lockdowns ↓', 'Healthcare ↑', 'Travel ↓'], story: 'COVID-like event → lockdowns → remote-work tech surges → energy/travel collapse → mixed impact' },
];

export default function ScenarioSimulatorPage() {
  const { user } = useAuthStore();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [portfolioHoldings, setPortfolioHoldings] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0].name);
  const [severity, setSeverity] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState('');
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true);

  // Load real Appwrite portfolios
  useEffect(() => {
    if (!user) return;
    portfolioService.listPortfolios(user.id)
      .then(res => {
        const pList = res.data as unknown as Portfolio[];

        setPortfolios(pList);
        if (pList.length > 0) {
          setSelectedPortfolioId(pList[0].$id);
          loadHoldings(pList[0].$id);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingPortfolios(false));
  }, [user]);

  const loadHoldings = async (portfolioId: string) => {
    try {
      const res = await portfolioService.getHoldings(portfolioId);
      setPortfolioHoldings(res.data as any[]);
    } catch {
      setPortfolioHoldings([]);
    }
  };

  const handlePortfolioChange = (id: string) => {
    setSelectedPortfolioId(id);
    setResult(null);
    setError('');
    loadHoldings(id);
  };

  const handleSimulate = async () => {
    if (!selectedPortfolioId) { setError('Select a portfolio first.'); return; }

    setIsRunning(true);
    setError('');
    setResult(null);

    try {
      const res = await scenarioAPI.simulateDirect({
        holdings: portfolioHoldings.map(h => ({
          ticker: h.ticker,
          quantity: h.quantity,
          avg_cost: h.avg_cost,
          sector: h.sector || 'Unknown',
          country: h.country || 'US',
          portfolio_id: selectedPortfolioId,
        })),
        scenarios: [{ name: selectedScenario, params: { severity_multiplier: severity } }],
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation failed. Ensure backend is running and portfolio has holdings.');
    } finally {
      setIsRunning(false);
    }
  };

  const selectedPortfolioName = portfolios.find(p => p.$id === selectedPortfolioId)?.name || 'Portfolio';

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
            {/* Scenario Preset Cards */}
            <div className="bg-root p-5 rounded-xl border border-border-light shadow-inner">
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Select Shock Vector</label>
              <div className="space-y-2">
                {PRESET_SCENARIOS.map(s => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedScenario(s.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${selectedScenario === s.name ? 'border-accent-indigo bg-accent-indigo-light/20 shadow-sm' : 'border-border-light bg-surface hover:border-border-strong'}`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`text-sm font-bold ${selectedScenario === s.name ? 'text-accent-indigo' : 'text-text-primary'}`}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
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
                  className="flex-1 accent-rose-500 h-2 bg-border-light rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-mono font-black text-accent-rose text-2xl truncate border-l border-border-light pl-4 w-20 text-right">
                  {severity}x
                </span>
              </div>
            </div>

            {/* Portfolio Selection from Appwrite */}
            <div className="bg-root p-5 rounded-xl border border-border-light shadow-inner">
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Target Portfolio</label>
              {isLoadingPortfolios ? (
                <div className="h-10 bg-elevated animate-pulse rounded-lg" />
              ) : portfolios.length > 0 ? (
                <div className="space-y-2">
                  {portfolios.map(p => (
                    <label key={p.$id} className="flex items-center gap-4 p-3 hover:bg-surface rounded-md border border-transparent hover:border-border-strong transition-colors cursor-pointer group">
                      <input
                        type="radio"
                        name="portfolio"
                        checked={selectedPortfolioId === p.$id}
                        onChange={() => handlePortfolioChange(p.$id)}
                        className="accent-indigo-600 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-text-primary group-hover:text-accent-indigo transition-colors">{p.name}</span>
                        <span className="text-[10px] text-text-dim block font-mono">{p.currency}</span>
                      </div>
                    </label>
                  ))}
                  {portfolioHoldings.length === 0 && selectedPortfolioId && (
                    <p className="text-xs text-accent-amber bg-accent-amber-light/20 border border-accent-amber/20 rounded-lg px-3 py-2">
                      ⚠ This portfolio has no holdings — add some to run simulation
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary p-3">No portfolios found. Create one first.</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-accent-rose bg-accent-rose-light border border-accent-rose/20 px-4 py-2 rounded-lg">{error}</p>
            )}

            <Button
              onClick={handleSimulate}
              disabled={isRunning || !selectedPortfolioId || portfolioHoldings.length === 0}
              className="w-full font-sans text-lg font-bold h-14 shadow-indigo mt-10 group relative overflow-hidden rounded-xl tracking-wide disabled:opacity-50 bg-accent-indigo hover:bg-accent-indigo-light text-white"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isRunning ? 'Analyzing Impact...' : 'Run Scenario'}
                {!isRunning && <span className="text-white/80 font-mono text-xs font-normal border border-white/30 px-1.5 py-0.5 rounded ml-2">⌘E</span>}
              </span>
              <div className="absolute inset-0 bg-accent-indigo-mid transform translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </div>
        </SoftCard>

        {/* Results */}
        <div className="lg:col-span-2 flex flex-col">
          {result ? (
            <SoftCard className="flex-1 bg-surface shadow-lg border-border-strong p-10 overflow-y-auto">
              <div className="mb-8 pb-6 border-b border-border-light">
                <h3 className="font-display text-3xl text-text-primary mb-2">Simulation Result</h3>
                <p className="text-sm text-text-secondary mb-3">Portfolio: <span className="font-bold text-text-primary">{selectedPortfolioName}</span> · {portfolioHoldings.length} holdings analyzed</p>
                <div className="bg-accent-indigo-light/10 border border-accent-indigo/20 rounded-xl p-4 inline-block">
                  <p className="font-mono text-sm text-accent-indigo font-medium">
                    {PRESET_SCENARIOS.find(s => s.name === selectedScenario)?.story || 'Shock event triggers market repricing'}
                  </p>
                </div>
                {result.historical_precedent && (
                  <p className="text-xs text-text-dim mt-3 italic">📜 {result.historical_precedent}</p>
                )}
              </div>

              {/* Impact Banner */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-surface border border-accent-rose/30 p-5 rounded-xl text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2">📉 Worst Case</span>
                  <span className="text-2xl font-mono font-black text-accent-rose">
                    {(result.total_impact_pct * 1.5).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-text-dim block mt-1">${(result.current_portfolio_value * (1 + result.total_impact_pct * 1.5 / 100)).toFixed(0)}</span>
                </div>
                <div className="bg-surface border border-accent-indigo/30 p-5 rounded-xl text-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-accent-indigo" />
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2">📊 Expected</span>
                  <span className={`text-3xl font-mono font-black ${result.total_impact_pct < 0 ? 'text-accent-rose' : 'text-accent-sage'}`}>
                    {result.total_impact_pct > 0 ? '+' : ''}{result.total_impact_pct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-text-dim block mt-1">${result.scenario_portfolio_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-surface border border-accent-sage/30 p-5 rounded-xl text-center shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest block mb-2">📈 Best Case</span>
                  <span className="text-2xl font-mono font-black text-accent-sage">
                    {(result.total_impact_pct * 0.5 > 0 ? '+' : '')}{(result.total_impact_pct * 0.5).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-text-dim block mt-1">${(result.current_portfolio_value * (1 + result.total_impact_pct * 0.5 / 100)).toFixed(0)}</span>
                </div>
              </div>

              {/* Trajectory */}
              <div className="mb-10 bg-root border border-border-light rounded-2xl py-6 px-4 shadow-inner">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-6 px-4">Projected Trajectory (6 Months)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { month: 'Now', value: result.current_portfolio_value },
                      { month: 'M1', value: result.current_portfolio_value + (result.scenario_portfolio_value - result.current_portfolio_value) * 0.2 },
                      { month: 'M2', value: result.current_portfolio_value + (result.scenario_portfolio_value - result.current_portfolio_value) * 0.5 },
                      { month: 'M3', value: result.current_portfolio_value + (result.scenario_portfolio_value - result.current_portfolio_value) * 0.8 },
                      { month: 'M4', value: result.scenario_portfolio_value * 1.02 },
                      { month: 'M5', value: result.scenario_portfolio_value * 0.99 },
                      { month: 'M6', value: result.scenario_portfolio_value },
                    ]}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-dim)' }} dy={10} />
                      <YAxis
                        domain={['dataMin - 1000', 'dataMax + 1000']}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12, fill: 'var(--text-dim)' }}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: '8px' }}
                        formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Portfolio Value']}
                      />
                      <Area type="monotone" dataKey="value" stroke={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Key Drivers */}
                <div className="bg-root/50 border border-border-light rounded-xl p-6">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-text-primary mb-4 flex items-center gap-2">
                    <span className="text-yellow-500">⚠️</span> Key Drivers
                  </h4>
                  <ul className="space-y-3 font-mono text-sm">
                    {(PRESET_SCENARIOS.find(s => s.name === selectedScenario)?.drivers || []).map((driver, i) => (
                      <li key={i} className="flex items-center gap-3 text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo shrink-0" />
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stock Impacts */}
                {result.stock_impacts.length > 0 && (
                  <div className="bg-root/50 border border-border-light rounded-xl p-6 overflow-y-auto max-h-[200px]">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-text-primary mb-4">Position-Level Impacts</h4>
                    <div className="space-y-3">
                      {result.stock_impacts.sort((a, b) => a.change_pct - b.change_pct).map(si => (
                        <div key={si.ticker} className="flex items-center justify-between border-b border-border-light/50 last:border-0 pb-2 last:pb-0">
                          <div>
                            <span className="font-bold text-text-primary font-mono">{si.ticker}</span>
                            <p className="text-[10px] text-text-dim">{si.impact_driver}</p>
                          </div>
                          <span className={`font-mono font-bold text-sm ${si.change_pct < 0 ? 'text-accent-rose' : 'text-accent-sage'}`}>
                            {si.change_pct >= 0 ? '+' : ''}{si.change_pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {result.hedging_suggestions.length > 0 && (
                <div className="bg-accent-indigo-light/20 border border-accent-indigo/20 rounded-xl p-6">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-accent-indigo mb-3">💡 Hedging Suggestions</h4>
                  <ul className="space-y-2 text-sm text-text-body">
                    {result.hedging_suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-accent-indigo mt-0.5 shrink-0">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SoftCard>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-surface/50 border border-border-strong rounded-[2rem] shadow-inner text-center relative overflow-hidden min-h-[600px]">
              <div className="absolute right-[-10%] bottom-[-10%] opacity-10 blur-3xl w-96 h-96 bg-accent-indigo rounded-full pointer-events-none mix-blend-multiply" />
              <div className="w-24 h-24 mb-8 rounded-[2rem] bg-root border-[4px] border-surface flex items-center justify-center shadow-md">
                <span className="text-4xl opacity-80 drop-shadow-md pb-1">⚡️</span>
              </div>
              <h2 className="font-display text-4xl text-text-primary mb-6 drop-shadow-sm leading-tight">Scenario Intelligence</h2>
              <p className="text-text-secondary max-w-lg mb-12 leading-relaxed font-sans text-base">
                Select a scenario from the left panel to run a stress test on your <span className="font-bold text-text-primary">{selectedPortfolioName}</span> portfolio.
                {portfolioHoldings.length > 0 && (
                  <span className="block mt-2 text-accent-sage font-semibold">✓ {portfolioHoldings.length} holdings ready for analysis</span>
                )}
              </p>
              <div className="w-full max-w-2xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {PRESET_SCENARIOS.map(s => (
                    <SoftCard
                      key={s.name}
                      className={`p-5 bg-surface cursor-pointer border ${selectedScenario === s.name ? 'border-accent-indigo shadow-lg ring-2 ring-accent-indigo/20' : 'border-border-light shadow-xs hover:border-accent-indigo/50'} text-center transition-all flex flex-col items-center justify-center group`}
                      onClick={() => setSelectedScenario(s.name)}
                    >
                      <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{s.icon}</span>
                      <span className="text-sm font-bold text-text-primary font-sans leading-snug">{s.label}</span>
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
