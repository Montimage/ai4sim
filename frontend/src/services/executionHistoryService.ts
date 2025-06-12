import { v4 as uuidv4 } from 'uuid';
import { Scenario as ProjectScenario } from '../types/project';
import { api } from './api';

export interface OutputLine {
  content: string;
  type: 'info' | 'error' | 'warning' | 'success';
  timestamp: Date;
}

export interface AttackExecution {
  id: string;
  name: string;
  tool: string;
  status: 'completed' | 'failed' | 'stopped' | 'error' | 'running' | 'pending';
  startTime?: Date;
  endTime?: Date;
  parameters: Record<string, any>;
  output: OutputLine[];
}

export interface TargetInfo {
  id: string;
  name: string;
  host: string;
  port?: number;
  description?: string;
}

export interface ExecutionRecord {
  id: string;
  scenarioId: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  status: 'completed' | 'failed' | 'stopped' | 'error' | 'running';
  isSequential: boolean;
  output: OutputLine[];
  attacks: AttackExecution[];
  targets: TargetInfo[];
}

class ExecutionHistoryService {
  private static instance: ExecutionHistoryService;
  // Set to track recently added messages and avoid duplicates
  private recentMessages: Map<string, number> = new Map();
  // Duration to keep messages in deduplication memory (in ms)
  private readonly DEDUP_TIMEOUT = 5000;

  private constructor() {
    // Singleton pattern
    // Periodically clean up deduplication memory
    setInterval(() => this.cleanupRecentMessages(), 30000);
  }
  
  // Clean up old messages from deduplication memory
  private cleanupRecentMessages(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > this.DEDUP_TIMEOUT) {
        this.recentMessages.delete(key);
      }
    }
  }
  
  // Generate a unique key for message deduplication
  private generateMessageKey(executionId: string, attackId: string | null, content: string): string {
    return `${executionId}-${attackId || 'global'}-${content.slice(0, 50)}`;
  }
  
  // Check if a message is a duplicate
  private isDuplicate(executionId: string, attackId: string | null, content: string): boolean {
    const key = this.generateMessageKey(executionId, attackId, content);
    const isDuplicate = this.recentMessages.has(key);
    
    if (!isDuplicate) {
      this.recentMessages.set(key, Date.now());
    }
    
    return isDuplicate;
  }

  public static getInstance(): ExecutionHistoryService {
    if (!ExecutionHistoryService.instance) {
      ExecutionHistoryService.instance = new ExecutionHistoryService();
    }
    return ExecutionHistoryService.instance;
  }

  // Get all execution history from backend
  public async getAllExecutions(): Promise<ExecutionRecord[]> {
    try {
      const response = await api.get('/api/executions');
      return response.data.map((execution: any) => ({
        ...execution,
        startTime: new Date(execution.startTime),
        endTime: execution.endTime ? new Date(execution.endTime) : undefined,
        output: execution.output.map((output: any) => ({
          ...output,
          timestamp: new Date(output.timestamp)
        })),
        attacks: execution.attacks.map((attack: any) => ({
          ...attack,
          startTime: attack.startTime ? new Date(attack.startTime) : undefined,
          endTime: attack.endTime ? new Date(attack.endTime) : undefined,
          output: attack.output.map((output: any) => ({
            ...output,
            timestamp: new Date(output.timestamp)
          }))
        }))
      }));
    } catch (error) {
      console.error('Error retrieving execution history from backend:', error);
      return [];
    }
  }

  // Get executions for a specific scenario
  public async getExecutionsForScenario(scenarioId: string): Promise<ExecutionRecord[]> {
    try {
      const response = await api.get(`/api/executions/scenario/${scenarioId}`);
      return response.data.map((execution: any) => ({
        ...execution,
        startTime: new Date(execution.startTime),
        endTime: execution.endTime ? new Date(execution.endTime) : undefined,
        output: execution.output.map((output: any) => ({
          ...output,
          timestamp: new Date(output.timestamp)
        })),
        attacks: execution.attacks.map((attack: any) => ({
          ...attack,
          startTime: attack.startTime ? new Date(attack.startTime) : undefined,
          endTime: attack.endTime ? new Date(attack.endTime) : undefined,
          output: attack.output.map((output: any) => ({
            ...output,
            timestamp: new Date(output.timestamp)
          }))
        }))
      }));
    } catch (error) {
      console.error('Error retrieving executions for scenario from backend:', error);
      return [];
    }
  }

  // Create a new execution entry in backend
  public async startExecution(scenario: ProjectScenario): Promise<ExecutionRecord> {
    const newExecution = {
      id: uuidv4(),
      scenarioId: scenario._id!,
      scenarioName: scenario.name,
      startTime: new Date(),
      status: 'running' as const,
      isSequential: scenario.sequence || false,
      output: [],
      attacks: (scenario.attacks || []).map((attack, index) => ({
        id: `attack-${index + 1}`,
        name: `Attack ${index + 1}`,
        tool: attack.tool,
        status: 'pending' as const,
        parameters: attack.parameters || {},
        output: []
      })),
      targets: (scenario.targets || []).map((target, index) => ({
        id: target._id || `target-${index}`,
        name: target.name || `Target ${index + 1}`,
        host: target.host,
        port: target.port
      }))
    };

    try {
      const response = await api.post('/api/executions', newExecution);
      return {
        ...response.data,
        startTime: new Date(response.data.startTime),
        endTime: response.data.endTime ? new Date(response.data.endTime) : undefined,
        output: response.data.output.map((output: any) => ({
          ...output,
          timestamp: new Date(output.timestamp)
        })),
        attacks: response.data.attacks.map((attack: any) => ({
          ...attack,
          startTime: attack.startTime ? new Date(attack.startTime) : undefined,
          endTime: attack.endTime ? new Date(attack.endTime) : undefined,
          output: attack.output.map((output: any) => ({
            ...output,
            timestamp: new Date(output.timestamp)
          }))
        }))
      };
    } catch (error) {
      console.error('Error creating execution in backend:', error);
      throw error;
    }
  }

  // Update an existing execution in backend
  public async updateExecution(executionId: string, updates: Partial<ExecutionRecord>): Promise<ExecutionRecord | null> {
    try {
      const response = await api.put(`/api/executions/${executionId}`, {
        ...updates,
        endTime: updates.status === 'running' ? undefined : (updates.endTime || new Date())
      });
      
      return {
        ...response.data,
        startTime: new Date(response.data.startTime),
        endTime: response.data.endTime ? new Date(response.data.endTime) : undefined,
        output: response.data.output.map((output: any) => ({
          ...output,
          timestamp: new Date(output.timestamp)
        })),
        attacks: response.data.attacks.map((attack: any) => ({
          ...attack,
          startTime: attack.startTime ? new Date(attack.startTime) : undefined,
          endTime: attack.endTime ? new Date(attack.endTime) : undefined,
          output: attack.output.map((output: any) => ({
            ...output,
            timestamp: new Date(output.timestamp)
          }))
        }))
      };
    } catch (error) {
      console.error('Error updating execution in backend:', error);
      return null;
    }
  }

  // Get a specific execution by ID
  public async getExecution(executionId: string): Promise<ExecutionRecord | null> {
    try {
      const response = await api.get(`/api/executions/${executionId}`);
      return {
        ...response.data,
        startTime: new Date(response.data.startTime),
        endTime: response.data.endTime ? new Date(response.data.endTime) : undefined,
        output: response.data.output.map((output: any) => ({
          ...output,
          timestamp: new Date(output.timestamp)
        })),
        attacks: response.data.attacks.map((attack: any) => ({
          ...attack,
          startTime: attack.startTime ? new Date(attack.startTime) : undefined,
          endTime: attack.endTime ? new Date(attack.endTime) : undefined,
          output: attack.output.map((output: any) => ({
            ...output,
            timestamp: new Date(output.timestamp)
          }))
        }))
      };
    } catch (error) {
      console.error('Error retrieving execution from backend:', error);
      return null;
    }
  }

  // Add output line to execution
  public async addOutputLine(executionId: string, content: string, type: OutputLine['type'] = 'info'): Promise<void> {
    // Check for duplicates
    if (this.isDuplicate(executionId, null, content)) {
      return;
    }

    try {
      await api.post(`/api/executions/${executionId}/output`, {
        content,
        type,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error adding output line to backend:', error);
    }
  }

  // Add output line to specific attack
  public async addAttackOutputLine(executionId: string, attackId: string, content: string, type: OutputLine['type'] = 'info'): Promise<void> {
    // Check for duplicates
    if (this.isDuplicate(executionId, attackId, content)) {
      return;
    }

    try {
      await api.post(`/api/executions/${executionId}/attacks/${attackId}/output`, {
        content,
        type,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error adding attack output line to backend:', error);
    }
  }

  // Update attack status
  public async updateAttackStatus(executionId: string, attackId: string, status: AttackExecution['status'], endTime?: Date): Promise<void> {
    try {
      await api.put(`/api/executions/${executionId}/attacks/${attackId}`, {
        status,
        endTime: endTime || (status !== 'running' && status !== 'pending' ? new Date() : undefined)
      });
    } catch (error) {
      console.error('Error updating attack status in backend:', error);
    }
  }

  // Clear attack output
  public async clearAttackOutput(executionId: string, attackId: string): Promise<void> {
    try {
      await api.delete(`/api/executions/${executionId}/attacks/${attackId}/output`);
    } catch (error) {
      console.error('Error clearing attack output in backend:', error);
    }
  }

  // Clear all attack outputs
  public async clearAllAttackOutputs(executionId: string): Promise<void> {
    try {
      await api.delete(`/api/executions/${executionId}/attacks/output`);
    } catch (error) {
      console.error('Error clearing all attack outputs in backend:', error);
    }
  }

  // Delete an execution
  public async deleteExecution(executionId: string): Promise<boolean> {
    try {
      await api.delete(`/api/executions/${executionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting execution from backend:', error);
      return false;
    }
  }

  // Clean up stale executions
  public async cleanupStaleExecutions(): Promise<{ cleanedCount: number; message: string }> {
    try {
      const response = await api.post('/api/executions/cleanup/stale');
      console.log('Stale executions cleanup result:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error cleaning up stale executions:', error);
      return { cleanedCount: 0, message: 'Failed to cleanup stale executions' };
    }
  }

  // Get execution statistics
  public async getExecutionStats(): Promise<{
    statusCounts: Record<string, number>;
    staleExecutions: number;
    totalExecutions: number;
  }> {
    try {
      const response = await api.get('/api/executions/stats');
      return response.data;
    } catch (error) {
      console.error('Error getting execution stats:', error);
      return {
        statusCounts: {},
        staleExecutions: 0,
        totalExecutions: 0
      };
    }
  }

  // Legacy methods for backward compatibility (now using backend)
  public async completeExecution(executionId: string, status: 'completed' | 'failed' | 'stopped' = 'completed'): Promise<ExecutionRecord | null> {
    return this.updateExecution(executionId, {
      status,
      endTime: new Date()
    });
  }

  public async failExecution(executionId: string, error?: string): Promise<ExecutionRecord | null> {
    if (error) {
      await this.addOutputLine(executionId, error, 'error');
    }
    return this.updateExecution(executionId, {
      status: 'failed',
      endTime: new Date()
    });
  }

  public async stopExecution(executionId: string): Promise<ExecutionRecord | null> {
    return this.updateExecution(executionId, {
      status: 'stopped',
      endTime: new Date()
    });
  }

  public async startAttack(executionId: string, attackId: string): Promise<void> {
    await this.updateAttackStatus(executionId, attackId, 'running');
  }

  public async completeAttack(executionId: string, attackId: string): Promise<void> {
    await this.updateAttackStatus(executionId, attackId, 'completed');
  }

  public async failAttack(executionId: string, attackId: string, error?: string): Promise<void> {
    if (error) {
      await this.addAttackOutputLine(executionId, attackId, error, 'error');
    }
    await this.updateAttackStatus(executionId, attackId, 'failed');
  }

  public async stopAttack(executionId: string, attackId: string): Promise<void> {
    await this.updateAttackStatus(executionId, attackId, 'stopped');
  }
}

export const executionHistoryService = ExecutionHistoryService.getInstance();
export default executionHistoryService;