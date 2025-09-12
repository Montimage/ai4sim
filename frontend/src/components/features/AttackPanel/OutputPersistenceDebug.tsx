import React from 'react';
import { useAttackStore } from '../../../store/attackStore';

export const OutputPersistenceDebug: React.FC<{ tabId: string }> = ({ tabId }) => {
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  
  if (!tabState) return null;

  const {
    output = [],
    outputCache = [],
    persistentOutput = [],
    outputTimestamps = [],
    multiOutputs = {}
  } = tabState;

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs space-y-2">
      <h4 className="font-bold text-blue-600 dark:text-blue-400">Debug Info for Tab {tabId}</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold">Regular Output:</div>
          <div>Count: {output.length}</div>
          <div>Latest: {output[output.length - 1]?.substring(0, 50) || 'None'}...</div>
        </div>
        
        <div>
          <div className="font-semibold">Persistent Output:</div>
          <div>Count: {persistentOutput.length}</div>
          <div>Latest: {persistentOutput[persistentOutput.length - 1]?.substring(0, 50) || 'None'}...</div>
        </div>
        
        <div>
          <div className="font-semibold">Output Cache:</div>
          <div>Count: {outputCache.length}</div>
          <div>Latest: {outputCache[outputCache.length - 1]?.substring(0, 50) || 'None'}...</div>
        </div>
        
        <div>
          <div className="font-semibold">Timestamps:</div>
          <div>Count: {outputTimestamps.length}</div>
          <div>Latest: {outputTimestamps[outputTimestamps.length - 1] ? new Date(outputTimestamps[outputTimestamps.length - 1]).toLocaleTimeString() : 'None'}</div>
        </div>
        
        <div>
          <div className="font-semibold">Multi Outputs:</div>
          <div>Keys: {Object.keys(multiOutputs).join(', ') || 'None'}</div>
          {Object.entries(multiOutputs).map(([key, outputs]) => (
            <div key={key}>
              {key}: {outputs.length} outputs
            </div>
          ))}
        </div>
        
        <div>
          <div className="font-semibold">Tab State:</div>
          <div>Status: {tabState.status}</div>
          <div>Running: {tabState.isRunning ? 'Yes' : 'No'}</div>
          <div>Tool: {tabState.selectedTool || 'None'}</div>
        </div>
      </div>
    </div>
  );
};

export default OutputPersistenceDebug;
