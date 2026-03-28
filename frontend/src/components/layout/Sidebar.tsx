"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, PieChart, Globe, Newspaper, MessageSquare, Gauge, Route, Network, Activity, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: PieChart },
  { name: 'Geopolitical', href: '/dashboard/geopolitical', icon: Globe },
  { name: 'News Intel', href: '/dashboard/news', icon: Newspaper },
  { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: MessageSquare },
  { name: 'Risk Profile', href: '/dashboard/risk-profile', icon: Gauge },
  { name: 'Simulator', href: '/dashboard/scenario', icon: Route },
  { name: 'Knowledge Graph', href: '/dashboard/knowledge-graph', icon: Network },
  { name: 'Portfolio X-Ray', href: '/dashboard/xray', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-surface/85 backdrop-blur-[20px] border-r border-border-light shadow-[2px_0_16px_rgba(28,25,23,0.04)] h-screen flex flex-col fixed left-0 top-0 z-40 relative">
      <div className="p-6 pb-2">
        <Link href="/dashboard" className="flex flex-col">
          <span className="font-display text-2xl text-accent-indigo font-bold tracking-tight">FinZen</span>
          <span className="text-text-secondary text-xs uppercase tracking-widest mt-1">Intelligence Platform</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors z-10",
                isActive ? "text-accent-indigo" : "text-text-secondary hover:bg-elevated hover:text-text-body"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 bg-accent-indigo-light border-l-[3px] border-accent-indigo rounded-r-lg -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-4 h-4", isActive ? "text-accent-indigo" : "text-text-dim group-hover:text-text-secondary")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-light">
        <div className="bg-surface shadow-xs rounded-xl p-3 flex items-center justify-between border border-border-light/50 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-accent-indigo text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-text-primary truncate">{user?.full_name || 'User'}</span>
              <span className="text-xs text-text-secondary">{user?.country_code || 'GLOBAL'}</span>
            </div>
          </div>
          <button onClick={logout} className="text-text-dim hover:text-accent-rose transition-colors p-1" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
