"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { geoAPI, newsAPI } from "@/lib/api";

export interface GlobeCountry {
  code: string;
  lat: number;
  lng: number;
  country_name: string;
  overall_score: number;
  overall_level: string;
}

interface TooltipData {
  country: GlobeCountry;
  stocks: Array<{ name: string; ticker: string; price: number | null; change_pct: number; currency?: string }>;
  news: Array<{ title: string; source: string; sentiment: string; published_at?: string }>;
  loading: boolean;
  x: number;
  y: number;
}

interface Props {
  countries: GlobeCountry[];
  onCountryClick?: (country: GlobeCountry) => void;
}

function riskColor(score: number): string {
  if (score >= 7) return "rgba(239,68,68,0.95)";
  if (score >= 4) return "rgba(245,158,11,0.95)";
  return "rgba(34,197,94,0.95)";
}

function riskGlowColor(score: number): string {
  if (score >= 7) return "rgba(239,68,68,0.4)";
  if (score >= 4) return "rgba(245,158,11,0.3)";
  return "rgba(34,197,94,0.3)";
}

function riskRadius(score: number): number {
  return 0.3 + (score / 10) * 0.6;
}

// Arc configs: major active geopolitical tensions
const BASE_CONFLICT_ARCS = [
  // Active conflicts
  { startLat: 61.52, startLng: 105.31, endLat: 48.37, endLng: 31.16, severity: "high",   label: "RU↔UA" },
  { startLat: 35.86, startLng: 104.19, endLat: 23.69, endLng: 120.96, severity: "high",   label: "CN↔TW" },
  { startLat: 31.04, startLng: 34.85,  endLat: 32.42, endLng: 53.68,  severity: "high",   label: "IL↔IR" },
  // Regional tensions
  { startLat: 32.42, startLng: 53.68,  endLat: 23.88, endLng: 45.07,  severity: "medium", label: "IR↔SA" },
  { startLat: 35.86, startLng: 104.19, endLat: 35.90, endLng: 127.76, severity: "medium", label: "CN↔KR" },
  { startLat: 35.86, startLng: 104.19, endLat: 20.59, endLng: 78.96,  severity: "medium", label: "CN↔IN" },
  { startLat: 39.50, startLng: -98.35, endLat: 35.86, endLng: 104.19, severity: "medium", label: "US↔CN" },
  { startLat: 39.50, startLng: -98.35, endLat: 32.42, endLng: 53.68,  severity: "medium", label: "US↔IR" },
  { startLat: 20.59, startLng: 78.96,  endLat: 30.37, endLng: 69.34,  severity: "medium", label: "IN↔PK" },
  // Sanctions / Economic pressure
  { startLat: 39.50, startLng: -98.35, endLat: 61.52, endLng: 105.31, severity: "low",    label: "US↔RU" },
  { startLat: 55.37, startLng: -3.43,  endLat: 61.52, endLng: 105.31, severity: "low",    label: "EU↔RU" },
  { startLat: 23.88, startLng: 45.07,  endLat: 9.08,  endLng: 8.67,   severity: "low",    label: "SA↔NG" },
];

function getSeverityColor(severity: string, opacity = 1): string {
  if (severity === "high")   return `rgba(239,68,68,${opacity})`;
  if (severity === "medium") return `rgba(245,158,11,${opacity})`;
  return `rgba(148,163,184,${opacity})`;
}


export default function GlobeViewer({ countries, onCountryClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipCache = useRef<Record<string, Omit<TooltipData, "x" | "y" | "loading" | "country">>>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTooltipData = useCallback(async (country: GlobeCountry, x: number, y: number) => {
    const cached = tooltipCache.current[country.code];
    if (cached) {
      setTooltip({ country, ...cached, x, y, loading: false });
      return;
    }

    setTooltip({ country, stocks: [], news: [], loading: true, x, y });

    try {
      const [stocksRes, newsRes] = await Promise.allSettled([
        geoAPI.getCountryStocks(country.code),
        newsAPI.getFeed({ country: country.code, limit: 3 }),
      ]);

      const stocks = stocksRes.status === "fulfilled" ? stocksRes.value.data.stocks ?? [] : [];
      const news =
        newsRes.status === "fulfilled"
          ? (newsRes.value.data.articles ?? []).slice(0, 3)
          : [];

      const data = { stocks, news };
      tooltipCache.current[country.code] = data;
      setTooltip((prev) => (prev?.country.code === country.code ? { ...prev, ...data, loading: false } : prev));
    } catch {
      setTooltip((prev) => (prev ? { ...prev, loading: false } : prev));
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || countries.length === 0) return;

    let globe: any;
    let cancelled = false;
    let rafId: number;

    const init = async () => {
      const GlobeLib = (await import("globe.gl")).default as any;
      if (cancelled) return;

      // Wait until the container has real dimensions (Framer Motion fade-in can delay layout)
      const waitForSize = (): Promise<{ w: number; h: number }> =>
        new Promise((resolve) => {
          const check = () => {
            const w = containerRef.current?.clientWidth ?? 0;
            const h = containerRef.current?.clientHeight ?? 0;
            if (w > 0 && h > 0) { resolve({ w, h }); return; }
            if (!cancelled) rafId = requestAnimationFrame(check);
          };
          check();
        });

      const { w: width, h: height } = await waitForSize();
      if (cancelled || !containerRef.current) return;

      globe = GlobeLib()(containerRef.current)
        .width(width)
        .height(height)
        .backgroundColor("rgba(0,0,0,0)")
        .atmosphereColor("rgba(100,149,237,0.25)")
        .atmosphereAltitude(0.18)
        .globeImageUrl(
          "https://unpkg.com/three-globe/example/img/earth-night.jpg"
        )
        // ── Ring halos for high-risk countries ──
        .ringsData(countries.filter((c) => c.overall_score >= 6))
        .ringLat((d: any) => d.lat)
        .ringLng((d: any) => d.lng)
        .ringColor((d: any) => () => riskGlowColor(d.overall_score))
        .ringMaxRadius(2.5)
        .ringPropagationSpeed(1.5)
        .ringRepeatPeriod(900)
        // ── Country marker points ──
        .pointsData(countries)
        .pointLat((d: any) => d.lat)
        .pointLng((d: any) => d.lng)
        .pointColor((d: any) => riskColor(d.overall_score))
        .pointRadius((d: any) => riskRadius(d.overall_score))
        .pointAltitude(0.01)
        .pointResolution(12)
        .pointsMerge(false)
        // ── Conflict arcs ──
        .arcsData(BASE_CONFLICT_ARCS)
        .arcStartLat((d: any) => d.startLat)
        .arcStartLng((d: any) => d.startLng)
        .arcEndLat((d: any) => d.endLat)
        .arcEndLng((d: any) => d.endLng)
        .arcColor((d: any) => [getSeverityColor(d.severity, 0.7), getSeverityColor(d.severity, 0.2)])
        .arcAltitude((d: any) => d.severity === "high" ? 0.35 : d.severity === "medium" ? 0.22 : 0.12)
        .arcStroke((d: any) => d.severity === "high" ? 0.7 : 0.4)
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime((d: any) => d.severity === "high" ? 1800 : 2800)
        // ── Labels ──
        .labelsData(countries)
        .labelLat((d: any) => d.lat)
        .labelLng((d: any) => d.lng)
        .labelText((d: any) => d.country_name)
        .labelSize(0.45)
        .labelDotRadius(0.3)
        .labelColor((d: any) => riskColor(d.overall_score))
        .labelResolution(2)
        .labelAltitude(0.015)
        // ── Hover events ──
        .onPointHover((point: any, _: any, event: MouseEvent) => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

          if (!point) {
            hoverTimeoutRef.current = setTimeout(() => setTooltip(null), 180);
            return;
          }
          const rect = containerRef.current!.getBoundingClientRect();
          const x = event ? event.clientX - rect.left : 0;
          const y = event ? event.clientY - rect.top : 0;
          fetchTooltipData(point as GlobeCountry, x, y);
        })
        .onPointClick((point: any) => {
          if (point && onCountryClick) {
            onCountryClick(point as GlobeCountry);
          }
        });

      // Camera settings
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
      globe.controls().enableDamping = true;
      globe.controls().dampingFactor = 0.1;
      globe.pointOfView({ lat: 20, lng: 10, altitude: 2.2 });

      // Handle container resize
      const resizeObserver = new ResizeObserver(([entry]) => {
        const { width: rw, height: rh } = entry.contentRect;
        if (globeRef.current && rw > 0 && rh > 0) {
          globeRef.current.width(rw).height(rh);
        }
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);

      // Pause rotation on hover
      containerRef.current!.addEventListener("mouseenter", () => {
        globe.controls().autoRotate = false;
      });
      containerRef.current!.addEventListener("mouseleave", () => {
        globe.controls().autoRotate = true;
        setTooltip(null);
      });

      globeRef.current = globe;
    };

    init();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (globeRef.current) {
        try { globeRef.current._destructor?.(); } catch {}
        globeRef.current = null;
      }
    };
  }, [countries, fetchTooltipData, onCountryClick]);


  // Update tooltip position on mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!tooltip || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip((prev) =>
        prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev
      );
    },
    [tooltip]
  );

  return (
    <div className="relative w-full h-full" onMouseMove={handleMouseMove}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip && (
        <GlobeTooltip tooltip={tooltip} />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Risk Level</span>
        {[
          { color: "bg-red-500", label: "High (7–10)", glow: "shadow-[0_0_6px_rgba(239,68,68,0.8)]" },
          { color: "bg-amber-500", label: "Medium (4–7)", glow: "shadow-[0_0_6px_rgba(245,158,11,0.8)]" },
          { color: "bg-green-500", label: "Low (0–4)", glow: "shadow-[0_0_6px_rgba(34,197,94,0.8)]" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color} ${item.glow}`} />
            <span className="text-[11px] text-white/70 font-medium">{item.label}</span>
          </div>
        ))}
        <div className="border-t border-white/10 mt-1 pt-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-red-400 opacity-70 rounded" style={{ background: "linear-gradient(to right, transparent, rgba(239,68,68,0.8), transparent)" }} />
            <span className="text-[11px] text-white/50">Conflict arc</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeTooltip({ tooltip }: { tooltip: TooltipData }) {
  const { country, stocks, news, loading, x, y } = tooltip;

  const riskBg = country.overall_score >= 7 ? "rgba(239,68,68,0.15)" : country.overall_score >= 4 ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)";
  const riskBorder = country.overall_score >= 7 ? "rgba(239,68,68,0.5)" : country.overall_score >= 4 ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.5)";
  const riskText = country.overall_score >= 7 ? "#f87171" : country.overall_score >= 4 ? "#fbbf24" : "#4ade80";

  // Smart positioning to keep tooltip on screen
  const tooltipWidth = 280;
  const tooltipHeight = 320;
  let left = x + 18;
  let top = y - 20;
  if (left + tooltipWidth > (typeof window !== "undefined" ? window.innerWidth : 1200)) left = x - tooltipWidth - 18;
  if (top + tooltipHeight > (typeof window !== "undefined" ? window.innerHeight : 800)) top = y - tooltipHeight + 20;

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{ left, top, width: tooltipWidth }}
    >
      <div
        className="rounded-2xl p-4 shadow-2xl"
        style={{
          background: "rgba(10,10,20,0.94)",
          border: `1px solid ${riskBorder}`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold text-white text-sm">{country.country_name}</div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{country.code}</div>
          </div>
          <div
            className="px-2.5 py-1 rounded-lg font-mono text-sm font-black"
            style={{ background: riskBg, color: riskText, border: `1px solid ${riskBorder}` }}
          >
            {country.overall_score.toFixed(1)}
            <span className="text-[9px] ml-0.5 opacity-60">/10</span>
          </div>
        </div>

        {/* Risk bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span className="uppercase tracking-widest">Risk Score</span>
            <span className="uppercase font-bold" style={{ color: riskText }}>{country.overall_level?.toUpperCase()}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${country.overall_score * 10}%`, background: riskText, boxShadow: `0 0 8px ${riskText}` }}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stocks */}
            {stocks.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">Markets</div>
                <div className="space-y-1">
                  {stocks.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-xs font-semibold text-white/90">{s.name}</div>
                        <div className="text-[10px] text-white/30 font-mono">{s.ticker}</div>
                      </div>
                      <div className="text-right">
                        {s.price != null && (
                          <div className="text-xs font-mono text-white/70">
                            {s.currency === "USD" ? "$" : ""}{s.price.toLocaleString()}
                          </div>
                        )}
                        <div
                          className="text-[11px] font-bold font-mono"
                          style={{ color: s.change_pct >= 0 ? "#4ade80" : "#f87171" }}
                        >
                          {s.change_pct >= 0 ? "▲" : "▼"} {Math.abs(s.change_pct).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News */}
            {news.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">Live News</div>
                <div className="space-y-1.5">
                  {news.map((n, i) => {
                    const sentColor = n.sentiment === "positive" ? "#4ade80" : n.sentiment === "negative" ? "#f87171" : "#94a3b8";
                    return (
                      <div key={i} className="text-[11px] text-white/60 leading-snug flex gap-1.5">
                        <span className="mt-0.5 shrink-0" style={{ color: sentColor }}>●</span>
                        <span className="line-clamp-2">{n.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Click hint */}
        <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-white/25 text-center uppercase tracking-widest">
          Click for full analysis
        </div>
      </div>
    </div>
  );
}
