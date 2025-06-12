import { Target } from './project';

// Réexporter les types pour être utilisés par les composants
export type { Target };

// Types pour les projets
export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  sharedWith: Array<{
    userId: string;
    username: string;
    role: 'viewer' | 'editor' | 'owner';
  }>;
  createdAt: string;
  updatedAt: string;
}

// Types pour les scénarios
export interface Attack {
  _id?: string;
  tool: string;
  parameters: Record<string, any>;
  status?: AttackStatus;
  processId?: string;
  startTime?: Date;
  endTime?: Date;
  logs?: string[];
  results?: any;
  timestamp?: Date;
}

export interface Scenario {
  _id?: string;
  name: string;
  description?: string;
  project: string;
  campaign?: string;
  targets: Target[];
  attacks: Attack[];
  sequence?: boolean;
  status?: AttackStatus;
  createdBy?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  executionTime?: number;
}

export interface ScenarioCreateData {
  name: string;
  description?: string;
  campaignId: string;
  targets: Array<{
    host: string;
    name: string;
  }>;
  attacks: Array<{
    tool: string;
    parameters: Record<string, unknown>;
  }>;
  sequence?: boolean;
}

// Types pour les campagnes
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}

export interface Campaign {
  _id?: string;
  name: string;
  description?: string;
  project: string;
  scenarioIds: string[];
  status?: CampaignStatus;
  createdBy?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  executionProgress?: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
  scheduledFor?: Date | string;
}

export type AttackStatus = 'pending' | 'running' | 'completed' | 'failed' | 'idle' | 'stopped' | 'error';
