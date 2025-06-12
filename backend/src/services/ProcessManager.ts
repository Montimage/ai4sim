import { spawn, ChildProcess, exec } from "child_process";
import type { SpawnOptionsWithoutStdio } from 'child_process';
import { logger } from "../utils/logger";
import { platform } from 'os';
import { TerminalManager } from './TerminalManager';
import { AttackStatus } from '../models/Scenario';

interface ProcessInfo {
  id: string;
  process: ChildProcess;
  scenarioId: string;
  attackId: string;
  tool: string;
  startTime: Date;
  status: 'running' | 'completed' | 'failed' | 'killed';
  dockerContainerId?: string;
  lastActivity: Date;
}

interface PublicProcessInfo {
  tabId: string;
  command: string;
  startTime: Date;
  projectId?: string;
  campaignId?: string;
  scenarioId?: string;
  targets?: string[];
}

export class ProcessManager {
  private static instance: ProcessManager;
  private allowedCommands = new Set(["caldera", "start_maip.sh", "docker", "python3", "bash", "sh", "./start-client.sh"]);
  private processes: Map<string, ProcessInfo> = new Map();
  private isWindows: boolean;
  private terminalManager: TerminalManager;
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly MAX_INACTIVE_TIME = 600000; // 10 minutes

  private constructor() {
    this.isWindows = platform() === 'win32';
    this.terminalManager = TerminalManager.getInstance();
    this.startCleanupInterval();
    
    // Gérer l'arrêt propre
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveProcesses();
      this.cleanupZombieProcesses();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupInactiveProcesses(): void {
    const now = Date.now();
    const toCleanup: string[] = [];

    this.processes.forEach((processInfo, id) => {
      const inactiveTime = now - processInfo.lastActivity.getTime();
      
      if (inactiveTime > this.MAX_INACTIVE_TIME && processInfo.status === 'running') {
        logger.warn(`Process ${id} inactive for ${inactiveTime}ms, marking for cleanup`);
        toCleanup.push(id);
      }
    });

    toCleanup.forEach(id => this.killProcess(id, 'timeout'));
  }

  private cleanupZombieProcesses(): void {
    this.processes.forEach((processInfo, id) => {
      if (processInfo.process.killed && processInfo.status === 'running') {
        logger.warn(`Zombie process detected: ${id}`);
        this.updateProcessStatus(id, 'failed');
        this.processes.delete(id);
      }
    });
  }

  public async waitForProcess(processId: string): Promise<{ success: boolean; fullError?: string }> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      return { success: false, fullError: 'Process not found' };
    }

    return new Promise((resolve) => {
      processInfo.process.on('exit', (code) => {
        resolve({
          success: code === 0,
          fullError: code !== 0 ? `Process exited with code ${code}` : undefined
        });
      });
    });
  }

  public getProcessStatus(processId: string): string {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      return 'not_found';
    }
    
    // Vérifier si le processus est toujours en cours d'exécution
    const { process } = processInfo;
    if (process.exitCode === null) {
      return 'running';
    } else {
      return process.exitCode === 0 ? 'completed' : 'failed';
    }
  }

  public async getProcessInfo(processId: string): Promise<PublicProcessInfo | null> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      return null;
    }

    // Adapter ProcessInfo vers PublicProcessInfo
    return {
      tabId: processInfo.id,
      command: processInfo.tool,
      startTime: processInfo.startTime,
      scenarioId: processInfo.scenarioId
    };
  }

  public getProcessesByScenario(scenarioId: string): PublicProcessInfo[] {
    const scenarioProcesses: PublicProcessInfo[] = [];
    
    for (const [, processInfo] of this.processes.entries()) {
      if (processInfo.scenarioId === scenarioId) {
        scenarioProcesses.push({
          tabId: processInfo.id,
          command: processInfo.tool,
          startTime: processInfo.startTime,
          scenarioId: processInfo.scenarioId
        });
      }
    }
    
    return scenarioProcesses;
  }

  private validateCommand(command: string): boolean {
    return Array.from(this.allowedCommands).some((cmd) => command.includes(cmd));
  }

  private splitCommand(command: string): { program: string; args: string[] } {
    const parts = command.split(' ');
    
    // Si la commande commence par python3, traiter normalement
    if (parts[0] === 'python3') {
      return {
        program: parts[0],
        args: parts.slice(1)
      };
    }
    
    // Si la commande se termine par .py mais n'a pas python3 au début, ajouter python3
    if (command.endsWith('.py')) {
      return {
        program: 'python3',
        args: [command]
      };
    }
    
    return {
      program: parts[0],
      args: parts.slice(1)
    };
  }

  private flushBuffers(stdout: string, stderr: string, onOutput: (output: string) => void): void {
    if (stdout.trim()) {
      stdout.split('\n').forEach(line => {
        if (line.trim()) {
          onOutput(line);
        }
      });
    }
    if (stderr.trim()) {
      stderr.split('\n').forEach(line => {
        if (line.trim()) {
          onOutput(line);
        }
      });
    }
  }

  public async startProcess(
    command: string,
    parameters: Record<string, any>,
    tabId: string,
    onOutput: (output: string) => void,
    onError: (error: string) => void,
    onNotification: (notification: { level: string, message: string }) => void,
    projectInfo?: {
      projectId: string;
      campaignId: string;
      scenarioId: string;
      targets: string[];
    }
  ): Promise<void> {
    logger.info(`[ProcessManager] Attempting to execute command: ${command}`);
    logger.info(`[ProcessManager] Parameters: ${JSON.stringify(parameters)}`);
    
    // Valider la commande avant l'exécution
    if (!this.validateCommand(command)) {
      const errorMessage = `[ProcessManager] Command not allowed: ${command}`;
      logger.error(errorMessage);
      onOutput(errorMessage);
      onError(errorMessage);
      onNotification({ 
        level: "error",
        message: "Command not authorized: " + command.split(' ')[0]
      });
      throw new Error("Command not authorized");
    }

    await this.stopProcess(tabId);
    
    const { program, args } = this.splitCommand(command);
    logger.info(`[ProcessManager] Program: ${program}, Args: ${JSON.stringify(args)}`);
    
    // Logique spéciale pour différents types de commandes
    let allArgs: string[];
    
    if (program === 'docker') {
      // Pour Docker, ne pas ajouter les paramètres automatiquement
      allArgs = args;
    } else if (command.includes('shennina_standalone.py')) {
      // Pour Shennina, construire les arguments manuellement avec seulement les paramètres valides
      allArgs = [...args];
      
      // Filtrer les paramètres pour ne garder que ceux reconnus par Shennina
      const validShenninParams = ['target', 'lhost', 'mode'];
      
      validShenninParams.forEach(param => {
        if (parameters[param]) {
          allArgs.push(`--${param}`, parameters[param]);
        }
      });
      
      // Log pour debug
      logger.info(`[ProcessManager] Shennina filtered parameters: ${JSON.stringify(Object.fromEntries(validShenninParams.map(p => [p, parameters[p]]).filter(([, v]) => v)))}`);
    } else {
      // Pour les autres commandes, ajouter tous les paramètres comme avant
      allArgs = [...args, ...Object.entries(parameters).map(([key, value]) => `--${key}=${value}`)];
    }
    
    logger.info(`[ProcessManager] Final args: ${JSON.stringify(allArgs)}`);
    
    try {
      onOutput(`Executing: ${command}`);
      logger.info(`[ProcessManager] Starting process: ${program} with arguments: ${JSON.stringify(allArgs)}`);
      
      const options: SpawnOptionsWithoutStdio = {
        shell: false,
        detached: !this.isWindows
      };
      
      const child = spawn(program, allArgs, options);
      logger.info(`[ProcessManager] Process created with PID: ${child.pid}`);
      
      if (!this.isWindows && child.pid) {
        process.nextTick(() => {
          child.unref();
        });
      }
      
      this.processes.set(tabId, {
        id: tabId,
        process: child,
        scenarioId: projectInfo?.scenarioId || '',
        attackId: '',
        tool: command,
        startTime: new Date(),
        status: 'running',
        lastActivity: new Date()
      });
      
      onOutput(`Process started with PID: ${child.pid}`);
      
      let stdoutBuffer = '';
      let stderrBuffer = '';

      child.stdout?.on("data", (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';
        
        lines.forEach(line => {
          if (line.trim()) {
            onOutput(line);
          }
        });
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderrBuffer += data.toString();
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';
        
        lines.forEach(line => {
          if (line.trim()) {
            onOutput(line);
          }
        });
      });

      child.on("error", (error: Error) => {
        this.flushBuffers(stdoutBuffer, stderrBuffer, onOutput);
        
        const errorMessage = `[ProcessManager] Process error: ${error.message}`;
        logger.error(errorMessage);
        onOutput(errorMessage);
        onError(errorMessage);
        onNotification({ 
          level: "error",
          message: errorMessage 
        });

        this.processes.delete(tabId);
      });

      child.on("exit", (code: number | null) => {
        this.flushBuffers(stdoutBuffer, stderrBuffer, onOutput);
        
        const message = code === 0
          ? "Process completed successfully"
          : `Process exited with code ${code}`;
        
        onOutput(message);
        onNotification({
          level: code === 0 ? "success" : "error",
          message
        });

        this.processes.delete(tabId);
      });
    } catch (error: unknown) {
      const errorMessage = `[ProcessManager] Spawn error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMessage);
      onOutput(errorMessage);
      onError(errorMessage);
      onNotification({ 
        level: "error", 
        message: errorMessage 
      });
      this.processes.delete(tabId);
      throw new Error("Error in command execution");
    }
  }

  public async stopProcess(tabId: string, port?: number): Promise<void> {
    const processInfo = this.processes.get(tabId);
    if (!processInfo) {
      return;
    }

    try {
      if (port) {
        await this.killProcessOnPort(port);
      }

      const { process: childProcess } = processInfo;
      
      if (this.isWindows) {
        try {
          exec(`taskkill /pid ${childProcess.pid} /T /F`);
        } catch (err) {
          logger.error('Error killing process on Windows:', err);
        }
      } else {
        try {
          process.kill(-childProcess.pid!, 'SIGTERM');
        } catch (err) {
          logger.error('Error killing process group:', err);
          try {
            childProcess.kill('SIGTERM');
          } catch (err) {
            logger.error('Error killing process directly:', err);
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error stopping process:', errorMessage);
    } finally {
      this.processes.delete(tabId);
    }
  }

  private async killProcessOnPort(port: number): Promise<void> {
    // For Unix-like systems
    if (!this.isWindows) {
      try {
        exec(`lsof -i:${port} -t | xargs kill -9`);
      } catch (err) {
        logger.error('Error killing process on port (Unix):', err);
      }
    } else {
      // For Windows systems
      try {
        exec(`FOR /F "tokens=5" %P IN ('netstat -a -n -o ^| find ":${port}"') DO TaskKill /F /PID %P`);
      } catch (err) {
        logger.error('Error killing process on port (Windows):', err);
      }
    }
  }

  public cleanupClientProcesses(clientId: string): void {
    // Cette méthode peut être utilisée pour nettoyer les processus d'un client spécifique
    const processesToCleanup = Array.from(this.processes.entries())
      .filter(([_, processInfo]) => processInfo.id.includes(clientId));
    
    processesToCleanup.forEach(([processId, _]) => {
      this.killProcess(processId, 'client-disconnect');
    });
  }

  public cleanup(): void {
    logger.info('ProcessManager cleanup started');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Arrêter tous les processus en cours
    const runningProcesses = Array.from(this.processes.entries())
      .filter(([_, processInfo]) => processInfo.status === 'running');
    
    runningProcesses.forEach(([processId, _]) => {
      this.killProcess(processId, 'shutdown');
    });
    
    logger.info('ProcessManager cleanup completed');
  }

  private updateProcessStatus(processId: string, status: 'completed' | 'failed'): void {
    const processInfo = this.processes.get(processId);
    if (processInfo) {
      processInfo.status = status;
      // Convertir vers AttackStatus
      const attackStatus = status === 'completed' ? AttackStatus.COMPLETED : AttackStatus.FAILED;
      this.terminalManager.updateStatus(processInfo.attackId, attackStatus);
    }
  }

  public killProcess(processId: string, reason: string = 'manual'): boolean {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      logger.warn(`Attempt to kill non-existent process: ${processId}`);
      return false;
    }

    try {
      logger.info(`Killing process ${processId} (reason: ${reason})`);
      
      // Nettoyer le conteneur Docker d'abord
      if (processInfo.dockerContainerId) {
        this.cleanupDockerContainer(processInfo.dockerContainerId);
      }
      
      // Tuer le processus
      if (!processInfo.process.killed) {
        processInfo.process.kill('SIGTERM');
        
        // Force kill après 5 secondes si nécessaire
        setTimeout(() => {
          if (!processInfo.process.killed) {
            processInfo.process.kill('SIGKILL');
          }
        }, 5000);
      }
      
      processInfo.status = 'killed';
      
      return true;
    } catch (error) {
      logger.error(`Failed to kill process ${processId}:`, error);
      return false;
    }
  }

  private cleanupDockerContainer(containerId: string): void {
    try {
      logger.info(`Cleaning up Docker container: ${containerId}`);
      
      // Arrêter le conteneur
      spawn('docker', ['stop', containerId], { stdio: 'ignore' });
      
      // Supprimer le conteneur après un délai
      setTimeout(() => {
        spawn('docker', ['rm', '-f', containerId], { stdio: 'ignore' });
      }, 5000);
      
    } catch (error) {
      logger.error(`Failed to cleanup Docker container ${containerId}:`, error);
    }
  }
}

export default ProcessManager;
