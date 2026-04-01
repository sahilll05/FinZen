import { Client, Account, Databases, ID, Query } from 'appwrite';

const client = new Client();

client
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('69c80e85002b588face1');

export const account = new Account(client);
export const databases = new Databases(client);

// Helper constants
export const DB_ID = 'finzen';
export const COL_PORTFOLIOS = 'portfolios';
export const COL_HOLDINGS = 'holdings';
export const COL_TRANSACTIONS = 'transactions'; // Deprecated, remove later when sure

export { ID, Query };
