import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface UIStore {
  sidebarCollapsed: boolean;
  activeTheme: "light";
  isGlobalLoading: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (n: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activeTheme: "light",
  isGlobalLoading: false,
  notifications: [],
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  addNotification: (n) => set(state => ({
    notifications: [...state.notifications, { ...n, id: Math.random().toString(36).substring(7) }]
  })),
  dismissNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}));
