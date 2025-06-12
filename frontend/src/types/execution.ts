// Types pour le statut d'exécution des scénarios
export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopped' | 'loading';

// Types pour la progression d'exécution
export interface ExecutionProgress {
  status: ExecutionStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  currentTarget?: string;
  currentAttack?: string;
}
