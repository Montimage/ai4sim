import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type NotificationCategory = 'system' | 'attack' | 'scenario' | 'project' | 'campaign' | 'security' | 'performance';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  timestamp: Date;
  read: boolean;
  persistent?: boolean; // Les notifications persistantes ne disparaissent pas automatiquement
  actionable?: boolean; // Indique si la notification a une action associée
  actionUrl?: string; // URL vers laquelle rediriger lors du clic
  metadata?: Record<string, any>; // Données supplémentaires (IDs, contexte, etc.)
  expiresAt?: Date; // Date d'expiration automatique
  autoReadTimer?: NodeJS.Timeout; // Timer pour auto-marquage comme lu
  displayed?: boolean; // Indique si la notification a déjà été affichée en toast
}

interface NotificationSettings {
  enabled: boolean;
  showToasts: boolean; // Afficher les notifications toast
  playSound: boolean;
  categories: Record<NotificationCategory, boolean>; // Activer/désactiver par catégorie
  autoHideDelay: number; // Délai en ms avant masquage automatique des toasts
  autoReadDelay: number; // Délai en ms avant marquage automatique comme lu
}

interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings;
  unreadCount: number;
  displayedToasts: Set<string>; // IDs des notifications déjà affichées en toast
  
  // Actions principales
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'displayed'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: (category?: NotificationCategory) => void;
  markAsDisplayed: (id: string) => void;
  
  // Gestion des paramètres
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  toggleCategory: (category: NotificationCategory) => void;
  
  // Utilitaires
  getNotificationsByCategory: (category: NotificationCategory) => Notification[];
  getUnreadNotifications: () => Notification[];
  getUndisplayedNotifications: () => Notification[];
  cleanExpiredNotifications: () => void;
}

// Compteur global pour garantir l'unicité des IDs
let notificationCounter = 0;

const generateUniqueId = (): string => {
  notificationCounter++;
  return `${Date.now()}-${notificationCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

// Fonction pour créer une clé unique basée sur le contenu
const createContentKey = (title: string, message: string, category: NotificationCategory): string => {
  return `${category}:${title}:${message}`.toLowerCase().replace(/\s+/g, ' ').trim();
};

const defaultSettings: NotificationSettings = {
  enabled: true,
  showToasts: true,
  playSound: false,
  categories: {
    system: true,
    attack: true,
    scenario: true,
    project: true,
    campaign: true,
    security: true,
    performance: true,
  },
  autoHideDelay: 5000,
  autoReadDelay: 3000, // Auto-marquage comme lu après 3 secondes
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      settings: defaultSettings,
      unreadCount: 0,
      displayedToasts: new Set(),

      addNotification: (notification) => {
        const state = get();
        
        // Vérifier si les notifications sont activées pour cette catégorie
        if (!state.settings.enabled || !state.settings.categories[notification.category]) {
          return;
        }

        // Créer une clé unique pour détecter les doublons
        const contentKey = createContentKey(notification.title, notification.message, notification.category);
        
        // Vérifier les doublons récents (dernières 30 secondes)
        const recentDuplicateThreshold = 30000; // 30 secondes
        const now = Date.now();
        
        const isDuplicate = state.notifications.some(n => {
          const nContentKey = createContentKey(n.title, n.message, n.category);
          const timeDiff = now - new Date(n.timestamp).getTime();
          return nContentKey === contentKey && timeDiff < recentDuplicateThreshold;
        });

        if (isDuplicate) {
          console.log('Notification duplicate détectée, ignorée:', notification.title);
          return;
        }

        // Créer la notification avec un ID unique
        const newNotification: Notification = {
          ...notification,
          id: generateUniqueId(),
          timestamp: new Date(),
          read: false,
          displayed: false,
        };

        // Définir l'expiration automatique si non spécifiée
        if (!newNotification.expiresAt && !newNotification.persistent) {
          newNotification.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h par défaut
        }

        set((state) => {
          const updatedNotifications = [newNotification, ...state.notifications]
            .slice(0, 100); // Limiter à 100 notifications max
          
          return {
            notifications: updatedNotifications,
            unreadCount: state.unreadCount + 1,
          };
        });

        // Programmer l'auto-marquage comme lu après le délai configuré
        if (!newNotification.persistent && state.settings.autoReadDelay > 0) {
          const timer = setTimeout(() => {
            const currentState = get();
            const notification = currentState.notifications.find(n => n.id === newNotification.id);
            if (notification && !notification.read) {
              get().markAsRead(newNotification.id);
            }
          }, state.settings.autoReadDelay);
          
          // Stocker le timer dans la notification pour pouvoir l'annuler si nécessaire
          newNotification.autoReadTimer = timer;
        }

        // Jouer un son si activé
        if (state.settings.playSound) {
          try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
              // Ignorer les erreurs de lecture audio
            });
          } catch (error) {
            // Ignorer les erreurs audio
          }
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (!notification || notification.read) return state;

          // Annuler le timer d'auto-marquage si il existe
          if (notification.autoReadTimer) {
            clearTimeout(notification.autoReadTimer);
          }

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true, autoReadTimer: undefined } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          // Annuler tous les timers d'auto-marquage
          state.notifications.forEach(n => {
            if (n.autoReadTimer) {
              clearTimeout(n.autoReadTimer);
            }
          });

          return {
            notifications: state.notifications.map((n) => ({ 
              ...n, 
              read: true, 
              autoReadTimer: undefined 
            })),
            unreadCount: 0,
          };
        });
      },

      markAsDisplayed: (id) => {
        set((state) => {
          // S'assurer que displayedToasts est un Set
          const currentDisplayedToasts = state.displayedToasts instanceof Set 
            ? state.displayedToasts 
            : new Set(Array.isArray(state.displayedToasts) ? state.displayedToasts : []);
            
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, displayed: true } : n
            ),
            displayedToasts: new Set([...currentDisplayedToasts, id])
          };
        });
      },

      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          const wasUnread = notification && !notification.read;
          
          // Annuler le timer d'auto-marquage si il existe
          if (notification?.autoReadTimer) {
            clearTimeout(notification.autoReadTimer);
          }
          
          const newDisplayedToasts = new Set(state.displayedToasts);
          newDisplayedToasts.delete(id);
          
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            displayedToasts: newDisplayedToasts,
          };
        });
      },

      clearNotifications: (category) => {
        set((state) => {
          let filteredNotifications = state.notifications;
          let removedUnreadCount = 0;
          const newDisplayedToasts = new Set(state.displayedToasts);

          if (category) {
            // Supprimer seulement les notifications de la catégorie spécifiée
            const toRemove = state.notifications.filter(n => n.category === category);
            removedUnreadCount = toRemove.filter(n => !n.read).length;
            
            // Annuler les timers des notifications à supprimer
            toRemove.forEach(n => {
              if (n.autoReadTimer) {
                clearTimeout(n.autoReadTimer);
              }
              newDisplayedToasts.delete(n.id);
            });
            
            filteredNotifications = state.notifications.filter(n => n.category !== category);
          } else {
            // Supprimer toutes les notifications
            removedUnreadCount = state.unreadCount;
            
            // Annuler tous les timers
            state.notifications.forEach(n => {
              if (n.autoReadTimer) {
                clearTimeout(n.autoReadTimer);
              }
            });
            
            filteredNotifications = [];
            newDisplayedToasts.clear();
          }

          return {
            notifications: filteredNotifications,
            unreadCount: Math.max(0, state.unreadCount - removedUnreadCount),
            displayedToasts: newDisplayedToasts,
          };
        });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      toggleCategory: (category) => {
        set((state) => ({
          settings: {
            ...state.settings,
            categories: {
              ...state.settings.categories,
              [category]: !state.settings.categories[category],
            },
          },
        }));
      },

      getNotificationsByCategory: (category) => {
        return get().notifications.filter(n => n.category === category);
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },

      getUndisplayedNotifications: () => {
        return get().notifications.filter(n => !n.read && !n.displayed);
      },

      cleanExpiredNotifications: () => {
        const now = new Date();
        set((state) => {
          const expiredNotifications = state.notifications.filter(n => 
            !n.persistent && n.expiresAt && n.expiresAt <= now
          );
          
          // Annuler les timers des notifications expirées
          expiredNotifications.forEach(n => {
            if (n.autoReadTimer) {
              clearTimeout(n.autoReadTimer);
            }
          });
          
          const validNotifications = state.notifications.filter(n => 
            n.persistent || !n.expiresAt || n.expiresAt > now
          );
          
          const removedUnreadCount = expiredNotifications
            .filter(n => !n.read)
            .length;

          // Nettoyer aussi les toasts affichés
          const newDisplayedToasts = new Set(state.displayedToasts);
          expiredNotifications.forEach(n => newDisplayedToasts.delete(n.id));

          return {
            notifications: validNotifications,
            unreadCount: Math.max(0, state.unreadCount - removedUnreadCount),
            displayedToasts: newDisplayedToasts,
          };
        });
      },
    }),
    {
      name: 'notifications-storage-v4',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        // Migration depuis l'ancienne version
        if (version < 4) {
          return {
            notifications: [],
            settings: defaultSettings,
            unreadCount: 0,
            displayedToasts: new Set(),
          };
        }
        return persistedState;
      },
    }
  )
);

// Hook pour nettoyer automatiquement les notifications expirées
export const useNotificationCleanup = () => {
  const cleanExpiredNotifications = useNotificationStore(state => state.cleanExpiredNotifications);
  
  React.useEffect(() => {
    // Nettoyer immédiatement
    cleanExpiredNotifications();
    
    // Nettoyer toutes les heures
    const interval = setInterval(cleanExpiredNotifications, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [cleanExpiredNotifications]);
};

// Fonctions utilitaires pour créer des notifications typées
export const createNotification = {
  success: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'success' as const,
    category: 'system' as NotificationCategory,
    ...options,
  }),
  
  error: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'error' as const,
    category: 'system' as NotificationCategory,
    persistent: true, // Les erreurs sont persistantes par défaut
    ...options,
  }),
  
  warning: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'warning' as const,
    category: 'system' as NotificationCategory,
    ...options,
  }),
  
  info: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'info' as const,
    category: 'system' as NotificationCategory,
    ...options,
  }),
  
  attack: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'info' as const,
    category: 'attack' as NotificationCategory,
    actionable: true,
    ...options,
  }),
  
  scenario: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'info' as const,
    category: 'scenario' as NotificationCategory,
    actionable: true,
    ...options,
  }),
  
  security: (title: string, message: string, options?: Partial<Notification>) => ({
    title,
    message,
    type: 'warning' as const,
    category: 'security' as NotificationCategory,
    persistent: true,
    ...options,
  }),
};
