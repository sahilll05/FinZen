import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// No auth token injection needed — backend uses demo user, no JWT required
api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't redirect on auth errors since we have no real auth
    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      console.warn('Backend unreachable — falling back to mock data.');
    }
    return Promise.reject(error);
  }
);

// ── Auth (mock — no real backend auth) ─────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; full_name: string; country_code: string }) =>
    Promise.resolve({ data: { user: { id: '1', ...data }, access_token: 'demo' } }),
  login: (data: { email: string; password: string }) =>
    Promise.resolve({ data: { user: { id: '1', email: data.email, full_name: 'FinZen User' }, access_token: 'demo' } }),
  getProfile: () =>
    Promise.resolve({ data: { id: '1', email: 'demo@finzen.app', full_name: 'FinZen User', country_code: 'US' } }),
  updateProfile: (data: any) => Promise.resolve({ data }),
};

// ── Portfolio ────────────────────────────────────────────────────────────────
export const portfolioAPI = {
  list: () => api.get('/portfolio/'),
  get: (id: string) => api.get(`/portfolio/${id}`),
  create: (data: { name: string; currency?: string }) => api.post('/portfolio/', data),
  update: (id: string, data: any) => api.put(`/portfolio/${id}`, data),
  delete: (id: string) => api.delete(`/portfolio/${id}`),
  getHoldings: (id: string) => api.get(`/portfolio/${id}/holdings`),
  addHolding: (portfolioId: string, data: any) => api.post(`/portfolio/${portfolioId}/holdings`, data),
  deleteHolding: (portfolioId: string, holdingId: string) =>
    api.delete(`/portfolio/${portfolioId}/holdings/${holdingId}`),
  getMetrics: (id: string) => api.get(`/portfolio/${id}/metrics`),
  optimize: (id: string, data: any) => api.post(`/portfolio/${id}/optimize`, data),
  xray: (id: string) => api.get(`/portfolio/${id}/xray`),
  // Direct endpoints — accept raw Appwrite holdings (no Python DB needed)
  xrayDirect: (holdings: any[]) => api.post('/xray/analyze/holdings', { holdings }),
  intelligenceDirect: (holdings: any[], client_context?: Record<string, any>) =>
    api.post('/xray/intelligence/holdings', { holdings, client_context }),
};

// ── Market Data ──────────────────────────────────────────────────────────────
export const marketAPI = {
  getQuote: (ticker: string) => api.get(`/market/quote/${ticker}`),
  getHistory: (ticker: string, period?: string) =>
    api.get(`/market/history/${ticker}`, { params: { period } }),
  getFundamentals: (ticker: string) => api.get(`/market/fundamentals/${ticker}`),
  search: (query: string) => api.get('/market/search', { params: { q: query } }),
  batchQuotes: (tickers: string[]) => api.post('/market/quotes/batch', tickers),
};

// ── News Intelligence ────────────────────────────────────────────────────────
export const newsAPI = {
  getFeed: (params?: { country?: string; trust_min?: number; limit?: number; query?: string }) =>
    api.get('/news/feed', { params }),
  getArticle: (id: string) => api.get(`/news/article/${id}`),
  getSentiment: (ticker: string) => api.get(`/news/sentiment/${ticker}`),
  triggerIngestion: () => api.post('/news/article/impact'),
};

// ── Geopolitical Risk ────────────────────────────────────────────────────────
export const geoAPI = {
  getCountryRisk: (code: string) => api.get(`/geo/risk/${code}`),
  getSectorImpact: (code: string) => api.get(`/geo/sectors/${code}`),
  getSectorStocks: (code: string) => api.get(`/geo/sectors/${code}/stocks`),
  getPortfolioExposure: (portfolioData: any) => api.post('/geo/portfolio/exposure', portfolioData),
  simulate: (portfolioData: any) => api.post('/geo/simulate', portfolioData),
  getGlobeData: () => api.get('/geo/globe-data'),
  getCountryStocks: (code: string) => api.get(`/geo/country-stocks/${code}`),
  getRecentEvents: (country: string) => api.get('/geo/events/recent', { params: { country } }),
};

// ── Trust Scoring ────────────────────────────────────────────────────────────
export const trustAPI = {
  upsertSource: (data: {
    source_name: string;
    accuracy_score: number;
    sector?: string;
    total_articles?: number;
  }) => api.post('/trust/source', data),
  getSource: (name: string) => api.get(`/trust/source/${name}`),
  scoreArticle: (data: {
    source: string;
    content: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    timestamp: string;
    sector?: string;
    peer_articles?: Array<{ source: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  }) => api.post('/trust/article/score', data),
  calculateConsensus: (
    articles: Array<{ source: string; sentiment: 'positive' | 'negative' | 'neutral' }>
  ) => api.post('/trust/consensus', { articles }),
};

// ── AI Assistant ─────────────────────────────────────────────────────────────
export const aiAPI = {
  chat: (data: { message: string; conversation_id?: string; portfolio_id?: string; context?: any }) =>
    api.post('/ai/chat', data),
  getConversations: () => api.get('/ai/conversations'),
  getConversation: (id: string) => api.get(`/ai/conversations/${id}`),
};

// ── Causal Chain ─────────────────────────────────────────────────────────────
export const causalAPI = {
  traceChain: (data: { event_type: string; source_country?: string }) =>
    api.post('/causal/trace', data),
  getActiveChains: () => api.get('/causal/chains/active'),
  getPortfolioRisks: (portfolioId: string) =>
    api.get(`/causal/portfolio/${portfolioId}/hidden-risk`),
};

// ── Risk Profiling ───────────────────────────────────────────────────────────
export const riskAPI = {
  submitProfile: (answers: any) => api.post('/risk-profile/profile', answers),
  getMyProfile: () => api.get('/risk-profile/profile/me'),
};

// ── Scenario Simulator ───────────────────────────────────────────────────────
export const scenarioAPI = {
  getAvailable: () => api.get('/scenario/available'),
  simulate: (data: { portfolio_id: string; scenarios: any[] }) =>
    api.post('/scenario/simulate', data),
  // Direct endpoint — accepts Appwrite holdings (no Python DB portfolio_id needed)
  simulateDirect: (data: { holdings: any[]; scenarios: any[] }) =>
    api.post('/scenario/simulate/holdings', data),
};

// ── Knowledge Graph ──────────────────────────────────────────────────────────
export const graphAPI = {
  query: (entity: string, depth?: number) =>
    api.get('/graph/data', { params: { center: entity, depth } }),
};

export default api;
