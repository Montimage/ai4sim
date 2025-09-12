import React from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { useTabOutputPersistence } from '../../../hooks/useTabOutputPersistence';

interface TabOutputTestProps {
  tabId: string;
}

/**
 * Composant de test pour vérifier le système de persistance des outputs
 */
export const TabOutputTest: React.FC<TabOutputTestProps> = ({ tabId }) => {
  const { addPersistentOutput, tabStates } = useAttackStore();
  useTabOutputPersistence(tabId);
  
  const tabState = tabStates[tabId];
  const outputCount = tabState?.output?.length || 0;
  const cacheCount = tabState?.outputCache?.length || 0;
  const persistentCount = tabState?.persistentOutput?.length || 0;

  const handleAddTestOutput = () => {
    const timestamp = new Date().toLocaleTimeString();
    addPersistentOutput(tabId, `🧪 Test output added at ${timestamp}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Output Persistence Test - Tab {tabId}
      </h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-400">Current Output</h4>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{outputCount}</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 dark:text-green-400">Output Cache</h4>
          <p className="text-2xl font-bold text-green-600 dark:text-green-300">{cacheCount}</p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900 dark:text-purple-400">Persistent Output</h4>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">{persistentCount}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleAddTestOutput}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Test Output
        </button>
      </div>

      {tabState && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Debug Info:</h4>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
            {JSON.stringify({
              hasOutput: !!tabState.output?.length,
              hasCache: !!tabState.outputCache?.length,
              hasPersistent: !!tabState.persistentOutput?.length,
              lastUpdate: tabState.lastOutputUpdate
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
