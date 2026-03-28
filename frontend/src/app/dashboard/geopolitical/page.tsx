"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, LayoutGrid } from "lucide-react";
import { geoAPI, newsAPI } from "@/lib/api";
import GlobeViewer from "@/components/globe/GlobeViewer";
import type { GlobeCountry } from "@/components/globe/GlobeViewer";

// ── Types ────────────────────────────────────────────────────────────────────

interface RiskDimension {
  dimension: string;
  score: number;
  level: string;
  drivers?: string[];
}

interface SectorImpact {
  sector: string;
  direction: string;
  magnitude: string;
  driver: string;
}

interface CountryRisk {
  country_code: string;
  country_name: string;
  overall_score: number;
  overall_level: string;
  risk_dimensions: RiskDimension[];
  sector_impacts: SectorImpact[];
}

interface StockEntry {
  name: string;
  ticker: string;
  price: number | null;
  change_pct: number;
  currency?: string;
}

interface NewsEntry {
  title: string;
  source: string;
  sentiment: string;
  published_at?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", CN: "🇨🇳", RU: "🇷🇺", TW: "🇹🇼", IN: "🇮🇳",
  JP: "🇯🇵", GB: "🇬🇧", DE: "🇩🇪",
};
const COUNTRY_CODES = ["US", "CN", "RU", "TW", "IN", "JP", "GB", "DE"];
const GRID_SIZES: Record<string, string> = {
  US: "col-span-3 row-span-2", CN: "col-span-2 row-span-2",
  RU: "col-span-1 row-span-1", TW: "col-span-1 row-span-1",
  IN: "col-span-2 row-span-1", JP: "col-span-1 row-span-1",
  GB: "col-span-1 row-span-1", DE: "col-span-1 row-span-1",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 7) return { bg: "#fecdd3", border: "var(--accent-rose)" };
  if (score >= 4) return { bg: "var(--accent-amber-light)", border: "var(--accent-amber)" };
  return { bg: "var(--accent-sage-light)", border: "var(--accent-sage)" };
}

function riskLabel(score: number) {
  if (score >= 7) return "critical";
  if (score >= 4) return "medium";
  return "low";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return "";
  }
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function GeopoliticalPage() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // 2D heatmap state
  const [countryRisks, setCountryRisks] = useState<Record<string, CountryRisk>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Global");

  // 3D globe state
  const [globeCountries, setGlobeCountries] = useState<GlobeCountry[]>([]);
  const [globeLoading, setGlobeLoading] = useState(false);

  // Detail panel extras (stocks + news)
  const [detailStocks, setDetailStocks] = useState<StockEntry[]>([]);
  const [detailNews, setDetailNews] = useState<NewsEntry[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);

  useEffect(() => {
    loadAllRisks();
  }, []);

  // Load 3D globe data when switching to 3D view
  useEffect(() => {
    if (viewMode === "3d" && globeCountries.length === 0) {
      loadGlobeData();
    }
  }, [viewMode, globeCountries.length]);

  const loadAllRisks = async () => {
    setIsLoading(true);
    const risks: Record<string, CountryRisk> = {};
    await Promise.all(
      COUNTRY_CODES.map(async (code) => {
        try {
          const res = await geoAPI.getCountryRisk(code);
          risks[code] = res.data;
        } catch {
          risks[code] = {
            country_code: code, country_name: code,
            overall_score: 5.0, overall_level: "medium",
            risk_dimensions: [], sector_impacts: [],
          };
        }
      })
    );
    setCountryRisks(risks);
    setIsLoading(false);
  };

  const loadGlobeData = async () => {
    setGlobeLoading(true);
    try {
      const res = await geoAPI.getGlobeData();
      setGlobeCountries(res.data.countries ?? []);
    } catch {
      console.warn("Globe data load failed");
    }
    setGlobeLoading(false);
  };

  const loadDetailExtras = async (code: string) => {
    setExtrasLoading(true);
    try {
      const [stocksRes, newsRes] = await Promise.allSettled([
        geoAPI.getCountryStocks(code),
        newsAPI.getFeed({ country: code, limit: 3 }),
      ]);
      setDetailStocks(stocksRes.status === "fulfilled" ? stocksRes.value.data.stocks ?? [] : []);
      setDetailNews(newsRes.status === "fulfilled" ? (newsRes.value.data.articles ?? []).slice(0, 3) : []);
    } catch {}
    setExtrasLoading(false);
  };

  const handleSelectCountry = async (code: string) => {
    setSelectedCountry(code);
    setDetailStocks([]);
    setDetailNews([]);

    // Fetch risk data if needed
    if (!countryRisks[code]?.risk_dimensions?.length) {
      setDetailLoading(true);
      try {
        const res = await geoAPI.getCountryRisk(code);
        setCountryRisks((prev) => ({ ...prev, [code]: res.data }));
      } catch {}
      setDetailLoading(false);
    }

    // Always fetch fresh stocks + news
    loadDetailExtras(code);
  };

  const handleGlobeCountryClick = (country: GlobeCountry) => {
    handleSelectCountry(country.code);
    // If clicking from globe, also store basic risk data so panel shows
    if (!countryRisks[country.code]) {
      setCountryRisks((prev) => ({
        ...prev,
        [country.code]: {
          country_code: country.code,
          country_name: country.country_name,
          overall_score: country.overall_score,
          overall_level: country.overall_level,
          risk_dimensions: [],
          sector_impacts: [],
        },
      }));
    }
  };

  const detail = selectedCountry ? countryRisks[selectedCountry] : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col relative animate-in fade-in duration-500 overflow-hidden min-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border-light flex-shrink-0">
        <h1 className="font-display text-4xl text-text-primary">Geopolitical Risk Heatmap</h1>

        <div className="flex items-center gap-3">
          {/* 2D / 3D Toggle */}
          <div className="flex items-center bg-elevated border border-border-base rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "2d"
                  ? "bg-surface text-accent-indigo border border-border-base shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Heatmap
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "3d"
                  ? "bg-surface text-accent-indigo border border-border-base shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              3D Globe
            </button>
          </div>

          {/* Region filter */}
          {viewMode === "2d" && (
            <div className="flex gap-2">
              {["Global", "Asia", "Europe", "Americas"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
                    f === activeFilter
                      ? "bg-accent-indigo text-white border-accent-indigo shadow-xs"
                      : "bg-surface text-text-secondary border-border-base hover:border-border-strong tracking-wide shadow-xs"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 mt-6 relative flex gap-6 pb-12 min-h-0">
        {/* ── 2D Heatmap ── */}
        <AnimatePresence mode="wait">
          {viewMode === "2d" && (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={`flex-1 transition-all duration-300 ${selectedCountry ? "mr-[420px]" : ""} h-full`}
            >
              {isLoading ? (
                <div className="grid grid-cols-5 grid-rows-3 gap-3 h-[600px]">
                  {COUNTRY_CODES.map((code) => (
                    <div
                      key={code}
                      className={`${GRID_SIZES[code]} rounded-xl animate-pulse bg-elevated border border-border-light`}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 grid-rows-3 gap-3 h-[600px]">
                  {COUNTRY_CODES.map((code) => {
                    const risk = countryRisks[code];
                    const score = risk?.overall_score ?? 5;
                    const colors = scoreColor(score);
                    const level = riskLabel(score);
                    const isSelected = selectedCountry === code;
                    return (
                      <div
                        key={code}
                        onClick={() => handleSelectCountry(code)}
                        className={`${GRID_SIZES[code]} rounded-xl p-6 flex flex-col cursor-pointer transition-all shadow-xs relative group overflow-hidden border-2 ${
                          isSelected ? "scale-[1.02] shadow-md" : "hover:scale-[1.01] hover:shadow-md"
                        }`}
                        style={{
                          backgroundColor: colors.bg,
                          borderColor: isSelected ? colors.border : colors.border,
                          boxShadow: isSelected ? `0 0 0 3px ${colors.border}40, 0 8px 24px rgba(0,0,0,0.12)` : undefined,
                        }}
                      >
                        {level === "critical" && (
                          <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-accent-rose animate-pulse shadow-[0_0_10px_rgba(190,18,60,0.5)]" />
                        )}
                        <span className="text-4xl opacity-[0.85] mb-2 block drop-shadow-sm">
                          {COUNTRY_FLAGS[code] || "🌐"}
                        </span>
                        <div className="flex justify-between items-end mt-auto w-full">
                          <span className="font-sans font-bold text-xl drop-shadow-sm" style={{ color: colors.border }}>
                            {risk?.country_name || code}
                          </span>
                          <span className="font-mono text-3xl font-black tracking-tighter" style={{ color: colors.border }}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 3D Globe ── */}
        <AnimatePresence mode="wait">
          {viewMode === "3d" && (
            <motion.div
              key="globe"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className={`flex-1 transition-all duration-300 ${selectedCountry ? "mr-[420px]" : ""}`}
              style={{
                height: "680px",
                background: "radial-gradient(ellipse at center, #0a0f1e 0%, #020409 100%)",
                borderRadius: "1.25rem",
                overflow: "hidden",
                border: "1px solid rgba(99,102,241,0.15)",
                boxShadow: "0 0 60px rgba(99,102,241,0.08), inset 0 0 120px rgba(0,0,0,0.6)",
              }}
            >
              {globeLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
                      <div className="absolute inset-3 rounded-full border-2 border-indigo-500/50 animate-ping" style={{ animationDelay: "0.2s" }} />
                      <div className="absolute inset-0 flex items-center justify-center text-3xl">🌍</div>
                    </div>
                    <span className="text-white/50 text-sm animate-pulse">Fetching globe data…</span>
                  </div>
                </div>
              ) : (
                <GlobeViewer
                  countries={globeCountries}
                  onCountryClick={handleGlobeCountryClick}
                />
              )}

              {/* 3D view badge */}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-indigo-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                <span className="text-[11px] font-mono text-white/60 uppercase tracking-widest">Live Globe</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Detail Panel ── */}
        <AnimatePresence>
          {selectedCountry && detail && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-12 w-[400px] bg-surface border border-border-strong shadow-[0_8px_32px_rgba(28,25,23,0.1)] rounded-xl z-20 flex flex-col overflow-y-auto"
            >
              <div className="p-8 flex flex-col h-full">
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="absolute top-4 right-4 text-text-dim hover:text-text-primary transition-colors text-xl font-mono"
                >
                  ✕
                </button>

                {/* Country header */}
                <div className="flex items-center gap-5 mb-6 mt-2 pb-6 border-b border-border-light">
                  <span className="text-5xl drop-shadow-md">{COUNTRY_FLAGS[selectedCountry] || "🌐"}</span>
                  <div>
                    <h2 className="text-2xl font-bold font-sans text-text-primary tracking-tight mb-1">
                      {detail.country_name}
                    </h2>
                    <span
                      className={`text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border mt-1 inline-block shadow-xs ${
                        detail.overall_score >= 7
                          ? "text-accent-rose bg-accent-rose-light border-accent-rose/20"
                          : detail.overall_score >= 4
                          ? "text-accent-amber bg-accent-amber-light border-accent-amber/20"
                          : "text-accent-sage bg-accent-sage-light border-accent-sage/20"
                      }`}
                    >
                      {detail.overall_level?.toUpperCase()} · {detail.overall_score.toFixed(1)}
                    </span>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-text-secondary animate-pulse">Loading risk data…</span>
                  </div>
                ) : (
                  <div className="space-y-7 flex-1 pr-1">
                    {/* Stock Indices */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-3">
                        Market Indices
                      </h4>
                      {extrasLoading ? (
                        <div className="space-y-2">
                          {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-12 rounded-xl bg-elevated animate-pulse" />
                          ))}
                        </div>
                      ) : detailStocks.length > 0 ? (
                        <div className="space-y-2">
                          {detailStocks.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-root border border-border-light rounded-xl px-4 py-3 shadow-xs"
                            >
                              <div>
                                <div className="font-semibold text-sm text-text-primary">{s.name}</div>
                                <div className="text-[10px] font-mono text-text-dim">{s.ticker}</div>
                              </div>
                              <div className="text-right">
                                {s.price != null && (
                                  <div className="text-sm font-mono text-text-secondary">
                                    {s.price.toLocaleString()}
                                  </div>
                                )}
                                <span
                                  className={`text-xs font-bold font-mono ${
                                    s.change_pct >= 0 ? "text-accent-sage" : "text-accent-rose"
                                  }`}
                                >
                                  {s.change_pct >= 0 ? "▲" : "▼"} {Math.abs(s.change_pct).toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-dim italic">No market data available</p>
                      )}
                    </div>

                    {/* Risk Dimensions */}
                    {detail.risk_dimensions.length > 0 && (
                      <div className="space-y-5">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                          Risk Dimensions
                        </h4>
                        <div className="space-y-4 bg-root p-5 rounded-xl border border-border-light/50 shadow-inner">
                          {detail.risk_dimensions.map((dim) => {
                            const dimColor =
                              dim.score >= 7
                                ? "var(--accent-rose)"
                                : dim.score >= 4
                                ? "var(--accent-amber)"
                                : "var(--accent-sage)";
                            return (
                              <div key={dim.dimension}>
                                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                                  <span>{dim.dimension}</span>
                                  <span className="font-mono font-bold" style={{ color: dimColor }}>
                                    {dim.score.toFixed(1)}
                                  </span>
                                </div>
                                <div className="w-full bg-elevated rounded-full h-2 shadow-inner">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${dim.score * 10}%`, backgroundColor: dimColor }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sector Impacts */}
                    {detail.sector_impacts.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                          Predicted Sector Impact
                        </h4>
                        <div className="bg-surface border border-border-strong rounded-xl p-4 text-sm shadow-xs">
                          {detail.sector_impacts.map((si, i) => (
                            <div
                              key={si.sector}
                              className={`flex justify-between font-semibold py-3 ${
                                i < detail.sector_impacts.length - 1 ? "border-b border-border-light" : ""
                              }`}
                            >
                              <div>
                                <span>{si.sector}</span>
                                <p className="text-[10px] text-text-dim font-normal mt-0.5">{si.driver}</p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-xs ${
                                  si.direction === "positive"
                                    ? "text-accent-sage bg-accent-sage-light border border-accent-sage/20"
                                    : "text-accent-rose bg-accent-rose-light"
                                }`}
                              >
                                {si.direction === "positive" ? "+" : "-"}
                                {si.magnitude}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live News */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-3">
                        Live News
                      </h4>
                      {extrasLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-elevated animate-pulse" />
                          ))}
                        </div>
                      ) : detailNews.length > 0 ? (
                        <div className="space-y-2">
                          {detailNews.map((n, i) => {
                            const sentColor =
                              n.sentiment === "positive"
                                ? "text-accent-sage"
                                : n.sentiment === "negative"
                                ? "text-accent-rose"
                                : "text-text-secondary";
                            return (
                              <div
                                key={i}
                                className="bg-root border border-border-light rounded-xl p-3 shadow-xs"
                              >
                                <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">
                                  {n.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`text-[10px] font-bold uppercase ${sentColor}`}>
                                    ● {n.sentiment}
                                  </span>
                                  <span className="text-[10px] text-text-dim">{n.source}</span>
                                  <span className="text-[10px] text-text-dim ml-auto">{timeAgo(n.published_at)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-text-dim italic">No news available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
