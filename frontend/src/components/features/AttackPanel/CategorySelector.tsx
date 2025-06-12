import React from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { BeakerIcon, BoltIcon, CommandLineIcon, WrenchIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
  {
    id: 'ALL',
    name: 'All Tools',
    description: 'View all available tools',
    Icon: WrenchIcon,
    count: 5
  },
  {
    id: 'FUZZING',
    name: 'Smart Fuzzing',
    description: 'AI-powered fuzzing tools',
    Icon: BeakerIcon,
    count: 2
  },
  {
    id: 'SIMULATION',
    name: 'Attack Simulation',
    description: 'Advanced simulation tools',
    Icon: BoltIcon,
    count: 1
  },
  {
    id: 'FRAMEWORK',
    name: 'Frameworks',
    description: 'Complete attack frameworks',
    Icon: CommandLineIcon,
    count: 2
  }
];

export const CategorySelector: React.FC<{ tabId: string }> = ({ tabId }) => {
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  const updateTabState = useAttackStore(state => state.updateTabState);
  const isRunning = useAttackStore(state => state.tabStates[tabId]?.status === 'running');

  const handleCategorySelect = (category: string) => {
    if (!isRunning) {
      updateTabState(tabId, { selectedCategory: category });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - HAUTEUR FIXE */}
      <div className="flex-shrink-0 h-20 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Attack Categories
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose a category to view available tools
        </p>
      </div>
      
      {/* Categories Grid - HAUTEUR CALCULÉE FIXE */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ height: 'calc(100% - 96px)' }}
      >
      <div className="grid grid-cols-1 gap-3">
        {CATEGORIES.map(({ id, name, description, Icon, count }) => {
          const isSelected = tabState?.selectedCategory === id;
          
          return (
            <button
              key={id}
              onClick={() => handleCategorySelect(id)}
                className={`flex items-center gap-4 w-full p-4 rounded-lg border-2 transition-all duration-200 text-left h-20 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isRunning}
            >
                <div className={`p-3 rounded-lg flex-shrink-0 ${
                isSelected 
                  ? 'bg-primary-100 dark:bg-primary-800' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <Icon className={`h-6 w-6 ${
                  isSelected 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {name}
                </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {description}
                </p>
              </div>
              
                <div className="text-right flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isSelected
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {count} tools
                </span>
              </div>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
};
