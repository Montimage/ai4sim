import { AttackStatus } from '../models/Scenario';
import { Terminal, TerminalManager as ITerminalManager } from '../types/terminal';
import { logger } from '../utils/logger';
import { WebSocketManager } from '../websocket/WebSocketManager';

export class TerminalManager implements ITerminalManager {
  private static instance: TerminalManager;
  public terminals: Map<string, Terminal>;
  private wsManager: WebSocketManager;
  private maxOutputLength = 1000; // Line limit per terminal
  private cleanupInterval = 3600000; // Clean inactive terminals every hour
  private maxInactiveTime = 86400000; // 24 hours in milliseconds

  private constructor() {
    this.terminals = new Map();
    this.wsManager = WebSocketManager.getInstance();
    this.wsManager.setTerminalManager(this);
    this.startCleanupInterval();
  }

  public static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager();
    }
    return TerminalManager.instance;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveTerminals();
    }, this.cleanupInterval);
  }

  private cleanupInactiveTerminals(): void {
    const now = Date.now();
    for (const [id, terminal] of this.terminals) {
      const inactiveTime = now - terminal.startTime.getTime();
      if (terminal.status === AttackStatus.COMPLETED || 
          terminal.status === AttackStatus.FAILED || 
          terminal.status === AttackStatus.STOPPED) {
        if (inactiveTime > this.maxInactiveTime) {
          this.removeTerminal(id);
          logger.info(`Terminal ${id} cleaned after ${inactiveTime}ms of inactivity`);
        }
      }
    }
  }

  public getTerminal(id: string): Terminal | undefined {
    try {
      return this.terminals.get(id);
    } catch (error) {
      logger.error(`Error retrieving terminal ${id}:`, error);
      return undefined;
    }
  }

  public getTerminalsByScenario(scenarioId: string): Terminal[] {
    try {
      return Array.from(this.terminals.values())
        .filter(terminal => terminal.scenarioId === scenarioId);
    } catch (error) {
      logger.error(`Error retrieving terminals for scenario ${scenarioId}:`, error);
      return [];
    }
  }

  public createTerminal(scenarioId: string, attackId: string, tool: string, attackIndex?: number): Terminal {
    try {
      // Use attackIndex to create terminal ID if provided (1-based for consistency)
      const terminalKey = attackIndex !== undefined ? `attack-${attackIndex + 1}` : attackId;
      const id = `${scenarioId}-${terminalKey}`;
      
      // Create user-friendly attack ID for display (1-based)
      const userFriendlyAttackId = attackIndex !== undefined ? `attack-${attackIndex + 1}` : attackId;
      
      // Check if terminal already exists and remove it to avoid duplicates
      if (this.terminals.has(id)) {
        logger.warn(`Terminal ${id} already exists, removing old one`);
        this.removeTerminal(id);
      }
      
      const terminal: Terminal = {
        id,
        scenarioId,
        attackId: userFriendlyAttackId, // Use user-friendly ID
        tool,
        status: AttackStatus.PENDING,
        output: [],
        startTime: new Date()
      };

      this.terminals.set(id, terminal);
      this.broadcastTerminalState(terminal);
      logger.info(`Terminal created: ${id} for tool ${tool} (attack ID: ${userFriendlyAttackId})`);
      return terminal;
    } catch (error) {
      logger.error('Error creating terminal:', error);
      throw new Error('Unable to create terminal');
    }
  }

  public appendOutput(id: string, output: string): void {
    try {
      const terminal = this.terminals.get(id);
      if (!terminal) {
        logger.warn(`Attempt to add output to non-existent terminal: ${id}`);
        return;
      }

      logger.debug(`[DEBUG-TERMINAL] Appending output to terminal ${id}:`, output);

      // Add new output to terminal buffer
      terminal.output.push(output);
      if (terminal.output.length > this.maxOutputLength) {
        terminal.output = terminal.output.slice(-this.maxOutputLength);
      }

      // Broadcast message immediately
      try {
        logger.debug(`[DEBUG-TERMINAL] Broadcasting output for terminal ${id}`);
        this.wsManager.broadcastScenarioUpdate(terminal.scenarioId, {
          type: 'terminal-output',
          data: {
            terminalId: id,
            attackId: terminal.attackId,
            output: output
          },
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`Error broadcasting terminal output for ${id}:`, error);
      }
    } catch (error) {
      logger.error(`Error appending output to terminal ${id}:`, error);
    }
  }

  public appendError(id: string, error: string): void {
    try {
      const terminal = this.terminals.get(id);
      if (!terminal) {
        logger.warn(`Attempt to add error to non-existent terminal: ${id}`);
        return;
      }

      logger.debug(`[DEBUG-TERMINAL] Appending error to terminal ${id}:`, error);

      const now = Date.now();

      // Add to terminal buffer
      terminal.output.push(error);
      if (terminal.output.length > this.maxOutputLength) {
        terminal.output = terminal.output.slice(-this.maxOutputLength);
      }

      // Broadcast error immediately
      try {
        logger.debug(`[DEBUG-TERMINAL] Broadcasting error for terminal ${id}`);
        this.wsManager.broadcastScenarioUpdate(terminal.scenarioId, {
          type: 'terminal-error',
          data: {
            terminalId: terminal.id,
            attackId: terminal.attackId,
            error: error
          },
          timestamp: now
        });
      } catch (error) {
        logger.error(`Error broadcasting error for ${id}:`, error);
      }

      // Update status if not already failed
      if (terminal.status !== AttackStatus.FAILED) {
        this.updateStatus(id, AttackStatus.FAILED);
      }
    } catch (error) {
      logger.error(`Error appending error to terminal ${id}:`, error);
    }
  }

  public updateStatus(id: string, status: AttackStatus): void {
    try {
      const terminal = this.terminals.get(id);
      if (!terminal) {
        logger.warn(`Attempt to update status of non-existent terminal: ${id}`);
        return;
      }

      // Check that the new status is valid in the current lifecycle
      const isStatusValid = this.isValidStatusTransition(terminal.status, status);
      if (!isStatusValid) {
        logger.warn(`Invalid status transition for terminal ${id}: ${terminal.status} -> ${status}`);
        return;
      }

      // Update the status only if it has changed
      if (terminal.status === status) {
        logger.debug(`Terminal ${id} status already ${status}, no update necessary`);
        return;
      }

      // Apply the new status
      const oldStatus = terminal.status;
      terminal.status = status;
      
      // Add endTime if the status is final
      if (status === AttackStatus.COMPLETED || 
          status === AttackStatus.FAILED || 
          status === AttackStatus.STOPPED) {
        terminal.endTime = new Date();
      }

      // Send only the status update via WebSocket
      if (oldStatus !== status) {
        try {
        this.wsManager.broadcastScenarioUpdate(terminal.scenarioId, {
          type: 'terminal-status',
          terminalId: terminal.id,
            attackId: terminal.attackId,
          status: status,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`Error broadcasting status for ${id}:`, error);
      }

        logger.info(`Terminal ${id} status updated: ${oldStatus} -> ${status}`);
      }
    } catch (error) {
      logger.error(`Error updating status of terminal ${id}:`, error);
    }
  }

  // Check if the status transition is valid
  private isValidStatusTransition(currentStatus: AttackStatus, newStatus: AttackStatus): boolean {
    // Special case: always allow transition to FAILED regardless of current state
    if (newStatus === AttackStatus.FAILED) {
      return true;
    }

    // Allowed transitions by current state
    const validTransitions: Record<AttackStatus, AttackStatus[]> = {
      [AttackStatus.PENDING]: [AttackStatus.RUNNING, AttackStatus.FAILED, AttackStatus.STOPPED],
      [AttackStatus.RUNNING]: [AttackStatus.COMPLETED, AttackStatus.FAILED, AttackStatus.PAUSED, AttackStatus.STOPPED],
      [AttackStatus.COMPLETED]: [AttackStatus.FAILED], // Only an error can replace a completed state
      [AttackStatus.FAILED]: [], // No state change after a failure
      [AttackStatus.PAUSED]: [AttackStatus.RUNNING, AttackStatus.FAILED, AttackStatus.STOPPED],
      [AttackStatus.STOPPED]: [AttackStatus.FAILED], // Only an error can replace a stopped state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  public removeTerminal(id: string): void {
    try {
      const terminal = this.terminals.get(id);
      if (terminal) {
        try {
          this.wsManager.broadcastScenarioUpdate(terminal.scenarioId, {
            type: 'terminal-removed',
            terminalId: id,
            attackId: terminal.attackId, // Add attack ID to facilitate client-side routing
            timestamp: Date.now()
          });
        } catch (error) {
          logger.error(`Error broadcasting removal for ${id}:`, error);
        }
        
        this.terminals.delete(id);
        logger.info(`Terminal removed: ${id}`);
      }
    } catch (error) {
      logger.error(`Error removing terminal ${id}:`, error);
    }
  }

  public clearTerminal(id: string): void {
    try {
      const terminal = this.terminals.get(id);
      if (!terminal) {
        logger.warn(`Attempt to clear non-existent terminal: ${id}`);
        return;
      }

      // Clear the terminal output
      terminal.output = [];

      // Notify clients
      try {
        this.wsManager.broadcastScenarioUpdate(terminal.scenarioId, {
          type: 'terminal-cleared',
          terminalId: terminal.id,
          attackId: terminal.attackId, // Add attack ID to facilitate client-side routing
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`Error broadcasting clear for ${id}:`, error);
      }

      logger.info(`Terminal cleared: ${id}`);
    } catch (error) {
      logger.error(`Error clearing terminal ${id}:`, error);
    }
  }

  /**
   * Cleans all terminals in a scenario
   */
  public clearScenarioTerminals(scenarioId: string): void {
    try {
      const terminalsToRemove = Array.from(this.terminals.keys())
        .filter(terminalId => terminalId.startsWith(`${scenarioId}-`));
      
      terminalsToRemove.forEach(terminalId => {
        this.removeTerminal(terminalId);
      });
      
      logger.info(`Cleanup completed for scenario ${scenarioId}: ${terminalsToRemove.length} terminals removed`);
    } catch (error) {
      logger.error(`Error cleaning terminals for scenario ${scenarioId}:`, error);
    }
  }

  private broadcastTerminalState(terminal: Terminal): void {
    try {
      this.wsManager.broadcastScenarioUpdate(terminal.scenarioId, {
        type: 'terminal-state',
        terminal: {
          id: terminal.id,
          attackId: terminal.attackId, // Add attack ID to facilitate client-side routing
          status: terminal.status,
          output: terminal.output,
          startTime: terminal.startTime,
          endTime: terminal.endTime
        },
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error broadcasting state of terminal ${terminal.id}:`, error);
    }
  }
}
