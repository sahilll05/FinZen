import { create } from 'zustand';
import { User } from '@/types';
import { account, ID } from '@/lib/appwrite';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; country_code: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const appwriteUser = await account.get();
      
      const user: User = {
        id: appwriteUser.$id,
        email: appwriteUser.email,
        full_name: appwriteUser.name,
        country_code: 'US', // Could be added to preferences or custom DB user table
        preferences: {},
      } as any;
      
      set({ user, isAuthenticated: true, isLoading: false });
      if (typeof window !== 'undefined') window.location.href = '/dashboard';
    } catch (error: any) {
      console.error("Login Error:", error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      await account.create(ID.unique(), data.email, data.password, data.full_name);
      await account.createEmailPasswordSession(data.email, data.password);
      
      const appwriteUser = await account.get();
      
      const user: User = {
        id: appwriteUser.$id,
        email: appwriteUser.email,
        full_name: appwriteUser.name,
        country_code: data.country_code,
        preferences: {},
      } as any;
      
      set({ user, isAuthenticated: true, isLoading: false });
      if (typeof window !== 'undefined') window.location.href = '/dashboard';
    } catch (error: any) {
      console.error("Register Error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.warn("Error during logout or no active session:", error);
    }
    set({ user: null, isAuthenticated: false });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  loadUser: async () => {
    try {
      const appwriteUser = await account.get();
      if (appwriteUser) {
        const user: User = {
          id: appwriteUser.$id,
          email: appwriteUser.email,
          full_name: appwriteUser.name,
          country_code: 'US',
          preferences: {},
        } as any;
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch (error) {
      // 401 Unauthorized expected if no session
      console.log("No valid Appwrite session.");
    }
    set({ isLoading: false, user: null, isAuthenticated: false });
  },
}));
