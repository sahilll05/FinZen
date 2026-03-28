"use client";

import { useEffect, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { portfolioAPI } from '@/lib/api';

interface XRayData {
  concentration_risk: any;
  supply_chain_risk: any;
  revenue_geography: any;
  correlation_clusters: any;
  hidden_risks: string[];
  factor_exposures?: any;
}

interface Portfolio {
  id: string;
  name: string;
}

export default function XRayPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [xrayData, setXrayData] = useState<XRayData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    portfolioAPI.list()
      .then(res => {
        const data: Portfolio[] = res.data;
        setPortfolios(data);
        if (data.length > 0) {
          setSelectedPortfolio(data[0].id);
          loadXRay(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadXRay = async (portfolioId: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await portfolioAPI.xray(portfolioId);
      setXrayData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load X-Ray. Ensure portfolio has holdings.');
      setXrayData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioChange = (id: string) => {
    setSelectedPortfolio(id);
    loadXRay(id);
  };

  const selectedName = portfolios.find(p => p.id === selectedPortfolio)?.name || 'Select Portfolio';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full h-full flex flex-col font-sans">
      <div className="flex items-center justify-between pb-6 border-b border-border-light flex-shrink-0">
        <div>
          <h1 className="font-display text-4xl text-text-primary mb-2">Portfolio X-Ray</h1>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">Decompose hidden risk factors, style drift, and macro sensitivities.</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-2">Active Analysis Context</span>
          <select
            value={selectedPortfolio}
            onChange={e => handlePortfolioChange(e.target.value)}
            className="font-mono font-bold text-text-primary bg-surface px-4 py-1.5 border-2 border-border-strong rounded-lg shadow-sm"
          >
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="min-h-[480px] bg-surface animate-pulse rounded-2xl border border-border-light" />
          <div className="min-h-[480px] bg-surface animate-pulse rounded-2xl border border-border-light" />
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-lg text-accent-rose mb-2">{error}</p>
          <p className="text-sm text-text-secondary">Upload holdings to your portfolio to enable X-Ray analysis.</p>
        </div>
      ) : xrayData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Factor Decomposition */}
          <SoftCard className="min-h-[480px] flex flex-col p-10 bg-surface border-border-strong shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-indigo-light/20 blur-[80px] rounded-full mix-blend-multiply pointer-events-none" />
            <h3 className="font-display text-3xl font-semibold text-text-primary mb-4 drop-shadow-sm leading-tight border-b border-border-light pb-4 w-full">
              Deep Factor Decomposition
            </h3>
            <p className="text-text-secondary max-w-sm mb-8 leading-relaxed font-sans text-sm">
              Quantitative engine analysis across risk factors.
            </p>

            {/* Concentration Risk */}
            {xrayData.concentration_risk && (
              <div className="w-full space-y-6 px-4 relative z-10">
                <div className="bg-root p-4 rounded-xl shadow-inner border border-border-light">
                  <div className="flex justify-between items-center text-sm font-bold mb-3 font-sans">
                    <span className="tracking-wide">Top Concentration</span>
                    <span className="font-mono text-accent-rose text-base">
                      {xrayData.concentration_risk.top_holding_pct?.toFixed(0) || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-elevated rounded-full overflow-hidden shadow-inner">
                    <div className="h-full rounded-full bg-accent-rose" style={{ width: `${xrayData.concentration_risk.top_holding_pct || 0}%` }} />
                  </div>
                  {xrayData.concentration_risk.top_holding && (
                    <p className="text-xs text-text-secondary mt-2">Largest: {xrayData.concentration_risk.top_holding}</p>
                  )}
                </div>

                <div className="bg-root p-4 rounded-xl shadow-inner border border-border-light">
                  <div className="flex justify-between items-center text-sm font-bold mb-3 font-sans">
                    <span className="tracking-wide">Sector Concentration (HHI)</span>
                    <span className="font-mono text-accent-indigo text-base">
                      {xrayData.concentration_risk.herfindahl_index?.toFixed(3) || 'N/A'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-elevated rounded-full overflow-hidden shadow-inner">
                    <div className="h-full rounded-full bg-accent-indigo" style={{ width: `${Math.min((xrayData.concentration_risk.herfindahl_index || 0) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Hidden Risks */}
                {xrayData.hidden_risks && xrayData.hidden_risks.length > 0 && (
                  <div className="bg-accent-amber-light/30 border border-accent-amber/20 rounded-xl p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-accent-amber mb-3">⚠️ Hidden Risks Found</h4>
                    <ul className="space-y-2 text-sm text-text-body">
                      {xrayData.hidden_risks.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-accent-amber mt-0.5">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </SoftCard>

          {/* Revenue Geography */}
          <SoftCard className="min-h-[480px] flex flex-col bg-surface shadow-lg border-border-strong p-10 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4 font-display text-3xl text-text-primary font-semibold drop-shadow-sm w-full">
              <span className="text-4xl">🌍</span> Look-Through Exposure
            </div>
            <p className="text-sm font-sans text-text-secondary mb-10 border-b border-border-light pb-6 leading-relaxed">
              Entity revenue geographic sourcing parsed beyond mere corporate domicile status.
            </p>

            <div className="space-y-5 flex-1 overflow-y-auto pr-4 font-sans">
              {xrayData.revenue_geography && Object.entries(xrayData.revenue_geography).length > 0 ? (
                Object.entries(xrayData.revenue_geography).map(([region, pct]: [string, any]) => {
                  const FLAGS: Record<string, string> = { US: '🇺🇸', CN: '🇨🇳', EU: '🇪🇺', JP: '🇯🇵', GB: '🇬🇧', IN: '🇮🇳' };
                  const isHighRisk = typeof pct === 'number' && pct > 30 && ['CN', 'RU'].includes(region);
                  return (
                    <div key={region} className={`bg-root p-6 rounded-2xl border shadow-inner flex flex-col justify-center transition-all group relative overflow-hidden ${isHighRisk ? 'border-accent-rose/30 hover:border-accent-rose' : 'border-border-light hover:border-border-strong'}`}>
                      {isHighRisk && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent-rose" />}
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-5">
                          <span className="text-4xl drop-shadow-md group-hover:scale-110 transition-transform">
                            {FLAGS[region] || '🌐'}
                          </span>
                          <div>
                            <span className="font-bold text-text-primary block text-lg mb-1 tracking-tight">{region}</span>
                            {isHighRisk && (
                              <span className="bg-accent-rose-light text-accent-rose text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-accent-rose/30 uppercase tracking-widest">
                                Elevated Risk
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`font-mono font-black text-3xl py-2 px-4 rounded-xl border-2 shadow-md tracking-tighter ${
                          isHighRisk ? 'text-accent-rose border-accent-rose/40 bg-surface' : 'text-text-primary border-border-strong bg-surface'
                        }`}>
                          {typeof pct === 'number' ? `${pct.toFixed(0)}%` : pct}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : xrayData.supply_chain_risk ? (
                /* Show supply chain data if no revenue geography */
                <div className="bg-root p-6 rounded-2xl border border-border-light shadow-inner">
                  <h4 className="font-bold text-text-primary text-lg mb-4">Supply Chain Exposure</h4>
                  <pre className="text-xs text-text-secondary overflow-x-auto">
                    {JSON.stringify(xrayData.supply_chain_risk, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  <p>No look-through data available.</p>
                </div>
              )}
            </div>
          </SoftCard>
        </div>
      ) : (
        <div className="text-center py-24 text-text-secondary">
          <p className="text-xl mb-2 font-display">No portfolio selected.</p>
          <p className="text-sm">Create and populate a portfolio to run X-Ray analysis.</p>
        </div>
      )}
    </div>
  );
}
