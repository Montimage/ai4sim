// Types communs pour remplacer les 'any' dans l'application

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExecutionStatistics {
  [status: string]: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}

export interface ProjectUpdateData {
  name?: string;
  description?: string;
  users?: ProjectUser[];
  status?: string;
  [key: string]: any; // Pour les propriétés dynamiques
}

export interface ProjectUser {
  _id: string;
  username: string;
  role: string;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  sessionId?: string;
  userId?: string;
  timestamp?: Date;
}

export interface ExecutionUpdateData {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
  completedAt?: Date;
  [key: string]: any;
}

export interface ToolParameters {
  [key: string]: string | number | boolean;
}

export interface TargetInfo {
  ip?: string;
  domain?: string;
  port?: number;
  protocol?: string;
}

export interface LLMSettings {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface WhitelistSettings {
  enabled: boolean;
  allowedIPs: string[];
  allowedDomains: string[];
}

export type UserRole = 'super_admin' | 'admin' | 'user';
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
export type AttackStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped'; 