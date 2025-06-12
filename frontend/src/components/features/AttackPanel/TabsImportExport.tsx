import React, { useState } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import { useAttackStore } from '../../../store/attackStore';
import { DocumentArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useNotificationStore } from '../../../store/notificationStore';

export const TabsImportExport: React.FC = () => {
  const theme = useThemeStore(state => state.theme);
  const { exportTabs, importTabs } = useAttackStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const config = exportTabs();
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attack-tabs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Configuration exported successfully',
        category: 'system',
        title: 'Export Success'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to export configuration',
        category: 'system',
        title: 'Export Error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const config = JSON.parse(text);
      
      if (!config.tabs || !Array.isArray(config.tabs)) {
        throw new Error('Invalid configuration format');
      }

      importTabs(config);
      setShowImportDialog(false);
      
      addNotification({
        type: 'success',
        message: `Successfully imported ${config.tabs.length} tab(s)`,
        category: 'system',
        title: 'Import Success'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to import configuration: Invalid file format',
        category: 'system',
        title: 'Import Error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        disabled={isProcessing}
        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          ${theme === 'dark' 
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
      >
        <DocumentArrowDownIcon className={`w-4 h-4 ${isProcessing ? 'animate-pulse' : ''}`} />
        Export Tabs
      </button>
      
      <button
        onClick={() => setShowImportDialog(true)}
        disabled={isProcessing}
        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          ${theme === 'dark'
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
      >
        <DocumentArrowUpIcon className={`w-4 h-4 ${isProcessing ? 'animate-pulse' : ''}`} />
        Import Tabs
      </button>

      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-xl max-w-md w-full mx-4
            ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          >
            <h3 className="text-lg font-semibold mb-4">Import Tabs Configuration</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select a configuration file (.json) to import your tabs setup
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isProcessing}
              className={`block w-full text-sm mb-4 p-2 rounded border
                ${theme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-300 bg-gray-50'}
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportDialog(false)}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-lg
                  ${theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
