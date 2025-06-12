import React, { useState } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { 
  TrashIcon, 
  ArrowPathIcon, 
  ArrowLeftIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  DocumentTextIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export const ConfigurationManager: React.FC = () => {
  const { 
    savedConfigs, 
    loadConfig, 
    deleteConfig, 
    setCurrentView, 
    loadUserConfigs,
    saveConfig,
    addTab,
    setInitialChoice
  } = useAttackStore();
  const { theme } = useThemeStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLoadConfig = async (config: any) => {
    try {
      setIsLoading(true);
      loadConfig(config);
      addNotification({
        message: `Configuration loaded: ${config.name || 'Unnamed configuration'}`,
        type: 'success',
        category: 'system',
        title: 'Configuration Loaded'
      });
    } catch (error) {
      addNotification({
        message: 'Failed to load configuration',
        type: 'error',
        category: 'system',
        title: 'Load Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfig = async (config: any) => {
    if (!window.confirm(`Are you sure you want to delete "${config.name || 'Unnamed configuration'}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteConfig(config.exportDate);
      addNotification({
        message: `Configuration deleted: ${config.name || 'Unnamed configuration'}`,
        type: 'info',
        category: 'system',
        title: 'Configuration Deleted'
      });
    } catch (error) {
      addNotification({
        message: 'Failed to delete configuration',
        type: 'error',
        category: 'system',
        title: 'Delete Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      await loadUserConfigs();
      addNotification({
        message: 'Configurations refreshed',
        type: 'success',
        category: 'system',
        title: 'Refresh Complete'
      });
    } catch (error) {
      addNotification({
        message: 'Failed to refresh configurations',
        type: 'error',
        category: 'system',
        title: 'Refresh Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurrentConfig = async () => {
    if (!newConfigName.trim()) {
      addNotification({
        message: 'Please enter a configuration name',
        type: 'warning',
        category: 'system',
        title: 'Name Required'
      });
      return;
    }

    try {
      setIsLoading(true);
      await saveConfig(newConfigName.trim());
      setNewConfigName('');
      setShowSaveDialog(false);
      addNotification({
        message: `Configuration saved: ${newConfigName}`,
        type: 'success',
        category: 'system',
        title: 'Configuration Saved'
      });
    } catch (error) {
      addNotification({
        message: 'Failed to save configuration',
        type: 'error',
        category: 'system',
        title: 'Save Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          loadConfig(config);
          addNotification({
            message: 'Configuration imported successfully',
            type: 'success',
            category: 'system',
            title: 'Import Complete'
          });
        } catch (error) {
          addNotification({
            message: 'Failed to import configuration',
            type: 'error',
            category: 'system',
            title: 'Import Error'
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const goBack = () => {
    setCurrentView('dashboard');
    setInitialChoice(false);
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b p-6 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
              }`}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Configuration Manager
              </h1>
              <p className={`mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Manage your saved attack configurations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <PlusCircleIcon className="w-4 h-4 mr-2" />
              Save Current
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Import
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {savedConfigs.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              No configurations saved
            </h3>
            <p className={`mb-6 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Start by creating a new attack session and save it as a configuration
            </p>
            <button
              onClick={() => {
                addTab();
                setInitialChoice(true);
                setCurrentView('attack');
              }}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusCircleIcon className="w-4 h-4 mr-2" />
              Create New Session
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {savedConfigs.map((config) => (
              <div 
                key={config.exportDate}
                className={`p-6 rounded-lg border transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <DocumentTextIcon className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                      }`} />
                      <h3 className={`font-semibold text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {config.name || 'Unnamed configuration'}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {new Date(config.exportDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <TagIcon className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {config.tabs.length} tab{config.tabs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          theme === 'dark' 
                            ? 'bg-blue-900 text-blue-200' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          v{config.version || '1.0.0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleLoadConfig(config)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <ArrowPathIcon className="w-4 h-4 mr-2" />
                      Load
                    </button>
                    
                    <button
                      onClick={() => handleDeleteConfig(config)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-medium mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Save Current Configuration
            </h3>
            
            <input
              type="text"
              value={newConfigName}
              onChange={(e) => setNewConfigName(e.target.value)}
              placeholder="Enter configuration name..."
              className={`w-full px-3 py-2 border rounded-lg mb-4 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              autoFocus
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewConfigName('');
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSaveCurrentConfig}
                disabled={!newConfigName.trim() || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}; 