import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOOLS } from '../constants/tools';
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

export interface TabState {
  selectedTool?: string;
  selectedAttack?: string;
  parameters: Record<string, any>;
  category?: string;
  output: string[];
  multiOutputs?: Record<string, string[]>;
  activeOutput?: string;
  outputViewMode?: 'single' | 'split';
  isRunning: boolean;
  status?: string;
  selectedCategory?: string;
  loading: boolean;
  iframeReady: boolean;
  customCommand?: string;
  lockedForInteraction: boolean;
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
              multiOutputs: undefined,
              activeOutput: undefined,
              outputViewMode: 'single',
              isRunning: false,
              category: 'ALL',
              status: 'idle',
              selectedCategory: 'ALL',
              loading: false,
              iframeReady: false,
              customCommand: undefined,
              lockedForInteraction: false
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
        set(state => ({
          ...state,
          activeTabId: id
        }));
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
            lockedForInteraction: false
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

        const tool = TOOLS.find(t => t.id === currentTool);
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

      addOutput: (tabId: string, output: string) => set(state => {
        if (!output || !tabId || !state.tabStates[tabId]) return state;

        const currentOutput = state.tabStates[tabId].output || [];
        const lastMessage = currentOutput[currentOutput.length - 1];
        const trimmedOutput = output.trimEnd();
        
        // Check for fatal errors that should stop execution
        const isFatalError = (message: string): boolean => {
          const lowerMessage = message.toLowerCase();
          return lowerMessage.includes('process exited with code') && !lowerMessage.includes('code 0') ||
                 lowerMessage.includes('cannot connect to the docker daemon') ||
                 lowerMessage.includes('access denied') ||
                 lowerMessage.includes('unable to find image') ||
                 lowerMessage.includes('permission denied') ||
                 lowerMessage.includes('connection refused') ||
                 lowerMessage.includes('fatal error') ||
                 lowerMessage.includes('critical error');
        };
        
        // Simple duplicate detection - only check exact duplicates
        if (lastMessage === trimmedOutput) {
          return state;
        }
        
        // Check if this is a fatal error
        const isFatal = isFatalError(trimmedOutput);
        
        // Update tab state
        const updatedTabState = {
          ...state.tabStates[tabId],
          output: [...currentOutput, trimmedOutput]
        };
        
        // If fatal error, stop the execution
        if (isFatal && state.tabStates[tabId].isRunning) {
          updatedTabState.status = 'error';
          updatedTabState.isRunning = false;
          updatedTabState.loading = false;
          updatedTabState.iframeReady = false;
          updatedTabState.lockedForInteraction = false;
          
          // Send stop command via websocket
          websocket.send(JSON.stringify({ 
            type: "stop", 
            tabId 
          }));
        }

        return {
          ...state,
          tabStates: {
            ...state.tabStates,
            [tabId]: updatedTabState
          }
        };
      }),

      clearOutput: (tabId: string) => {
        set(state => {
          const currentState = state.tabStates[tabId] || {
            selectedTool: undefined,
            selectedAttack: undefined,
            parameters: {},
            output: [],
            isRunning: false,
            category: undefined,
            status: 'idle'
          };

          return {
            ...state,
            tabStates: {
              ...state.tabStates,
              [tabId]: {
                ...currentState,
                output: []
              }
            }
          };
        });
      },

      clearAllOutputs: () => set(state => {
        const updatedTabStates = Object.entries(state.tabStates).reduce((acc, [id, tabState]) => {
          acc[id] = {
            ...tabState,
            output: [],
            loading: false,
            iframeReady: false
          };
          return acc;
        }, {} as Record<string, TabState>);

        return {
          ...state,
          tabStates: updatedTabStates
        };
      }),

      getTabState: (tabId) => {
        const state = get();
        return state.tabStates[tabId] || {
          selectedTool: undefined,
          selectedAttack: undefined,
          parameters: {},
          category: 'ALL',
          output: [],
          isRunning: false,
          loading: false,
          iframeReady: false,
          status: 'idle',
          customCommand: undefined,
          lockedForInteraction: false
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
            
            const tool = TOOLS.find(t => t.id === tabState.selectedTool);
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
          const tool = TOOLS.find(t => t.id === tab.selectedTool);
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
          
          const tool = TOOLS.find(t => t.id === toolId);
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
        
        const selectedTool = TOOLS.find(t => t.id === toolId);
        if (!selectedTool) return;
        
        const defaultAttack = selectedTool?.attacks && selectedTool.attacks.length > 0 
          ? selectedTool.attacks[0] 
          : null;
        
        const defaultParameters: Record<string, any> = {};
        
        if (defaultAttack?.parameters) {
          // Utiliser Object.entries avec une assertion de type explicite
          Object.entries(defaultAttack.parameters).forEach(([paramKey, paramUnknown]) => {
            // Assertion de type explicite
            const param = paramUnknown as ToolParameter;
            defaultParameters[paramKey] = param.default !== undefined ? param.default : '';
          });
        } else if (selectedTool?.parameters) {
          // Utiliser Object.entries avec une assertion de type explicite
          Object.entries(selectedTool.parameters).forEach(([paramKey, paramUnknown]) => {
            // Assertion de type explicite
            const param = paramUnknown as ToolParameter;
            defaultParameters[paramKey] = param.default !== undefined ? param.default : '';
          });
        }
        
        get().updateTabState(tabId, { 
          selectedTool: toolId,
          selectedAttack: defaultAttack?.id,
          parameters: defaultParameters,
          status: 'idle',
          isRunning: false,
          output: currentState?.output || [],
          customCommand: undefined,
          lockedForInteraction: false
        });
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
