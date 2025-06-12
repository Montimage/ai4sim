import React from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { TOOLS } from '../../../constants/tools';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

type StatusType = 'implemented' | 'in-progress' | 'not-implemented';

const STATUS_ICONS: Record<StatusType, { icon: typeof CheckCircleIcon, class: string }> = {
  implemented: { icon: CheckCircleIcon, class: 'text-green-500' },
  'in-progress': { icon: ClockIcon, class: 'text-yellow-500' },
  'not-implemented': { icon: XCircleIcon, class: 'text-gray-400' }
};

interface ToolListProps {
  tabId: string;
}

export const ToolList: React.FC<ToolListProps> = ({ tabId }) => {
  const tabState = useAttackStore(state => state.getTabState(tabId));
  const handleToolSelect = useAttackStore(state => state.handleToolSelect);
  // Check both status and isRunning
  const isRunning = tabState?.status === 'running' || tabState?.isRunning;

  const filteredTools = React.useMemo(() => {
    if (!tabState?.selectedCategory || tabState.selectedCategory === 'ALL') return TOOLS;
    return TOOLS.filter(tool => tool.type === tabState.selectedCategory);
  }, [tabState?.selectedCategory]);

  const onToolSelect = (toolId: string) => {
    if (!isRunning) {
      handleToolSelect(tabId, toolId);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - HAUTEUR FIXE */}
      <div className="flex-shrink-0 h-20 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Available Tools
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredTools.length} tools available in {tabState?.selectedCategory || 'All'} category
        </p>
      </div>

      {/* Tools List - HAUTEUR CALCULÉE FIXE */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ height: 'calc(100% - 96px)' }}
      >
      <div className="space-y-3">
        {filteredTools.map((tool) => {
          const StatusIcon = STATUS_ICONS[tool.status as StatusType]?.icon;
          const isSelected = tabState?.selectedTool === tool.id;
          const isDisabled = isRunning && !isSelected;

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all h-24 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isDisabled}
            >
                <div className="flex justify-between items-start h-full">
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {tool.name}
                    </h3>
                    {isRunning && isSelected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                        Running
                      </span>
                    )}
                  </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {tool.description}
                  </p>
                    </div>
                  
                  {/* Tool Status */}
                    <div className="flex items-center space-x-2 mt-1">
                    {StatusIcon && (
                        <StatusIcon className={`h-3 w-3 ${STATUS_ICONS[tool.status as StatusType].class}`} />
                    )}
                    <span className={`text-xs font-medium capitalize ${STATUS_ICONS[tool.status as StatusType].class}`}>
                      {tool.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                
                {/* Attack count if available */}
                {tool.attacks && tool.attacks.length > 0 && (
                    <div className="ml-4 text-right flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      {tool.attacks.length} attack{tool.attacks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        
        {filteredTools.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No tools available in this category
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
