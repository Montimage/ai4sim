import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, Notification, NotificationCategory } from '../../../store/notificationStore';
import { useThemeStore } from '../../../store/themeStore';
import { 
  BellIcon, 
  CheckIcon, 
  XMarkIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FolderIcon,
  BoltIcon,
  ShieldExclamationIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface NotificationsListProps {
  limit?: number;
  showAll?: boolean;
  isDashboard?: boolean;
}

const getCategoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'attack':
      return BoltIcon;
    case 'scenario':
      return FolderIcon;
    case 'project':
      return FolderIcon;
    case 'campaign':
      return FolderIcon;
    case 'security':
      return ShieldExclamationIcon;
    case 'performance':
      return CpuChipIcon;
    default:
      return InformationCircleIcon;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircleIcon;
    case 'error':
      return XCircleIcon;
    case 'warning':
      return ExclamationTriangleIcon;
    default:
      return InformationCircleIcon;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    case 'warning':
      return 'text-yellow-500';
    default:
      return 'text-blue-500';
  }
};

const getCategoryLabel = (category: NotificationCategory) => {
  switch (category) {
    case 'attack':
      return 'Attack';
    case 'scenario':
      return 'Scenario';
    case 'project':
      return 'Project';
    case 'campaign':
      return 'Campaign';
    case 'security':
      return 'Security';
    case 'performance':
      return 'Performance';
    default:
      return 'System';
  }
};

export const NotificationsList: React.FC<NotificationsListProps> = ({ 
  limit, 
  showAll = false,
  isDashboard = false 
}) => {
  const navigate = useNavigate();
  const theme = useThemeStore(state => state.theme);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    settings
  } = useNotificationStore();

  // Filtrer et limiter les notifications
  const displayNotifications = React.useMemo(() => {
    let filtered = [...notifications];
    
    // Trier par timestamp décroissant
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limiter si nécessaire
    if (!showAll && limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [notifications, limit, showAll]);

  const handleNotificationClick = (notification: Notification) => {
    // Marquer comme lu
    markAsRead(notification.id);
    
    // Rediriger si actionable
    if (notification.actionable && notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const formatTime = (date: Date) => {
    try {
      return format(new Date(date), 'HH:mm', { locale: enUS });
    } catch {
      return '';
    }
  };

  const formatDate = (date: Date) => {
    try {
      const now = new Date();
      const notifDate = new Date(date);
      const diffDays = Math.floor((now.getTime() - notifDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return formatTime(date);
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d`;
      } else {
        return format(notifDate, 'dd/MM', { locale: enUS });
      }
    } catch {
      return '';
    }
  };

  if (!settings.enabled) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Notifications disabled</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* En-tête */}
      <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <BellIcon className="h-4 w-4 text-gray-500" />
          <h3 className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}
              title="Mark all as read"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => clearNotifications()}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}
              title="Clear all"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des notifications */}
      <div className={`overflow-y-auto ${isDashboard ? 'max-h-[600px]' : 'max-h-[300px]'}`}>
        {displayNotifications.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayNotifications.map((notification) => {
              const TypeIcon = getTypeIcon(notification.type);
              const CategoryIcon = getCategoryIcon(notification.category);
              
              return (
                <div
                  key={notification.id}
                  className={`p-3 transition-colors ${
                    !notification.read 
                      ? theme === 'light' 
                        ? 'bg-indigo-50 hover:bg-indigo-100' 
                        : 'bg-indigo-900/20 hover:bg-indigo-900/30'
                      : theme === 'light'
                      ? 'hover:bg-gray-50'
                      : 'hover:bg-gray-800/50'
                  } ${notification.actionable ? 'cursor-pointer' : ''}`}
                  onClick={() => notification.actionable && handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Indicateur de statut */}
                    <div className="flex-shrink-0 flex items-center space-x-1">
                      <TypeIcon className={`h-4 w-4 ${getTypeColor(notification.type)}`} />
                      {!notification.read && (
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-1 line-clamp-2 ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {/* Métadonnées */}
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="flex items-center space-x-1">
                              <CategoryIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-500 truncate">
                                {getCategoryLabel(notification.category)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDate(notification.timestamp)}
                            </span>
                            {notification.persistent && (
                              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1 rounded flex-shrink-0">
                                Persistant
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Mark as read"
                            >
                              <CheckIcon className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            <BellIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notification</p>
          </div>
        )}
      </div>

      {/* Pied de page avec lien vers toutes les notifications */}
      {!showAll && notifications.length > (limit || 3) && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => navigate('/notifications')}
            className={`w-full text-center text-sm ${
              theme === 'light' 
                ? 'text-indigo-600 hover:text-indigo-800' 
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            See all notifications ({notifications.length})
          </button>
        </div>
      )}
    </div>
  );
};
