// Système de logging pour le frontend
import { useNotificationStore } from '../store/notificationStore';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${message}`, ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
    
    // En développement, afficher aussi une notification
    if (this.isDevelopment) {
      const notificationStore = useNotificationStore.getState();
      notificationStore.addNotification({
        title: 'Debug Warning',
        message: `Debug: ${message}`,
        type: 'warning',
        category: 'system'
      });
    }
  }
  
  error(message: string, error?: Error | any, showNotification = false) {
    console.error(`❌ [ERROR] ${message}`, error);
    
    // Afficher une notification pour les erreurs importantes
    if (showNotification) {
      const notificationStore = useNotificationStore.getState();
      notificationStore.addNotification({
        title: 'Error',
        message: message,
        type: 'error',
        category: 'system'
      });
    }
  }
  
  // Méthode spéciale pour les erreurs API
  apiError(operation: string, error: any, showNotification = true) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Erreur inconnue';
    this.error(`API Error - ${operation}: ${errorMessage}`, error, showNotification);
  }
  
  // Méthode pour les erreurs de WebSocket
  websocketError(event: string, error: any) {
    this.error(`WebSocket Error - ${event}:`, error, false);
  }
  
  // Méthode pour traquer les performances
  performance(operation: string, duration: number) {
    if (this.isDevelopment) {
      const message = `Performance - ${operation}: ${duration}ms`;
      if (duration > 1000) {
        this.warn(message);
      } else {
        this.debug(message);
      }
    }
  }
}

export const logger = new Logger();

// Hook pour utiliser le logger avec les notifications
export const useLogger = () => {
  const { addNotification } = useNotificationStore();
  
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    apiError: logger.apiError.bind(logger),
    websocketError: logger.websocketError.bind(logger),
    performance: logger.performance.bind(logger),
    
    // Méthodes avec notifications automatiques
    notifyError: (message: string, error?: any) => {
      logger.error(message, error);
      addNotification({
        title: 'Error',
        message: message,
        type: 'error',
        category: 'system'
      });
    },
    
    notifyWarning: (message: string) => {
      logger.warn(message);
      addNotification({
        title: 'Warning',
        message: message,
        type: 'warning',
        category: 'system'
      });
    },
    
    notifySuccess: (message: string) => {
      logger.info(message);
      addNotification({
        title: 'Success',
        message: message,
        type: 'success',
        category: 'system'
      });
    }
  };
}; 