import React, { useEffect, useState, useCallback } from 'react';
import { useNotificationStore, Notification } from '../../../store/notificationStore';
import { useThemeStore } from '../../../store/themeStore';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ToastProps {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose, onMarkAsRead }) => {
  const theme = useThemeStore(state => state.theme);
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Marquer automatiquement comme lu après le délai configuré si pas persistant
    if (!notification.persistent && !notification.read) {
      const timer = setTimeout(() => {
        onMarkAsRead();
      }, 3000); // 3 secondes
      return () => clearTimeout(timer);
    }
  }, [notification.persistent, notification.read, onMarkAsRead]);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(onClose, 300); // Attendre la fin de l'animation
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`max-w-lg min-w-[400px] w-full ${
          theme === 'light' ? 'bg-white' : 'bg-gray-800'
        } shadow-lg rounded-lg pointer-events-auto border-l-4 ${getBorderColor()}`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className={`text-sm font-medium ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {notification.title}
              </p>
              <p className={`mt-1 text-sm ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-300'
              }`}>
                {notification.message}
              </p>
              {/* Indicateur de catégorie */}
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  notification.category === 'attack' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  notification.category === 'security' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  notification.category === 'scenario' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  notification.category === 'project' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  notification.category === 'campaign' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                  notification.category === 'performance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {notification.category === 'attack' ? 'Attack' :
                   notification.category === 'security' ? 'Security' :
                   notification.category === 'scenario' ? 'Scenario' :
                   notification.category === 'project' ? 'Project' :
                   notification.category === 'campaign' ? 'Campaign' :
                   notification.category === 'performance' ? 'Performance' :
                   'System'}
                </span>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className={`rounded-md inline-flex ${
                  theme === 'light' 
                    ? 'text-gray-400 hover:text-gray-500' 
                    : 'text-gray-500 hover:text-gray-400'
                } focus:outline-none`}
                onClick={handleClose}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationToastContainer: React.FC = () => {
  const { 
    notifications, 
    settings, 
    markAsRead, 
    markAsDisplayed, 
    getUndisplayedNotifications 
  } = useNotificationStore();
  
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  // Fonction pour gérer la fermeture d'un toast
  const handleCloseToast = useCallback((notificationId: string) => {
    setActiveToasts(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Fonction pour marquer une notification comme lue
  const handleMarkAsRead = useCallback((notificationId: string) => {
    markAsRead(notificationId);
    // Fermer le toast après marquage comme lu (sauf si persistant)
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification?.persistent) {
      setTimeout(() => handleCloseToast(notificationId), 1000);
    }
  }, [markAsRead, notifications, handleCloseToast]);

  // Effet pour gérer l'affichage des nouvelles notifications
  useEffect(() => {
    if (!settings.showToasts) {
      setActiveToasts([]);
      return;
    }

    // Récupérer les notifications non affichées et non lues
    const undisplayedNotifications = getUndisplayedNotifications()
      .slice(0, 3); // Limiter à 3 toasts max

    if (undisplayedNotifications.length > 0) {
      // Marquer immédiatement comme affichées pour éviter les doublons
      undisplayedNotifications.forEach(notification => {
        markAsDisplayed(notification.id);
      });

      // Ajouter aux toasts actifs
      setActiveToasts(prev => {
        const newToasts = [...undisplayedNotifications, ...prev].slice(0, 3);
        return newToasts;
      });

      // Programmer la fermeture automatique pour les notifications non persistantes
      undisplayedNotifications.forEach(notification => {
        if (!notification.persistent) {
          setTimeout(() => {
            handleCloseToast(notification.id);
          }, settings.autoHideDelay);
        }
      });
    }

    // Nettoyer les toasts des notifications supprimées
    const currentNotificationIds = new Set(notifications.map(n => n.id));
    setActiveToasts(prev => 
      prev.filter(toast => currentNotificationIds.has(toast.id))
    );
  }, [
    notifications, 
    settings.showToasts, 
    settings.autoHideDelay, 
    getUndisplayedNotifications, 
    markAsDisplayed, 
    handleCloseToast
  ]);

  if (!settings.showToasts || activeToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {activeToasts.map(notification => (
        <Toast
          key={`toast-${notification.id}`}
          notification={notification}
          onClose={() => handleCloseToast(notification.id)}
          onMarkAsRead={() => handleMarkAsRead(notification.id)}
        />
      ))}
    </div>
  );
}; 