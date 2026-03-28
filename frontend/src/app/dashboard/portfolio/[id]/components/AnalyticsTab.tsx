"use client";

import { SoftCard } from '@/components/shared/SoftCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';

export function AnalyticsTab({ portfolio }: { portfolio: any }) {

  // Dummy Historical Performance Data comparing Portfolio vs Benchmark (S&P 500)
  const historicalData = Array.from({ length: 12 }).map((_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    portfolio: 10000 + (Math.random() * 5000 + (i * 1000)),
    benchmark: 10000 + (Math.random() * 3000 + (i * 800))
  }));

  // Dummy Drawdown Data (showing worst drops)
  const drawdownData = Array.from({ length: 12 }).map((_, i) => ({
    month: historicalData[i].month,
    drawdown: -(Math.random() * 15)
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Returns Breakdown KPIs */}
      <h3 className="font-display text-2xl text-text-primary mb-4 border-b border-border-light pb-2">Returns Breakdown</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SoftCard className="p-5 flex flex-col justify-center bg-surface border-l-4 border-l-accent-indigo">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-1">Absolute Return</span>
          <span className="font-mono text-2xl font-bold text-accent-sage">+18.4%</span>
          <span className="text-xs text-text-dim mt-2 tracking-wide font-sans">Total since inception</span>
        </SoftCard>
        
        <SoftCard className="p-5 flex flex-col justify-center bg-surface border-l-4 border-l-accent-teal">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-1">Annualized Return</span>
          <span className="font-mono text-2xl font-bold text-text-primary">12.2%</span>
          <span className="text-xs text-text-dim mt-2 tracking-wide font-sans">Compounded yearly</span>
        </SoftCard>

        <SoftCard className="p-5 flex flex-col justify-center bg-surface border-l-4 border-l-accent-amber">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-1">Portfolio Volatility</span>
          <span className="font-mono text-2xl font-bold text-accent-amber">14.1%</span>
          <span className="text-xs text-text-dim mt-2 tracking-wide font-sans">Standard Deviation</span>
        </SoftCard>

        <SoftCard className="p-5 flex flex-col justify-center bg-surface border-l-4 border-l-accent-sage">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest block mb-1">Sharpe Ratio</span>
          <span className="font-mono text-2xl font-bold text-accent-sage">1.45</span>
          <span className="text-xs text-text-dim mt-2 tracking-wide font-sans">Risk-adjusted return</span>
        </SoftCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Performance Chart */}
        <SoftCard className="lg:col-span-2 p-6 bg-surface">
          <h3 className="font-sans text-lg font-bold text-text-primary mb-6">Historical Performance vs Benchmark (S&P 500)</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} dx={-10} domain={['dataMin', 'dataMax + 2000']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Line type="basis" name="Your Portfolio" dataKey="portfolio" stroke="var(--accent-indigo)" strokeWidth={3} dot={{ r: 4, fill: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                <Line type="basis" name="S&P 500" dataKey="benchmark" stroke="var(--text-dim)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SoftCard>

        {/* Drawdown Chart */}
        <SoftCard className="lg:col-span-1 p-6 bg-surface border-t-4 border-t-accent-rose">
          <h3 className="font-sans text-lg font-bold text-text-primary mb-6">Drawdown Analysis</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={drawdownData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10, fill: 'var(--accent-rose)' }} dx={-10} />
                <Tooltip 
                  cursor={{ fill: 'var(--border-light)', opacity: 0.3 }}
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drop']}
                />
                <Bar dataKey="drawdown" fill="var(--accent-rose)" radius={[0, 0, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
