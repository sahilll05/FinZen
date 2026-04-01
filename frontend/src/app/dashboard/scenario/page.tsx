"use client";

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SoftCard } from '@/components/shared/SoftCard';
import { Button } from '@/components/ui/button';
import { scenarioAPI } from '@/lib/api';
import { portfolioService } from '@/services/portfolioService';
import { useAuthStore } from '@/store/authStore';
import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ComposedChart } from 'recharts';
import CausalFlow, { FlowData } from './CausalFlow';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, TrendingDown, Zap, Activity, Globe, RefreshCcw, Play, Pause, ChevronRight, Network, Info } from 'lucide-react';

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
  beta?: number;
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
  confidence_score?: number;
  causal_chain?: any;
  geo_risk?: any;
  impact_narrative?: string;
}

const PRESET_SCENARIOS = [
  { id: 'oil_shock', label: 'Global Oil Shock', icon: '🛢️', color: 'rose', defaults: { oil: 50, inf: 8, rate: 100, curr: 5 } },
  { id: 'recession', label: 'Global Recession', icon: '📉', color: 'amber', defaults: { oil: -20, inf: 2, rate: -50, curr: -10 } },
  { id: 'war', label: 'Taiwan Conflict', icon: '⚔️', color: 'red', defaults: { oil: 30, inf: 12, rate: 200, curr: 15 } },
  { id: 'tech_crash', label: 'Tech Bubble Burst', icon: '💥', color: 'indigo', defaults: { oil: 0, inf: 5, rate: 150, curr: 0 } },
  { id: 'custom', label: 'Custom Sandbox', icon: '🛠️', color: 'emerald', defaults: { oil: 0, inf: 0, rate: 0, curr: 0 } },
];

/** Stable hash from a string — avoids Math.random() re-renders */
function stableId(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).padStart(6, '0').slice(0, 6);
}

export default function ScenarioSimulatorPage() {
  const { user } = useAuthStore();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [selectedPortfolioName, setSelectedPortfolioName] = useState('');
  const [portfolioHoldings, setPortfolioHoldings] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_SCENARIOS[0].id);

  // Custom Sliders
  const [oilPrice, setOilPrice] = useState(50);
  const [inflation, setInflation] = useState(8);
  const [interestRate, setInterestRate] = useState(100);
  const [currencyShock, setCurrencyShock] = useState(5);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true);

  // Simulation Player
  const [simStep, setSimStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showCausalChain, setShowCausalChain] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Client-side matching for portals
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Causal chain sidebar - default open with scenario context
  const sidebarNode = selectedNode;

  // Build connected node list for selected node
  const connectedNodes = useMemo(() => {
    if (!selectedNode || !result?.causal_chain?.chain) return [];
    const label = selectedNode.data?.label;
    return result.causal_chain.chain.filter(
      (link: any) => link.from_node === label || link.to_node === label
    );
  }, [selectedNode, result]);

  // Conversion for React Flow
  const flowData = useMemo<FlowData>(() => {
    if (!result?.causal_chain) return { nodes: [], edges: [] };

    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeSet = new Set<string>();

    const addNode = (id: string, label: string, isRoot = false, depth = 0) => {
      if (nodeSet.has(id)) return;
      nodeSet.add(id);
      nodes.push({
        id,
        data: { label, isRoot },
        position: { x: 0, y: depth * 90 },
        type: 'causal',
      });
    };

    const chain = result.causal_chain;
    addNode(chain.event, chain.event, true, 0);

    const depthMap: Record<string, number> = { [chain.event]: 0 };

    chain.chain.forEach((link: any, idx: number) => {
      const fromDepth = depthMap[link.from_node] || 0;
      const toDepth = fromDepth + 1;
      depthMap[link.to_node] = toDepth;

      addNode(link.to_node, link.to_node, false, toDepth);
      edges.push({
        id: `e-${idx}`,
        source: link.from_node,
        target: link.to_node,
        animated: true,
        label: link.relationship?.toLowerCase() ?? '',
        style: { stroke: 'var(--accent-indigo)', strokeWidth: 2 },
        type: 'pulse',
      });
    });

    return { nodes, edges };
  }, [result]);

  // Load portfolios
  useEffect(() => {
    if (!user) return;
    portfolioService.listPortfolios(user.id)
      .then((res: any) => {
        const pList = res.data as unknown as Portfolio[];
        setPortfolios(pList);
        if (pList.length > 0) {
          setSelectedPortfolioId(pList[0].$id);
          setSelectedPortfolioName(pList[0].name);
          loadHoldings(pList[0].$id);
        }
      })
      .finally(() => setIsLoadingPortfolios(false));
  }, [user]);

  const loadHoldings = async (portfolioId: string) => {
    try {
      const res: any = await portfolioService.getHoldings(portfolioId);
      setPortfolioHoldings(res.data as any[]);
    } catch {
      setPortfolioHoldings([]);
    }
  };

  /** When portfolio selection changes: clear old result so scores don't bleed across portfolios */
  const handlePortfolioChange = (portfolioId: string) => {
    const p = portfolios.find(p => p.$id === portfolioId);
    setSelectedPortfolioId(portfolioId);
    setSelectedPortfolioName(p?.name ?? '');
    setResult(null);
    setOptimizationResult(null);
    setSimStep(0);
    setIsAutoPlaying(false);
    loadHoldings(portfolioId);
  };

  const handleSimulate = async () => {
    if (!selectedPortfolioId) { setError('Select a portfolio first.'); return; }
    setIsRunning(true);
    setError('');
    setResult(null);
    setSimStep(0);
    setIsAutoPlaying(false);
    setShowOptimizer(false);

    try {
      const res = await scenarioAPI.simulateDirect({
        holdings: portfolioHoldings.map(h => ({
          ticker: h.ticker,
          quantity: h.quantity,
          avg_cost: h.avg_cost,
          sector: h.sector || 'Unknown',
          country: h.country || 'US',
          portfolio_id: selectedPortfolioId,
          market_value: h.quantity * (h.current_price || h.avg_cost)
        })),
        scenarios: [{
          name: selectedPreset === 'custom' ? 'custom' : selectedPreset,
          params: {
            oil_price_pct: oilPrice,
            inflation_pct: inflation,
            interest_rate_change: interestRate,
            currency_shock_pct: currencyShock
          }
        }],
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleOptimize = async () => {
    if (!portfolioHoldings.length) return;
    setIsOptimizing(true);
    try {
      const res = await scenarioAPI.optimizeDirect({
        holdings: portfolioHoldings.map(h => ({
          ticker: h.ticker,
          quantity: h.quantity,
          avg_cost: h.avg_cost,
        })),
        constraints: { max_position_pct: 35 }
      });
      setOptimizationResult(res.data);
      setShowOptimizer(true);
    } catch (err: any) {
      console.error('Optimization failed', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Animation logic
  useEffect(() => {
    let interval: any;
    if (isAutoPlaying && result) {
      interval = setInterval(() => {
        setSimStep(prev => (prev < 6 ? prev + 1 : prev));
        if (simStep >= 6) setIsAutoPlaying(false);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, result, simStep]);

  const chartData = useMemo(() => {
    if (!result) return [];
    const baseline = result.current_portfolio_value;
    const endValue = result.scenario_portfolio_value;
    const diff = endValue - baseline;

    return [
      { step: 0, label: 'T0', val: baseline, low: baseline, high: baseline },
      { step: 1, label: 'T+1M', val: baseline + diff * 0.2, low: baseline + diff * 0.3, high: baseline + diff * 0.1 },
      { step: 2, label: 'T+2M', val: baseline + diff * 0.45, low: baseline + diff * 0.6, high: baseline + diff * 0.3 },
      { step: 3, label: 'T+3M', val: baseline + diff * 0.7, low: baseline + diff * 0.9, high: baseline + diff * 0.5 },
      { step: 4, label: 'T+4M', val: baseline + diff * 0.85, low: baseline + diff * 1.1, high: baseline + diff * 0.65 },
      { step: 5, label: 'T+5M', val: baseline + diff * 0.95, low: baseline + diff * 1.25, high: baseline + diff * 0.75 },
      { step: 6, label: 'T+6M', val: endValue, low: endValue - Math.abs(diff) * 0.3, high: endValue + Math.abs(diff) * 0.1 },
    ];
  }, [result]);

  const activeChartData = chartData.slice(0, simStep + 1);

  const applyPreset = (presetId: string) => {
    const p = PRESET_SCENARIOS.find(s => s.id === presetId);
    if (p) {
      setSelectedPreset(presetId);
      setOilPrice(p.defaults.oil);
      setInflation(p.defaults.inf);
      setInterestRate(p.defaults.rate);
      setCurrencyShock(p.defaults.curr);
    }
  };

  const CustomSlider = ({ label, value, unit, min, max, step, onChange, color }: any) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</label>
        <span className={`font-mono text-sm font-bold text-accent-${color}`}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-1.5 bg-border-light rounded-lg appearance-none cursor-pointer accent-accent-${color}`}
      />
    </div>
  );

  const activePreset = PRESET_SCENARIOS.find(s => s.id === selectedPreset);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between pb-4 border-b border-border-light">
        <div>
          <h1 className="font-display text-4xl text-text-primary">Scenario Simulator</h1>
          <p className="text-sm text-text-secondary mt-1">Hedge against systemic risks with causal intelligence.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-9 text-xs" onClick={() => window.open('/dashboard/geopolitical', '_blank')}>
            <Globe className="w-4 h-4" /> Geo Engine
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* LEFT PANEL: CONFIG */}
        <div className="lg:col-span-1 space-y-6">
          <SoftCard className="p-6 border-border-strong shadow-xl bg-surface relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-indigo-light/5 rounded-full blur-3xl -mr-16 -mt-16" />

            <h3 className="font-display text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent-indigo" /> Configure Shock
            </h3>

            <div className="space-y-6">
              {/* Presets Grid */}
              <div className="grid grid-cols-3 gap-2">
                {PRESET_SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => applyPreset(s.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${selectedPreset === s.id ? 'bg-accent-indigo/5 border-accent-indigo shadow-inner' : 'bg-root border-border-light hover:border-border-strong'}`}
                  >
                    <span className="text-xl mb-1">{s.icon}</span>
                    <span className={`text-[8px] font-bold uppercase truncate w-full text-center ${selectedPreset === s.id ? 'text-accent-indigo' : 'text-text-secondary'}`}>{s.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              <div className="h-px bg-border-light my-4" />

              {/* Granular Sliders */}
              <div className="space-y-5">
                <CustomSlider label="Oil Price Shift" value={oilPrice} unit="%" min={-50} max={100} step={5} onChange={setOilPrice} color="rose" />
                <CustomSlider label="Inflation Δ" value={inflation} unit="%" min={-5} max={20} step={0.1} onChange={setInflation} color="amber" />
                <CustomSlider label="Interest Rate" value={interestRate} unit="bps" min={-200} max={500} step={25} onChange={setInterestRate} color="indigo" />
                <CustomSlider label="Currency Shock" value={currencyShock} unit="%" min={-20} max={20} step={1} onChange={setCurrencyShock} color="emerald" />
              </div>

              {/* Portfolio Selector */}
              <div className="pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-dim mb-2 block">Target Portfolio</label>
                <select
                  value={selectedPortfolioId}
                  onChange={e => handlePortfolioChange(e.target.value)}
                  className="w-full bg-root border border-border-light rounded-lg px-3 py-2 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 ring-accent-indigo/20"
                >
                  {portfolios.map(p => <option key={p.$id} value={p.$id}>{p.name}</option>)}
                </select>
                {portfolioHoldings.length > 0 && (
                  <p className="text-[10px] text-text-dim mt-1.5 font-medium">
                    {portfolioHoldings.length} position{portfolioHoldings.length !== 1 ? 's' : ''} loaded
                  </p>
                )}
              </div>

              <Button
                onClick={handleSimulate}
                disabled={isRunning || !selectedPortfolioId || portfolioHoldings.length === 0}
                className="w-full h-12 rounded-xl bg-accent-indigo hover:bg-accent-indigo-light text-white font-bold shadow-lg shadow-indigo/20 mt-4"
              >
                {isRunning ? <Activity className="w-5 h-5 animate-spin" /> : 'Run Real-Time Simulation'}
              </Button>

              {error && (
                <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
          </SoftCard>

          {/* Confidence Card — only when API returns a real score */}
          {result && result.confidence_score != null && (
            <SoftCard className="p-4 bg-accent-indigo/5 border-accent-indigo/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest">Model Confidence</span>
                <span className="font-mono text-sm font-black text-accent-indigo">{result.confidence_score}%</span>
              </div>
              <div className="w-full h-2 bg-accent-indigo/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${result.confidence_score}%` }} className="h-full bg-accent-indigo" />
              </div>
              <p className="text-[10px] text-text-secondary mt-2 leading-tight">
                Based on historical correlation density and data quality.
              </p>
            </SoftCard>
          )}

          {/* Portfolio tag when result shown */}
          {result && (
            <SoftCard className="p-3 border-border-light bg-root/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Scoring:</span>
                <span className="text-xs font-bold text-text-primary truncate">{selectedPortfolioName}</span>
              </div>
            </SoftCard>
          )}
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-[600px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-border-strong rounded-[2.5rem] bg-surface/50 text-center">
                <div className="w-32 h-32 mb-8 rounded-full bg-accent-indigo/5 flex items-center justify-center text-5xl">🔭</div>
                <h2 className="font-display text-3xl text-text-primary mb-4">Awaiting Simulation…</h2>
                <p className="text-text-secondary max-w-md mb-8">
                  {portfolioHoldings.length === 0 && selectedPortfolioId
                    ? 'The selected portfolio has no holdings. Add positions first.'
                    : 'Select a shock preset or customize parameters to see how your portfolio behaves under extreme market conditions.'}
                </p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-text-dim"><span className="w-2 h-2 rounded-full bg-rose-500" /> Tail Risk Analysis</div>
                  <div className="flex items-center gap-2 text-xs font-medium text-text-dim"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Causal Chains</div>
                  <div className="flex items-center gap-2 text-xs font-medium text-text-dim"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimization</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
                {/* Result Header */}
                <div className="flex flex-wrap gap-4 items-stretch">
                  <SoftCard className="flex-1 p-6 border-l-4 border-rose-500 flex flex-col justify-between min-w-[200px]">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Max Projected Drawdown</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-mono font-black text-rose-500">{result.total_impact_pct.toFixed(1)}%</span>
                      <TrendingDown className="w-6 h-6 text-rose-500" />
                    </div>
                    <p className="text-[10px] text-text-dim mt-2 italic">"{activePreset?.label} scenario — {selectedPortfolioName}"</p>
                  </SoftCard>

                  {result.historical_precedent && (
                    <button
                      onClick={() => window.open('https://www.google.com/search?q=' + encodeURIComponent(result.historical_precedent || ''), '_blank')}
                      className="flex-1 p-6 rounded-2xl bg-surface border border-border-light hover:border-accent-indigo transition-all text-left min-w-[240px] group"
                    >
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Historical Context</span>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent-indigo transition-colors">📜 {result.historical_precedent}</p>
                      <div className="mt-auto flex items-center gap-1 text-[10px] text-accent-indigo font-bold mt-2">
                        View Historical Case <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  )}

                  <SoftCard className="p-6 bg-accent-indigo text-white min-w-[200px] flex flex-col items-center justify-center cursor-pointer hover:bg-accent-indigo-light transition-all shadow-indigo" onClick={handleOptimize}>
                    {isOptimizing ? <Activity className="w-8 h-8 mb-2 animate-spin" /> : <RefreshCcw className="w-8 h-8 mb-2" />}
                    <span className="text-sm font-bold">{isOptimizing ? 'Optimizing…' : 'Optimize Portfolio'}</span>
                    <span className="text-[10px] opacity-80 mt-1">Mitigate Shock Risk</span>
                  </SoftCard>

                  {result.causal_chain && (
                    <SoftCard className="p-6 bg-surface border border-border-light min-w-[200px] flex flex-col items-center justify-center cursor-pointer hover:border-accent-indigo transition-all group" onClick={() => { setShowCausalChain(true); setSelectedNode(null); }}>
                      <Network className="w-8 h-8 mb-2 text-accent-indigo group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-text-primary group-hover:text-accent-indigo">Causal Chain</span>
                      <span className="text-[10px] text-text-dim mt-1 uppercase tracking-widest font-black">Intelligence Trace</span>
                    </SoftCard>
                  )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Main Viz: Chart */}
                  <SoftCard className="xl:col-span-2 p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="font-display text-xl font-bold text-text-primary">Shock Progression (T+6M)</h4>
                        <p className="text-[10px] text-text-secondary">Expected value trajectory with ±confidence bands.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 gap-2 ${isAutoPlaying ? 'bg-accent-rose/5 text-accent-rose' : ''}`}
                          onClick={() => { setIsAutoPlaying(!isAutoPlaying); if (!isAutoPlaying && simStep === 6) setSimStep(0); }}
                        >
                          {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {isAutoPlaying ? 'Pause' : 'Play Sim'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold" onClick={() => setSimStep(6)}>Skip to End</Button>
                      </div>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={activeChartData}>
                          <defs>
                            <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                          <YAxis
                            domain={['dataMin - 500', 'dataMax + 500']}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                          />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: '12px', fontSize: '12px' }} />
                          <Area type="monotone" dataKey="low" stroke="none" fill={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} fillOpacity={0.05} />
                          <Area type="monotone" dataKey="high" stroke="none" fill={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} fillOpacity={0.05} />
                          <Area type="monotone" dataKey="val" stroke={result.total_impact_pct < 0 ? '#F43F5E' : '#10B981'} strokeWidth={3} fill="url(#stepGrad)" animationDuration={1000} />
                          <ReferenceLine y={result.current_portfolio_value} stroke="var(--text-dim)" strokeDasharray="5 5" label={{ value: 'BASELINE', position: 'right', fontSize: 8, fill: 'var(--text-dim)' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </SoftCard>

                  {/* Why it hit */}
                  <SoftCard className="p-6 bg-root/30 border-border-light shadow-2xl backdrop-blur-md">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-accent-rose" /> Why your portfolio is hit
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-surface rounded-xl border border-border-light relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-indigo/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-xs text-text-primary font-bold mb-2">Risk Narrative</p>
                        <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                          {result.impact_narrative || 'Computing causal exposure vectors…'}
                        </p>
                      </div>

                      <div className="mt-4">
                        <span className="text-[10px] font-bold uppercase text-text-dim block mb-3">Top Exposed Positions</span>
                        <div className="space-y-2">
                          {result.stock_impacts.slice(0, 3).map((si: any) => (
                            <div key={si.ticker} className="flex items-center justify-between px-3 py-2 bg-root border border-border-light rounded-lg hover:border-accent-indigo/30 transition-all">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-text-primary">{si.ticker}</span>
                                {si.beta != null && (
                                  <span className="text-[8px] text-text-dim font-mono">β {si.beta.toFixed(2)}</span>
                                )}
                              </div>
                              <span className={`text-[9px] font-bold uppercase ${si.change_pct < -10 ? 'text-rose-500' : si.change_pct < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {si.change_pct < -10 ? 'High Impact' : si.change_pct < 0 ? 'Moderate' : 'Resilient'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hedging suggestions */}
                      {result.hedging_suggestions?.length > 0 && (
                        <div className="mt-4">
                          <span className="text-[10px] font-bold uppercase text-text-dim block mb-2">Hedging Signals</span>
                          <div className="space-y-1.5">
                            {result.hedging_suggestions.slice(0, 3).map((s, i) => (
                              <div key={i} className="flex items-start gap-2 text-[10px] text-text-secondary">
                                <span className="text-accent-indigo mt-0.5 shrink-0">›</span>
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SoftCard>
                </div>

                {/* Position Impacts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary">Position-Level Breakdown</h4>
                    <span className="text-[10px] font-bold text-text-dim">{result.stock_impacts.length} Active Positions · {selectedPortfolioName}</span>
                  </div>
                  <SoftCard className="p-8 bg-surface shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                      {result.stock_impacts.sort((a, b) => a.change_pct - b.change_pct).map(si => (
                        <div key={si.ticker} className="space-y-3 group/item">
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black font-mono text-text-primary px-2 py-0.5 bg-root rounded border border-border-light">{si.ticker}</span>
                                <span className={`text-[8px] font-bold uppercase py-0.5 px-1.5 rounded-full ${si.change_pct < -5 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                  {si.change_pct < -5 ? 'High Risk' : 'Resilient'}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-dim font-medium mt-1.5 line-clamp-1">{si.impact_driver.split(':')[0]}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-base font-mono font-black ${si.change_pct < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {si.change_pct > 0 ? '+' : ''}{si.change_pct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-root rounded-full overflow-hidden flex border border-border-light/50">
                            {si.change_pct < 0 ? (
                              <>
                                <div className="flex-1 flex justify-end">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.abs(si.change_pct) * 4)}%` }} className="h-full bg-gradient-to-l from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
                                </div>
                                <div className="flex-1 opacity-0" />
                              </>
                            ) : (
                              <>
                                <div className="flex-1 opacity-0" />
                                <div className="flex-1">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, si.change_pct * 4)}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SoftCard>
                </div>

                {/* Optimizer Result Overlay */}
                {mounted && typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {showOptimizer && (
                      <motion.div
                        key="optimizer-overlay"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-root/80 backdrop-blur-md"
                      >
                        <SoftCard className="max-w-4xl w-full p-10 shadow-2xl relative overflow-hidden bg-surface border-accent-indigo/30 border-2">
                          <div className="absolute top-0 left-0 w-full h-2 bg-accent-indigo" />
                          <button onClick={() => setShowOptimizer(false)} className="absolute top-6 right-6 text-text-dim hover:text-text-primary text-2xl">×</button>

                          <div className="mb-10 text-center">
                            <h2 className="font-display text-4xl text-text-primary mb-2">Simulated Hedge Strategy</h2>
                            <p className="text-text-secondary">AI-driven allocation shift to neutralize {activePreset?.label} shock.</p>
                          </div>

                          <div className="grid grid-cols-2 gap-12 mb-10">
                            <div>
                              <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest block mb-4">Current Allocation</span>
                              <div className="h-48 flex items-end gap-2 px-4 border-b border-border-strong pb-4">
                                {optimizationResult?.allocations?.slice(0, 6).map((alloc: any) => (
                                  <div key={alloc.ticker} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full bg-border-light rounded-t-lg" style={{ height: `${Math.min(100, (alloc.current_weight || 0) * 1.5)}px` }} />
                                    <span className="text-[10px] font-bold text-text-dim">{alloc.ticker}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-accent-indigo">
                                <ChevronRight className="w-8 h-8" />
                              </div>
                              <span className="text-[10px] font-bold text-accent-indigo uppercase tracking-widest block mb-4">Optimized Strategy</span>
                              <div className="h-48 flex items-end gap-2 px-4 border-b border-accent-indigo/30 pb-4">
                                {optimizationResult?.allocations?.slice(0, 6).map((alloc: any) => (
                                  <div key={alloc.ticker} className="flex-1 flex flex-col items-center gap-2">
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, (alloc.optimized_weight || 0) * 1.5)}px` }} className="w-full bg-accent-indigo rounded-t-lg shadow-indigo-sm" />
                                    <span className="text-[10px] font-bold text-accent-indigo">{alloc.ticker}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="bg-accent-indigo/5 border border-accent-indigo/10 rounded-2xl p-6 mb-8 text-center">
                            <p className="text-sm text-text-primary leading-relaxed font-bold">
                              {optimizationResult?.status === 'optimal'
                                ? `By rebalancing weights, your projected return increases to ${optimizationResult.expected_return}% while maintaining risk controls.`
                                : 'AI-driven rebalance to neutralize systemic shock risks.'}
                            </p>
                          </div>

                          <div className="flex gap-4">
                            <Button className="flex-1 h-14 bg-accent-indigo hover:bg-accent-indigo-light text-white text-lg font-bold">Execute Hedge Rebalance</Button>
                            <Button variant="outline" className="flex-1 h-14" onClick={() => setShowOptimizer(false)}>Save Strategy As Preset</Button>
                          </div>
                        </SoftCard>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}

                {/* ── CAUSAL CHAIN — Full-Screen Immersive Panel (Knowledge Graph style) ── */}
                {mounted && typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {showCausalChain && (
                      <motion.div
                        key="causal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#020617]"
                      >
                        <div className="w-full h-full flex flex-row overflow-hidden">

                          {/* ── LEFT SIDEBAR ── */}
                          <div className="w-[380px] h-full bg-[#0B0E14] border-r border-[#1E293B] flex flex-col z-10 flex-shrink-0">

                            {/* Header */}
                            <div className="p-8 pb-6 border-b border-[#1E293B]">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                  <Network className="w-4 h-4 text-white" />
                                </div>
                                <h1 className="font-display text-2xl text-white tracking-tight">Causal Engine</h1>
                              </div>
                              <p className="font-sans text-xs text-slate-400 mt-1 leading-relaxed">
                                Intelligence Network Trace — {activePreset?.label}
                              </p>

                              {/* Scenario pill + close */}
                              <div className="flex items-center gap-2 mt-4">
                                <span className="text-lg">{activePreset?.icon}</span>
                                <span className="flex-1 text-xs font-bold text-slate-300 truncate">{activePreset?.label}</span>
                                <button
                                  onClick={() => { setShowCausalChain(false); setSelectedNode(null); }}
                                  className="w-8 h-8 rounded-lg border border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 hover:bg-[#1E293B]/40 transition-all text-lg font-light"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            {/* Scrollable detail area */}
                            <div className="flex-1 overflow-y-auto p-8 relative">
                              {sidebarNode ? (
                                <motion.div
                                  key={sidebarNode.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-6"
                                >
                                  {/* Node type badge */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
                                      {sidebarNode.data?.isRoot ? 'Trigger Event' : 'Propagation Node'}
                                    </span>
                                  </div>

                                  {/* Node name */}
                                  <h2 className="font-display text-3xl text-white leading-tight break-words">
                                    {sidebarNode.data?.label}
                                  </h2>

                                  {/* Description */}
                                  <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5">
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                      {sidebarNode.data?.isRoot
                                        ? `This is the root trigger event for the ${activePreset?.label} scenario. It initiates a chain of systemic propagation effects that cascade through correlated macro variables.`
                                        : `This node represents a downstream propagation of "${result?.causal_chain?.event}". It captures sector and regional exposure vectors affected by the trigger.`}
                                    </p>
                                  </div>

                                  {/* Real metadata */}
                                  <div className="bg-[#0F172A]/60 border border-[#1E293B] rounded-2xl p-5">
                                    <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Node Metadata</h3>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-mono">Type</span>
                                        <span className="text-white font-mono font-bold">{sidebarNode.data?.isRoot ? 'Root Trigger' : 'Systemic Link'}</span>
                                      </div>
                                      {result?.confidence_score != null && (
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-slate-400 font-mono">Model Confidence</span>
                                          <span className="text-indigo-400 font-mono font-bold">{result.confidence_score}%</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-mono">Scenario</span>
                                        <span className="text-slate-300 font-mono font-bold truncate max-w-[140px]">{activePreset?.label}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs pt-3 border-t border-[#1E293B]">
                                        <span className="text-slate-500 font-mono italic">Node ID</span>
                                        <span className="text-slate-500 font-mono text-[8px] uppercase">{stableId(sidebarNode.data?.label ?? '')}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Connected edges (real data) */}
                                  {connectedNodes.length > 0 && (
                                    <div>
                                      <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                                        <Network className="w-3 h-3" /> Causal Links ({connectedNodes.length})
                                      </h3>
                                      <div className="space-y-2">
                                        {connectedNodes.map((link: any, i: number) => {
                                          const isFrom = link.from_node === sidebarNode.data?.label;
                                          const other = isFrom ? link.to_node : link.from_node;
                                          return (
                                            <button
                                              key={i}
                                              onClick={() => {
                                                const targetNode = flowData.nodes.find(n => n.data.label === other);
                                                if (targetNode) setSelectedNode(targetNode);
                                              }}
                                              className="w-full flex items-center gap-3 px-3 py-2 bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-slate-500 rounded-xl transition-all text-left group"
                                            >
                                              <span className="text-[10px] text-indigo-400 font-mono uppercase">{isFrom ? '→' : '←'}</span>
                                              <div className="flex-1 min-w-0">
                                                <span className="text-xs font-mono text-slate-300 group-hover:text-white truncate block">{other}</span>
                                                <span className="text-[9px] text-slate-500 font-mono">{link.relationship?.toLowerCase()}</span>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              ) : (
                                /* Default idle state — no node selected */
                                <div className="h-full flex flex-col">
                                  {/* Chain summary */}
                                  {result?.causal_chain && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                        <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Chain Overview</span>
                                      </div>
                                      <h2 className="font-display text-3xl text-white leading-tight">
                                        {result.causal_chain.event}
                                      </h2>
                                      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5">
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                          Systemic propagation trace identifying macro-level exposure vectors. {result.causal_chain.chain?.length ?? 0} causal links detected across correlated variables.
                                        </p>
                                      </div>

                                      {/* Chain summary list */}
                                      <div className="bg-[#0F172A]/60 border border-[#1E293B] rounded-2xl p-5">
                                        <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Propagation Chain ({result.causal_chain.chain?.length ?? 0} links)</h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                          {result.causal_chain.chain?.map((link: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px]">
                                              <span className="text-slate-600 font-mono w-4 text-right shrink-0">{i + 1}</span>
                                              <span className="text-indigo-400 font-mono">→</span>
                                              <span className="text-slate-300 font-mono truncate">{link.to_node}</span>
                                              <span className="text-slate-600 font-mono italic shrink-0 ml-auto">{link.relationship?.toLowerCase()}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {result.confidence_score != null && (
                                        <div className="bg-[#0F172A]/60 border border-[#1E293B] rounded-2xl p-5">
                                          <div className="flex justify-between items-center text-xs mb-2">
                                            <span className="text-slate-400 font-mono">Model Confidence</span>
                                            <span className="text-indigo-400 font-mono font-bold">{result.confidence_score}%</span>
                                          </div>
                                          <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${result.confidence_score}%` }} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-auto pt-8">
                                    <div className="flex items-center gap-2 opacity-40">
                                      <div className="w-8 h-8 rounded-full border border-indigo-500/30 flex items-center justify-center animate-pulse">
                                        <Zap className="w-4 h-4 text-indigo-500" />
                                      </div>
                                      <p className="text-xs text-slate-400">Click any node in the graph to reveal its causal propagation path.</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── RIGHT: GRAPH CANVAS ── */}
                          <div className="flex-1 relative bg-[#020617] overflow-hidden">
                            {/* Subtle grid background */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-10"
                              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                            />

                            <CausalFlow
                              nodes={flowData.nodes}
                              edges={flowData.edges}
                              onNodeClick={(_: any, node: any) => setSelectedNode(node)}
                            />

                            {/* Top-right status badge */}
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-indigo-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2 pointer-events-none">
                              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                              <span className="text-[11px] font-mono text-white/60 uppercase tracking-widest">
                                {flowData.nodes.length} nodes · {flowData.edges.length} links
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom footer legend */}
                        <div className="absolute bottom-0 left-0 right-0 px-8 py-4 bg-indigo-500/5 border-t border-indigo-500/10 flex items-center justify-center gap-8 pointer-events-none">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Root Trigger</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-slate-600" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Systemic Node</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                            <div className="w-10 h-0.5 bg-indigo-500/40" />
                            Impact Propagation
                          </div>
                          <span className="text-[9px] text-indigo-400/60 font-black italic ml-4">CAUSAL ENGINE v4</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
