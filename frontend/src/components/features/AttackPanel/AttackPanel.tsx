import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAttackStore } from '../../../store/attackStore';
import { getFilteredTools, Tool, Attack } from '../../../constants/tools';
import { 
  BoltIcon, 
  Cog6ToothIcon, 
  CommandLineIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { globalWebSocketHandler } from '../../../services/globalWebSocketHandler';

// Components
import { TabsManager } from './TabsManager';
import { CategorySelector } from './CategorySelector';
import { ToolList } from './ToolList';
import { ConfigPanel } from './ConfigPanel';
import { OutputPanel } from './OutputPanel';
import { MultiOutputPanel } from './MultiOutputPanel';
import { ViewSwitcher } from './ViewSwitcher';
import { InitialChoiceDialog } from './InitialChoiceDialog';
import { ConfigurationManager } from './ConfigurationManager';
import { FullAIAssessment } from './FullAIAssessment';
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

  // Initialize global WebSocket handler for background processing
  useEffect(() => {
    globalWebSocketHandler.initialize();

    return () => {
      globalWebSocketHandler.destroy();
    };
  }, []);

  // Récupérer l'objet Tool complet à partir de l'ID
  const getSelectedTool = () => {
    if (!activeTabState?.selectedTool) return null;
    return getFilteredTools().find((tool: Tool) => tool.id === activeTabState.selectedTool) || null;
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
        selectedAttack: undefined,
        parameters: {}
      });
    }
  };

  const handleBackToAttacks = () => {
    if (activeTabId) {
      updateTabState(activeTabId, { 
        selectedAttack: undefined,
        parameters: {}
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
    
    // Si un outil est sélectionné
    if (activeTabState.selectedTool) {
      // Si l'outil a plusieurs attaques et qu'aucune attaque n'est sélectionnée
      if (selectedTool?.attacks && selectedTool.attacks.length > 1 && !activeTabState.selectedAttack) {
        return 'attacks';
      }
      // Si une attaque est sélectionnée (ou si l'outil n'a qu'une seule attaque)
      else if (activeTabState.selectedAttack || (selectedTool?.attacks && selectedTool.attacks.length <= 1)) {
        return 'config';
      }
      // Si l'outil n'a pas d'attaques définies, aller directement à la config
      else if (!selectedTool?.attacks || selectedTool.attacks.length === 0) {
        return 'config';
      }
    }
    
    if (activeTabState.selectedCategory) {
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
    const selectedTool = tabState?.selectedTool ? getFilteredTools().find((t: Tool) => t.id === tabState.selectedTool) : null;
    
    // Utiliser ViewSwitcher pour les outils avec iframe
    if (selectedTool?.iframe) {
      const terminalContent = (selectedTool as any)?.multiOutput?.enabled ? (
        <MultiOutputPanel key={`multi-${activeTabId}`} tabId={activeTabId} />
      ) : (
        <OutputPanel key={`output-${activeTabId}`} tabId={activeTabId} />
      );
      
      return (
        <ViewSwitcher tabId={activeTabId}>
          {terminalContent}
        </ViewSwitcher>
      );
    }
    
    // Utiliser MultiOutputPanel si l'outil a des outputs multiples (sans iframe)
    if ((selectedTool as any)?.multiOutput?.enabled || (selectedTool as any)?.sequentialExecution?.enabled) {
      return <MultiOutputPanel key={`multi-${activeTabId}`} tabId={activeTabId} />;
    } else {
      return <OutputPanel key={`output-${activeTabId}`} tabId={activeTabId} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header - HAUTEUR FIXE */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 h-20">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-2">
            <BoltIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Attack Panel
            </h1>
          </div>
          {!showInitialChoice && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {openTabs.length} tab{openTabs.length !== 1 ? 's' : ''} open
              </div>
            </div>
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
                    
                    {currentView === 'attacks' && (
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
                        {selectedTool?.attacks && selectedTool.attacks.length > 1 ? (
                          <>
                            <button
                              onClick={handleBackToAttacks}
                              className="flex items-center text-gray-500 hover:text-primary-600 transition-colors"
                            >
                              <CommandLineIcon className="w-4 h-4 mr-1" />
                              {selectedTool?.name}
                            </button>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                            <div className="flex items-center text-primary-600 font-medium">
                              <BoltIcon className="w-4 h-4 mr-1" />
                              {selectedTool?.attacks?.find((a: Attack) => a.id === activeTabState.selectedAttack)?.name}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center text-primary-600 font-medium">
                            <CommandLineIcon className="w-4 h-4 mr-1" />
                            {selectedTool?.name}
                          </div>
                        )}
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

                {currentView === 'attacks' && activeTabId && selectedTool && (
                  <motion.div
                    key="attacks"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden"
                  >
                    <div className="h-full flex flex-col">
                      {/* Header */}
                      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Select Attack
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Choose from {selectedTool.attacks?.length} available attacks for {selectedTool.name}
                        </p>
                      </div>
                      
                      {/* Attacks List */}
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-3">
                          {selectedTool.attacks?.map((attack) => (
                            <button
                              key={attack.id}
                              onClick={() => {
                                if (activeTabId) {
                                  // Get default parameters for this attack
                                  const defaultParams: Record<string, any> = {};
                                  if (attack.parameters) {
                                    Object.entries(attack.parameters).forEach(([key, param]) => {
                                      defaultParams[key] = param.default !== undefined ? param.default : '';
                                    });
                                  }
                                  
                                  updateTabState(activeTabId, {
                                    selectedAttack: attack.id,
                                    parameters: defaultParams
                                  });
                                }
                              }}
                              className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                            >
                              <div className="flex flex-col">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                  {attack.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {attack.description}
                                </p>
                                {attack.parameters && Object.keys(attack.parameters).length > 0 && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                      {Object.keys(attack.parameters).length} parameter{Object.keys(attack.parameters).length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
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
