import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types pour la nouvelle architecture d'agents
interface AgentConfig {
  agentName: string;
  modelProvider: 'Gemini' | 'Ollama' | 'OpenRouter' | 'Claude';
  modelName: string;
  enabled: boolean;
}

interface AgentStep {
  id: string;
  step: number;
  agent: 'PlanningAgent' | 'ScanningAgent' | 'MAIPAgent' | 'CalderaAgent' | 'ShenninaAgent' | 'ReportAgent' | 'FixingAgent';
  description: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED';
  parameters: Record<string, any>;
  results?: Record<string, any>;
  logs: string[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

interface AgentSession {
  id: string;
  status: 'ANALYZING' | 'PLANNING' | 'ATTACKING' | 'REPORTING' | 'DONE' | 'FAILED';
  mode: 'auto' | 'semi-auto';
  initialPrompt: string;
  targetIp: string;
  discoveredData?: {
    os?: string;
    ports?: Array<{ port: number; service: string; version: string }>;
  };
  executionPlan: AgentStep[];
  finalReport?: {
    executiveSummary: string;
    attackNarrative: string;
    remediationPlan: Array<{ vulnerability: string; fix: string }>;
  };
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    userId?: string;
    projectId?: string;
    lastActivity?: Date;
    executionTime?: number;
  };
}

interface AgentMessage {
  id: string;
  content: string;
  isAgent: boolean;
  timestamp: Date;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface AgentStore {
  // État
  currentSession: AgentSession | null;
  sessions: AgentSession[];
  messages: AgentMessage[];
  agentConfigs: AgentConfig[];
  isExecuting: boolean;
  executionProgress: number;
  autoMode: boolean;
  
  // Actions
  createSession: (prompt: string, mode?: 'auto' | 'semi-auto') => Promise<AgentSession>;
  loadSession: (sessionId: string) => void;
  stopSession: (sessionId: string) => void;
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  startExecution: (sessionId: string) => Promise<void>;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;
  approveStep: (sessionId: string, stepId: string) => Promise<void>;
  updateAgentConfigs: (configs: AgentConfig[]) => void;
  loadAgentConfigs: () => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // État initial
      currentSession: null,
      sessions: [],
      messages: [],
      agentConfigs: [
        { agentName: 'PlanningAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true },
        { agentName: 'ScanningAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true },
        { agentName: 'MAIPAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true },
        { agentName: 'CalderaAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true },
        { agentName: 'ShenninaAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true },
        { agentName: 'ReportAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true },
        { agentName: 'FixingAgent', modelProvider: 'Gemini', modelName: 'gemini-2.5-pro', enabled: true }
      ],
      isExecuting: false,
      executionProgress: 0,
      autoMode: false,

      // Actions principales
      createSession: async (prompt: string, mode: 'auto' | 'semi-auto' = 'semi-auto') => {
        try {
          const token = localStorage.getItem('token');
          
          // Appel API pour créer une nouvelle session
          const response = await fetch('/api/agent/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              prompt,
              mode
            })
          });

          if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
          }

          const data = await response.json();
          const newSession = data.session;

          // Mettre à jour le store
          set((state) => ({
            sessions: [...state.sessions, newSession],
            currentSession: newSession
          }));

          return newSession;

        } catch (error) {
          console.error('❌ Erreur lors de la création de session:', error);
          
          // Fallback: créer une session locale
          const fallbackSession: AgentSession = {
      id: `session-${Date.now()}`,
            status: 'ANALYZING',
            mode,
            initialPrompt: prompt,
            targetIp: 'À définir',
            executionPlan: [],
      createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              lastActivity: new Date()
      }
    };

          set((state) => ({
            sessions: [...state.sessions, fallbackSession],
            currentSession: fallbackSession
          }));

          console.warn('⚠️ Session créée en mode fallback (locale uniquement)');
          return fallbackSession;
        }
  },

      loadSession: (sessionId: string) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (session) {
      set({ currentSession: session });
    }
  },

      stopSession: (sessionId: string) => {
        set((state) => ({
      sessions: state.sessions.map(s => 
            s.id === sessionId ? { ...s, status: 'FAILED' as const } : s
      ),
          isExecuting: false,
          executionProgress: 0
    }));
  },

      // Messages
      addMessage: (message) => {
        const newMessage: AgentMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random()}`,
          timestamp: new Date()
        };

        set((state) => ({
          messages: [...state.messages, newMessage]
    }));
  },

      clearMessages: () => {
        set({ messages: [] });
      },

      // Contrôle d'exécution
      startExecution: async (sessionId: string) => {
        try {
          set({ isExecuting: true, executionProgress: 0 });

          const token = localStorage.getItem('token');
          const response = await fetch(`/api/agent/session/${sessionId}/execute-auto`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Erreur d'exécution: ${response.status}`);
          }

          await response.json();

        } catch (error) {
          console.error('❌ Erreur lors de l\'exécution:', error);
    set({ isExecuting: false });
        }
  },

  pauseExecution: () => {
    set({ isExecuting: false });
  },

  resumeExecution: () => {
    set({ isExecuting: true });
  },

  stopExecution: () => {
    set({ 
      isExecuting: false,
          executionProgress: 0
    });
  },

      // Approuver une étape (mode semi-auto)
      approveStep: async (sessionId: string, stepId: string) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/agent/session/${sessionId}/approve-step`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stepId })
          });

          if (!response.ok) {
            throw new Error(`Erreur d'approbation: ${response.status}`);
          }

          await response.json();

        } catch (error) {
          console.error('❌ Erreur lors de l\'approbation:', error);
        }
      },

      // Configuration des agents
      updateAgentConfigs: (configs: AgentConfig[]) => {
        set({ agentConfigs: configs });
        localStorage.setItem('agentConfigs', JSON.stringify(configs));
      },

      loadAgentConfigs: () => {
        const savedConfigs = localStorage.getItem('agentConfigs');
        if (savedConfigs) {
          try {
            const configs = JSON.parse(savedConfigs);
            set({ agentConfigs: configs });
          } catch (error) {
            console.error('Erreur lors du chargement des configurations:', error);
          }
        }
      }
    }),
    {
      name: 'agent-store',
      partialize: (state) => ({
        sessions: state.sessions,
        agentConfigs: state.agentConfigs,
        autoMode: state.autoMode
      })
    }
  )
); 