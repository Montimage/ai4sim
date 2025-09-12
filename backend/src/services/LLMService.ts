import axios from 'axios';
import { AgentType } from '../models/AgentSession';
import { IAgentConfig } from '../models/AgentConfig';
import { logger } from '../utils/logger';

// Types pour les requêtes et réponses LLM
export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  agentType: AgentType;
  context?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface APIKeyStatus {
  key: string;
  isActive: boolean;
  lastUsed: Date;
  errorCount: number;
  rateLimitUntil?: Date;
}

// Pool de clés API par provider
export class APIKeyPool {
  public pools: Map<string, APIKeyStatus[]> = new Map();
  private currentIndex: Map<string, number> = new Map();

  addKeys(provider: string, keys: string[]) {
    const existingPool = this.pools.get(provider) || [];
    const newKeys = keys.map(key => ({
      key,
      isActive: true,
      lastUsed: new Date(0),
      errorCount: 0
    }));
    this.pools.set(provider, [...existingPool, ...newKeys]);
    if (!this.currentIndex.has(provider)) {
      this.currentIndex.set(provider, 0);
    }
  }

  getNextKey(provider: string): string | null {
    const pool = this.pools.get(provider);
    if (!pool || pool.length === 0) return null;

    const currentIdx = this.currentIndex.get(provider) || 0;
    const now = new Date();

    // Chercher une clé active et disponible
    for (let i = 0; i < pool.length; i++) {
      const idx = (currentIdx + i) % pool.length;
      const keyStatus = pool[idx];

      if (keyStatus.isActive && 
          (!keyStatus.rateLimitUntil || keyStatus.rateLimitUntil < now)) {
        this.currentIndex.set(provider, (idx + 1) % pool.length);
        keyStatus.lastUsed = now;
        return keyStatus.key;
      }
    }

    return null;
  }

  markKeyAsRateLimited(provider: string, key: string, duration: number = 60000) {
    const pool = this.pools.get(provider);
    if (!pool) return;

    const keyStatus = pool.find(k => k.key === key);
    if (keyStatus) {
      keyStatus.rateLimitUntil = new Date(Date.now() + duration);
      keyStatus.errorCount++;
    }
  }

  markKeyAsError(provider: string, key: string) {
    const pool = this.pools.get(provider);
    if (!pool) return;

    const keyStatus = pool.find(k => k.key === key);
    if (keyStatus) {
      keyStatus.errorCount++;
      if (keyStatus.errorCount >= 5) {
        keyStatus.isActive = false;
      }
    }
  }
}

export class LLMService {
  private apiKeyPool: APIKeyPool;

  constructor() {
    this.apiKeyPool = new APIKeyPool();
    this.loadAPIKeys();
  }

  // Charge les clés API depuis les variables d'environnement
  private loadAPIKeys() {
    // Clés Google Gemini depuis les variables d'environnement
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      this.apiKeyPool.addKeys('google', [googleApiKey]);
      logger.info('✅ Clé API Google chargée depuis les variables d\'environnement');
      logger.debug('🔧 Clé configurée:', googleApiKey.substring(0, 10) + '...');
    } else {
      logger.warn('⚠️ Aucune clé API Google trouvée dans les variables d\'environnement');
    }

    // Clés OpenRouter depuis les variables d'environnement  
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (openrouterApiKey) {
      this.apiKeyPool.addKeys('openrouter', [openrouterApiKey]);
      logger.info('✅ Clé API OpenRouter chargée depuis les variables d\'environnement');
      logger.debug('🔧 Clé configurée:', openrouterApiKey.substring(0, 10) + '...');
    } else {
      logger.warn('⚠️ Aucune clé API OpenRouter trouvée dans les variables d\'environnement');
    }

    // Clés OpenAI depuis les variables d'environnement
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.apiKeyPool.addKeys('openai', [openaiApiKey]);
      logger.info('✅ Clé API OpenAI chargée depuis les variables d\'environnement');
    }

    // Clés Anthropic depuis les variables d'environnement
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey) {
      this.apiKeyPool.addKeys('anthropic', [anthropicApiKey]);
      logger.info('✅ Clé API Anthropic chargée depuis les variables d\'environnement');
    }

    // Clés Mistral depuis les variables d'environnement
    const mistralApiKey = process.env.MISTRAL_API_KEY;
    if (mistralApiKey) {
      this.apiKeyPool.addKeys('mistral', [mistralApiKey]);
      logger.info('✅ Clé API Mistral chargée depuis les variables d\'environnement');
    }

    // Clés Cohere depuis les variables d'environnement
    const cohereApiKey = process.env.COHERE_API_KEY;
    if (cohereApiKey) {
      this.apiKeyPool.addKeys('cohere', [cohereApiKey]);
      logger.info('✅ Clé API Cohere chargée depuis les variables d\'environnement');
    }

    // Clés Groq depuis les variables d'environnement
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      this.apiKeyPool.addKeys('groq', [groqApiKey]);
      logger.info('✅ Clé API Groq chargée depuis les variables d\'environnement');
    }

    // Clés HuggingFace depuis les variables d'environnement
    const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    if (huggingfaceApiKey) {
      this.apiKeyPool.addKeys('huggingface', [huggingfaceApiKey]);
      logger.info('✅ Clé API HuggingFace chargée depuis les variables d\'environnement');
    }
  }

  // Met à jour les settings IA depuis les variables d'environnement
  updateSettings(_settings?: any) {
    // Cette méthode n'a plus besoin de stocker les settings car ils sont passés dynamiquement
    // Les variables d'environnement sont toujours prioritaires et chargées via loadAPIKeys()
    logger.info('📝 Settings LLM mis à jour');
  }

  // Méthode principale pour envoyer une requête LLM
  async sendRequest(request: LLMRequest, config: IAgentConfig): Promise<LLMResponse> {
    const { modelProvider } = config;
    
    // Utiliser les paramètres AI du contexte si disponibles
    const aiSettings = request.context?.aiSettings;
    const provider = aiSettings?.provider || modelProvider;
    const model = aiSettings?.model || config.modelName;
    const baseUrl = aiSettings?.baseUrl;
    const apiKey = aiSettings?.apiKey;
    
    try {
      switch (provider) {
        case 'openai':
          return await this.sendOpenAIRequest(request, config, { model, apiKey });
        case 'anthropic':
          return await this.sendAnthropicRequest(request, config, { model, apiKey });
        case 'google':
          return await this.sendGoogleRequest(request, config, { model, apiKey });
        case 'mistral':
          return await this.sendMistralRequest(request, config, { model, apiKey });
        case 'openrouter':
          return await this.sendOpenRouterRequest(request, config, { model, apiKey });
        case 'ollama':
          return await this.sendOllamaRequest(request, config, { model, baseUrl });
        default:
          throw new Error(`Provider non supporté: ${provider}`);
      }
    } catch (error: any) {
      logger.error(`Erreur LLM pour ${provider}:`, error.message);
      throw error;
    }
  }

  // OpenAI API
  private async sendOpenAIRequest(request: LLMRequest, config: IAgentConfig, options: { model: string; apiKey: string }): Promise<LLMResponse> {
    const { model, apiKey } = options;
    if (!apiKey) throw new Error('Clé API OpenAI non disponible');

    const messages = [
      { role: 'system', content: config.systemPrompt || request.systemPrompt },
      { role: 'user', content: request.prompt }
    ].filter(msg => msg.content);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages,
          temperature: request.temperature ?? config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? config.maxTokens ?? 2000,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minutes pour les rapports complexes
        }
      );

      return {
        content: (response.data as any).choices[0].message.content,
        provider: 'openai',
        model: model,
        usage: (response.data as any).usage,
        finishReason: (response.data as any).choices[0].finish_reason
      };
    } catch (error: any) {
      this.handleAPIError('openai', apiKey, error);
      throw error;
    }
  }

  // Anthropic Claude API
  private async sendAnthropicRequest(request: LLMRequest, config: IAgentConfig, options: { model: string; apiKey: string }): Promise<LLMResponse> {
    const { model, apiKey } = options;
    if (!apiKey) throw new Error('Clé API Anthropic non disponible');

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: model,
          system: config.systemPrompt || request.systemPrompt,
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature ?? config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? config.maxTokens ?? 2000
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          timeout: 300000 // 5 minutes pour les rapports complexes
        }
      );

      return {
        content: (response.data as any).content[0].text,
        provider: 'anthropic',
        model: model,
        usage: (response.data as any).usage,
        finishReason: (response.data as any).stop_reason
      };
    } catch (error: any) {
      this.handleAPIError('anthropic', apiKey, error);
      throw error;
    }
  }

  // Google Gemini API
  private async sendGoogleRequest(request: LLMRequest, config: IAgentConfig, options: { model: string; apiKey: string }): Promise<LLMResponse> {
    const { model, apiKey } = options;
    if (!apiKey) throw new Error('Clé API Google non disponible');

    const fullPrompt = [
      config.systemPrompt || request.systemPrompt,
      request.prompt
    ].filter(Boolean).join('\n\n');

    try {
      // Support pour Gemini 2.5 Flash Experimental
      const modelName = model === 'gemini-2.5-flash-exp' ? 'gemini-2.0-flash-exp' : model;
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: request.temperature ?? config.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? config.maxTokens ?? 2000
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000 // 5 minutes pour les rapports complexes
        }
      );

      return {
        content: (response.data as any).candidates[0].content.parts[0].text,
        provider: 'google',
        model: model,
        finishReason: (response.data as any).candidates[0].finishReason
      };
    } catch (error: any) {
      this.handleAPIError('google', apiKey, error);
      throw error;
    }
  }

  // Mistral AI API
  private async sendMistralRequest(request: LLMRequest, config: IAgentConfig, options: { model: string; apiKey: string }): Promise<LLMResponse> {
    const { model, apiKey } = options;
    if (!apiKey) throw new Error('Clé API Mistral non disponible');

    const messages = [
      { role: 'system', content: config.systemPrompt || request.systemPrompt },
      { role: 'user', content: request.prompt }
    ].filter(msg => msg.content);

    try {
      const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: model,
          messages,
          temperature: request.temperature ?? config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? config.maxTokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minutes pour les rapports complexes
        }
      );

      return {
        content: (response.data as any).choices[0].message.content,
        provider: 'mistral',
        model: model,
        usage: (response.data as any).usage,
        finishReason: (response.data as any).choices[0].finish_reason
      };
    } catch (error: any) {
      this.handleAPIError('mistral', apiKey, error);
      throw error;
    }
  }

  // OpenRouter API
  private async sendOpenRouterRequest(request: LLMRequest, config: IAgentConfig, options: { model: string; apiKey: string }): Promise<LLMResponse> {
    const { model, apiKey } = options;
    if (!apiKey) throw new Error('Clé API OpenRouter non disponible');

    const messages = [
      { role: 'system', content: config.systemPrompt || request.systemPrompt },
      { role: 'user', content: request.prompt }
    ].filter(msg => msg.content);

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages,
          temperature: request.temperature ?? config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? config.maxTokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ai4sim-dashboard.local',
            'X-Title': 'AI4SIM Dashboard'
          },
          timeout: 300000 // 5 minutes pour les rapports complexes
        }
      );

      return {
        content: (response.data as any).choices[0].message.content,
        provider: 'openrouter',
        model: model,
        usage: (response.data as any).usage,
        finishReason: (response.data as any).choices[0].finish_reason
      };
    } catch (error: any) {
      this.handleAPIError('openrouter', apiKey, error);
      throw error;
    }
  }

  // Ollama API (local)
  private async sendOllamaRequest(request: LLMRequest, config: IAgentConfig, options: { model: string; baseUrl: string }): Promise<LLMResponse> {
    const { model, baseUrl } = options;

    try {
      // ✅ Utiliser l'API Chat moderne de Ollama au lieu de /api/generate
      const messages = [
        {
          role: 'system',
          content: config.systemPrompt || request.systemPrompt || 'You are a helpful assistant.'
        },
        {
          role: 'user', 
          content: request.prompt
        }
      ];

      logger.info(`🤖 Calling Ollama API: ${baseUrl}/api/chat with model ${model}`);
      const response = await axios.post(
        `${baseUrl}/api/chat`,
        {
          model: model,
          messages: messages,
          stream: false,
          options: {
            temperature: request.temperature ?? config.temperature ?? 0.7,
            num_predict: request.maxTokens ?? config.maxTokens ?? 2000
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000 // 5 minutes pour les rapports complexes
        }
      );

      const responseData = response.data as any;
      logger.info(`✅ Ollama response received: ${responseData.message?.content ? 'Success' : 'Empty'}`);
      return {
        content: responseData.message?.content || '',
        provider: 'ollama',
        model: model,
        finishReason: responseData.done ? 'stop' : 'length'
      };
    } catch (error: any) {
      logger.error(`❌ Erreur Ollama: ${error.message}`, { 
        url: `${baseUrl}/api/chat`, 
        model, 
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw new Error(`Erreur Ollama: ${error.message}`);
    }
  }

  // Méthode publique pour appeler directement Ollama
  async sendOllamaRequestDirect(request: LLMRequest, options: { model: string; baseUrl: string }): Promise<LLMResponse> {
    return await this.sendOllamaRequest(request, {
      modelProvider: 'ollama',
      modelName: options.model,
      systemPrompt: request.systemPrompt || 'You are a helpful assistant.',
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens || 2000
    } as any, options);
  }

  // Gère les erreurs d'API et met à jour le pool de clés
  private handleAPIError(provider: string, apiKey: string, error: any) {
    logger.error(`API Error for ${provider}:`, error);
    
    // Marquer la clé comme ayant une erreur
      this.apiKeyPool.markKeyAsError(provider, apiKey);
    
    // Si c'est une erreur de rate limit, marquer temporairement
    if (error.response?.status === 429) {
      this.apiKeyPool.markKeyAsRateLimited(provider, apiKey, 60000); // 1 minute
    }
  }

  // Méthode de test de connexion
  async testConnection(provider: string, config: IAgentConfig): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: 'Test de connexion. Répondez simplement "OK".',
        agentType: 'PlanningAgent',
        temperature: 0.1,
        maxTokens: 10
      };

      const response = await this.sendRequest(testRequest, config);
      return response.content.toLowerCase().includes('ok');
    } catch (error) {
      logger.error(`Test de connexion échoué pour ${provider}:`, error);
      return false;
    }
  }

  // Statistiques des clés API
  getKeyPoolStatus(provider: string): APIKeyStatus[] {
    return this.apiKeyPool.pools.get(provider) || [];
  }

  // Ajouter des clés API au pool
  addAPIKeys(provider: string, keys: string[]) {
    this.apiKeyPool.addKeys(provider, keys);
  }
}

// Instance singleton
export const llmService = new LLMService(); 