"use client";

import { useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';

export function OverviewTab({ portfolio, holdings }: { portfolio: any, holdings: any[] }) {
  const [timeframe, setTimeframe] = useState('1M');

  // Dummy data for the mini-chart showing Portfolio Growth
  const data = Array.from({ length: 30 }).map((_, i) => ({
    name: `Day ${i + 1}`,
    value: portfolio.total_invested + (Math.random() * 5000 - 2000) + (i * 200)
  }));

  const value = portfolio.current_value || portfolio.total_invested || 0;
  const returnAbs = portfolio.total_gain_loss || 0;
  const returnPct = portfolio.total_gain_loss_pct || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SoftCard className="p-6 flex flex-col justify-center">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-2">Net Asset Value</span>
          <AnimatedNumber value={value} prefix="$" decimals={2} className="font-mono text-3xl leading-none font-bold text-text-primary drop-shadow-sm block" />
        </SoftCard>
        
        <SoftCard className="p-6 flex flex-col justify-center">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-2">Total Invested</span>
          <AnimatedNumber value={portfolio.total_invested || 0} prefix="$" decimals={2} className="font-mono text-3xl leading-none font-bold text-text-primary drop-shadow-sm block" />
        </SoftCard>

        <SoftCard className="p-6 flex flex-col justify-center">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-2">Total Return</span>
          <AnimatedNumber value={Math.abs(returnAbs)} prefix={returnAbs >= 0 ? "+$" : "-$"} decimals={2} className={`font-mono text-3xl leading-none font-bold drop-shadow-sm block ${returnAbs >= 0 ? 'text-accent-sage' : 'text-accent-rose'}`} />
        </SoftCard>

        <SoftCard className="p-6 flex flex-col justify-center flex-row justify-between items-end">
          <div>
            <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-2">Return %</span>
            <AnimatedNumber value={Math.abs(returnPct)} prefix={returnPct >= 0 ? "+" : "-"} suffix="%" decimals={2} className={`font-mono text-3xl leading-none font-bold drop-shadow-sm block ${returnPct >= 0 ? 'text-accent-sage' : 'text-accent-rose'}`} />
          </div>
          <div className="text-right">
             <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-1">Active</span>
             <span className="font-mono text-2xl font-bold text-text-primary">{holdings.length}</span>
          </div>
        </SoftCard>
      </div>

      <SoftCard className="p-6 bg-surface shadow-md border-border-strong">
        <div className="flex justify-between items-center mb-6 border-b border-border-light pb-4">
          <h3 className="font-sans text-lg font-bold text-text-primary flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-indigo animate-pulse"/>
            Portfolio Growth Over Time
          </h3>
          <div className="flex bg-elevated rounded-lg p-1 border border-border-base">
            {['1D', '1W', '1M', '1Y', 'ALL'].map(t => (
              <button 
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeframe === t ? 'bg-surface text-accent-indigo shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} dx={-10} domain={['dataMin - 1000', 'dataMax + 1000']} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                itemStyle={{ color: 'var(--accent-indigo)', fontWeight: 'bold' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
              />
              <Area type="monotone" dataKey="value" stroke="var(--accent-indigo)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SoftCard>
    </div>
  );
}
