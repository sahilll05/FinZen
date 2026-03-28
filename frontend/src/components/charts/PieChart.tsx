"use client";

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '@/lib/constants';

export function PieChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={85}
          paddingAngle={4}
          dataKey="value"
          animationDuration={1500}
          stroke="var(--bg-surface)"
          strokeWidth={3}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-jakarta)' }}
          itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          formatter={(value: number, name: string) => [`${value}%`, name]}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
