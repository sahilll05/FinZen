"use client";

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ReactNode } from 'react';
import { GrainOverlay } from '@/components/shared/GrainOverlay';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function DashboardShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-root flex items-center justify-center relative overflow-hidden">
        <GrainOverlay />
        <div className="flex flex-col items-center gap-4 animate-pulse">
           <div className="w-12 h-12 rounded-full border-[3px] border-accent-indigo border-t-transparent animate-spin" />
           <span className="font-display text-text-primary text-xl">Loading Intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-root text-text-body font-sans relative">
      <GrainOverlay />
      <Sidebar />
      <div className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-[1440px] mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
