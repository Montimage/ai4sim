import React, { useState } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { PlusIcon, XMarkIcon, XCircleIcon, ArrowDownTrayIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';

export const TabsManager: React.FC = () => {
  const openTabs = useAttackStore((state) => state.openTabs);
  const activeTabId = useAttackStore((state) => state.activeTabId);
  const theme = useThemeStore((state) => state.theme);
  const addTab = useAttackStore((state) => state.addTab);
  const closeTab = useAttackStore((state) => state.closeTab);
  const setActiveTab = useAttackStore((state) => state.setActiveTab);
  const closeAllTabs = useAttackStore((state) => state.closeAllTabs);
  const exportTabs = useAttackStore((state) => state.exportTabs);
  const saveConfig = useAttackStore((state) => state.saveConfig);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');

  const handleCloseAllTabs = () => {
    setShowConfirmDialog(false);
    closeAllTabs();
  };

  const handleExport = () => {
    const config = exportTabs();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai4sim-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = async () => {
    if (!isAuthenticated) {
      addNotification({
        message: 'Please login to save configurations',
        type: 'error',
        category: 'system',
        title: 'Authentication Required'
      });
      navigate('/login');
      return;
    }

    try {
      await saveConfig(configName);
      setShowSaveDialog(false);
      setConfigName('');
      addNotification({
        message: 'Configuration saved successfully',
        type: 'success',
        category: 'system',
        title: 'Save Success'
      });
    } catch (error) {
      addNotification({
        message: error instanceof Error ? error.message : 'Failed to save configuration',
        type: 'error',
        category: 'system',
        title: 'Save Error'
      });
      
      if (error instanceof Error && error.message.includes('Please login')) {
        navigate('/login');
      }
    }
  };

  const handleAddTab = () => {
    addTab();
  };

  return (
    <>
      <div className={`flex items-center border-b ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700/50' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex-1 flex items-center overflow-x-auto">
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex items-center h-full px-4 py-2.5 cursor-pointer border-r relative ${
                activeTabId === tab.id
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-100 border-r-gray-600'
                    : 'bg-white text-gray-800 border-r-gray-200'
                  : theme === 'dark'
                  ? 'bg-gray-800 text-gray-400 hover:text-gray-200 border-r-gray-700/50 hover:bg-gray-700/50'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900 border-r-gray-200 hover:bg-gray-100'
              } ${
                activeTabId === tab.id && theme === 'dark'
                  ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500'
                  : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mr-3 select-none">{tab.name}</span>
              <button
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                  theme === 'dark'
                    ? 'hover:bg-red-500/20 hover:text-red-400'
                    : 'hover:bg-red-50 hover:text-red-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddTab}
            className={`p-2 rounded-md transition-colors flex items-center ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="New tab"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
        {openTabs.length > 0 && (
          <div className={`flex items-center h-full gap-2 px-3 border-l ${
            theme === 'dark' ? 'border-l-gray-700/50' : 'border-l-gray-200'
          }`}>
            <button
              onClick={() => setShowSaveDialog(true)}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Save configuration"
            >
              <BookmarkIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Export configuration"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowConfirmDialog(true)}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Close all tabs"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Save Configuration Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          } p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}>
            <h3 className={`text-lg font-medium mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Save Configuration
            </h3>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Configuration name"
              className={`w-full px-3 py-2 rounded-lg border mb-4 ${
                theme === 'light'
                  ? 'border-gray-300 focus:border-indigo-500'
                  : 'border-gray-600 bg-gray-700 text-white focus:border-indigo-500'
              }`}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className={`px-4 py-2 rounded ${
                  theme === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!configName.trim()}
                className={`px-4 py-2 rounded ${
                  configName.trim()
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    : 'bg-gray-400 cursor-not-allowed text-gray-200'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${
            theme === 'light' ? 'bg-white' : 'bg-gray-800'
          } p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}>
            <h3 className={`text-lg font-medium mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Close all tabs?
            </h3>
            <p className={`mb-6 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              This action will close all open tabs. Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className={`px-4 py-2 rounded ${
                  theme === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseAllTabs}
                className={`px-4 py-2 rounded ${
                  theme === 'dark'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Close all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
