import { databases, DB_ID, COL_PORTFOLIOS, COL_HOLDINGS, ID, Query } from '@/lib/appwrite';

export const portfolioService = {
  // --- Portfolios ---
  async listPortfolios(userId: string) {
    const res = await databases.listDocuments(DB_ID, COL_PORTFOLIOS, [
      Query.equal('user_id', userId)
    ]);
    return { data: res.documents };
  },

  async getPortfolio(id: string) {
    const res = await databases.getDocument(DB_ID, COL_PORTFOLIOS, id);
    return { data: res };
  },

  async createPortfolio(userId: string, name: string, currency: string) {
    const res = await databases.createDocument(DB_ID, COL_PORTFOLIOS, ID.unique(), {
      user_id: userId,
      name,
      currency,
      created_at: new Date().toISOString()
    });
    return { data: res };
  },

  async deletePortfolio(id: string) {
    await databases.deleteDocument(DB_ID, COL_PORTFOLIOS, id);
    return { data: { success: true } };
  },

  // --- Holdings ---
  async getHoldings(portfolioId: string) {
    const res = await databases.listDocuments(DB_ID, COL_HOLDINGS, [
      Query.equal('portfolio_id', portfolioId),
      Query.limit(100)
    ]);
    return { data: res.documents };
  },

  async addHolding(userId: string, portfolioId: string, data: { ticker: string, quantity: number, avg_cost: number, company_name?: string, sector?: string, country?: string }) {
    try {
      const payload: Record<string, any> = {
        portfolio_id: portfolioId,
        ticker: data.ticker,
        quantity: data.quantity,
        avg_cost: data.avg_cost,
      };
      if (data.company_name) payload.company_name = data.company_name;
      if (data.sector) payload.sector = data.sector;
      if (data.country) payload.country = data.country;

      const res = await databases.createDocument(DB_ID, COL_HOLDINGS, ID.unique(), payload);
      return { data: res };
    } catch (err: any) {
      console.error('[portfolioService.addHolding] Appwrite error:', err?.message, err?.code, err?.response);
      throw err;
    }
  },

  async deleteHolding(holdingId: string) {
    await databases.deleteDocument(DB_ID, COL_HOLDINGS, holdingId);
    return { data: { success: true } };
  }
};
