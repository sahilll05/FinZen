import { databases, DB_ID, COL_PORTFOLIOS, COL_HOLDINGS, COL_TRANSACTIONS, ID, Query } from '@/lib/appwrite';

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
      // Only send fields defined in the Appwrite schema to avoid attribute errors
      const payload: Record<string, any> = {
        portfolio_id: portfolioId,
        ticker: data.ticker,
        quantity: data.quantity,
        avg_cost: data.avg_cost,
      };
      // Add optional fields only if they have a value
      if (data.company_name) payload.company_name = data.company_name;
      if (data.sector) payload.sector = data.sector;
      if (data.country) payload.country = data.country;

      try {
        const res = await databases.createDocument(DB_ID, COL_HOLDINGS, ID.unique(), payload);
        return { data: res };
      } catch (err: any) {
        console.warn('Backend schema missing newly added fields, falling back to core schema fields.', err);
        const fallbackPayload = {
            portfolio_id: portfolioId,
            ticker: data.ticker,
            quantity: data.quantity,
            avg_cost: data.avg_cost,
        };
        const res = await databases.createDocument(DB_ID, COL_HOLDINGS, ID.unique(), fallbackPayload);
        return { data: res };
      }
    } catch (err: any) {
      console.error('[portfolioService.addHolding] Appwrite error:', err?.message, err?.code, err?.response);
      throw err;
    }
  },

  async deleteHolding(holdingId: string) {
    await databases.deleteDocument(DB_ID, COL_HOLDINGS, holdingId);
    return { data: { success: true } };
  },

  // --- Transactions ---
  async getTransactions(portfolioId: string) {
    const res = await databases.listDocuments(DB_ID, COL_TRANSACTIONS, [
      Query.equal('portfolio_id', portfolioId),
      Query.orderDesc('date'),
      Query.limit(100)
    ]);
    return { data: res.documents };
  },

  async addTransaction(userId: string, portfolioId: string, data: { ticker: string, action: string, quantity: number, price: number, date: string }) {
    try {
      const res = await databases.createDocument(DB_ID, COL_TRANSACTIONS, ID.unique(), {
        portfolio_id: portfolioId,
        user_id: userId,
        ...data
      });
      return { data: res };
    } catch (err: any) {
      console.warn("Could not create transaction. Collection may not exist yet in Appwrite.", err);
      return { data: null };
    }
  }
};
