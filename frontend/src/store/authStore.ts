import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAttackStore } from './attackStore';
import { createStorage } from '../services/storage';
import { api } from '../services/api';

interface User {
  _id: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  init: () => void;
  verifyToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      init: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Vérifie si le token est valide
            const isValid = await get().verifyToken();
            if (isValid) {
              set({ 
                token,
                isAuthenticated: true 
              });
              await useAttackStore.getState().loadUserConfigs();
            } else {
              // Si le token n'est pas valide, déconnexion
              get().logout();
            }
          } catch (error) {
            console.error('Erreur lors de l\'initialisation de l\'auth:', error);
            get().logout();
          }
        }
      },

      verifyToken: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return false;

          // On utilise l'instance axios configurée pour tester le token
          await api.get('/api/projects');
          return true;
        } catch (error) {
          console.error('Erreur de vérification du token:', error);
          return false;
        }
      },

      login: async (credentials) => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            credentials: 'include'  // Important for cookies
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
          }
          
          const data = await response.json();
          if (!data.token) {
            throw new Error('No token received');
          }

          // Store the token
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.user.username);
          
          set({ 
            token: data.token, 
            user: data.user, 
            isAuthenticated: true 
          });

          // Load configurations after login
          await useAttackStore.getState().loadUserConfigs();
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false 
        });
        // Clear configurations on logout
        useAttackStore.setState({ savedConfigs: [] });
        window.location.href = '/login';
      },
    }),
    {
      name: 'auth-storage',
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
