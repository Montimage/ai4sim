import { api } from './api';

export interface ProcessStatus {
  isRunning: boolean;
  pid?: number;
  lastActivity?: Date;
}

class ProcessStatusService {
  private static instance: ProcessStatusService;
  
  public static getInstance(): ProcessStatusService {
    if (!ProcessStatusService.instance) {
      ProcessStatusService.instance = new ProcessStatusService();
    }
    return ProcessStatusService.instance;
  }

  /**
   * Vérifie si un processus est réellement en cours d'exécution
   */
  async checkProcessStatus(processId: string): Promise<ProcessStatus> {
    try {
      const response = await api.get(`/api/process-status/${processId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to check process status for ${processId}:`, error);
      return { isRunning: false };
    }
  }

  /**
   * Vérifie le statut de plusieurs processus en une fois
   */
  async checkMultipleProcessStatus(processIds: string[]): Promise<Record<string, ProcessStatus>> {
    try {
      const response = await api.post('/api/process-status/batch', { processIds });
      return response.data;
    } catch (error) {
      console.warn('Failed to check multiple process status:', error);
      // Retourner un objet avec tous les processus marqués comme non-running
      return processIds.reduce((acc, id) => {
        acc[id] = { isRunning: false };
        return acc;
      }, {} as Record<string, ProcessStatus>);
    }
  }

  /**
   * Corrige automatiquement les statuts d'exécution incorrects
   */
  async correctExecutionStatuses(executions: any[]): Promise<any[]> {
    const runningExecutions = executions.filter(exec => 
      exec.status === 'running' || 
      exec.attacks?.some((attack: any) => attack.status === 'running')
    );

    if (runningExecutions.length === 0) {
      return executions;
    }

    // Collecter tous les IDs de processus à vérifier
    const processIds: string[] = [];
    runningExecutions.forEach(exec => {
      if (exec.status === 'running') {
        processIds.push(exec.id);
      }
      exec.attacks?.forEach((attack: any, index: number) => {
        if (attack.status === 'running') {
          processIds.push(`${exec.id}-attack-${index + 1}`);
        }
      });
    });

    // Vérifier les statuts réels
    const statusResults = await this.checkMultipleProcessStatus(processIds);

    // Corriger les statuts
    return executions.map(exec => {
      let correctedExec = { ...exec };

      // Corriger le statut global de l'exécution
      if (exec.status === 'running' && !statusResults[exec.id]?.isRunning) {
        correctedExec.status = 'stopped';
        correctedExec.endTime = correctedExec.endTime || new Date();
      }

      // Corriger les statuts des attaques
      if (correctedExec.attacks) {
        correctedExec.attacks = correctedExec.attacks.map((attack: any, index: number) => {
          const attackProcessId = `${exec.id}-attack-${index + 1}`;
          if (attack.status === 'running' && !statusResults[attackProcessId]?.isRunning) {
            return {
              ...attack,
              status: 'stopped',
              endTime: attack.endTime || new Date()
            };
          }
          return attack;
        });
      }

      return correctedExec;
    });
  }

  /**
   * Vérifie si un port est en cours d'utilisation (pour les outils qui utilisent des ports spécifiques)
   */
  async checkPortStatus(port: number): Promise<boolean> {
    try {
      const response = await api.get(`/api/check-port/${port}`);
      return response.data.isInUse;
    } catch (error) {
      console.warn(`Failed to check port ${port}:`, error);
      return false;
    }
  }
}

export const processStatusService = ProcessStatusService.getInstance(); 