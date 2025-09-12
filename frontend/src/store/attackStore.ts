import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getFilteredTools } from '../constants/tools';
import { useAuthStore } from './authStore';
import { createStorage } from '../services/storage';
import { websocket } from '../services/websocket';

// Définir des types plus précis avec des signatures d'index
export interface Attack {
  id: string;
  name: string;
  description?: string;
  parameters?: Record<string, ToolParameter>;
}

export type ToolParameter = {
  label: string;
  type: string;
  default?: string;
  required?: boolean;
  description?: string;
};

export type ToolParameters = Record<string, ToolParameter>;

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'implemented' | 'in-progress' | 'not-implemented';
  command?: (paramValues: Record<string, string>) => string;
  parameters?: Record<string, ToolParameter>;
  attacks?: Attack[];
  iframe?: {
    port: number;
    successMessage?: string;
  };
  multiOutput?: MultiOutputConfig;
  sequentialExecution?: SequentialExecutionConfig;
}

export interface MultiOutput {
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

export interface MultiOutputConfig {
  enabled: boolean;
  outputs: MultiOutput[];
}

export interface SequentialStep {
  id: string;
  name: string;
  description: string;
  command: string;
  workingDirectory?: string;
  successMessage?: string;
  dependsOn?: string;
  iframe?: {
    port: number;
    path: string;
  };
}

export interface SequentialExecutionConfig {
  enabled: boolean;
  steps: SequentialStep[];
  finalIframe?: {
    port: number;
    successMessage?: string;
  };
}

export interface TabState {
  selectedTool?: string;
  selectedAttack?: string;
  parameters: Record<string, string>;
  customCommand?: string;
  isRunning?: boolean;
  loading?: boolean;
  status?: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  iframeReady?: boolean;
  lockedForInteraction?: boolean;
  multiOutputs?: Record<string, string[]>;
  multiOutputsCache?: Record<string, string[]>; // Cache persistant des outputs multiples
  activeOutput?: string;
  outputViewMode?: 'split' | 'tabs' | 'single';
  outputCache?: string[];
  lastOutputUpdate?: number;
  category?: string;
  output: string[];
  outputTimestamps?: number[]; // Timestamps correspondant aux outputs
  selectedCategory?: string;
  persistentOutput?: string[]; // Output persistant qui ne se perd jamais
}

export interface ExportedTab {
  selectedTool?: string;
  selectedAttack?: string;
  parameters?: Record<string, any>;
  category?: string;
  selectedCategory?: string;
  customCommand?: string;
}

export interface ExportConfig {
  tabs: ExportedTab[];
  version: string;
  exportDate: string;
  name?: string;
}

interface AttackState {
  attacks: Attack[];
  openTabs: { id: string; name: string }[];
  activeTabId: string | null;
  tabStates: Record<string, TabState>;
  currentView: string;
  hasInitialChoice: boolean;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setCurrentView: (view: string) => void;
  updateTabState: (id: string, updates: Partial<TabState>) => void;
  exportTabs: () => ExportConfig;
  importTabs: (config: ExportConfig) => void;
  setInitialChoice: (choice: boolean) => void;
  addOutput: (tabId: string, output: string) => void;
  clearOutput: (tabId: string) => void;
  clearAllOutputs: () => void;
  addMultiOutput: (tabId: string, outputId: string, output: string) => void;
  clearMultiOutput: (tabId: string, outputId: string) => void;
  clearAllMultiOutputs: (tabId: string) => void;
  setActiveOutput: (tabId: string, outputId: string) => void;
  setOutputViewMode: (tabId: string, mode: 'single' | 'split') => void;
  initializeMultiOutputs: (tabId: string, outputIds: string[]) => void;
  getTabState: (tabId: string) => TabState;
  handleToolSelect: (tabId: string, toolId: string) => void;
  updateParameters: (tabId: string, parameters: Record<string, any>) => void;
  closeAllTabs: () => void;
  savedConfigs: ExportConfig[];
  saveConfig: (name: string) => void;
  loadConfig: (config: ExportConfig) => void;
  deleteConfig: (configDate: string) => void;
  loadUserConfigs: () => void;
  // Nouvelles méthodes pour la persistance des outputs
  addOutputToCache: (tabId: string, output: string) => void;
  getOutputCache: (tabId: string) => string[];
  clearOutputCache: (tabId: string) => void;
  restoreOutputFromCache: (tabId: string) => void;
  addPersistentOutput: (tabId: string, output: string) => void;
}

export const useAttackStore = create<AttackState>()(
  persist(
    (set, get) => ({
      attacks: [],
      openTabs: [],
      activeTabId: null,
      tabStates: {},
      currentView: 'dashboard',
      hasInitialChoice: false,
      savedConfigs: [],
      
      addTab: () => {
        const state = get();
        const newId = `tab-${Date.now()}`;
        
        const getNextAvailableTabNumber = () => {
          const existingNumbers = new Set(
            state.openTabs
              .map(tab => {
                const match = tab.name.match(/^Tab (\d+)$/);
                return match ? parseInt(match[1]) : 0;
              })
          );
          
          let number = 1;
          while (existingNumbers.has(number)) {
            number++;
          }
          return number;
        };

        const newTabNumber = getNextAvailableTabNumber();
        const newTabName = `Tab ${newTabNumber}`;
        
        set((state) => ({
          openTabs: [...state.openTabs, { id: newId, name: newTabName }],
          activeTabId: newId,
          tabStates: {
            ...state.tabStates,
            [newId]: {
              selectedTool: undefined,
              selectedAttack: undefined,
              parameters: {},
              output: [],
              outputTimestamps: [],
              multiOutputs: undefined,
              activeOutput: undefined,
              outputViewMode: 'tabs',
              isRunning: false,
              category: 'ALL',
              status: 'idle',
              selectedCategory: 'ALL',
              loading: false,
              iframeReady: false,
              customCommand: undefined,
              lockedForInteraction: false,
              outputCache: [],
              persistentOutput: [],
              lastOutputUpdate: Date.now()
            }
          },
          hasInitialChoice: true
        }));
      },

      closeTab: (id) => set(state => {
        const { [id]: removedState, ...remainingStates } = state.tabStates;
        const newTabs = state.openTabs.filter(tab => tab.id !== id);
        
        if (removedState?.isRunning || removedState?.status === 'running') {
          websocket.send(JSON.stringify({ 
            type: "stop", 
            tabId: id
          }));
          console.warn('Stopping running attack for tab:', id);
        }
        
        return {
          ...state,
          openTabs: newTabs,
          activeTabId: newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null,
          tabStates: remainingStates
        };
      }),

      setActiveTab: (id) => {
        set(state => {
          // Lors du changement d'onglet, restaurer automatiquement les outputs depuis le cache
          const currentState = state.tabStates[id];
          if (currentState) {
            const cachedOutput = currentState.outputCache || [];
            const persistentOutput = currentState.persistentOutput || [];
            
            // Utiliser persistentOutput comme source principale
            const restoredOutput = persistentOutput.length > 0 ? persistentOutput : cachedOutput;
            
            // Si l'output actuel est vide mais qu'on a du cache, restaurer
            if (currentState.output.length === 0 && restoredOutput.length > 0) {
              console.log(`[setActiveTab] Auto-restoring ${restoredOutput.length} outputs for tab ${id}`);
              return {
                ...state,
                activeTabId: id,
                tabStates: {
                  ...state.tabStates,
                  [id]: {
                    ...currentState,
                    output: restoredOutput
                  }
                }
              };
            }
          }
          
          return {
            ...state,
            activeTabId: id
          };
        });
      },
      
      setCurrentView: (view) => set({ currentView: view }),

      updateTabState: (tabId, updates) => {
        set(state => {
          const currentState = state.tabStates[tabId] || {
            selectedTool: undefined,
            selectedAttack: undefined,
            parameters: {},
            output: [],
            isRunning: false,
            category: undefined,
            status: 'idle',
            loading: false,
            iframeReady: false,
            lockedForInteraction: false,
            outputCache: [],
            lastOutputUpdate: Date.now()
          };

          let updatedRunningState = updates.isRunning !== undefined ? updates.isRunning : currentState.isRunning;
          let updatedStatus = updates.status || currentState.status;
          
          if (updates.status === 'running' && !updatedRunningState) {
            updatedRunningState = true;
          } else if ((updates.status === 'error' || updates.status === 'stopped' || updates.status === 'idle') && updatedRunningState) {
            updatedRunningState = false;
          }

          if (updates.isRunning === true && updatedStatus !== 'running') {
            updatedStatus = 'running';
          } else if (updates.isRunning === false && updatedStatus === 'running') {
            updatedStatus = 'idle';
          }
          
          const lockedForInteraction = updatedRunningState || 
                                      updatedStatus === 'running' || 
                                      (updates.loading !== undefined ? updates.loading : currentState.loading);
          
          if (updates.status === 'error' || updates.status === 'stopped') {
            const currentOutput = currentState.output || [];
            const lastMessage = currentOutput[currentOutput.length - 1];
            const newMessage = updates.status === 'error' ? 'Process terminated with error' : 'Process stopped';
            
            const shouldAddMessage = !lastMessage || 
                                    (!lastMessage.includes('Process terminated with error') && 
                                     !lastMessage.includes('Process exited with code') && 
                                     !lastMessage.includes('Process stopped'));
            return {
              ...state,
              tabStates: {
                ...state.tabStates,
                [tabId]: {
                  ...currentState,
                  ...updates,
                  isRunning: false,
                  loading: false,
                  iframeReady: false,
                  lockedForInteraction: false,
                  status: updates.status,
                  output: shouldAddMessage ? 
                    [...(currentState.output || []), newMessage] : 
                    currentState.output
                }
              }
            };
          }
          
          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                ...updates,
                isRunning: updatedRunningState,
                status: updatedStatus,
                lockedForInteraction
              }
            }
          };
        });
      },

      updateParameters: (tabId: string, parameters: Record<string, any>) => {
        const state = get();
        const currentTool = state.tabStates[tabId]?.selectedTool;
        if (!currentTool) return;

        const tool = getFilteredTools().find(t => t.id === currentTool);
        if (!tool) return;
        
        const cleanParameters: Record<string, any> = {};
        
        if (state.tabStates[tabId]?.selectedAttack && tool.attacks) {
          const attack = tool.attacks.find(a => a.id === state.tabStates[tabId].selectedAttack);
          if (attack?.parameters) {
            Object.keys(parameters).forEach(key => {
              if (attack.parameters && key in attack.parameters) {
                cleanParameters[key] = parameters[key];
              }
            });
          }
        } 
        else if (tool.parameters) {
          Object.keys(parameters).forEach(key => {
            if (tool.parameters && key in tool.parameters) {
              cleanParameters[key] = parameters[key];
            }
          });
        }
        
        set(state => ({
          ...state,
          tabStates: {
            ...state.tabStates,
            [tabId]: {
              ...state.tabStates[tabId],
              parameters: cleanParameters
            }
          }
        }));
      },

      addOutput: (tabId, output) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          // Ajouter à tous les caches pour assurer une persistance maximale
          const newOutput = [...(currentState.output || []), output];
          const newOutputCache = [...(currentState.outputCache || []), output];
          const newPersistentOutput = [...(currentState.persistentOutput || []), output];
          
          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                output: newOutput,
                outputCache: newOutputCache,
                persistentOutput: newPersistentOutput,
                lastOutputUpdate: Date.now()
              }
            }
          };
        });
      },

      clearOutput: (tabId) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                output: [],
                outputTimestamps: [],
                outputCache: [],
                lastOutputUpdate: Date.now()
              }
            }
          };
        });
      },

      clearAllOutputs: () => {
        set(state => {
          const updatedTabStates = { ...state.tabStates };
          Object.keys(updatedTabStates).forEach(tabId => {
            updatedTabStates[tabId] = {
              ...updatedTabStates[tabId],
              output: [],
              outputCache: []
            };
          });
          return { ...state, tabStates: updatedTabStates };
        });
      },

      getTabState: (tabId) => {
        const state = get();
        return state.tabStates[tabId] || {
          selectedTool: undefined,
          selectedAttack: undefined,
          parameters: {},
          category: 'ALL',
          output: [],
          outputCache: [],
          persistentOutput: [],
          isRunning: false,
          loading: false,
          iframeReady: false,
          status: 'idle',
          customCommand: undefined,
          lockedForInteraction: false,
          lastOutputUpdate: Date.now()
        };
      },

      exportTabs: () => {
        const state = get();
        const exportedTabs: ExportedTab[] = state.openTabs
          .filter(tab => {
            const tabState = state.tabStates[tab.id];
            return tabState?.selectedTool !== undefined;
          })
          .map(tab => {
            const tabState = state.tabStates[tab.id];
            if (!tabState?.selectedTool) {
              return {
                selectedTool: undefined,
                selectedAttack: undefined,
                parameters: {},
                category: 'ALL',
                selectedCategory: 'ALL'
              };
            }
            
            const tool = getFilteredTools().find(t => t.id === tabState.selectedTool);
            if (!tool) {
              return {
                selectedTool: tabState.selectedTool,
                selectedAttack: tabState.selectedAttack,
                parameters: {},
                category: tabState.category,
                selectedCategory: tabState.selectedCategory,
                customCommand: tabState.customCommand
              };
            }
            
            const cleanParameters: Record<string, any> = {};
            
            if (tool && tabState.selectedAttack && tool.attacks) {
              const attack = tool.attacks.find(a => a.id === tabState.selectedAttack);
              if (attack?.parameters && tabState.parameters) {
                Object.keys(attack.parameters).forEach(key => {
                  if (tabState.parameters[key] !== undefined) {
                    cleanParameters[key] = tabState.parameters[key];
                  }
                });
              }
            } else if (tool?.parameters && tabState.parameters) {
              Object.keys(tool.parameters).forEach(key => {
                if (tabState.parameters[key] !== undefined) {
                  cleanParameters[key] = tabState.parameters[key];
                }
              });
            }
            
            const exportedTab: ExportedTab = {
              selectedTool: tabState.selectedTool,
              selectedAttack: tabState.selectedAttack,
              parameters: cleanParameters,
              category: tabState.category,
              selectedCategory: tabState.selectedCategory,
              customCommand: tabState.customCommand
            };
            
            return exportedTab;
          });
          
        return {
          tabs: exportedTabs,
          version: "1.0.0",
          exportDate: new Date().toISOString()
        };
      },

      importTabs: (config: ExportConfig) => {
        const state = get();
        state.openTabs.forEach(tab => get().closeTab(tab.id));
        
        const currentTimestamp = Date.now();
        let currentTabNumber = 1;

        const validTabs = config.tabs.filter(tab => {
          if (!tab.selectedTool) return false;
          const tool = getFilteredTools().find(t => t.id === tab.selectedTool);
          return tool !== undefined;
        });

        const newTabs = validTabs.map(() => ({
          id: `tab-${currentTimestamp}-${currentTabNumber++}`,
          name: `Tab ${currentTabNumber - 1}`
        }));

        const newTabStates: Record<string, TabState> = {};
        
        validTabs.forEach((tab, index) => {
          const newId = newTabs[index].id;
          const toolId = tab.selectedTool;
          if (!toolId) return;
          
          const tool = getFilteredTools().find(t => t.id === toolId);
          if (!tool) return;
          
          const cleanParameters: Record<string, any> = {};
          
          if (tab.selectedAttack && tool.attacks) {
            const attack = tool.attacks.find(a => a.id === tab.selectedAttack);
            
            if (attack?.parameters && tab.parameters) {
              // Utiliser Object.entries avec une assertion de type explicite
              Object.entries(attack.parameters).forEach(([paramKey, paramDefUnknown]) => {
                // Assertion de type explicite
                const paramDef = paramDefUnknown as ToolParameter;
                
                if (tab.parameters && typeof tab.parameters === 'object') {
                  const tabParams = tab.parameters as Record<string, any>;
                  if (paramKey in tabParams) {
                    cleanParameters[paramKey] = tabParams[paramKey];
                  } else if (paramDef.default !== undefined) {
                    cleanParameters[paramKey] = paramDef.default;
                  } else {
                    cleanParameters[paramKey] = '';
                  }
                }
              });
            }
          } else if (tool.parameters && tab.parameters) {
            // Utiliser Object.entries avec une assertion de type explicite
            Object.entries(tool.parameters).forEach(([paramKey, paramDefUnknown]) => {
              // Assertion de type explicite
              const paramDef = paramDefUnknown as ToolParameter;
              
              if (tab.parameters && typeof tab.parameters === 'object') {
                const tabParams = tab.parameters as Record<string, any>;
                if (paramKey in tabParams) {
                  cleanParameters[paramKey] = tabParams[paramKey];
                } else if (paramDef.default !== undefined) {
                  cleanParameters[paramKey] = paramDef.default;
                } else {
                  cleanParameters[paramKey] = '';
                }
              }
            });
          }
          
          newTabStates[newId] = {
            selectedTool: tab.selectedTool,
            selectedAttack: tab.selectedAttack,
            parameters: cleanParameters,
            category: tab.category || 'ALL',
            selectedCategory: tab.selectedCategory || 'ALL',
            status: 'idle',
            output: [],
            isRunning: false,
            loading: false,
            iframeReady: false,
            customCommand: tab.customCommand,
            lockedForInteraction: false
          };
        });
        
        if (newTabs.length > 0) {
          set((state) => ({
            ...state,
            openTabs: newTabs,
            tabStates: newTabStates,
            activeTabId: newTabs[0]?.id || null,
            hasInitialChoice: true
          }));
        } else {
          get().addTab();
          set(state => ({ ...state, hasInitialChoice: true }));
        }
      },

      setInitialChoice: (choice: boolean) => set({ hasInitialChoice: choice }),

      handleToolSelect: (tabId: string, toolId: string) => {
        const state = get();
        const currentState = state.tabStates[tabId];
        
        if (currentState?.isRunning || currentState?.status === 'running' || currentState?.loading) {
          console.warn('Cannot change tool while attack is running');
          return;
        }
        
        const selectedTool = getFilteredTools().find(t => t.id === toolId);
        if (!selectedTool) return;
        
        const defaultParameters: Record<string, any> = {};
        
        // Si l'outil n'a qu'une seule attaque, la sélectionner automatiquement
        if (selectedTool?.attacks && selectedTool.attacks.length === 1) {
          const singleAttack = selectedTool.attacks[0];
          if (singleAttack.parameters) {
            Object.entries(singleAttack.parameters).forEach(([paramKey, paramUnknown]) => {
              const param = paramUnknown as ToolParameter;
              defaultParameters[paramKey] = param.default !== undefined ? param.default : '';
            });
          }
          
          get().updateTabState(tabId, { 
            selectedTool: toolId,
            selectedAttack: singleAttack.id,
            parameters: defaultParameters,
            status: 'idle',
            isRunning: false,
            output: currentState?.output || [],
            customCommand: undefined,
            lockedForInteraction: false
          });
        } else {
          // Pour les outils avec plusieurs attaques, ne pas en sélectionner une automatiquement
          if (selectedTool?.parameters) {
            Object.entries(selectedTool.parameters).forEach(([paramKey, paramUnknown]) => {
              const param = paramUnknown as ToolParameter;
              defaultParameters[paramKey] = param.default !== undefined ? param.default : '';
            });
          }
          
          get().updateTabState(tabId, { 
            selectedTool: toolId,
            selectedAttack: undefined, // Pas de sélection automatique
            parameters: defaultParameters,
            status: 'idle',
            isRunning: false,
            output: currentState?.output || [],
            customCommand: undefined,
            lockedForInteraction: false
          });
        }
      },

      closeAllTabs: () => set(state => ({
        ...state,
        openTabs: [],
        activeTabId: null,
        tabStates: {},
        hasInitialChoice: false
      })),

      saveConfig: async (name: string) => {
        const config = {
          ...get().exportTabs(),
          name,
          exportDate: new Date().toISOString()
        };
        
        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No token found. Please login again.');
          }

          const response = await fetch('/api/configs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ config })
          });

          if (!response.ok) {
            throw new Error('Failed to save configuration');
          }

          set(state => ({
            ...state,
            savedConfigs: [...state.savedConfigs, config]
          }));
        } catch (error) {
          console.error('Error saving config:', error);
          throw error;
        }
      },

      loadConfig: (config: ExportConfig) => {
        get().closeAllTabs();
        get().importTabs(config);
        set(state => ({ 
          ...state,
          hasInitialChoice: true,
          currentView: 'attack'
        }));
      },

      deleteConfig: async (configDate: string) => {
        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No token found. Please login again.');
          }

          const response = await fetch(`/api/configs/${encodeURIComponent(configDate)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete configuration');
          }

          set(state => ({
            ...state,
            savedConfigs: state.savedConfigs.filter(config => config.exportDate !== configDate)
          }));
        } catch (error) {
          console.error('Error deleting config:', error);
          throw error;
        }
      },

      loadUserConfigs: async () => {
        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            console.error('No token found. Please login again.');
            return;
          }

          const response = await fetch('/api/configs', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch configurations');
          }

          const configs = await response.json();
          if (Array.isArray(configs)) {
            set(state => ({ ...state, savedConfigs: configs }));
          } else {
            set(state => ({ ...state, savedConfigs: [] }));
          }
        } catch (error) {
          console.error('Error loading configs:', error);
          set(state => ({ ...state, savedConfigs: [] }));
          throw error;
        }
      },

      addMultiOutput: (tabId: string, outputId: string, output: string) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          const currentMultiOutputs = currentState.multiOutputs || {};
          const currentOutputLines = currentMultiOutputs[outputId] || [];

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                multiOutputs: {
                  ...currentMultiOutputs,
                  [outputId]: [...currentOutputLines, output]
                }
              }
            }
          };
        });
        
        // Aussi ajouter à l'output principal pour la persistance
        get().addPersistentOutput(tabId, `[${outputId}] ${output}`);
      },

      clearMultiOutput: (tabId: string, outputId: string) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState || !currentState.multiOutputs) return state;

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                multiOutputs: {
                  ...currentState.multiOutputs,
                  [outputId]: []
                }
              }
            }
          };
        });
      },

      clearAllMultiOutputs: (tabId: string) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState || !currentState.multiOutputs) return state;

          const clearedOutputs: Record<string, string[]> = {};
          Object.keys(currentState.multiOutputs).forEach(outputId => {
            clearedOutputs[outputId] = [];
          });

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                multiOutputs: clearedOutputs
              }
            }
          };
        });
      },

      setActiveOutput: (tabId: string, outputId: string) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                activeOutput: outputId
              }
            }
          };
        });
      },

      setOutputViewMode: (tabId: string, mode: 'single' | 'split') => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                outputViewMode: mode
              }
            }
          };
        });
      },

      initializeMultiOutputs: (tabId: string, outputIds: string[]) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          const multiOutputs: Record<string, string[]> = {};
          outputIds.forEach(outputId => {
            multiOutputs[outputId] = [];
          });

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                multiOutputs,
                activeOutput: outputIds[0] || undefined,
                outputViewMode: 'split'
              }
            }
          };
        });
      },

      addOutputToCache: (tabId, output) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          const currentCache = currentState.outputCache || [];
          const newCache = [...currentCache, output];

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                outputCache: newCache,
                lastOutputUpdate: Date.now()
              }
            }
          };
        });
      },

      getOutputCache: (tabId) => {
        const state = get();
        return state.tabStates[tabId]?.outputCache || [];
      },

      clearOutputCache: (tabId) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                outputCache: []
              }
            }
          };
        });
      },

      restoreOutputFromCache: (tabId) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          const cachedOutput = currentState.outputCache || [];
          const persistentOutput = currentState.persistentOutput || [];
          
          // Utiliser persistentOutput comme source principale (le plus fiable)
          // Compléter avec le cache seulement si persistentOutput est vide
          const restoredOutput = persistentOutput.length > 0 ? persistentOutput : cachedOutput;

          // Générer des timestamps approximatifs si on restaure depuis le cache
          const now = Date.now();
          const restoredTimestamps = restoredOutput.map((_, index) => 
            now - (restoredOutput.length - index) * 1000 // 1 seconde entre chaque message
          );

          console.log(`[restoreOutputFromCache] Tab ${tabId}: restored ${restoredOutput.length} outputs from ${persistentOutput.length > 0 ? 'persistent' : 'cache'}`);

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                output: restoredOutput,
                outputTimestamps: restoredTimestamps
              }
            }
          };
        });
      },

      addPersistentOutput: (tabId, output) => {
        set(state => {
          const currentState = state.tabStates[tabId];
          if (!currentState) return state;

          const currentPersistent = currentState.persistentOutput || [];
          const newPersistent = [...currentPersistent, output];
          const currentTimestamps = currentState.outputTimestamps || [];
          const timestamp = Date.now();

          // Logique de détection des patterns pour iframe (Caldera, MAIP, etc.)
          let updatedState = { ...currentState };
          
          // Vérifier si l'output contient un message de succès pour iframe
          if (currentState.selectedTool) {
            const tools = getFilteredTools();
            const selectedTool = tools.find(tool => tool.id === currentState.selectedTool);
            
            if (selectedTool?.iframe?.successMessage) {
              const successMessage = selectedTool.iframe.successMessage;
              
              // Vérifier si l'output contient le message de succès
              if (output.includes(successMessage)) {
                console.log(`🖼️ [addPersistentOutput] Iframe ready detected for ${selectedTool.name}: "${successMessage}"`);
                
                // Pour MAIP avec "Compiled successfully!", ajouter un délai d'1 seconde
                if (selectedTool.id === 'maip' && successMessage === 'Compiled successfully!') {
                  console.log(`🔄 [addPersistentOutput] MAIP client ready, switching to interface in 1 second...`);
                  
                  // Fallback: si après 3 secondes le backend n'a pas envoyé iframe-ready, on l'active nous-mêmes
                  setTimeout(() => {
                    const currentState = get().tabStates[tabId];
                    if (currentState && !currentState.iframeReady) {
                      console.log(`⚠️ [addPersistentOutput] Backend iframe-ready timeout, activating interface as fallback`);
                      get().updateTabState(tabId, {
                        iframeReady: true,
                        status: 'completed',
                        isRunning: false,
                        loading: false,
                        lockedForInteraction: false
                      });
                    }
                  }, 3000); // Fallback après 3 secondes
                } else {
                  // Pour les autres outils, marquer comme prêt immédiatement
                  updatedState = {
                    ...updatedState,
                    iframeReady: true,
                    status: 'completed',
                    isRunning: false,
                    loading: false,
                    lockedForInteraction: false
                  };
                }
              }
            }
          }

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...updatedState,
                persistentOutput: newPersistent,
                output: [...(currentState.output || []), output],
                outputTimestamps: [...currentTimestamps, timestamp],
                lastOutputUpdate: timestamp
              }
            }
          };
        });
      }
    }),
    {
      name: 'attack-storage',
      storage: {
        getItem: async (name) => {
          const value = await createStorage().getItem(name);
          return value ? { state: value } : null;
        },
        setItem: async (name, value) => {
          await createStorage().setItem(name, value.state);
        },
        removeItem: async (name) => {
          await createStorage().removeItem(name);
        }
      },
      partialize: (state) => state
    }
  )
);
