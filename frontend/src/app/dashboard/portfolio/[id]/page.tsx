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
import { TransactionsTab } from './components/TransactionsTab';
import { IntelligenceTab } from './components/IntelligenceTab';

const TABS = ['Overview', 'Analytics', 'Allocation', 'Holdings', 'Transactions', 'Intelligence'] as const;
type Tab = typeof TABS[number];

export default function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [params.id, user]);

  const loadData = async (refresh = false) => {
    if (!user) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      // 1. Fetch DB Data from Appwrite
      const pRes = await portfolioService.getPortfolio(params.id);
      const hRes = await portfolioService.getHoldings(params.id);
      const tRes = await portfolioService.getTransactions(params.id);

      let p = pRes.data;
      let rawHoldings = hRes.data;
      const txs = tRes.data;

      // 2. Fetch Live Market Data from Python Backend
      if (rawHoldings.length > 0) {
        const tickers = rawHoldings.map(h => h.ticker);
        try {
          const mRes = await marketAPI.batchQuotes(tickers);
          const quotes = mRes.data;

          // 3. Augment Holdings
          let totalValue = 0;
          let totalCost = 0;
          
          rawHoldings = rawHoldings.map(h => {
             const quote = quotes[h.ticker] || {};
             const currentPrice = quote.price || h.avg_cost;
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
                day_change_pct: dayChangePct
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
      setTransactions(txs);
      
    } catch (e) {
      console.error(e);
      // alert("Failed to load portfolio");
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
      // 2. Automatically record as a BUY transaction in Appwrite
      await portfolioService.addTransaction(user.id, params.id, {
        ticker: payload.ticker,
        action: 'buy',
        quantity: payload.quantity,
        price: payload.avg_cost,
        date: new Date().toISOString()
      });
      // 3. Reload Page
      await loadData(true);
    } catch {
      alert("Failed to add holding.");
    }
  };

  const handleRemoveHolding = async (holdingId: string) => {
    try {
      const h = holdings.find(x => x.$id === holdingId);
      if (h) {
         // Log a sell transaction
         await portfolioService.addTransaction(user?.id || '', params.id, {
          ticker: h.ticker,
          action: 'sell',
          quantity: h.quantity,
          price: h.current_price || h.avg_cost,
          date: new Date().toISOString()
         });
      }
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
          {activeTab === 'Analytics' && <AnalyticsTab portfolio={portfolio} />}
          {activeTab === 'Allocation' && <AllocationTab holdings={holdings} />}
          {activeTab === 'Holdings' && <HoldingsTab portfolio={portfolio} holdings={holdings} onAddHolding={handleAddHolding} onRemoveHolding={handleRemoveHolding} />}
          {activeTab === 'Transactions' && <TransactionsTab transactions={transactions} />}
          {activeTab === 'Intelligence' && <IntelligenceTab portfolio={portfolio} holdings={holdings} />}
        </div>
      </div>
    </div>
  );
}
