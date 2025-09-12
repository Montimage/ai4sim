// Types for real pentesting tools
export interface PentestConfig {
  toolName: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  content: string;
  isAgent: boolean;
  timestamp: Date;
  type?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isLoading?: boolean; // État de chargement spécifique à cette conversation
  pentestSession?: {
    sessionId: string;
    target: string;
    status: 'analyzing' | 'executing' | 'completed' | 'failed';
    tools: PentestConfig[];
    results: Record<string, any>;
    finalReport?: any;
  };
}

export interface ExecutionStep {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  command?: string;
  output?: string;
  error?: string;
  duration?: number;
  progress?: number;
}

export interface PentestSession {
  id: string;
  target: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  steps: ExecutionStep[];
  summary?: {
    totalTools: number;
    successful: number;
    failed: number;
    totalDuration: number;
  };
}

export type ViewType = 'chat' | 'pipeline';

// Declare global WebSocket interface extension
declare global {
  interface Window {
    websocket?: {
      isConnected(): boolean;
      on(event: string, callback: (data: any) => void): void;
      emit(event: string, data: any): void;
    };
  }
}
