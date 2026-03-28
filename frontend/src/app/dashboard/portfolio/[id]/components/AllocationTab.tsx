"use client";

import { SoftCard } from '@/components/shared/SoftCard';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export function AllocationTab({ holdings }: { holdings: any[] }) {

  // Dummy Sector Data (In real app, group holdings by sector and sum market_value)
  const sectorData = [
    { name: 'Technology', value: 400 },
    { name: 'Financials', value: 300 },
    { name: 'Energy', value: 150 },
    { name: 'Healthcare', value: 100 },
    { name: 'Consumer', value: 50 },
  ];

  const geoData = [
    { country: 'United States', percentage: 65, risk: 'Low' },
    { country: 'China', percentage: 15, risk: 'Moderate' },
    { country: 'India', percentage: 10, risk: 'Low' },
    { country: 'Brazil', percentage: 5, risk: 'High' },
    { country: 'Germany', percentage: 5, risk: 'Low' },
  ];

  const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sector Allocation */}
        <SoftCard className="p-6 bg-surface flex flex-col items-center">
          <h3 className="font-sans text-lg font-bold text-text-primary self-start mb-6">Sector Allocation</h3>
          <div className="h-[300px] w-full max-w-sm">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="45%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value) => [`$${value}`, 'Exposure']}
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SoftCard>

        {/* Geographic Allocation & Asset Allocation */}
        <div className="space-y-6 flex flex-col">
          <SoftCard className="p-6 bg-surface flex-1">
            <h3 className="font-sans text-lg font-bold text-text-primary mb-6">Geographic Allocation</h3>
            <div className="space-y-4">
              {geoData.map((geo, i) => (
                <div key={geo.country} className="flex flex-col">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-sm text-text-primary">{geo.country}</span>
                      {geo.risk === 'High' && <span className="text-[9px] bg-accent-rose/10 text-accent-rose px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-accent-rose/30">High Risk</span>}
                      {geo.risk === 'Moderate' && <span className="text-[9px] bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-accent-amber/30">Mod Risk</span>}
                    </div>
                    <span className="font-mono text-sm font-bold text-accent-indigo">{geo.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border-light">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${geo.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </SoftCard>

          <SoftCard className="p-6 bg-surface">
             <h3 className="font-sans text-lg font-bold text-text-primary mb-4">Asset Class Distribution</h3>
             <div className="flex h-6 rounded-lg overflow-hidden border border-border-light shadow-inner">
               <div className="bg-accent-indigo flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: '80%' }}>Equities 80%</div>
               <div className="bg-accent-teal flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: '10%' }}>Cash 10%</div>
               <div className="bg-accent-amber flex items-center justify-center text-[10px] font-bold text-white transition-all" style={{ width: '10%' }}>Crypto 10%</div>
             </div>
          </SoftCard>
        </div>

      </div>
    </div>
  );
}
