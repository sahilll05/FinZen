"use client";

import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export function AreaChart({ data, label = 'Value' }: { data: any[]; label?: string }) {
  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value || 0)) : 0;
  const isCurrency = maxVal > 1000;

  const yFormatter = (val: number) => isCurrency ? `$${(val / 1000).toFixed(1)}k` : `${val}`;
  const tooltipFormatter = (value: number) => isCurrency
    ? [formatCurrency(value), label]
    : [value, label];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
        <XAxis 
          dataKey="date" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-plex-mono)' }} 
          dy={10} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tickFormatter={yFormatter} 
          tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-plex-mono)' }}
          width={50}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-jakarta)' }}
          formatter={tooltipFormatter}
        />
        <Area type="monotone" dataKey="value" stroke="var(--accent-indigo)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
