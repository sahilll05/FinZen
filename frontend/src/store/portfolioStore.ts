import { create } from 'zustand';
import { portfolioAPI } from '@/lib/api';
import { Portfolio, Holding, PortfolioMetrics } from '@/types';

interface PortfolioStore {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  holdings: Holding[];
  metrics: PortfolioMetrics | null;
  isLoading: boolean;
  fetchPortfolios: () => Promise<void>;
  setActivePortfolio: (id: string) => void;
  createPortfolio: (name: string, currency?: string) => Promise<void>;
  fetchHoldings: (id: string) => Promise<void>;
  addHolding: (portfolioId: string, data: any) => Promise<void>;
  fetchMetrics: (id: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  portfolios: [],
  activePortfolio: null,
  holdings: [],
  metrics: null,
  isLoading: false,
  fetchPortfolios: async () => {
    set({ isLoading: true });
    try {
      const response = await portfolioAPI.list();
      set({ portfolios: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  setActivePortfolio: (id: string) => {
    const portfolios = get().portfolios;
    const active = portfolios.find(p => p.id === id) || null;
    set({ activePortfolio: active });
  },
  createPortfolio: async (name: string, currency: string = 'USD') => {
    try {
      const response = await portfolioAPI.create({ name, currency });
      set(state => ({ portfolios: [...state.portfolios, response.data] }));
    } catch {}
  },
  fetchHoldings: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await portfolioAPI.getHoldings(id);
      set({ holdings: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  addHolding: async (portfolioId: string, data: any) => {
    try {
      await portfolioAPI.addHolding(portfolioId, data);
      await get().fetchHoldings(portfolioId);
      await get().fetchMetrics(portfolioId);
    } catch {}
  },
  fetchMetrics: async (id: string) => {
    try {
      const response = await portfolioAPI.getMetrics(id);
      set({ metrics: response.data });
    } catch {}
  },
}));
