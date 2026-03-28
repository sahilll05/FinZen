"use client";

import { motion } from 'framer-motion';

const MOCK_TICKERS = [
  { sym: 'AAPL', p: 173.50, c: 1.2 },
  { sym: 'RELIANCE.NS', p: 2950.10, c: 0.8 },
  { sym: 'TSLA', p: 175.22, c: -2.3 },
  { sym: 'EUR/USD', p: 1.08, c: 0.05 },
  { sym: 'BTC', p: 68500, c: 4.5 },
  { sym: 'MSFT', p: 420.55, c: 1.1 },
  { sym: 'NVDA', p: 890.00, c: -1.5 },
  { sym: 'US10Y', p: 4.25, c: 0.02 },
];

export function TickerTape() {
  return (
    <div className="w-full bg-elevated border-t border-border-light h-10 flex items-center overflow-hidden fixed bottom-0 left-0 z-50">
      <motion.div 
        className="flex whitespace-nowrap min-w-max"
        animate={{ x: [0, -1000] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...MOCK_TICKERS, ...MOCK_TICKERS, ...MOCK_TICKERS].map((t, i) => (
          <div key={`${t.sym}-${i}`} className="flex items-center gap-3 px-6 font-mono text-xs">
            <span className="font-semibold text-text-primary">{t.sym}</span>
            <span className="text-text-body">{t.p}</span>
            <span className={t.c >= 0 ? 'text-accent-sage font-semibold' : 'text-accent-rose font-semibold'}>
              {t.c >= 0 ? '+' : ''}{t.c}%
            </span>
            <div className="w-1 h-1 rounded-full bg-border-strong mx-2 opacity-50" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
