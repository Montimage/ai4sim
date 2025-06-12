import React, { useRef, useEffect, useState } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { useThemeStore } from '../../../store/themeStore';
import { TOOLS } from '../../../constants/tools';
import { 
  ClipboardIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  WindowIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

interface MultiOutputPanelProps {
  tabId: string;
}

interface OutputConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  workingDirectory?: string;
  successMessage?: string;
  iframe?: {
    port: number;
    path: string;
  };
}

export const MultiOutputPanel: React.FC<MultiOutputPanelProps> = ({ tabId }) => {
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  const clearMultiOutput = useAttackStore(state => state.clearMultiOutput);
  const clearAllMultiOutputs = useAttackStore(state => state.clearAllMultiOutputs);
  const setActiveOutput = useAttackStore(state => state.setActiveOutput);
  const setOutputViewMode = useAttackStore(state => state.setOutputViewMode);
  const theme = useThemeStore(state => state.theme);
  
  const outputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedTool, setSelectedTool] = useState<any>(null);

  // Récupérer la configuration de l'outil sélectionné
  useEffect(() => {
    if (tabState?.selectedTool) {
      const tool = TOOLS.find(t => t.id === tabState.selectedTool);
      setSelectedTool(tool);
    }
  }, [tabState?.selectedTool]);

  // Auto-scroll pour chaque output
  useEffect(() => {
    if (tabState?.multiOutputs) {
      Object.keys(tabState.multiOutputs).forEach(outputId => {
        const ref = outputRefs.current[outputId];
        if (ref) {
          ref.scrollTop = ref.scrollHeight;
        }
      });
    }
  }, [tabState?.multiOutputs]);

  if (!selectedTool?.multiOutput?.enabled || !tabState?.multiOutputs) {
    return null;
  }

  const { outputs } = selectedTool.multiOutput;
  const { multiOutputs, activeOutput, outputViewMode } = tabState;

  const handleCopy = (outputId: string) => {
    const outputLines = multiOutputs[outputId] || [];
    navigator.clipboard.writeText(outputLines.join('\n'));
  };

  const handleClear = (outputId: string) => {
    clearMultiOutput(tabId, outputId);
  };

  const handleClearAll = () => {
    clearAllMultiOutputs(tabId);
  };

  const handleExport = (outputId: string) => {
    const outputLines = multiOutputs[outputId] || [];
    const outputConfig = outputs.find((o: OutputConfig) => o.id === outputId);
    const blob = new Blob([outputLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outputConfig?.name || outputId}-${tabId}-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleViewModeChange = (mode: 'single' | 'split') => {
    setOutputViewMode(tabId, mode);
  };

  const handleOutputSelect = (outputId: string) => {
    setActiveOutput(tabId, outputId);
  };

  const renderOutputConsole = (outputId: string, outputConfig: OutputConfig, className?: string) => {
    const outputLines = multiOutputs[outputId] || [];
    
    return (
      <div className={`flex flex-col h-full ${className || ''}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              outputLines.length > 0 ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <h4 className="text-sm font-medium">{outputConfig.name}</h4>
            <span className="text-xs text-gray-500">({outputLines.length} lines)</span>
          </div>
          
          <div className="flex gap-1">
            <button 
              onClick={() => handleCopy(outputId)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy to clipboard"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleClear(outputId)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clear output"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleExport(outputId)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Export output"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Console Content */}
        <div 
          ref={(el) => outputRefs.current[outputId] = el}
          className={`flex-1 p-4 overflow-y-auto font-mono text-sm ${
            theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-gray-100'
          }`}
          style={{ minHeight: '200px' }}
        >
          {outputLines.length === 0 ? (
            <div className="text-gray-500 italic">No output yet...</div>
          ) : (
            outputLines.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap break-words">
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${
      theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-gray-100'
    }`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'
      }`}>
        <div className="flex items-center space-x-4">
          <h3 className="text-sm font-medium">Multi Console Output</h3>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('split')}
              className={`p-1 rounded ${
                outputViewMode === 'split' 
                  ? 'bg-white dark:bg-gray-600 shadow' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="Split view"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('single')}
              className={`p-1 rounded ${
                outputViewMode === 'single' 
                  ? 'bg-white dark:bg-gray-600 shadow' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="Single view"
            >
              <WindowIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Output Selector (for single view) */}
          {outputViewMode === 'single' && (
            <div className="flex items-center space-x-2">
              <select
                value={activeOutput || ''}
                onChange={(e) => handleOutputSelect(e.target.value)}
                className={`text-sm border rounded px-2 py-1 ${
                  theme === 'light' 
                    ? 'border-gray-300 bg-white' 
                    : 'border-gray-600 bg-gray-700'
                }`}
              >
                {outputs.map((output: OutputConfig) => (
                  <option key={output.id} value={output.id}>
                    {output.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            title="Clear all outputs"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Output Content */}
      <div className="flex-1 overflow-hidden">
        {outputViewMode === 'split' ? (
          // Split View - Show all outputs side by side
          <div className="h-full flex">
            {outputs.map((output: OutputConfig, index: number) => (
              <React.Fragment key={output.id}>
                {renderOutputConsole(
                  output.id, 
                  output, 
                  `flex-1 ${index > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}`
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          // Single View - Show only active output
          activeOutput && renderOutputConsole(
            activeOutput, 
            outputs.find((o: OutputConfig) => o.id === activeOutput)!
          )
        )}
      </div>
    </div>
  );
};

export default MultiOutputPanel; 