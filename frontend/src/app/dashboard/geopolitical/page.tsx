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
  JP: "🇯🇵", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", BR: "🇧🇷",
  AU: "🇦🇺", CA: "🇨🇦", SA: "🇸🇦", ZA: "🇿🇦", NG: "🇳🇬",
  MX: "🇲🇽", AR: "🇦🇷", KR: "🇰🇷", SG: "🇸🇬", ID: "🇮🇩",
  TH: "🇹🇭", MY: "🇲🇾", VN: "🇻🇳", PH: "🇵🇭", PK: "🇵🇰",
  TR: "🇹🇷", UA: "🇺🇦", IR: "🇮🇷", IL: "🇮🇱", EG: "🇪🇬",
  IT: "🇮🇹", ES: "🇪🇸", PL: "🇵🇱", NL: "🇳🇱", SE: "🇸🇪",
  NO: "🇳🇴", CH: "🇨🇭", NZ: "🇳🇿", AE: "🇦🇪", CO: "🇨🇴",
  CL: "🇨🇱", PE: "🇵🇪", KE: "🇰🇪", GH: "🇬🇭", MA: "🇲🇦",
};

// Country sets per region (ordered to match grid layout spans perfectly)
const REGION_COUNTRIES: Record<string, string[]> = {
  // Global: US(3×2) + CN(2×2) fills rows 1-2 | RU+IN(2)+GB+DE fills row 3 | BR+JP+SA+TR fills row 4
  "Global":   ["US", "CN", "RU", "IN", "GB", "DE", "BR", "JP", "SA", "TR"],
  // Asia: CN(3×2)+IN(2×2) fills rows 1-2 | JP(2)+KR+TW+SG row 3 | ID(2)+TH+VN+MY row 4 | PH+PK partial row 5
  "Asia":     ["CN", "IN", "JP", "KR", "TW", "SG", "ID", "TH", "VN", "MY", "PH", "PK"],
  // Europe: GB+DE+FR row 1 (3+2) wait — RU(3×2) | GB+DE+FR in rows 1-2 right side | UA+TR+IT+ES row 3 | PL+NL+SE+CH row 4
  "Europe":   ["RU", "GB", "DE", "FR", "UA", "TR", "IT", "ES", "PL", "NL", "SE", "CH"],
  // Americas: US(3×2)+BR(2×2) fills rows 1-2 | CA(2)+MX+AR+CO row 3 | CL+PE partial row 4
  "Americas": ["US", "BR", "CA", "MX", "AR", "CO", "CL", "PE"],
  // Middle East & Africa: SA(2×2) | IR+IL+EG(2) row 1 right | AE+ZA(2) row 2 right | NG+KE+MA+GH row 3
  "Middle East & Africa": ["SA", "IR", "IL", "EG", "AE", "ZA", "NG", "KE", "MA", "GH"],
};

// Grid span per country per region — all layouts verified for 5-column grid
// Row math: check cols sum ≤ 5 per row, including row-span continuations
const REGION_GRID_SIZES: Record<string, Record<string, string>> = {
  // Row1: US(3) + CN(2) = 5 ✓  Row2: same (row-span)  Row3: RU(1)+IN(2)+GB(1)+DE(1) = 5 ✓  Row4: BR(1)+JP(1)+SA(1)+TR(1)+[empty] = 4
  "Global": {
    US: "col-span-3 row-span-2", CN: "col-span-2 row-span-2",
    RU: "col-span-1",            IN: "col-span-2",
    GB: "col-span-1",            DE: "col-span-1",
    BR: "col-span-1",            JP: "col-span-1",
    SA: "col-span-1",            TR: "col-span-1",
  },
  // Row1: CN(3) + IN(2) = 5 ✓  Row2: same  Row3: JP(2)+KR(1)+TW(1)+SG(1) = 5 ✓  Row4: ID(2)+TH(1)+VN(1)+MY(1) = 5 ✓  Row5: PH(1)+PK(1)
  "Asia": {
    CN: "col-span-3 row-span-2", IN: "col-span-2 row-span-2",
    JP: "col-span-2",            KR: "col-span-1",
    TW: "col-span-1",            SG: "col-span-1",
    ID: "col-span-2",            TH: "col-span-1",
    VN: "col-span-1",            MY: "col-span-1",
    PH: "col-span-1",            PK: "col-span-1",
  },
  // Row1: RU(3×2 span) + GB(2) = 5 ✓  Row2: RU-cont + DE(1)+FR(1)+[fills right] = OK
  // Row3: UA(2)+TR(1)+IT(1)+ES(1) = 5 ✓  Row4: PL(1)+NL(1)+SE(1)+CH(1)+[empty] = 4
  "Europe": {
    RU: "col-span-3 row-span-2", GB: "col-span-2",
    DE: "col-span-1",            FR: "col-span-1",
    UA: "col-span-2",            TR: "col-span-1",
    IT: "col-span-1",            ES: "col-span-1",
    PL: "col-span-1",            NL: "col-span-1",
    SE: "col-span-1",            CH: "col-span-1",
  },
  // Row1: US(3×2) + BR(2×2) = 5 ✓  Row2: same  Row3: CA(2)+MX(1)+AR(1)+CO(1) = 5 ✓  Row4: CL(1)+PE(1)
  "Americas": {
    US: "col-span-3 row-span-2", BR: "col-span-2 row-span-2",
    CA: "col-span-2",            MX: "col-span-1",
    AR: "col-span-1",            CO: "col-span-1",
    CL: "col-span-1",            PE: "col-span-1",
  },
  // Row1: SA(2×2) + IR(1)+IL(1)+EG(2-wait only 3 remain)...
  // SA(2×2): cols 1-2, rows 1-2  | Row1 right: IR(1 col3)+IL(1 col4)+EG(1 col5) = 3
  // Row2 right: AE(1 col3)+ZA(2 cols4-5) = 3 | Row3: NG(1)+KE(1)+MA(1)+GH(1)+[empty] = 4
  "Middle East & Africa": {
    SA: "col-span-2 row-span-2", IR: "col-span-1",
    IL: "col-span-1",            EG: "col-span-1",
    AE: "col-span-1",            ZA: "col-span-2",
    NG: "col-span-1",            KE: "col-span-1",
    MA: "col-span-1",            GH: "col-span-1",
  },
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

  const [countryRisks, setCountryRisks] = useState<Record<string, CountryRisk>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Global");
  const [loadingFilter, setLoadingFilter] = useState(false);

  // 3D globe state
  const [globeCountries, setGlobeCountries] = useState<GlobeCountry[]>([]);
  const [globeLoading, setGlobeLoading] = useState(false);

  // Detail panel extras (stocks + news)
  const [detailStocks, setDetailStocks] = useState<StockEntry[]>([]);
  const [detailNews, setDetailNews] = useState<NewsEntry[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);

  // Derived: current country codes to display
  const currentCodes = REGION_COUNTRIES[activeFilter] ?? REGION_COUNTRIES["Global"];
  const currentGridSizes = REGION_GRID_SIZES[activeFilter] ?? REGION_GRID_SIZES["Global"];

  useEffect(() => {
    loadRisksForRegion("Global");
  }, []);

  // Reload when active filter changes
  useEffect(() => {
    loadRisksForRegion(activeFilter);
    setSelectedCountry(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Load 3D globe data when switching to 3D view
  useEffect(() => {
    if (viewMode === "3d" && globeCountries.length === 0) {
      loadGlobeData();
    }
  }, [viewMode, globeCountries.length]);

  const loadRisksForRegion = async (region: string) => {
    const codes = REGION_COUNTRIES[region] ?? REGION_COUNTRIES["Global"];
    setIsLoading(true);
    setLoadingFilter(true);
    const risks: Record<string, CountryRisk> = { ...countryRisks };
    await Promise.all(
      codes.map(async (code) => {
        if (risks[code]?.risk_dimensions?.length) return; // already cached
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
    setLoadingFilter(false);
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
            <div className="flex gap-2 flex-wrap">
              {Object.keys(REGION_COUNTRIES).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
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
              {/* Scrollable heatmap container */}
              <div className="overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
                {isLoading ? (
                  <div className="grid grid-cols-5 auto-rows-[120px] gap-2.5">
                    {currentCodes.map((code) => (
                      <div
                        key={code}
                        className={`${currentGridSizes[code] ?? "col-span-1"} rounded-xl animate-pulse bg-elevated border border-border-light`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 auto-rows-[120px] gap-2.5">
                    {currentCodes.map((code) => {
                      const risk = countryRisks[code];
                      const score = risk?.overall_score ?? 5;
                      const colors = scoreColor(score);
                      const level = riskLabel(score);
                      const isSelected = selectedCountry === code;
                      const gridSize = currentGridSizes[code] ?? "col-span-1";
                      return (
                        <div
                          key={code}
                          onClick={() => handleSelectCountry(code)}
                          className={`${gridSize} rounded-xl p-4 flex flex-col cursor-pointer transition-all relative overflow-hidden border-2 ${
                            isSelected ? "scale-[1.015] shadow-lg" : "hover:scale-[1.01] hover:shadow-md"
                          }`}
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            boxShadow: isSelected
                              ? `0 0 0 3px ${colors.border}40, 0 8px 24px rgba(0,0,0,0.1)`
                              : undefined,
                          }}
                        >
                          {/* Pulsing dot for critical risk */}
                          {level === "critical" && (
                            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-accent-rose animate-pulse shadow-[0_0_8px_rgba(190,18,60,0.6)]" />
                          )}

                          {/* Country code badge */}
                          <div className="flex items-center gap-1.5 mb-auto">
                            <span className="text-xl leading-none">{COUNTRY_FLAGS[code] || "🌐"}</span>
                            <span className="font-mono text-xs font-bold opacity-50" style={{ color: colors.border }}>
                              {code}
                            </span>
                          </div>

                          {/* Bottom row: name + score */}
                          <div className="flex justify-between items-end w-full mt-1">
                            <div className="min-w-0 flex-1 pr-2">
                              <span
                                className="font-sans font-bold leading-tight block truncate"
                                style={{ color: colors.border, fontSize: "clamp(0.7rem, 1.5vw, 0.95rem)" }}
                              >
                                {risk?.country_name || code}
                              </span>
                              <span className="block text-[9px] font-mono opacity-50 truncate" style={{ color: colors.border }}>
                                {risk?.overall_level?.toUpperCase() ?? "LOADING…"}
                              </span>
                            </div>
                            <span
                              className="font-mono font-black tracking-tighter flex-shrink-0"
                              style={{ color: colors.border, fontSize: "clamp(1.1rem, 2vw, 1.6rem)" }}
                            >
                              {score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
