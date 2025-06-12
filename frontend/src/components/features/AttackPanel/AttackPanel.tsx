import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAttackStore } from '../../../store/attackStore';
import { InitialChoiceDialog } from './InitialChoiceDialog';
import { CategorySelector } from './CategorySelector';
import { ToolList } from './ToolList';
import { ConfigPanel } from './ConfigPanel';
import { OutputPanel } from './OutputPanel';
import MultiOutputPanel from './MultiOutputPanel';
import { TabsManager } from './TabsManager';
import { FullAIAssessment } from './FullAIAssessment';
import { ConfigurationManager } from './ConfigurationManager';
import { TOOLS } from '../../../constants/tools';
import { 
  BoltIcon, 
  Cog6ToothIcon,
  CommandLineIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useNotificationStore } from '../../../store/notificationStore';

export const AttackPanel: React.FC = () => {
  const { 
    openTabs, 
    activeTabId, 
    addTab, 
    getTabState,
    updateTabState,
    setCurrentView,
    currentView: storeCurrentView,
    loadConfig,
    setInitialChoice
  } = useAttackStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [showInitialChoice, setShowInitialChoice] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(40); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTabState = activeTabId ? getTabState(activeTabId) : null;

  // Récupérer l'objet Tool complet à partir de l'ID
  const getSelectedTool = () => {
    if (!activeTabState?.selectedTool) return null;
    return TOOLS.find(tool => tool.id === activeTabState.selectedTool) || null;
  };

  const selectedTool = getSelectedTool();

  useEffect(() => {
    if (openTabs.length === 0) {
      setShowInitialChoice(true);
    } else {
      setShowInitialChoice(false);
    }
  }, [openTabs.length]);

  const handleInitialChoice = (choice: 'new-session' | 'manage-configs' | 'import-config') => {
    switch (choice) {
      case 'new-session':
        addTab();
        setShowInitialChoice(false);
        setCurrentView('attack');
        break;
      case 'manage-configs':
        setCurrentView('config-manager');
        setInitialChoice(false);
        setShowInitialChoice(false);
        break;
      case 'import-config':
        fileInputRef.current?.click();
        break;
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          loadConfig(config);
          setShowInitialChoice(false);
          addNotification({
            message: 'Configuration imported successfully',
            type: 'success',
            category: 'system',
            title: 'Import Complete'
          });
        } catch (error) {
          addNotification({
            message: 'Failed to import configuration: Invalid file format',
            type: 'error',
            category: 'system',
            title: 'Import Error'
          });
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
  };

  const handleCreateTab = () => {
    addTab();
    setShowInitialChoice(false);
  };

  // Navigation handlers - utilise le store pour gérer l'état
  const handleBackToCategories = () => {
    if (activeTabId) {
      updateTabState(activeTabId, { 
        selectedTool: undefined,
        selectedAttack: undefined,
        selectedCategory: undefined
      });
    }
  };

  const handleBackToTools = () => {
    if (activeTabId) {
      updateTabState(activeTabId, { 
        selectedTool: undefined,
        selectedAttack: undefined
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const containerWidth = window.innerWidth;
    const newWidth = Math.min(Math.max((e.clientX / containerWidth) * 100, 20), 80);
    setLeftPanelWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Détermine quelle vue afficher basée sur l'état du tab actif
  const getCurrentView = () => {
    if (!activeTabState) return 'categories';
    
    // Si Shennina est sélectionné, afficher directement Full AI Assessment
    if (selectedTool?.name === 'Shennina') {
      return 'full-ai-assessment';
    }
    
    // Vérifier si c'est le mode Full AI Assessment
    if (activeTabState.category === 'FULL_AI_ASSESSMENT') {
      return 'full-ai-assessment';
    }
    
    if (activeTabState.selectedTool && activeTabState.selectedAttack) {
      return 'config';
    } else if (activeTabState.selectedCategory) {
      return 'tools';
    } else {
      return 'categories';
    }
  };

  const currentView = getCurrentView();

  // Helper function to render the appropriate output panel
  const renderOutputPanel = () => {
    if (!activeTabId || currentView !== 'config') return null;
    
    const tabState = useAttackStore.getState().tabStates[activeTabId];
    const selectedTool = tabState?.selectedTool ? TOOLS.find(t => t.id === tabState.selectedTool) : null;
    
    // Utiliser MultiOutputPanel si l'outil a des outputs multiples
    if (selectedTool?.multiOutput?.enabled) {
      return <MultiOutputPanel tabId={activeTabId} />;
    } else {
      return <OutputPanel tabId={activeTabId} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header - HAUTEUR FIXE */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 h-20">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BoltIcon className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Attack Panel
              </h1>
            </div>
            {!showInitialChoice && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {openTabs.length} tab{openTabs.length !== 1 ? 's' : ''} open
              </div>
            )}
          </div>
          
          {showInitialChoice && (
            <button
              onClick={handleCreateTab}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Tab
            </button>
          )}
        </div>
      </div>

      {/* Tabs - HAUTEUR FIXE */}
      {!showInitialChoice && (
        <div className="flex-shrink-0 h-12">
          <TabsManager />
        </div>
      )}

      {/* Main Content - HAUTEUR CALCULÉE FIXE */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Configuration Manager */}
        {storeCurrentView === 'config-manager' && (
          <div className="w-full h-full">
            <ConfigurationManager />
          </div>
        )}

        {/* Si c'est Full AI Assessment (Shennina), afficher directement cette interface */}
        {currentView === 'full-ai-assessment' && activeTabId && storeCurrentView !== 'config-manager' && (
          <div className="w-full h-full">
            <FullAIAssessment tabId={activeTabId} />
          </div>
        )}

        {/* Interface normale pour les autres outils */}
        {currentView !== 'full-ai-assessment' && storeCurrentView !== 'config-manager' && (
          <>
            {/* Left Panel - Tool Selection & Configuration - LARGEUR VARIABLE MAIS HAUTEUR FIXE */}
            <div 
              className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
              style={{ 
                width: `${leftPanelWidth}%`, 
                minWidth: '320px', 
                maxWidth: '600px',
                height: '100%'
              }}
            >
              {/* Navigation Breadcrumb - HAUTEUR FIXE */}
              {!showInitialChoice && activeTabState && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 h-16">
                  <div className="flex items-center space-x-2 text-sm h-full">
                    {currentView === 'categories' && (
                      <div className="flex items-center text-primary-600 font-medium">
                        <Cog6ToothIcon className="w-4 h-4 mr-1" />
                        Categories
                      </div>
                    )}
                    
                    {currentView === 'tools' && (
                      <>
                        <button
                          onClick={handleBackToCategories}
                          className="flex items-center text-gray-500 hover:text-primary-600 transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-1" />
                          Categories
                        </button>
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center text-primary-600 font-medium">
                          <BoltIcon className="w-4 h-4 mr-1" />
                          {activeTabState.selectedCategory}
                        </div>
                      </>
                    )}
                    
                    {currentView === 'config' && (
                      <>
                        <button
                          onClick={handleBackToCategories}
                          className="flex items-center text-gray-500 hover:text-primary-600 transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-1" />
                          Categories
                        </button>
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        <button
                          onClick={handleBackToTools}
                          className="flex items-center text-gray-500 hover:text-primary-600 transition-colors"
                        >
                          <BoltIcon className="w-4 h-4 mr-1" />
                          {activeTabState.selectedCategory}
                        </button>
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center text-primary-600 font-medium">
                          <CommandLineIcon className="w-4 h-4 mr-1" />
                          {selectedTool?.name}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Content Area - HAUTEUR CALCULÉE FIXE */}
              <div className="flex-1 overflow-hidden">
                {currentView === 'categories' && activeTabId && (
                  <motion.div
                    key="categories"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden p-4"
                  >
                    <CategorySelector tabId={activeTabId} />
                  </motion.div>
                )}

                {currentView === 'tools' && activeTabId && (
                  <motion.div
                    key="tools"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden p-4"
                  >
                    <ToolList tabId={activeTabId} />
                  </motion.div>
                )}

                {currentView === 'config' && activeTabId && (
                  <motion.div
                    key="config"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden"
                  >
                    <ConfigPanel tabId={activeTabId} />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Resizer - LARGEUR FIXE */}
            <div
              className="w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              onMouseDown={handleMouseDown}
            />

            {/* Right Panel - Output - LARGEUR CALCULÉE FIXE */}
            <div 
              className="bg-white dark:bg-gray-800 flex flex-col overflow-hidden"
              style={{ 
                width: `${100 - leftPanelWidth}%`,
                height: '100%'
              }}
            >
              {renderOutputPanel()}
              
              {currentView !== 'config' && (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <CommandLineIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-medium mb-2">No Output</h3>
                    <p className="text-sm">Configure and run an attack to see output here</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Initial Choice Dialog */}
      {showInitialChoice && (
        <InitialChoiceDialog onChoice={handleInitialChoice} />
      )}

      {/* Hidden file input for configuration import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </div>
  );
};
