export interface Attack {
    id: string;
    name: string; 
    description: string;
    command: (paramValues: Record<string, string>) => string;
    parameters: Record<string, any>;
    status: "idle" | "running" | "stopped" | "failed" | "completed";
    type: "FUZZING" | "SIMULATION" | "FRAMEWORK";
    output: string[];
    startTime?: Date;
    endTime?: Date;
}

export interface AttackConfig {
    name: string;
    command: string;
    parameters: Record<string, any>;
    type: Attack["type"];
}

export type AttackStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped' | 'loading' | 'paused';

export interface TabState {
  selectedCategory?: string;
  selectedTool?: string;
  selectedAttack?: string;
  targets: import('../types/project').Target[];
  parameters: Record<string, any>;
  output: string[];
  status: AttackStatus;
  error?: string;
  iframeReady: boolean;
  customCommand: string;
  lockedForInteraction?: boolean;
  isRunning?: boolean;
  loading?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  attacks: Attack[];
  command: (paramValues: Record<string, string>) => string;
  parameters: Record<string, any>;
  iframe?: string;
  tags?: string[];
}

export interface SavedConfig {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  exportDate: string;
  state: any;
  tabs: any[];
  tabStates: Record<string, any>;
}
