import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { TOOLS } from '../../../constants/tools';
import { useThemeStore } from '../../../store/themeStore';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';

interface ToolSelectionFunnelProps {
  tabId: string;
}

type FunnelStep = 'category' | 'tool' | 'attack';

export const ToolSelectionFunnel: React.FC<ToolSelectionFunnelProps> = ({ tabId }) => {
  const theme = useThemeStore(state => state.theme);
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  const updateTabState = useAttackStore(state => state.updateTabState);
  const handleToolSelect = useAttackStore(state => state.handleToolSelect);
  
  // États locaux pour suivre l'étape actuelle du funnel et les interactions
  const [currentStep, setCurrentStep] = useState<FunnelStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>(tabState?.selectedCategory || 'ALL');
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  
  // Ref pour suivre le dernier moment d'interaction (debounce plus efficace)
  const lastInteractionRef = useRef<number>(0);
  
  // Vérifier si l'interface est verrouillée
  const isLocked = tabState?.lockedForInteraction || tabState?.isRunning || tabState?.status === 'running' || false;

  // Effet pour suivre les changements d'état du tabState
  useEffect(() => {
    if (tabState?.selectedTool) {
      // Si un outil est déjà sélectionné, on affiche les attaques disponibles
      const tool = TOOLS.find(t => t.id === tabState.selectedTool);
      if (tool?.attacks && tool.attacks.length > 1) {
        setCurrentStep('attack');
      } else {
        setCurrentStep('tool');
      }
    } else {
      setCurrentStep('category');
    }
    
    if (tabState?.selectedCategory) {
      setSelectedCategory(tabState.selectedCategory);
    }
  }, [tabState?.selectedTool, tabState?.selectedCategory]);

  // Filtrer les outils par catégorie
  const categories = ['ALL', 'FUZZING', 'SIMULATION', 'FRAMEWORK'];
  
  const filteredTools = TOOLS.filter(tool => {
    if (selectedCategory === 'ALL') return true;
    return tool.type === selectedCategory;
  });

  // Récupérer l'outil sélectionné et ses attaques
  const selectedTool = tabState?.selectedTool ? TOOLS.find(t => t.id === tabState.selectedTool) : undefined;

  // Fonction de protection contre les clicks trop rapprochés
  const debounceInteraction = useCallback(() => {
    const now = Date.now();
    if (now - lastInteractionRef.current < 500) {
      return false;
    }
    lastInteractionRef.current = now;
    return true;
  }, []);

  // Utilisation du useCallback avec un meilleur debounce pour éviter les doubles clics
  const handleCategorySelect = useCallback((category: string) => {
    // Si l'interface est verrouillée, ne rien faire
    if (isLocked) return;
    
    // Si déjà en interaction ou si le debounce rejette l'action, ne rien faire
    if (isInteracting || !debounceInteraction()) return;
    
    // Prévention des doubles clics
    setIsInteracting(true);
    
    // Petite pause avant de traiter pour éviter les clicks parasites
    setTimeout(() => {
      setSelectedCategory(category);
      updateTabState(tabId, { selectedCategory: category });
      setCurrentStep('tool');
      
      // Réinitialiser le flag après un délai plus long
      setTimeout(() => setIsInteracting(false), 500);
    }, 50);
  }, [isLocked, isInteracting, updateTabState, tabId, debounceInteraction]);

  const handleSelectTool = useCallback((toolId: string) => {
    // Si l'interface est verrouillée, ne rien faire
    if (isLocked) return;
    
    // Si déjà en interaction ou si le debounce rejette l'action, ne rien faire
    if (isInteracting || !debounceInteraction()) return;
    
    // Prévention des doubles clics
    setIsInteracting(true);
    
    // Petite pause avant de traiter pour éviter les clicks parasites
    setTimeout(() => {
      handleToolSelect(tabId, toolId);
      
      // Vérifier si l'outil a plusieurs attaques
      const tool = TOOLS.find(t => t.id === toolId);
      if (tool?.attacks && tool.attacks.length > 1) {
        setCurrentStep('attack');
      }
      
      // Réinitialiser le flag après un délai plus long
      setTimeout(() => setIsInteracting(false), 500);
    }, 50);
  }, [isLocked, isInteracting, handleToolSelect, tabId, debounceInteraction]);

  const handleSelectAttack = useCallback((attackId: string) => {
    // Si l'interface est verrouillée ou si pas d'outil sélectionné, ne rien faire
    if (isLocked || !selectedTool) return;
    
    // Si déjà en interaction ou si le debounce rejette l'action, ne rien faire
    if (isInteracting || !debounceInteraction()) return;
    
    // Prévention des doubles clics
    setIsInteracting(true);
    
    // Petite pause avant de traiter pour éviter les clicks parasites
    setTimeout(() => {
      // Trouver l'attaque
      const attack = selectedTool.attacks?.find(a => a.id === attackId);
      if (!attack) {
        setIsInteracting(false);
        return;
      }
      
      // Récupérer les paramètres par défaut de cette attaque
      const defaultParams: Record<string, any> = {};
      if (attack.parameters) {
        Object.entries(attack.parameters).forEach(([key, param]) => {
          defaultParams[key] = param.default !== undefined ? param.default : '';
        });
      }
      
      // Mettre à jour l'état avec la nouvelle attaque sélectionnée et ses paramètres
      updateTabState(tabId, {
        selectedAttack: attackId,
        parameters: defaultParams,
        customCommand: undefined
      });
      
      // Réinitialiser le flag après un délai plus long
      setTimeout(() => setIsInteracting(false), 500);
    }, 50);
  }, [isLocked, isInteracting, selectedTool, updateTabState, tabId, debounceInteraction]);

  const goBack = useCallback(() => {
    // Si l'interface est verrouillée, ne rien faire
    if (isLocked) return;
    
    // Si déjà en interaction ou si le debounce rejette l'action, ne rien faire
    if (isInteracting || !debounceInteraction()) return;
    
    // Prévention des doubles clics
    setIsInteracting(true);
    
    // Petite pause avant de traiter pour éviter les clicks parasites
    setTimeout(() => {
      if (currentStep === 'attack') {
        setCurrentStep('tool');
      } else if (currentStep === 'tool') {
        setCurrentStep('category');
      }
      
      // Réinitialiser le flag après un délai plus long
      setTimeout(() => setIsInteracting(false), 500);
    }, 50);
  }, [currentStep, isLocked, isInteracting, debounceInteraction]);

  const renderStepIndicator = () => {
    return (
      <div className={`flex items-center justify-between p-4 border-b ${
        theme === 'light' 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-gray-900/40 border-gray-700/50'
      }`}>
        <div className="flex items-center space-x-2">
          {isLocked && (
            <div className="flex items-center text-amber-500">
              <LockClosedIcon className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">Locked</span>
            </div>
          )}
          {currentStep !== 'category' && !isLocked && (
            <button 
              onClick={goBack}
              disabled={isLocked} 
              className={`p-1 rounded-full ${
                theme === 'light' 
                  ? 'hover:bg-gray-200 text-gray-700' 
                  : 'hover:bg-gray-700 text-gray-300'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}
          <span className={`text-sm font-medium ${
            theme === 'light' ? 'text-gray-700' : 'text-gray-300'
          }`}>
            {currentStep === 'category' && 'Select Category'}
            {currentStep === 'tool' && `${selectedCategory} > Select Tool`}
            {currentStep === 'attack' && `${selectedTool?.name} > Select Attack`}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`h-2 w-2 rounded-full ${
            currentStep === 'category' 
              ? theme === 'light' ? 'bg-indigo-500' : 'bg-indigo-400'
              : theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'
          }`}></div>
          <div className={`h-2 w-2 rounded-full ${
            currentStep === 'tool' 
              ? theme === 'light' ? 'bg-indigo-500' : 'bg-indigo-400'
              : theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'
          }`}></div>
          <div className={`h-2 w-2 rounded-full ${
            currentStep === 'attack' 
              ? theme === 'light' ? 'bg-indigo-500' : 'bg-indigo-400'
              : theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'
          }`}></div>
        </div>
      </div>
    );
  };

  // Rendu du contenu en fonction de l'étape actuelle
  const renderContent = () => {
    switch (currentStep) {
      case 'category':
        return (
          <div className={`divide-y ${
            theme === 'light' ? 'divide-gray-200' : 'divide-gray-700/50'
          }`}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                disabled={isLocked}
                className={`w-full text-left p-4 transition-colors flex justify-between items-center ${
                  selectedCategory === category
                    ? theme === 'light'
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'bg-indigo-700/20 text-indigo-200'
                    : theme === 'light'
                      ? 'hover:bg-gray-50 text-gray-800'
                      : 'hover:bg-gray-800/30 text-gray-200'
                } ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <span>{category}</span>
                {isLocked ? (
                  <LockClosedIcon className="h-4 w-4 text-amber-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        );
      
      case 'tool':
        return (
          <div className={`divide-y ${
            theme === 'light' ? 'divide-gray-200' : 'divide-gray-700/50'
          }`}>
            {filteredTools.length > 0 ? (
              filteredTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleSelectTool(tool.id)}
                  disabled={isLocked}
                  className={`w-full text-left p-4 transition-colors ${
                    tabState?.selectedTool === tool.id
                      ? theme === 'light'
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'bg-indigo-700/20 text-indigo-200'
                      : theme === 'light'
                        ? 'hover:bg-gray-50 text-gray-800'
                        : 'hover:bg-gray-800/30 text-gray-200'
                  } ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between">
                    <div className="flex flex-col">
                      <h3 className="font-medium">{tool.name}</h3>
                      <p className={`text-sm ${
                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>{tool.description}</p>
                      
                      <div className="flex mt-2 gap-2">
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${tool.type === 'FUZZING' 
                            ? theme === 'light' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-green-500/20 text-green-300 ring-1 ring-green-500/50'
                            : tool.type === 'SIMULATION'
                            ? theme === 'light'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                            : theme === 'light'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50'
                          }`}
                        >
                          {tool.type}
                        </span>
                        
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${tool.status === 'implemented' 
                            ? theme === 'light'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30'
                            : tool.status === 'in-progress'
                            ? theme === 'light'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30'
                            : theme === 'light'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                          }`}
                        >
                          {tool.status}
                        </span>
                      </div>
                    </div>
                    {isLocked ? (
                      <LockClosedIcon className="h-4 w-4 mt-2 text-amber-500" />
                    ) : tool.attacks && tool.attacks.length > 1 ? (
                      <ChevronRightIcon className="h-4 w-4 mt-2" />
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <div className={`p-4 text-center ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No tools available in this category
              </div>
            )}
          </div>
        );
      
      case 'attack':
        if (!selectedTool?.attacks || selectedTool.attacks.length <= 0) {
          return (
            <div className={`p-4 text-center ${
              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              No attacks available for this tool
            </div>
          );
        }
        
        return (
          <div className={`divide-y ${
            theme === 'light' ? 'divide-gray-200' : 'divide-gray-700/50'
          }`}>
            {selectedTool.attacks.map(attack => (
              <button
                key={attack.id}
                onClick={() => handleSelectAttack(attack.id)}
                disabled={isLocked}
                className={`w-full text-left p-4 transition-colors ${
                  tabState?.selectedAttack === attack.id
                    ? theme === 'light'
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'bg-indigo-700/20 text-indigo-200'
                    : theme === 'light'
                      ? 'hover:bg-gray-50 text-gray-800'
                      : 'hover:bg-gray-800/30 text-gray-200'
                } ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col">
                  <h3 className="font-medium">{attack.name}</h3>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}>{attack.description}</p>
                </div>
                {isLocked && (
                  <div className="flex justify-end mt-1">
                    <LockClosedIcon className="h-4 w-4 text-amber-500" />
                  </div>
                )}
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {renderStepIndicator()}
      <div className={`flex-1 overflow-auto ${
        theme === 'light' ? 'bg-white' : 'bg-gray-900/40'
      } ${isLocked ? 'opacity-90' : ''} ${isInteracting ? 'pointer-events-none' : ''}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-gray-900/10 dark:bg-gray-900/30 flex items-center justify-center z-10 pointer-events-none">
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl ${isLocked ? 'opacity-80' : 'opacity-0'} transition-opacity duration-300`}>
              <p className="text-sm font-medium flex items-center">
                <LockClosedIcon className="h-4 w-4 mr-2 text-amber-500" />
                Interface locked during execution
              </p>
            </div>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};
