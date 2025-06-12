import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';
import { StatusBadge } from '../shared/UI/StatusBadge';
import {
  PlusIcon,
  ClockIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications } = useNotificationStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Obtenir les activités récentes (dernières 10)
  const recentActivities = notifications.slice(-10).reverse();

  return (
    <div className="container-padding space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.username}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome to your security testing dashboard
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            onClick={() => navigate('/projects/new')}
            icon={<PlusIcon className="w-4 h-4" />}
          >
            New Project
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/attacks')}
            icon={<BoltIcon className="w-4 h-4" />}
          >
            Launch Attack
          </Button>
        </div>
      </motion.div>

      {/* Notifications et Activités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications récentes */}
        <Card className="flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BellIcon className="w-5 h-5 mr-2 text-blue-500" />
              Recent Notifications
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {notifications.length} total
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto min-w-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <BellIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 8).map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'error' ? 'bg-red-500' :
                        notification.type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Activités récentes */}
        <Card className="flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ClockIcon className="w-5 h-5 mr-2 text-green-500" />
              Recent Activity
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Last 24h
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto min-w-0">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 10).map((activity, activityIndex) => (
                  <motion.div
                    key={`${activity.type}-${activity.timestamp}-${activityIndex}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: activityIndex * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'success' ? 'bg-green-100 dark:bg-green-900' :
                      activity.type === 'error' ? 'bg-red-100 dark:bg-red-900' :
                      activity.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                      'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      {activity.type === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {activity.type === 'error' && <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />}
                      {activity.type === 'warning' && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                      {activity.type === 'info' && <BellIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">All systems operational</p>
              </div>
            </div>
            <StatusBadge status="success" size="sm">
              Healthy
            </StatusBadge>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardView;
