import React, { useRef, useEffect, useState } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { useThemeStore } from '../../../store/themeStore';
import { useTabOutputPersistence } from '../../../hooks/useTabOutputPersistence';
import { ClipboardIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface OutputPanelProps {
  tabId: string;
}

// Function to detect message type from content
const detectMessageType = (message: string): 'error' | 'warning' | 'success' | 'info' => {
  const lowerMessage = message.toLowerCase();
  
  // Error patterns
  if (lowerMessage.includes('error') || 
      lowerMessage.includes('failed') || 
      lowerMessage.includes('❌') ||
      lowerMessage.includes('cannot connect') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('unable to find') ||
      lowerMessage.includes('daemon') ||
      lowerMessage.includes('process exited with code') && !lowerMessage.includes('code 0') ||
      lowerMessage.includes('permission denied') ||
      lowerMessage.includes('connection refused') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('not found')) {
    return 'error';
  }
  
  // Warning patterns
  if (lowerMessage.includes('warning') || 
      lowerMessage.includes('warn') || 
      lowerMessage.includes('⚠️') ||
      lowerMessage.includes('deprecated') ||
      lowerMessage.includes('caution')) {
    return 'warning';
  }
  
  // Success patterns
  if (lowerMessage.includes('success') || 
      lowerMessage.includes('completed') || 
      lowerMessage.includes('✅') ||
      lowerMessage.includes('🎉') ||
      lowerMessage.includes('finished') ||
      lowerMessage.includes('done') ||
      lowerMessage.includes('process exited with code 0')) {
    return 'success';
  }
  
  return 'info';
};

// Function to format timestamp
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

export const OutputPanel: React.FC<OutputPanelProps> = ({ tabId }) => {
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  const clearOutput = useAttackStore(state => state.clearOutput);
  const clearOutputCache = useAttackStore(state => state.clearOutputCache);
  const theme = useThemeStore(state => state.theme);
  
  const outputRef = useRef<HTMLDivElement>(null);
  const [autoScroll] = useState(true);

  // Utiliser le hook de persistance pour gérer automatiquement la restauration des outputs
  useTabOutputPersistence(tabId);

  // Utiliser le output principal qui est automatiquement synchronisé avec persistentOutput
  const outputs = tabState?.output || [];

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputs, autoScroll]);

  // Forcer la mise à jour quand le tabId change
  useEffect(() => {
    if (outputRef.current && autoScroll) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tabId, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputs.join('\n'));
  };

  const handleClear = () => {
    clearOutput(tabId);
    clearOutputCache(tabId);
  };

  const handleExport = () => {
    const blob = new Blob([outputs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${tabId}-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'light' ? 'bg-white text-gray-900 border-t border-gray-200' : 'bg-gray-900 text-gray-100 border-t border-gray-700'}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
        <h3 className="text-sm font-medium">Console Output</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Copy to clipboard"
          >
            <ClipboardIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Clear output"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Export output"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div 
        ref={outputRef}
        className={`flex-1 overflow-auto p-4 font-mono text-sm ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}
      >
        {outputs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            No output yet
          </div>
        ) : (
          <div className="space-y-1">
            {outputs.map((line, index) => {
              const messageType = detectMessageType(line);
              const timestamps = tabState?.outputTimestamps || [];
              const timestamp = timestamps[index] ? formatTimestamp(timestamps[index]) : formatTimestamp(Date.now());
              
              return (
                <div 
                  key={index}
                  className="py-0.5 flex items-start space-x-2"
                >
                  <span className="text-xs text-gray-500 mt-0.5 min-w-[60px]">
                    {timestamp}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                    messageType === 'error' ? 'bg-red-900 text-red-200' :
                    messageType === 'warning' ? 'bg-yellow-900 text-yellow-200' :
                    messageType === 'success' ? 'bg-green-900 text-green-200' :
                    'bg-blue-900 text-blue-200'
                  }`}>
                    {messageType.toUpperCase()}
                  </span>
                  <span className={`flex-1 whitespace-pre-wrap ${
                    messageType === 'error' ? 'text-red-400' :
                    messageType === 'warning' ? 'text-yellow-400' :
                    messageType === 'success' ? 'text-green-400' :
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {line}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
