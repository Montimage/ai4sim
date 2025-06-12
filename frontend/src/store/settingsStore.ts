import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AttackMode = 'ai4cyber' | 'extended';

interface SettingsState {
  attackMode: AttackMode;
  securityReportsEnabled: boolean;
  setAttackMode: (mode: AttackMode) => void;
  setSecurityReportsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      attackMode: 'ai4cyber',
      securityReportsEnabled: true,
      setAttackMode: (mode: AttackMode) => set({ attackMode: mode }),
      setSecurityReportsEnabled: (enabled: boolean) => set({ securityReportsEnabled: enabled }),
    }),
    {
      name: 'settings-storage',
    }
  )
); 