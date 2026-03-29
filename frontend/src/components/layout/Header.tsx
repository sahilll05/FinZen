"use client";

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const pathname = usePathname();

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search FinZen..."
            className="w-80 h-10 bg-surface border border-border-light rounded-lg pl-9 pr-16 text-sm focus:outline-none focus:border-border-strong focus:bg-surface transition-all placeholder:text-text-dim"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-dim pointer-events-none">
            Ctrl+K
          </div>
        </div>

        <div className="flex items-center gap-5 border-l border-border-light pl-6">
          <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full">
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-border-strong transition-all bg-elevated">
            <img 
              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=FinZen" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
