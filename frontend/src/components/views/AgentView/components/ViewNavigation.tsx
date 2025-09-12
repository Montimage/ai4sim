import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  Cog6ToothIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { ViewType } from '../types';

interface ViewNavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onToggleSidebar: () => void;
  onShowSettings: () => void;
  sidebarVisible: boolean;
  hasActiveSession?: boolean;
}

const ViewNavigation: React.FC<ViewNavigationProps> = ({
  currentView,
  onViewChange,
  onToggleSidebar,
  onShowSettings,
  sidebarVisible,
  hasActiveSession = false
}) => {
  const navItems = [
    {
      id: 'chat' as ViewType,
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      description: 'Interface de chat avec l\'agent IA'
    },
    {
      id: 'pipeline' as ViewType,
      label: 'Pipeline',
      icon: CommandLineIcon,
      description: 'Suivi des tests de pénétration',
      badge: hasActiveSession
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Sidebar toggle and navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-lg transition-colors ${
              sidebarVisible 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={sidebarVisible ? 'Masquer la sidebar' : 'Afficher la sidebar'}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          {/* View Navigation */}
          <nav className="flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === item.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }`}
                title={item.description}
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  )}
                </div>
                
                {/* Active indicator */}
                {currentView === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-lg -z-10"
                    initial={false}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Settings */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onShowSettings}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Paramètres"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewNavigation;
