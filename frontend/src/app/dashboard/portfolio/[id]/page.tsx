"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { marketAPI } from '@/lib/api';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { portfolioService } from '@/services/portfolioService';
import { useAuthStore } from '@/store/authStore';

// Tabs
import { OverviewTab } from './components/OverviewTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { AllocationTab } from './components/AllocationTab';
import { HoldingsTab } from './components/HoldingsTab';

import { IntelligenceTab } from './components/IntelligenceTab';

const TABS = ['Overview', 'Analytics', 'Allocation', 'Holdings', 'Intelligence'] as const;
type Tab = typeof TABS[number];

export default function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [params.id, user]);

  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      // Keep portfolio metrics/returns fresh with near real-time quote updates.
      loadData(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [params.id, user]);

  const loadData = async (refresh = false) => {
    if (!user) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      // 1. Fetch DB Data from Appwrite
      let p: any = null;
      let rawHoldings: any[] = [];

      try {
        const pRes = await portfolioService.getPortfolio(params.id);
        p = pRes.data;
      } catch (err) {
        console.error("Portfolio fetch failed:", err);
      }

      try {
        const hRes = await portfolioService.getHoldings(params.id);
        rawHoldings = hRes.data || [];
      } catch (err) {
        console.error("Holdings fetch failed:", err);
      }

      if (!p) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
      }

      // Fill missing holding metadata (sector/country/company) from backend fundamentals
      // so Intelligence/X-Ray do not show generic "Unknown" when ticker data exists.
      if (rawHoldings.length > 0) {
        rawHoldings = await Promise.all(rawHoldings.map(async (h) => {
          const hasSector = h.sector && h.sector !== 'Unknown';
          const hasCountry = h.country && h.country !== 'Unknown';
          const hasCompany = h.company_name && String(h.company_name).trim().length > 0;

          if (hasSector && hasCountry && hasCompany) {
            return h;
          }

          try {
            const fundamentals = await marketAPI.getFundamentals(h.ticker);
            const info = fundamentals?.data || {};
            return {
              ...h,
              company_name: hasCompany ? h.company_name : (info.name || h.ticker),
              sector: hasSector ? h.sector : (info.sector || 'Unclassified'),
              country: hasCountry ? h.country : (info.country || 'US'),
            };
          } catch {
            return {
              ...h,
              company_name: hasCompany ? h.company_name : h.ticker,
              sector: hasSector ? h.sector : 'Unclassified',
              country: hasCountry ? h.country : 'US',
            };
          }
        }));
      }

      // 2. Fetch Live Market Data from Python Backend
      if (rawHoldings.length > 0) {
        const tickers = Array.from(
          new Set(
            rawHoldings
              .map(h => String(h.ticker || '').trim().toUpperCase())
              .filter(Boolean)
          )
        );
        try {
          const mRes = await marketAPI.batchQuotes(tickers);
          const quotes = mRes.data || {};

          // 3. Augment Holdings
          let totalValue = 0;
          let totalCost = 0;
          
          rawHoldings = rawHoldings.map(h => {
             const tickerKey = String(h.ticker || '').trim().toUpperCase();
             const quote =
               quotes[tickerKey] ||
               quotes[String(h.ticker || '')] ||
               {};
             const hasLivePrice = typeof quote.price === 'number' && Number.isFinite(quote.price);
             const currentPrice = hasLivePrice ? quote.price : h.avg_cost;
             const marketValue = currentPrice * h.quantity;
             const costBasis = h.avg_cost * h.quantity;
             const gainLoss = marketValue - costBasis;
             const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
             const dayChange = quote.change || 0;
             const dayChangePct = quote.change_pct || 0;

             totalValue += marketValue;
             totalCost += costBasis;

             return {
                ...h,
                current_price: currentPrice,
                market_value: marketValue,
                cost_basis: costBasis,
                gain_loss: gainLoss,
                gain_loss_pct: gainLossPct,
                day_change: dayChange,
                  day_change_pct: dayChangePct,
                  quote_source: quote.source || 'unavailable',
                  quote_error: quote.error || null,
                  resolved_ticker: quote.resolved_ticker || h.ticker,
             };
          });

          // 4. Augment Portfolio Rollup
          p = {
            ...p,
            current_value: totalValue,
            total_invested: totalCost,
            total_gain_loss: totalValue - totalCost,
            total_gain_loss_pct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
          };

        } catch (e) {
          console.error("Live quote fetch failed, using static Appwrite data", e);
        }
      }

      setPortfolio(p);
      setHoldings(rawHoldings);
      
    } catch (e) {
      console.error("Critical Page Load Error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddHolding = async (payload: any) => {
    if (!user) return;
    try {
      // 1. Add Holding to DB
      await portfolioService.addHolding(user.id, params.id, payload);
      // 2. Reload Page
      await loadData(true);
    } catch {
      alert("Failed to add holding.");
    }
  };

  const handleRemoveHolding = async (holdingId: string) => {
    try {
      // Delete holding from Appwrite DB
      await portfolioService.deleteHolding(holdingId);
      await loadData(true);
    } catch {
      alert("Failed to remove holding.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-accent-indigo" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex-1 p-8 text-center text-text-secondary mt-20">
        Portfolio not found or unauthorized.
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <button 
            onClick={() => router.push('/dashboard/portfolio')} 
            className="flex items-center text-xs font-bold text-text-secondary hover:text-text-primary uppercase tracking-wider mb-4 transition-colors group"
          >
            <ArrowLeft className="w-3 h-3 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Back to Portfolios
          </button>
          
          <div className="flex items-center gap-3">
             <h1 className="font-display text-4xl text-text-primary tracking-tight">{portfolio.name}</h1>
             <span className="bg-elevated text-text-secondary px-2.5 py-0.5 rounded text-xs font-mono font-bold border border-border-strong shadow-xs">{portfolio.currency}</span>
          </div>
          <p className="text-text-dim mt-2 text-sm font-sans max-w-xl">Deep analytics, performance tracking, and machine learning insight generation for this portfolio.</p>
        </div>
        
        <button 
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-root hover:bg-elevated border border-border-strong px-4 py-2 rounded-lg text-sm font-bold text-text-primary transition-colors shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 text-accent-indigo ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Live Sync'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-border-strong mb-8 hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-text-primary' : 'text-text-dim hover:text-text-secondary'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent-indigo rounded-t-full shadow-[0_0_8px_var(--accent-indigo)]" />
              )}
            </button>
          ))}
        </div>

        {/* Dynamic Content area */}
        <div className="min-h-[600px]">
          {activeTab === 'Overview' && <OverviewTab portfolio={portfolio} holdings={holdings} />}
          {activeTab === 'Analytics' && <AnalyticsTab portfolio={portfolio} holdings={holdings} />}
          {activeTab === 'Allocation' && <AllocationTab holdings={holdings} />}
          {activeTab === 'Holdings' && <HoldingsTab portfolio={portfolio} holdings={holdings} onAddHolding={handleAddHolding} onRemoveHolding={handleRemoveHolding} />}

          {activeTab === 'Intelligence' && <IntelligenceTab portfolio={portfolio} holdings={holdings} />}
        </div>
      </div>
    </div>
  );
}
