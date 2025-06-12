import React, { useRef, useEffect } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { useThemeStore } from '../../../store/themeStore';
import { ClipboardIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

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
const formatTimestamp = (index: number): string => {
  const now = new Date();
  // Simulate timestamps based on message index (for demo purposes)
  const timestamp = new Date(now.getTime() - (1000 * (100 - index)));
  return timestamp.toLocaleTimeString();
};

export const OutputPanel: React.FC<{ tabId: string }> = ({ tabId }) => {
  const output = useAttackStore(state => state.tabStates[tabId]?.output || []);
  const clearOutput = useAttackStore(state => state.clearOutput);
  const theme = useThemeStore(state => state.theme);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll au bas de la console quand de nouveaux logs arrivent
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output.join('\n'));
  };

  const handleClear = () => {
    clearOutput(tabId);
  };

  const handleExport = () => {
    const blob = new Blob([output.join('\n')], { type: 'text/plain' });
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
        {output.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            No output yet
          </div>
        ) : (
          <div className="space-y-1">
            {output.map((line, index) => {
              const messageType = detectMessageType(line);
              const timestamp = formatTimestamp(index);
              
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
