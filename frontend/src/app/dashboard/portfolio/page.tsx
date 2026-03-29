"use client";

import { motion } from 'framer-motion';
import { FormEvent, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/shared/SoftCard';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import Link from 'next/link';
import { portfolioService } from '@/services/portfolioService';
import { useAuthStore } from '@/store/authStore';
import { marketAPI } from '@/lib/api';

interface Portfolio {
  $id?: string;
  name: string;
  currency: string;
  total_invested?: number;
  current_value?: number;
  total_gain_loss?: number;
  total_gain_loss_pct?: number;
  holdings_count?: number;
}

const COLOR_CYCLE = ['indigo', 'teal', 'amber', 'rose', 'violet'] as const;

export default function PortfoliosPage() {
  const { user } = useAuthStore();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newTicker, setNewTicker] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newAvgCost, setNewAvgCost] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadPortfolios();
    }
  }, [user]);

  const loadPortfolios = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await portfolioService.listPortfolios(user.id);
      const basePortfolios = res.data as any[];

      const enriched = await Promise.all(
        basePortfolios.map(async (p) => {
          try {
            const portfolioId = p.$id as string | undefined;
            if (!portfolioId) return p;

            const hRes = await portfolioService.getHoldings(portfolioId);
            const holdings = (hRes.data as any[]) || [];

            const invested = holdings.reduce((sum, h) => {
              const qty = Number(h.quantity ?? 0);
              const avgCost = Number(h.avg_cost ?? 0);
              if (!Number.isFinite(qty) || !Number.isFinite(avgCost)) return sum;
              return sum + qty * avgCost;
            }, 0);

            let currentValue = invested;
            if (holdings.length > 0) {
              try {
                const tickers = Array.from(new Set(holdings.map(h => String(h.ticker || '').toUpperCase()).filter(Boolean)));
                const qRes = await marketAPI.batchQuotes(tickers);
                const quotes = qRes?.data || {};

                currentValue = holdings.reduce((sum, h) => {
                  const qty = Number(h.quantity ?? 0);
                  const avgCost = Number(h.avg_cost ?? 0);
                  const tickerKey = String(h.ticker || '').trim().toUpperCase();
                  const q =
                    quotes[tickerKey] ||
                    quotes[String(h.ticker || '')] ||
                    {};
                  const hasLivePrice = typeof q.price === 'number' && Number.isFinite(q.price);
                  const price = hasLivePrice ? q.price : avgCost;
                  return sum + (Number.isFinite(qty) ? qty * price : 0);
                }, 0);
              } catch {
                currentValue = invested;
              }
            }

            const gainLoss = currentValue - invested;
            const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0;

            return {
              ...p,
              total_invested: invested,
              current_value: currentValue,
              total_gain_loss: gainLoss,
              total_gain_loss_pct: gainLossPct,
              holdings_count: holdings.length,
            };
          } catch {
            return p;
          }
        })
      );

      setPortfolios(enriched);
    } catch {
      setPortfolios([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePortfolio = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const trimmedTicker = newTicker.trim().toUpperCase();
    const hasInitialHoldingInput = Boolean(trimmedTicker || newQty.trim() || newAvgCost.trim());
    if (hasInitialHoldingInput) {
      const qty = Number(newQty);
      const avgCost = Number(newAvgCost);
      const tickerOk = /^[A-Z0-9.-]{1,20}$/.test(trimmedTicker);
      if (!tickerOk) {
        setError('Use stock ticker format only (e.g. RELIANCE.NS, TCS.NS, AAPL), max 20 chars, no spaces.');
        return;
      }
      if (!Number.isFinite(qty) || !Number.isFinite(avgCost) || qty <= 0 || avgCost <= 0) {
        setError('For initial stock, enter valid quantity and buy price greater than 0.');
        return;
      }
    }

    setIsCreating(true);
    setError('');
    try {
      const created = await portfolioService.createPortfolio(user.id, trimmedName, newCurrency);
      const portfolioId = (created?.data as any)?.$id as string | undefined;

      if (portfolioId && hasInitialHoldingInput) {
        const qty = Number(newQty);
        const avgCost = Number(newAvgCost);

        await portfolioService.addHolding(user.id, portfolioId, {
          ticker: trimmedTicker,
          quantity: qty,
          avg_cost: avgCost,
        });

        await portfolioService.addTransaction(user.id, portfolioId, {
          ticker: trimmedTicker,
          action: 'buy',
          quantity: qty,
          price: avgCost,
          date: new Date().toISOString(),
        });
      }

      await loadPortfolios();
      setNewName('');
      setNewCurrency('USD');
      setNewTicker('');
      setNewQty('');
      setNewAvgCost('');
      setShowCreateForm(false);
    } catch {
      setError('Failed to create portfolio. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this portfolio and all its holdings?')) return;
    try {
      await portfolioService.deletePortfolio(id);
      setPortfolios(prev => prev.filter(p => p.$id !== id));
    } catch {
      alert('Failed to delete portfolio.');
    }
  };

  const getReturn = (p: Portfolio) => {
    if (typeof p.total_gain_loss_pct === 'number' && Number.isFinite(p.total_gain_loss_pct)) {
      return p.total_gain_loss_pct;
    }
    const invested = Number(p.total_invested ?? 0);
    const current = Number(p.current_value ?? invested);
    if (invested > 0 && Number.isFinite(current)) {
      return ((current - invested) / invested) * 100;
    }
    return 0;
  };

  const getGainLoss = (p: Portfolio) => {
    if (typeof p.total_gain_loss === 'number' && Number.isFinite(p.total_gain_loss)) {
      return p.total_gain_loss;
    }
    const invested = Number(p.total_invested ?? 0);
    const current = Number(p.current_value ?? invested);
    if (Number.isFinite(invested) && Number.isFinite(current)) {
      return current - invested;
    }
    return 0;
  };

  const getValue = (p: Portfolio) => p.current_value ?? p.total_invested ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between pb-6 border-b border-border-light">
        <h1 className="font-display text-4xl text-text-primary">My Portfolios</h1>
        <Button
          className="font-sans shadow-xs bg-accent-indigo text-white hover:bg-accent-indigo-mid transition-all"
          onClick={() => setShowCreateForm(true)}
        >
          + New Portfolio
        </Button>
      </div>

      {showCreateForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleCreatePortfolio}
          className="bg-surface border border-border-light rounded-2xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-6 gap-3 md:items-end"
        >
          <div className="md:col-span-2">
            <label htmlFor="portfolio-name" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Portfolio Name
            </label>
            <input
              id="portfolio-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Macro Volatility Shield"
              className="w-full h-10 px-3 rounded-lg border border-border-light bg-elevated text-text-primary outline-none focus:ring-2 focus:ring-accent-indigo"
              autoFocus
            />
          </div>

          <div className="w-full md:col-span-1">
            <label htmlFor="portfolio-currency" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Currency
            </label>
            <select
              id="portfolio-currency"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-light bg-elevated text-text-primary outline-none focus:ring-2 focus:ring-accent-indigo"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div className="w-full md:col-span-1">
            <label htmlFor="portfolio-first-ticker" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              First Stock (Optional)
            </label>
            <input
              id="portfolio-first-ticker"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE.NS"
              className="w-full h-10 px-3 rounded-lg border border-border-light bg-elevated text-text-primary outline-none focus:ring-2 focus:ring-accent-indigo"
            />
          </div>

          <div className="w-full md:col-span-1">
            <label htmlFor="portfolio-first-qty" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Qty
            </label>
            <input
              id="portfolio-first-qty"
              type="number"
              min="0"
              step="any"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="10"
              className="w-full h-10 px-3 rounded-lg border border-border-light bg-elevated text-text-primary outline-none focus:ring-2 focus:ring-accent-indigo"
            />
          </div>

          <div className="w-full md:col-span-1">
            <label htmlFor="portfolio-first-price" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Buy Price
            </label>
            <input
              id="portfolio-first-price"
              type="number"
              min="0"
              step="any"
              value={newAvgCost}
              onChange={(e) => setNewAvgCost(e.target.value)}
              placeholder="100"
              className="w-full h-10 px-3 rounded-lg border border-border-light bg-elevated text-text-primary outline-none focus:ring-2 focus:ring-accent-indigo"
            />
          </div>

          {error && (
            <p className="text-accent-rose text-xs md:col-span-6">{error}</p>
          )}

          <div className="flex gap-2 w-full md:w-auto md:col-span-6">
            <Button
              type="submit"
              className="bg-accent-indigo text-white hover:bg-accent-indigo-mid w-full md:w-auto"
              disabled={!newName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full md:w-auto"
              onClick={() => {
                setShowCreateForm(false);
                setNewName('');
                setNewCurrency('USD');
                setNewTicker('');
                setNewQty('');
                setNewAvgCost('');
                setError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-surface animate-pulse rounded-2xl border border-border-light" />
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-24 text-text-secondary">
          <p className="text-xl mb-2 font-display">No portfolios yet.</p>
          <p className="text-sm mb-8">Create your first portfolio to get started.</p>
          <Button onClick={() => setShowCreateForm(true)} className="bg-accent-indigo text-white">
            + Create Portfolio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {portfolios.map((p, i) => {
            const ret = getReturn(p);
            const gainLoss = getGainLoss(p);
            const color = COLOR_CYCLE[i % COLOR_CYCLE.length];
            return (
              <motion.div
                key={p.$id!}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="h-full"
              >
                <SoftCard accentColor={color as any} className="flex flex-col h-full bg-surface shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-semibold text-text-primary text-lg font-sans mb-1">{p.name}</h3>
                      <div className="bg-elevated px-2 py-0.5 rounded text-xs font-mono font-bold text-text-secondary inline-block border border-border-light shadow-xs">
                        {p.currency}
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full border-[6px] border-elevated flex items-center justify-center relative bg-surface shadow-inner">
                      <div className={`absolute inset-0 rounded-full border-[6px] border-accent-${color} border-l-transparent border-b-transparent transform rotate-45 opacity-80`} />
                    </div>
                  </div>

                  <div className="mb-8">
                    <span className="text-xs text-text-secondary uppercase tracking-widest font-semibold block mb-1">Total Value</span>
                    <AnimatedNumber
                      value={getValue(p)}
                      prefix={p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : ''}
                      className="text-3xl font-mono font-bold text-text-primary drop-shadow-sm"
                    />
                  </div>

                  <div className="flex justify-between items-center mb-8 border-t border-border-light pt-4 border-b pb-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-text-secondary mb-1">Return</span>
                      <span className={`font-mono font-bold ${ret >= 0 ? 'text-accent-sage' : 'text-accent-rose'}`}>
                        {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                      </span>
                      <span className={`text-[11px] font-mono ${gainLoss >= 0 ? 'text-accent-sage' : 'text-accent-rose'}`}>
                        {gainLoss >= 0 ? '+$' : '-$'}{Math.abs(gainLoss).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-border-light" />
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-text-secondary mb-1">Holdings</span>
                      <span className="font-mono font-bold text-text-primary">{p.holdings_count || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <Link href={`/dashboard/portfolio/${p.$id}`}>
                      <Button variant="link" className="px-0 text-accent-indigo hover:text-accent-indigo-mid">
                        View Details &rarr;
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-accent-rose hover:bg-accent-rose-light px-3"
                        onClick={() => handleDelete(p.$id!)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </SoftCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
