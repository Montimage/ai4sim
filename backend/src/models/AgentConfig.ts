import mongoose, { Document, Schema } from 'mongoose';
import { AgentType } from './AgentSession';

// Interface pour la configuration d'un agent
export interface IAgentConfig extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  agentName: AgentType;
  modelProvider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'openrouter' | 'ollama';
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  customParameters?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schéma pour la configuration des agents
const AgentConfigSchema = new Schema<IAgentConfig>({
  userId: { type: String, required: true },
  agentName: { 
    type: String, 
    enum: ['PlanningAgent', 'ScanningAgent', 'MAIPAgent', 'CalderaAgent', 'ShenninaPentestAgent', 'ReportAgent', 'FixingAgent'],
    required: true 
  },
  modelProvider: { 
    type: String, 
    enum: ['openai', 'anthropic', 'google', 'mistral', 'openrouter', 'ollama'],
    required: true 
  },
  modelName: { type: String, required: true },
  temperature: { 
    type: Number, 
    min: 0, 
    max: 2, 
    default: 0.5
  },
  maxTokens: { 
    type: Number, 
    min: 100, 
    max: 32000,
    default: 2000
  },
  systemPrompt: { 
    type: String,
    default: 'You are a specialized cybersecurity agent. Follow instructions precisely and provide structured, actionable output. Focus on accuracy and security best practices.'
  },
  customParameters: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'agent_configs'
});

// Index composé pour éviter les doublons agent/user
AgentConfigSchema.index({ userId: 1, agentName: 1 }, { unique: true });
AgentConfigSchema.index({ userId: 1, isActive: 1 });

// Méthodes utiles
AgentConfigSchema.methods.getModelDisplayName = function(): string {
  const providerNames: Record<string, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic (Claude)',
    'google': 'Google (Gemini)',
    'mistral': 'Mistral AI',
    'openrouter': 'OpenRouter',
    'ollama': 'Ollama (Local)'
  };
  
  return `${providerNames[this.modelProvider] || this.modelProvider} - ${this.modelName}`;
};

AgentConfigSchema.methods.getOptimalTokenLimit = function(): number {
  // Limites optimales par modèle
  const modelLimits: Record<string, number> = {
    'gpt-4': 8000,
    'gpt-4o': 8000,
    'gpt-4o-mini': 4000,
    'claude-3-5-sonnet-20241022': 8000,
    'claude-3-5-haiku-20241022': 4000,
    'gemini-1.5-pro': 8000,
    'gemini-2.0-flash': 4000,
    'gemini-2.5-flash-exp': 4000,
    'mistral-large-latest': 8000,
    'mistral-medium-latest': 4000,
  };
  
  return Math.min(this.maxTokens || 2000, modelLimits[this.modelName] || 2000);
};

// Configuration par défaut pour un nouvel utilisateur
export const getDefaultAgentConfigs = (userId: string): Partial<IAgentConfig>[] => [
  {
    userId,
    agentName: 'PlanningAgent',
    modelProvider: 'google',
    modelName: 'gemini-2.5-flash-exp',
    temperature: 0.7,
    maxTokens: 4000
  },
  {
    userId,
    agentName: 'ScanningAgent',
    modelProvider: 'google',
    modelName: 'gemini-2.5-flash-exp',
    temperature: 0.3,
    maxTokens: 2000
  },
  {
    userId,
    agentName: 'MAIPAgent',
    modelProvider: 'google',
    modelName: 'gemini-2.5-flash-exp',
    temperature: 0.5,
    maxTokens: 2000
  },
  {
    userId,
    agentName: 'CalderaAgent',
    modelProvider: 'google',
    modelName: 'gemini-2.5-flash-exp',
    temperature: 0.5,
    maxTokens: 2000
  },
  {
    userId,
    agentName: 'ShenninaPentestAgent',
    modelProvider: 'anthropic',
    modelName: 'anthropic/claude-3-5-sonnet-20241022',
    temperature: 0.5,
    maxTokens: 2000,
    systemPrompt: 'Expert en tests de pénétration avec framework Shennina.',
    customParameters: {
      'max_vulnerability_checks': 50,
      'exploit_depth': 'safe_mode'
    }
  },{
    userId,
    agentName: 'ReportAgent',
    modelProvider: 'google',
    modelName: 'gemini-2.5-flash-exp',
    temperature: 0.8,
    maxTokens: 8000
  },
  {
    userId,
    agentName: 'FixingAgent',
    modelProvider: 'google',
    modelName: 'gemini-2.5-flash-exp',
    temperature: 0.6,
    maxTokens: 4000
  }
];

export const AgentConfig = mongoose.model<IAgentConfig>('AgentConfig', AgentConfigSchema); 