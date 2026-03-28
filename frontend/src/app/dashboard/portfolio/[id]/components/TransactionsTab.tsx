"use client";

import { SoftCard } from '@/components/shared/SoftCard';

export function TransactionsTab({ transactions }: { transactions: any[] }) {

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SoftCard className="p-0 overflow-hidden bg-surface">
        <div className="p-6 border-b border-border-light bg-root/50 flex justify-between items-center">
          <h3 className="font-display text-lg font-bold text-text-primary">Transaction History</h3>
          <span className="bg-elevated px-3 py-1 rounded text-xs text-text-secondary border border-border-light font-mono shadow-inner tracking-widest uppercase">Verified Ledgers</span>
        </div>

        <div className="overflow-x-auto w-full pb-10">
          <table className="w-full text-left whitespace-nowrap min-w-[700px]">
            <thead className="bg-surface text-[10px] uppercase font-bold text-text-secondary border-b border-border-strong tracking-widest shadow-xs">
              <tr>
                <th className="px-6 py-4">Execution Date</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Execution Price</th>
                <th className="px-6 py-4 text-right">Net Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/60 bg-surface">
              {transactions.map(t => (
                <tr key={t.$id || t.id} className="hover:bg-root transition-colors group">
                  <td className="px-6 py-5">
                    <span className="font-sans font-bold text-sm text-text-primary block">{new Date(t.date || t.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="text-[10px] font-mono text-text-dim block mt-0.5">{new Date(t.date || t.created_at || Date.now()).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-5">
                     <span className="font-mono font-bold text-text-primary px-2 py-1 bg-elevated border border-border-light rounded">{t.ticker}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${t.action === 'buy' ? 'bg-accent-indigo-light/50 text-accent-indigo border-accent-indigo/30' : 'bg-accent-amber/10 text-accent-amber border-accent-amber/30'}`}>
                      {t.action === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-sm font-bold text-text-primary">{t.quantity}</td>
                  <td className="px-6 py-5 text-right font-mono text-sm text-text-secondary">${t.price.toFixed(2)}</td>
                  <td className="px-6 py-5 text-right font-mono font-bold text-sm text-text-primary block">${(t.quantity * t.price).toFixed(2)}</td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-text-primary font-bold mb-1">No execution history found</p>
                    <p className="text-xs text-text-secondary">Your executed trades will appear here automatically from Appwrite sync.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SoftCard>
    </div>
  );
}
