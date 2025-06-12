export interface Target {
  _id?: string;
  host: string;
  name: string;
  description?: string;
  port?: number;
  protocol?: string;
  hasAgent?: boolean;
}

export interface Attack {
  _id?: string;
  tool: string;
  parameters: Record<string, any>;
  timestamp?: Date;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'idle' | 'stopped' | 'error';
  processId?: string;
  startTime?: Date;
  endTime?: Date;
  logs?: string[];
  results?: any;
}

export interface Scenario {
  _id?: string;
  name: string;
  description?: string;
  targets: Target[];
  attacks: Attack[];
  createdAt: string | Date;
  updatedAt: string | Date;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'idle' | 'stopped' | 'error';
  project?: string;
  campaign?: string;
  sequence?: boolean;
  createdBy?: string;
  executionTime?: number;
}

export interface Campaign {
  _id?: string;
  name: string;
  description?: string;
  targets: Target[];
  attacks: Attack[];
  createdAt: string | Date;
  scenarios: Scenario[];
  updatedAt: string | Date;
  status?: 'draft' | 'active' | 'completed' | 'paused';
  scheduledFor?: Date;
  project?: string;
  scenarioIds?: string[];
  createdBy?: string;
  executionProgress?: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
}

export interface SharedUser {
  userId: string;
  username: string;
  role: 'viewer' | 'editor' | 'owner';
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  campaigns?: Campaign[];
  sharedWith?: SharedUser[];
  owner: {
    _id: string;
    username: string;
  };
}

// Interface pour le ProjectStore utilisé par les composants React
export interface ProjectStoreInterface {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Méthodes
  init: () => Promise<void>;
  setSelectedProject: (project: Project | null) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchProject: (projectId: string) => Promise<Project>;
  selectProject: (projectId: string) => Promise<Project>;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  shareProject: (projectId: string, username: string, role: 'viewer' | 'editor') => Promise<Project>;
  removeUserFromProject: (projectId: string, userId: string) => Promise<Project>;
  addCampaign: (campaign: Partial<Campaign>) => Promise<Project>;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => Promise<Project>;
  selectCampaign: (campaignId: string) => Campaign | undefined;
  addScenario: (campaignId: string, scenario: Partial<Scenario>) => Promise<Scenario>;
  updateScenario: (campaignId: string, scenarioId: string, updates: Partial<Scenario>) => Promise<Project | undefined>;
  clearSelectedProject: () => Promise<void>;
  clearError: () => void;
}
