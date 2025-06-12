import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStorage } from '../services/storage';

interface ThemeState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      closeSidebar: () => set({ isSidebarOpen: false }),
      openSidebar: () => set({ isSidebarOpen: true })
    }),
    {
      name: 'theme-storage',
      storage: {
        getItem: async (name) => {
          const value = await createStorage().getItem(name);
          return value ? { state: value } : null;
        },
        setItem: async (name, value) => {
          await createStorage().setItem(name, value.state);
        },
        removeItem: async (name) => {
          await createStorage().removeItem(name);
        }
      }
    }
  )
);
