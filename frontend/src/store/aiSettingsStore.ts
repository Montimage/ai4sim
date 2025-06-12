import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'ollama' | 'openrouter';

export interface OllamaModel {
  name: string;
  displayName?: string;
  description?: string;
  size?: number;
  modified_at?: string;
}

export interface OpenRouterSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface OllamaSettings {
  baseUrl: string;
  selectedModel: string;
  availableModels: OllamaModel[];
}

export interface AISettings {
  provider: AIProvider;
  openrouter: OpenRouterSettings;
  ollama: OllamaSettings;
}

interface AISettingsStore {
  settings: AISettings;
  updateProvider: (provider: AIProvider) => void;
  updateOpenRouterSettings: (settings: Partial<OpenRouterSettings>) => void;
  updateOllamaSettings: (settings: Partial<OllamaSettings>) => void;
  addOllamaModel: (model: OllamaModel) => void;
  removeOllamaModel: (modelName: string) => void;
  testConnection: (provider: AIProvider) => Promise<boolean>;
  fetchOllamaModels: () => Promise<OllamaModel[]>;
}

const defaultSettings: AISettings = {
  provider: 'ollama',
  openrouter: {
    apiKey: '',
    model: 'meta-llama/llama-4-maverick:free',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    selectedModel: 'llama3.2:latest',
    availableModels: [
      {
        name: 'llama3.2:latest',
        displayName: 'Llama 3.2 Latest',
        description: 'Latest Llama 3.2 model'
      }
    ]
  }
};

export const useAISettingsStore = create<AISettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateProvider: (provider: AIProvider) => {
        set((state) => ({
          settings: {
            ...state.settings,
            provider
          }
        }));
      },

      updateOpenRouterSettings: (newSettings: Partial<OpenRouterSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            openrouter: {
              ...state.settings.openrouter,
              ...newSettings
            }
          }
        }));
      },

      updateOllamaSettings: (newSettings: Partial<OllamaSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ollama: {
              ...state.settings.ollama,
              ...newSettings
            }
          }
        }));
      },

      addOllamaModel: (model: OllamaModel) => {
        set((state) => {
          const existingModels = state.settings.ollama.availableModels;
          const modelExists = existingModels.some(m => m.name === model.name);
          
          if (!modelExists) {
            return {
              settings: {
                ...state.settings,
                ollama: {
                  ...state.settings.ollama,
                  availableModels: [...existingModels, model]
                }
              }
            };
          }
          return state;
        });
      },

      removeOllamaModel: (modelName: string) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ollama: {
              ...state.settings.ollama,
              availableModels: state.settings.ollama.availableModels.filter(
                m => m.name !== modelName
              )
            }
          }
        }));
      },

      testConnection: async (provider: AIProvider): Promise<boolean> => {
        const { settings } = get();
        
        try {
          if (provider === 'ollama') {
            const response = await fetch(`${settings.ollama.baseUrl}/api/tags`);
            return response.ok;
          } else if (provider === 'openrouter') {
            if (!settings.openrouter.apiKey) {
              return false;
            }
            
            const response = await fetch(`${settings.openrouter.baseUrl}/models`, {
              headers: {
                'Authorization': `Bearer ${settings.openrouter.apiKey}`,
                'Content-Type': 'application/json'
              }
            });
            return response.ok;
          }
          return false;
        } catch (error) {
          console.error(`Failed to test ${provider} connection:`, error);
          return false;
        }
      },

      fetchOllamaModels: async (): Promise<OllamaModel[]> => {
        const { settings } = get();
        
        try {
          const response = await fetch(`${settings.ollama.baseUrl}/api/tags`);
          if (!response.ok) {
            throw new Error('Failed to fetch Ollama models');
          }
          
          const data = await response.json();
          return data.models?.map((model: any) => ({
            name: model.name,
            displayName: model.name,
            description: model.details?.family || 'Ollama model',
            size: model.size,
            modified_at: model.modified_at
          })) || [];
        } catch (error) {
          console.error('Failed to fetch Ollama models:', error);
          throw error;
        }
      }
    }),
    {
      name: 'ai-settings-storage',
      version: 1
    }
  )
); 