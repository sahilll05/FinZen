"use client";

import { useEffect, useMemo, useState } from 'react';
import { SoftCard } from '@/components/shared/SoftCard';
import { AlertCircle, BrainCircuit, ShieldAlert, Sparkles } from 'lucide-react';
import { portfolioAPI } from '@/lib/api';

interface IntelligenceClaim {
  id: string;
  title: string;
  statement: string;
  confidence: string;
  evidence: {
    type: string;
    source: string;
    value: any;
  };
}

interface IntelligenceReport {
  as_of: string;
  engine: string;
  mode: string;
  data_sources: string[];
  quality: {
    confidence: string;
    metadata_coverage_pct: number;
    complete_metadata_positions: number;
    total_positions: number;
    reliability_gate_passed: boolean;
    reliability_threshold_pct: number;
  };
  summary: {
    top_sector: string;
    top_country: string;
  };
  claims: IntelligenceClaim[];
  recommendations: string[];
  audit?: {
    audit_id?: string;
  };
}

function localFallbackReport(holdings: any[]): IntelligenceReport {
  const total = holdings.length;
  const complete = holdings.filter((h) => h.sector && h.country).length;
  const coverage = total > 0 ? (complete / total) * 100 : 0;
  const confidence = coverage >= 80 ? 'HIGH' : coverage >= 60 ? 'MEDIUM' : 'LOW';

  return {
    as_of: new Date().toISOString(),
    engine: 'portfolio_intelligence_local_fallback_v1',
    mode: 'heuristic',
    data_sources: ['holdings_snapshot'],
    quality: {
      confidence,
      metadata_coverage_pct: Number(coverage.toFixed(1)),
      complete_metadata_positions: complete,
      total_positions: total,
      reliability_gate_passed: total > 0 && coverage >= 60,
      reliability_threshold_pct: 60,
    },
    summary: {
      top_sector: 'Unclassified',
      top_country: 'US',
    },
    claims: [
      {
        id: 'fallback_data_quality',
        title: 'Backend Intelligence Unavailable',
        statement: 'Unable to fetch server-side intelligence report. Displaying local safety fallback.',
        confidence: 'LOW',
        evidence: { type: 'system', source: 'frontend_fallback', value: { total_positions: total } },
      },
    ],
    recommendations: [
      'Verify backend connectivity to enable provenance-backed intelligence.',
      'Use Overview and Holdings tabs until server intelligence is available.',
    ],
  };
}

export function IntelligenceTab({ portfolio, holdings }: { portfolio: any, holdings: any[] }) {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const payload = holdings.map((h) => ({
          ticker: h.ticker,
          quantity: h.quantity,
          avg_cost: h.avg_cost,
          sector: h.sector,
          country: h.country,
          company_name: h.company_name,
        }));

        const portfolioId = portfolio?.$id || portfolio?.id || portfolio?.portfolio_id || null;
        const userId = portfolio?.user_id || null;

        const res = await portfolioAPI.intelligenceDirect(payload, {
          portfolio_id: portfolioId,
          user_id: userId,
          surface: 'portfolio_intelligence_tab',
        });
        if (!cancelled) {
          setReport(res.data as IntelligenceReport);
        }
      } catch {
        if (!cancelled) {
          setReport(localFallbackReport(holdings));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [holdings, portfolio]);

  const quality = report?.quality;
  const confidenceLabel = quality?.confidence || 'LOW';
  const coveragePct = quality?.metadata_coverage_pct || 0;
  const reliabilityGatePassed = Boolean(quality?.reliability_gate_passed);
  const modeBadge = reliabilityGatePassed ? 'Heuristic Insight' : 'Insufficient Data';
  const confidenceClass = confidenceLabel === 'HIGH'
    ? 'text-accent-sage border-accent-sage/30 bg-accent-sage-light'
    : confidenceLabel === 'MEDIUM'
      ? 'text-accent-amber border-accent-amber/30 bg-accent-amber-light'
      : 'text-accent-rose border-accent-rose/30 bg-accent-rose-light';

  const asOfTime = useMemo(() => {
    if (!report?.as_of) return new Date().toLocaleTimeString();
    const d = new Date(report.as_of);
    return isNaN(d.getTime()) ? new Date().toLocaleTimeString() : d.toLocaleTimeString();
  }, [report]);

  const topSector = report?.summary?.top_sector || 'Unclassified';
  const topCountry = report?.summary?.top_country || 'US';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* AI Insights Panel — Full Width */}
      <SoftCard className="p-6 bg-surface border-l-4 border-l-accent-indigo">
        <div className="flex items-center gap-3 mb-6">
          <BrainCircuit className="w-6 h-6 text-accent-indigo animate-pulse" />
          <h3 className="font-display text-xl font-bold text-text-primary">FinZen ML Intelligence</h3>
        </div>

        <div className="mb-5 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-elevated px-3 py-2 rounded-md border border-border-strong text-[11px] font-mono text-text-secondary">
            Source: {report?.data_sources?.join(' + ') || 'holdings_snapshot'}
          </div>
          <div className="bg-elevated px-3 py-2 rounded-md border border-border-strong text-[11px] font-mono text-text-secondary">
            Mode: {modeBadge}
          </div>
          <div className={`px-3 py-2 rounded-md border text-[11px] font-mono ${confidenceClass}`}>
            Confidence: {confidenceLabel}
          </div>
          <div className="bg-elevated px-3 py-2 rounded-md border border-border-strong text-[11px] font-mono text-text-secondary">
            Coverage: {coveragePct.toFixed(0)}%
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-text-secondary">Generating intelligence report...</div>
        ) : (
          <div className="space-y-3">
            {(report?.claims || []).map((claim) => (
              <div key={claim.id} className="bg-root border border-border-light rounded-lg p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-text-primary">{claim.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-border-strong text-text-secondary font-mono">
                    {claim.confidence}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{claim.statement}</p>
                <p className="text-[11px] text-text-dim mt-2 font-mono">
                  Evidence: {claim.evidence?.type} · source: {claim.evidence?.source}
                </p>
              </div>
            ))}

            {(report?.recommendations || []).length > 0 && (
              <div className="bg-elevated border border-border-light rounded-lg p-3">
                <p className="text-xs uppercase tracking-widest font-bold text-text-secondary mb-2">Recommendations</p>
                <ul className="space-y-1 list-disc pl-5 text-sm text-text-secondary">
                  {report?.recommendations?.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border-light flex gap-4 flex-wrap">
          <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary flex items-center gap-2 shadow-xs">
            <Sparkles className="w-3 h-3 text-accent-sage" /> Engine: {report?.engine || 'portfolio_intelligence_heuristic_v1'}
          </div>
          <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary shadow-xs">
            Based on {quality?.total_positions ?? holdings.length} live position{(quality?.total_positions ?? holdings.length) !== 1 ? 's' : ''} · As of {asOfTime}
          </div>
          {report?.audit?.audit_id && (
            <div className="bg-elevated px-4 py-2 rounded-md border border-border-strong text-xs font-mono text-text-secondary shadow-xs">
              Audit ID: {report.audit.audit_id}
            </div>
          )}
        </div>
      </SoftCard>

      {/* X-Ray / Hidden Exposures */}
      <h3 className="font-display text-2xl text-text-primary mt-12 mb-4 border-b border-border-light pb-2 flex items-center gap-3">
        <ShieldAlert className="text-accent-rose w-6 h-6" /> Deep X-Ray Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <SoftCard className="p-6 bg-surface border border-accent-rose/30">
          <h4 className="font-sans text-md font-bold text-accent-rose mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Concentration Risk</h4>
          <p className="text-sm text-text-secondary font-sans leading-relaxed mb-4">
            {reliabilityGatePassed
              ? `Entity resolution found sector concentration in ${topSector}. Overlapping exposure across ETFs and direct holdings can amplify drawdowns.`
              : 'Add holdings to detect hidden concentration and cross-asset overlaps.'}
          </p>
          {reliabilityGatePassed && (
            <ul className="space-y-3">
              {(report?.claims || []).filter(c => c.id === 'sector_concentration').map((claim) => {
                const v = claim.evidence?.value || {};
                const count = v.top_sector_count ?? 0;
                const total = quality?.total_positions ?? holdings.length;
                return (
                  <li key={claim.id} className="bg-root p-3 rounded border border-border-light flex justify-between items-center shadow-inner">
                    <span className="text-sm font-bold text-text-primary">{v.top_sector || topSector}</span>
                    <span className="text-xs font-mono text-accent-rose px-2 py-0.5 bg-accent-rose/10 rounded">{count} / {total} positions</span>
                  </li>
                );
              })}
            </ul>
          )}
        </SoftCard>

        <SoftCard className="p-6 bg-surface border border-accent-amber/30">
          <h4 className="font-sans text-md font-bold text-accent-amber mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Geopolitical Vulnerability</h4>
          <p className="text-sm text-text-secondary font-sans leading-relaxed mb-4">
            {reliabilityGatePassed
              ? `Geographic analysis indicates primary exposure to ${topCountry}. Supply chain dependencies and geopolitical tension in this region may impact portfolio performance.`
              : 'Add holdings to unlock geopolitical exposure analysis.'}
          </p>
          {reliabilityGatePassed && (() => {
            const countryClaim = (report?.claims || []).find(c => c.id === 'country_concentration');
            const evidence = countryClaim?.evidence?.value || {};
            const topPct = Number(evidence.top_country_pct || 0);
            const totalCountries = 1;
            return (
              <>
                <div className="h-4 w-full bg-elevated rounded-full overflow-hidden border border-border-light mb-2">
                  <div className="h-full bg-accent-amber transition-all" style={{ width: `${topPct}%` }} />
                </div>
                <span className="text-[10px] text-text-dim font-mono font-bold uppercase tracking-widest block">{topPct}% holdings in {topCountry} · {totalCountries} countr{totalCountries !== 1 ? 'ies' : 'y'} total</span>
              </>
            );
          })()}
        </SoftCard>
      </div>
    </div>
  );
}
