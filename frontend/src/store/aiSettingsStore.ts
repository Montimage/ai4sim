import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'ollama' | 'openrouter' | 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'groq' | 'huggingface';

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

export interface OpenAISettings {
  apiKey: string;
  model: string;
  baseUrl: string;
  organization?: string;
}

export interface AnthropicSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
  version: string;
}

export interface GoogleSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
  projectId?: string;
}

export interface MistralSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface CohereSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface GroqSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface HuggingFaceSettings {
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
  openai: OpenAISettings;
  anthropic: AnthropicSettings;
  google: GoogleSettings;
  mistral: MistralSettings;
  cohere: CohereSettings;
  groq: GroqSettings;
  huggingface: HuggingFaceSettings;
}

interface AISettingsStore {
  settings: AISettings;
  updateProvider: (provider: AIProvider) => void;
  updateOpenRouterSettings: (settings: Partial<OpenRouterSettings>) => void;
  updateOllamaSettings: (settings: Partial<OllamaSettings>) => void;
  updateOpenAISettings: (settings: Partial<OpenAISettings>) => void;
  updateAnthropicSettings: (settings: Partial<AnthropicSettings>) => void;
  updateGoogleSettings: (settings: Partial<GoogleSettings>) => void;
  updateMistralSettings: (settings: Partial<MistralSettings>) => void;
  updateCohereSettings: (settings: Partial<CohereSettings>) => void;
  updateGroqSettings: (settings: Partial<GroqSettings>) => void;
  updateHuggingFaceSettings: (settings: Partial<HuggingFaceSettings>) => void;
  addOllamaModel: (model: OllamaModel) => void;
  removeOllamaModel: (modelName: string) => void;
  testConnection: (provider: AIProvider) => Promise<boolean>;
  fetchOllamaModels: () => Promise<OllamaModel[]>;
}

const defaultSettings: AISettings = {
  provider: 'ollama',
  openrouter: {
    apiKey: '',
    model: 'meta-llama/llama-3.2-3b-instruct:free',
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
  },
  openai: {
    apiKey: '',
    model: 'gpt-4',
    baseUrl: 'https://api.openai.com/v1',
    organization: ''
  },
  anthropic: {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com',
    version: '2023-06-01'
  },
  google: {
    apiKey: '',
    model: 'gemini-2.0-flash-exp',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    projectId: ''
  },
  mistral: {
    apiKey: '',
    model: 'mistral-large-latest',
    baseUrl: 'https://api.mistral.ai/v1'
  },
  cohere: {
    apiKey: '',
    model: 'command-r-plus',
    baseUrl: 'https://api.cohere.ai/v1'
  },
  groq: {
    apiKey: '',
    model: 'llama-3.1-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  huggingface: {
    apiKey: '',
    model: 'meta-llama/Meta-Llama-3-70B-Instruct',
    baseUrl: 'https://api-inference.huggingface.co/models'
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

      updateOpenAISettings: (newSettings: Partial<OpenAISettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            openai: {
              ...state.settings.openai,
              ...newSettings
            }
          }
        }));
      },

      updateAnthropicSettings: (newSettings: Partial<AnthropicSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            anthropic: {
              ...state.settings.anthropic,
              ...newSettings
            }
          }
        }));
      },

      updateGoogleSettings: (newSettings: Partial<GoogleSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            google: {
              ...state.settings.google,
              ...newSettings
            }
          }
        }));
      },

      updateMistralSettings: (newSettings: Partial<MistralSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            mistral: {
              ...state.settings.mistral,
              ...newSettings
            }
          }
        }));
      },

      updateCohereSettings: (newSettings: Partial<CohereSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            cohere: {
              ...state.settings.cohere,
              ...newSettings
            }
          }
        }));
      },

      updateGroqSettings: (newSettings: Partial<GroqSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            groq: {
              ...state.settings.groq,
              ...newSettings
            }
          }
        }));
      },

      updateHuggingFaceSettings: (newSettings: Partial<HuggingFaceSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            huggingface: {
              ...state.settings.huggingface,
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
          switch (provider) {
            case 'ollama':
              const ollamaResponse = await fetch(`${settings.ollama.baseUrl}/api/tags`);
              return ollamaResponse.ok;
              
            case 'openrouter':
              if (!settings.openrouter.apiKey) return false;
              const openrouterResponse = await fetch(`${settings.openrouter.baseUrl}/models`, {
                headers: {
                  'Authorization': `Bearer ${settings.openrouter.apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              return openrouterResponse.ok;
              
            case 'openai':
              if (!settings.openai.apiKey) return false;
              const openaiResponse = await fetch(`${settings.openai.baseUrl}/models`, {
                headers: {
                  'Authorization': `Bearer ${settings.openai.apiKey}`,
                  'Content-Type': 'application/json',
                  ...(settings.openai.organization && { 'OpenAI-Organization': settings.openai.organization })
                }
              });
              return openaiResponse.ok;
              
            case 'anthropic':
              if (!settings.anthropic.apiKey) return false;
              const anthropicResponse = await fetch(`${settings.anthropic.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${settings.anthropic.apiKey}`,
                  'Content-Type': 'application/json',
                  'anthropic-version': settings.anthropic.version
                },
                body: JSON.stringify({
                  model: settings.anthropic.model,
                  max_tokens: 1,
                  messages: [{ role: 'user', content: 'test' }]
                })
              });
              return anthropicResponse.status === 200 || anthropicResponse.status === 400; // 400 is ok for test
              
            case 'google':
              if (!settings.google.apiKey) return false;
              const googleResponse = await fetch(`${settings.google.baseUrl}/models?key=${settings.google.apiKey}`);
              return googleResponse.ok;
              
            case 'mistral':
              if (!settings.mistral.apiKey) return false;
              const mistralResponse = await fetch(`${settings.mistral.baseUrl}/models`, {
                headers: {
                  'Authorization': `Bearer ${settings.mistral.apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              return mistralResponse.ok;
              
            case 'cohere':
              if (!settings.cohere.apiKey) return false;
              const cohereResponse = await fetch(`${settings.cohere.baseUrl}/check-api-key`, {
                headers: {
                  'Authorization': `Bearer ${settings.cohere.apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              return cohereResponse.ok;
              
            case 'groq':
              if (!settings.groq.apiKey) return false;
              const groqResponse = await fetch(`${settings.groq.baseUrl}/models`, {
                headers: {
                  'Authorization': `Bearer ${settings.groq.apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              return groqResponse.ok;
              
            case 'huggingface':
              if (!settings.huggingface.apiKey) return false;
              const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${settings.huggingface.model}`, {
                headers: {
                  'Authorization': `Bearer ${settings.huggingface.apiKey}`
                }
              });
              return hfResponse.ok;
              
            default:
              return false;
          }
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
      version: 2 // Increment version to trigger migration
    }
  )
); 