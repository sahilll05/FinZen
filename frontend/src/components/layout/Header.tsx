"use client";

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { StatusDot } from '@/components/shared/StatusDot';
import { format } from 'date-fns';

export function Header() {
  const pathname = usePathname();
  const { status } = useWebSocket();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const titleMap: Record<string, string> = {
    '/dashboard': 'Overview',
    '/dashboard/portfolio': 'My Portfolios',
    '/dashboard/geopolitical': 'Geopolitical Risk',
    '/dashboard/news': 'News Intelligence',
    '/dashboard/ai-assistant': 'AI Assistant',
    '/dashboard/risk-profile': 'Risk Profile',
    '/dashboard/scenario': 'Scenario Simulator',
    '/dashboard/knowledge-graph': 'Knowledge Graph',
    '/dashboard/xray': 'Portfolio X-Ray',
  };

  const getTitle = () => {
    if (titleMap[pathname]) return titleMap[pathname];
    for (const key of Object.keys(titleMap)) {
      if (key !== '/dashboard' && pathname.startsWith(key)) {
        return titleMap[key];
      }
    }
    return 'Dashboard';
  };

  return (
    <header className="h-16 bg-root/90 backdrop-blur-[16px] border-b border-border-light sticky top-0 z-30 flex items-center justify-between px-8">
      <div>
        <h2 className="font-display text-2xl text-text-primary shadow-sm">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent-indigo transition-colors" />
          <input 
            type="text" 
            placeholder="Search symbols, news, commands..."
            className="w-64 h-9 bg-elevated border border-transparent rounded-full pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent-indigo focus:border-accent-indigo-light focus:bg-surface transition-all placeholder:text-text-dim"
          />
        </div>

        <div className="flex items-center gap-4 border-l border-border-light pl-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-text-primary">
              {time ? format(time, 'HH:mm:ss') : '--:--:--'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-sage-light text-accent-sage border border-accent-sage/20 font-mono font-semibold">
              MKT OPEN
            </span>
            <StatusDot status={status} />
          </div>

          <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors hover:bg-elevated rounded-full">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent-amber rounded-full border border-surface shadow-xs" />
          </button>
        </div>
      </div>
    </header>
  );
}
