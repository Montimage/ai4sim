import React from 'react';
import { useAttackStore } from '../../store/attackStore';
import { useThemeStore } from '../../store/themeStore';
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNotificationStore } from '../../store/notificationStore';

export const SavedConfigsView: React.FC = () => {
  const { savedConfigs, loadConfig, deleteConfig } = useAttackStore();
  const { theme } = useThemeStore();
  const addNotification = useNotificationStore(state => state.addNotification);

  const handleLoadConfig = (config: any) => {
    loadConfig(config);
    addNotification({
      message: `Loaded configuration: ${config.name || 'Unnamed configuration'}`,
      type: 'success',
      category: 'system',
      title: 'Configuration Loaded'
    });
  };

  const handleDeleteConfig = (config: any) => {
    deleteConfig(config.exportDate);
    addNotification({
      message: `Deleted configuration: ${config.name || 'Unnamed configuration'}`,
      type: 'info',
      category: 'system',
      title: 'Configuration Deleted'
    });
  };

  return (
    <div className={`h-screen p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-7xl mx-auto`}>
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Saved Configurations
          </h1>
          <p className={`mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage your saved attack configurations
          </p>
        </div>

        <div className="grid gap-4">
          {savedConfigs.map((config) => (
            <div 
              key={config.exportDate}
              className={`p-6 rounded-lg flex justify-between items-center ${
                theme === 'dark' 
                  ? 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors' 
                  : 'bg-white border border-gray-200 shadow-sm hover:border-gray-300 transition-colors'
              }`}
            >
              <div>
                <h3 className={`font-semibold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {config.name || 'Unnamed configuration'}
                </h3>
                <div className="mt-1 space-y-1">
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Created on {new Date(config.exportDate).toLocaleDateString()}
                  </p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {config.tabs.length} tab{config.tabs.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleLoadConfig(config)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 border border-gray-600'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                  }`}
                  title="Load configuration"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  <span>Load</span>
                </button>
                
                <button
                  onClick={() => handleDeleteConfig(config)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    theme === 'dark'
                      ? 'text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 border border-red-900/50'
                      : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200'
                  }`}
                  title="Delete configuration"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
          
          {savedConfigs.length === 0 && (
            <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
              theme === 'dark'
                ? 'border-gray-700 text-gray-400'
                : 'border-gray-200 text-gray-500'
            }`}>
              <p className="text-lg">No saved configurations</p>
              <p className="mt-1">Your saved configurations will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
