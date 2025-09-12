import { spawn, ChildProcess, exec } from "child_process";
import type { SpawnOptionsWithoutStdio } from 'child_process';
import { logger } from "../utils/logger";
import { platform } from 'os';
import { TerminalManager } from './TerminalManager';
import { AttackStatus } from '../models/Scenario';
import * as path from 'path';

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
  private allowedCommands = new Set(["caldera", "start_maip.sh", "start_maip_iframe.sh", "docker", "python3", "bash", "sh", "./start-client.sh", "cmd"]);
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
      this.checkStuckScenarios();
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
    // Si la commande commence par cd, elle est autorisée car elle sera exécutée via un shell
    if (command.startsWith('cd ')) {
      return true;
    }
    
    return Array.from(this.allowedCommands).some((cmd) => command.includes(cmd));
  }

  private splitCommand(command: string): { program: string; args: string[]; useShell: boolean } {
    const parts = command.split(' ');
    
    // Si la commande commence par cd, utiliser un shell
    if (parts[0] === 'cd') {
      return {
        program: this.isWindows ? 'cmd' : '/bin/bash',
        args: this.isWindows ? ['/c', command] : ['-c', command],
        useShell: true
      };
    }
    
    // Si la commande est un script shell, l'exécuter avec bash
    if (command.endsWith('.sh') && !command.startsWith('cd')) {
      return {
        program: '/bin/bash',
        args: [command],
        useShell: true
      };
    }
    
    // Si la commande commence par python3, traiter normalement
    if (parts[0] === 'python3') {
      return {
        program: parts[0],
        args: parts.slice(1),
        useShell: false
      };
    }
    
    // Si la commande se termine par .py mais n'a pas python3 au début, ajouter python3
    if (command.endsWith('.py')) {
      return {
        program: 'python3',
        args: [command],
        useShell: false
      };
    }
    
    return {
      program: parts[0],
      args: parts.slice(1),
      useShell: false
    };
  }

  private cleanAnsiCodes(text: string, preserveColors: boolean = false): string {
    if (preserveColors) {
      // Pour les outils comme Shennina, on garde les couleurs mais on nettoie les autres codes de contrôle
      return text
        // Supprimer seulement les codes de contrôle non-couleur
        .replace(/\x1b\[[0-9;]*[GKHF]/g, '') // Garde les couleurs [m] mais supprime les autres
        // Liens hypertext OSC 8
        .replace(/\x1b\]8;[^;]*;[^\x07]*\x07/g, '')
        .replace(/\x1b\]8;;\x07/g, '')
        // Séquences de sauvegarde/restauration du curseur
        .replace(/\x1b\[s/g, '')
        .replace(/\x1b\[u/g, '')
        // Codes de formatage spéciaux
        .replace(/\x1b\[?[0-9;]*[hlc]/g, '')
        // Séquences de contrôle diverses
        .replace(/\x1b\[[?!><][0-9;]*[a-zA-Z]/g, '')
        // Nettoyer les caractères de contrôle restants (sauf les couleurs et les retours à la ligne)
        .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]/g, '')
        // Remplacer les retours chariot par des espaces pour éviter les problèmes d'affichage
        .replace(/\r/g, ' ')
        .trim();
    } else {
      // Supprimer tous les codes ANSI (couleurs, formatage, etc.)
      return text
        // Séquences de couleur ANSI standard
        .replace(/\x1b\[[0-9;]*[mGKHF]/g, '')
        // Liens hypertext OSC 8
        .replace(/\x1b\]8;[^;]*;[^\x07]*\x07/g, '')
        .replace(/\x1b\]8;;\x07/g, '')
        // Codes de formatage avancés
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        // Séquences de sauvegarde/restauration du curseur
        .replace(/\x1b\[s/g, '')
        .replace(/\x1b\[u/g, '')
        // Codes de couleur 256 et RGB
        .replace(/\x1b\[38;[0-9;]*m/g, '')
        .replace(/\x1b\[48;[0-9;]*m/g, '')
        // Codes de formatage spéciaux
        .replace(/\x1b\[?[0-9;]*[hlc]/g, '')
        // Séquences de contrôle diverses
        .replace(/\x1b\[[?!><][0-9;]*[a-zA-Z]/g, '')
        // Nettoyer les caractères de contrôle restants
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
        // Nettoyer les espaces multiples
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  private flushBuffers(stdout: string, stderr: string, onOutput: (output: string) => void, command?: string): void {
    if (stdout.trim()) {
      const preserveColors = Boolean(command && (command.includes('shennina') || command.includes('caldera')));
      const isShennina = command && command.includes('shennina');
      
      if (preserveColors && isShennina) {
        // Pour Shennina, traiter les séparateurs de ligne correctement
        const cleanOutput = this.cleanAnsiCodes(stdout, true);
        let formattedOutput = cleanOutput
          .replace(/║/g, '\n')  // Séparateur principal
          .replace(/╔/g, '\n╔') // Début de boîte
          .replace(/╚/g, '\n╚') // Fin de boîte
          .replace(/🎯/g, '\n🎯') // Cibles
          .replace(/🔍/g, '\n🔍') // Découverte
          .replace(/🚪/g, '\n🚪') // Ports
          .replace(/🔬/g, '\n🔬') // Services
          .replace(/🛡️/g, '\n🛡️') // Vulnérabilités
          .replace(/🧠/g, '\n🧠') // IA
          .replace(/🌳/g, '\n🌳') // Arbre
          .replace(/📦/g, '\n📦') // Exploits
          .replace(/✅/g, '\n✅') // Succès
          .replace(/📊/g, '\n📊') // Statistiques
          .replace(/⚠️/g, '\n⚠️') // Avertissements
          .replace(/🎉/g, '\n🎉') // Célébrations
          .replace(/💡/g, '\n💡') // Recommandations
          .replace(/🔓/g, '\n🔓') // Compromis
          .replace(/📄/g, '\n📄') // Fichiers
          .replace(/📋/g, '\n📋') // Rapports
          .replace(/============================================================/g, '\n============================================================\n');
        
        formattedOutput.split('\n').forEach(line => {
          if (line.trim()) {
            onOutput(line);
          }
        });
      } else {
        stdout.split('\n').forEach(line => {
          if (line.trim()) {
            // Nettoyer les codes ANSI avant d'envoyer la sortie
            const cleanLine = this.cleanAnsiCodes(line, preserveColors);
            if (cleanLine.trim()) {
              onOutput(cleanLine);
            }
          }
        });
      }
    }
    if (stderr.trim()) {
      const preserveColors = Boolean(command && (command.includes('shennina') || command.includes('caldera')));
      const isShennina = command && command.includes('shennina');
      
      if (preserveColors && isShennina) {
        // Pour Shennina, traiter les séparateurs de ligne correctement
        const cleanOutput = this.cleanAnsiCodes(stderr, true);
        let formattedOutput = cleanOutput
          .replace(/║/g, '\n')  // Séparateur principal
          .replace(/╔/g, '\n╔') // Début de boîte
          .replace(/╚/g, '\n╚') // Fin de boîte
          .replace(/🎯/g, '\n🎯') // Cibles
          .replace(/🔍/g, '\n🔍') // Découverte
          .replace(/🚪/g, '\n🚪') // Ports
          .replace(/🔬/g, '\n🔬') // Services
          .replace(/🛡️/g, '\n🛡️') // Vulnérabilités
          .replace(/🧠/g, '\n🧠') // IA
          .replace(/🌳/g, '\n🌳') // Arbre
          .replace(/📦/g, '\n📦') // Exploits
          .replace(/✅/g, '\n✅') // Succès
          .replace(/📊/g, '\n📊') // Statistiques
          .replace(/⚠️/g, '\n⚠️') // Avertissements
          .replace(/🎉/g, '\n🎉') // Célébrations
          .replace(/💡/g, '\n💡') // Recommandations
          .replace(/🔓/g, '\n🔓') // Compromis
          .replace(/📄/g, '\n📄') // Fichiers
          .replace(/📋/g, '\n📋') // Rapports
          .replace(/============================================================/g, '\n============================================================\n');
        
        formattedOutput.split('\n').forEach(line => {
          if (line.trim()) {
            onOutput(line);
          }
        });
      } else {
        stderr.split('\n').forEach(line => {
          if (line.trim()) {
            // Nettoyer les codes ANSI avant d'envoyer la sortie
            const cleanLine = this.cleanAnsiCodes(line, preserveColors);
            if (cleanLine.trim()) {
              onOutput(cleanLine);
            }
          }
        });
      }
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
      attackId?: string;
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
    
    const { program, args, useShell } = this.splitCommand(command);
    logger.info(`[ProcessManager] Program: ${program}, Args: ${JSON.stringify(args)}, Use Shell: ${useShell}`);
    
    // Logique spéciale pour différents types de commandes
    let allArgs: string[];
    
    if (useShell) {
      // Pour les commandes shell (comme cd), utiliser les arguments tels quels
      allArgs = args;
    } else if (program === 'docker') {
      // Pour Docker, ne pas ajouter les paramètres automatiquement
      allArgs = args;
    } else if (command.includes('shennina_standalone.py')) {
      // Pour Shennina, vérifier si la commande contient déjà tous les paramètres
      // Si la commande contient déjà --target, --lhost, et --mode, ne pas ajouter d'arguments
      const hasAllParams = command.includes('--target') && command.includes('--lhost') && command.includes('--mode');
      
      if (hasAllParams) {
        // La commande est déjà complète, utiliser les arguments tels quels
        allArgs = args;
        logger.info(`[ProcessManager] Shennina command already complete, using args as-is: ${JSON.stringify(allArgs)}`);
      } else {
        // Construire les arguments manuellement avec seulement les paramètres valides
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
      }
    } else {
      // Pour les autres commandes, ajouter tous les paramètres comme avant
      allArgs = [...args, ...Object.entries(parameters).map(([key, value]) => `--${key}=${value}`)];
    }
    
    logger.info(`[ProcessManager] Final args: ${JSON.stringify(allArgs)}`);
    
    try {
      onOutput(`Executing: ${command}`);
      logger.info(`[ProcessManager] Starting process: ${program} with arguments: ${JSON.stringify(allArgs)}`);
      
      // Déterminer le répertoire de travail pour tous les outils
      let workingDirectory: string | undefined;
      if (command.includes('shennina_standalone.py') || command.includes('tools/shennina')) {
        // Définir le répertoire de travail pour Shennina (un niveau au-dessus du backend)
        workingDirectory = path.join(process.cwd(), '..');
        logger.info(`[ProcessManager] Setting working directory for Shennina: ${workingDirectory}`);
      } else if (command.includes('tools/caldera/start_caldera.sh')) {
        // Définir le répertoire de travail pour Caldera (un niveau au-dessus du backend)
        workingDirectory = path.join(process.cwd(), '..');
        logger.info(`[ProcessManager] Setting working directory for Caldera: ${workingDirectory}`);
      } else if (command.includes('tools/maip/start_maip_iframe.sh')) {
        // Définir le répertoire de travail pour MAIP (un niveau au-dessus du backend)
        workingDirectory = path.join(process.cwd(), '..');
        logger.info(`[ProcessManager] Setting working directory for MAIP: ${workingDirectory}`);
      }
      
      // Pour les commandes shell, utiliser exec au lieu de spawn
      logger.info(`[ProcessManager] DEBUG: useShell = ${useShell}, command = ${command}`);
      if (useShell) {
        logger.info(`[ProcessManager] DEBUG: Using exec for shell command`);
        logger.info(`[ProcessManager] DEBUG: Working directory: ${workingDirectory}`);
        const child = exec(`/bin/bash -c "${command}"`, { 
          cwd: workingDirectory
        }, (error: any, _stdout: any, _stderr: any) => {
          if (error) {
            logger.error(`[ProcessManager] Process error: ${error.message}`);
            onOutput(`ERROR: [ProcessManager] Process error: ${error.message}`);
            this.processes.delete(tabId);
            return;
          }
        });
        
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
          attackId: projectInfo?.attackId || '',
          tool: command,
          startTime: new Date(),
          status: 'running',
          lastActivity: new Date()
        });
        
        onOutput(`Process started with PID: ${child.pid}`);
        
        child.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          onOutput(output);
        });
        
        child.stderr?.on('data', (data: Buffer) => {
          const output = data.toString();
          onOutput(output);
        });
        
        child.on('close', (code: number) => {
          logger.info(`[ProcessManager] Process ${tabId} exited with code ${code}`);
          this.processes.delete(tabId);
        });
        
        return;
      }
      
      const options: SpawnOptionsWithoutStdio = {
        shell: false,
        detached: !this.isWindows,
        cwd: workingDirectory || process.cwd()
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
        attackId: projectInfo?.attackId || '',
        tool: command,
        startTime: new Date(),
        status: 'running',
        lastActivity: new Date()
      });
      
      onOutput(`Process started with PID: ${child.pid}`);
      
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let allOutput = ''; // Collecter toute la sortie pour l'analyse
      let shenninaBuffer = ''; // Buffer spécial pour Shennina

      child.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        allOutput += output;
        stdoutBuffer += output;
        
        // Pour Shennina et Caldera, traiter immédiatement chaque caractère pour préserver le formatage
        const preserveColors = Boolean(command && (command.includes('shennina') || command.includes('caldera')));
        const isShennina = command && command.includes('shennina');
        
        if (preserveColors) {
          if (isShennina) {
            // Pour Shennina, accumuler dans le buffer spécial
            shenninaBuffer += output;
            
            // Traiter le buffer complet pour gérer les séparateurs de ligne correctement
            const cleanBuffer = this.cleanAnsiCodes(shenninaBuffer, true);
            let formattedBuffer = cleanBuffer
              .replace(/║/g, '\n')  // Séparateur principal
              .replace(/╔/g, '\n╔') // Début de boîte
              .replace(/╚/g, '\n╚') // Fin de boîte
              .replace(/🎯/g, '\n🎯') // Cibles
              .replace(/🔍/g, '\n🔍') // Découverte
              .replace(/🚪/g, '\n🚪') // Ports
              .replace(/🔬/g, '\n🔬') // Services
              .replace(/🛡️/g, '\n🛡️') // Vulnérabilités
              .replace(/🧠/g, '\n🧠') // IA
              .replace(/🌳/g, '\n🌳') // Arbre
              .replace(/📦/g, '\n📦') // Exploits
              .replace(/✅/g, '\n✅') // Succès
              .replace(/📊/g, '\n📊') // Statistiques
              .replace(/⚠️/g, '\n⚠️') // Avertissements
              .replace(/🎉/g, '\n🎉') // Célébrations
              .replace(/💡/g, '\n💡') // Recommandations
              .replace(/🔓/g, '\n🔓') // Compromis
              .replace(/📄/g, '\n📄') // Fichiers
              .replace(/📋/g, '\n📋') // Rapports
              .replace(/============================================================/g, '\n============================================================\n');
            
            const lines = formattedBuffer.split('\n');
            
            // Envoyer toutes les lignes complètes sauf la dernière (qui peut être incomplète)
            for (let i = 0; i < lines.length - 1; i++) {
              if (lines[i].trim()) {
                onOutput(lines[i]);
              }
            }
            
            // Garder la dernière ligne dans le buffer si elle n'est pas complète
            shenninaBuffer = lines[lines.length - 1] || '';
          } else {
            // Traitement normal pour Caldera
            const cleanOutput = this.cleanAnsiCodes(output, true);
            if (cleanOutput.trim()) {
              const lines = cleanOutput.split('\n');
              lines.forEach(line => {
                if (line.trim()) {
                  onOutput(line);
                }
              });
            }
          }
        } else {
          // Traitement normal ligne par ligne
          const lines = stdoutBuffer.split('\n');
          stdoutBuffer = lines.pop() || '';
          
          lines.forEach(line => {
            if (line.trim()) {
              const cleanLine = this.cleanAnsiCodes(line, false);
              if (cleanLine.trim()) {
                onOutput(cleanLine);
              }
            }
          });
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        allOutput += output;
        stderrBuffer += output;
        
        // Pour Shennina et Caldera, traiter immédiatement chaque caractère pour préserver le formatage
        const preserveColors = Boolean(command && (command.includes('shennina') || command.includes('caldera')));
        
        if (preserveColors) {
          // Traitement spécial pour préserver le formatage en temps réel
          const cleanOutput = this.cleanAnsiCodes(output, true);
          if (cleanOutput.trim()) {
            // Pour Shennina, traiter ║ comme un retour à la ligne
            const isShennina = command && command.includes('shennina');
            if (isShennina) {
              // Remplacer ║ par \n pour forcer les retours à la ligne
              const formattedOutput = cleanOutput.replace(/║/g, '\n');
              const lines = formattedOutput.split('\n');
              lines.forEach(line => {
                if (line.trim()) {
                  onOutput(line);
                }
              });
            } else {
              // Diviser en lignes normales pour Caldera
              const lines = cleanOutput.split('\n');
              lines.forEach(line => {
                if (line.trim()) {
                  onOutput(line);
                }
              });
            }
          }
        } else {
          // Traitement normal ligne par ligne
          const lines = stderrBuffer.split('\n');
          stderrBuffer = lines.pop() || '';
          
          lines.forEach(line => {
            if (line.trim()) {
              const cleanLine = this.cleanAnsiCodes(line, false);
              if (cleanLine.trim()) {
                onOutput(cleanLine);
              }
            }
          });
        }
      });

      child.on("error", (error: Error) => {
        // Pour Shennina, vider le buffer spécial avant de faire le flush normal
        if (command && command.includes('shennina') && shenninaBuffer.trim()) {
          const cleanBuffer = this.cleanAnsiCodes(shenninaBuffer, true);
          let formattedBuffer = cleanBuffer
            .replace(/║/g, '\n')  // Séparateur principal
            .replace(/╔/g, '\n╔') // Début de boîte
            .replace(/╚/g, '\n╚') // Fin de boîte
            .replace(/🎯/g, '\n🎯') // Cibles
            .replace(/🔍/g, '\n🔍') // Découverte
            .replace(/🚪/g, '\n🚪') // Ports
            .replace(/🔬/g, '\n🔬') // Services
            .replace(/🛡️/g, '\n🛡️') // Vulnérabilités
            .replace(/🧠/g, '\n🧠') // IA
            .replace(/🌳/g, '\n🌳') // Arbre
            .replace(/📦/g, '\n📦') // Exploits
            .replace(/✅/g, '\n✅') // Succès
            .replace(/📊/g, '\n📊') // Statistiques
            .replace(/⚠️/g, '\n⚠️') // Avertissements
            .replace(/🎉/g, '\n🎉') // Célébrations
            .replace(/💡/g, '\n💡') // Recommandations
            .replace(/🔓/g, '\n🔓') // Compromis
            .replace(/📄/g, '\n📄') // Fichiers
            .replace(/📋/g, '\n📋') // Rapports
            .replace(/============================================================/g, '\n============================================================\n');
          
          const lines = formattedBuffer.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              onOutput(line);
            }
          });
        }
        
        this.flushBuffers(stdoutBuffer, stderrBuffer, onOutput, command);
        
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
        // Pour Shennina, vider le buffer spécial avant de faire le flush normal
        if (command && command.includes('shennina') && shenninaBuffer.trim()) {
          const cleanBuffer = this.cleanAnsiCodes(shenninaBuffer, true);
          let formattedBuffer = cleanBuffer
            .replace(/║/g, '\n')  // Séparateur principal
            .replace(/╔/g, '\n╔') // Début de boîte
            .replace(/╚/g, '\n╚') // Fin de boîte
            .replace(/🎯/g, '\n🎯') // Cibles
            .replace(/🔍/g, '\n🔍') // Découverte
            .replace(/🚪/g, '\n🚪') // Ports
            .replace(/🔬/g, '\n🔬') // Services
            .replace(/🛡️/g, '\n🛡️') // Vulnérabilités
            .replace(/🧠/g, '\n🧠') // IA
            .replace(/🌳/g, '\n🌳') // Arbre
            .replace(/📦/g, '\n📦') // Exploits
            .replace(/✅/g, '\n✅') // Succès
            .replace(/📊/g, '\n📊') // Statistiques
            .replace(/⚠️/g, '\n⚠️') // Avertissements
            .replace(/🎉/g, '\n🎉') // Célébrations
            .replace(/💡/g, '\n💡') // Recommandations
            .replace(/🔓/g, '\n🔓') // Compromis
            .replace(/📄/g, '\n📄') // Fichiers
            .replace(/📋/g, '\n📋') // Rapports
            .replace(/============================================================/g, '\n============================================================\n');
          
          const lines = formattedBuffer.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              onOutput(line);
            }
          });
        }
        
        this.flushBuffers(stdoutBuffer, stderrBuffer, onOutput, command);
        
        const processInfo = this.processes.get(tabId);
        
        // Détection intelligente du succès basée sur le contenu et le code de sortie
        const isSuccess = this.determineProcessSuccess(code, allOutput, command);
        const message = isSuccess
          ? "Process completed successfully"
          : `Process failed - ${this.getFailureReason(allOutput, code)}`;
        
        // Envoyer le message une seule fois
        onOutput(message);
        onNotification({
          level: isSuccess ? "success" : "error",
          message
        });

        // Update process status before removing
        if (processInfo) {
          processInfo.status = isSuccess ? 'completed' : 'failed';
          
          // Update attack status in database if this is part of a scenario
          if (processInfo.scenarioId && processInfo.attackId) {
            this.updateAttackStatusInDatabase(
              processInfo.scenarioId, 
              processInfo.attackId, 
              isSuccess ? AttackStatus.COMPLETED : AttackStatus.FAILED
            ).catch(error => {
              logger.error(`Error updating attack status in database:`, error);
            });
          }
          
          // If this is part of a scenario, check if all attacks are finished
          if (processInfo.scenarioId) {
            // Add a small delay to ensure database update is processed
            setTimeout(() => {
              this.checkScenarioCompletion(processInfo.scenarioId);
            }, 100);
          }
        }

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

  /**
   * Détermine si un processus a réussi basé sur le code de sortie et le contenu de la sortie
   */
  private determineProcessSuccess(exitCode: number | null, output: string, command: string): boolean {
    // Si le processus a été tué ou a eu une erreur système, c'est un échec
    if (exitCode === null || exitCode < 0) {
      return false;
    }

    // Détection spécifique par outil
    if (command.includes('knxsmartfuzzer')) {
      return this.analyzeKnxSmartFuzzerOutput(output, exitCode);
    } else if (command.includes('shennina')) {
      return this.analyzeShenninOutput(output, exitCode);
    } else if (command.includes('caldera')) {
      return this.analyzeCalderaOutput(output, exitCode);
    } else if (command.includes('maip')) {
      return this.analyzeMaipOutput(output, exitCode);
    }

    // Pour les autres outils, utiliser le code de sortie par défaut
    return exitCode === 0;
  }

  /**
   * Analyse la sortie du KNX Smart Fuzzer pour déterminer le succès
   */
  private analyzeKnxSmartFuzzerOutput(output: string, exitCode: number): boolean {
    // Indicateurs d'échec pour KNX Smart Fuzzer
    const failureIndicators = [
      'Connection timeout',
      'ENDED with 0 triggers (0 total requests sent)',
      'Network is unreachable',
      'Cannot connect to',
      'Connection refused',
      'No route to host'
    ];

    // Indicateurs de succès
    const successIndicators = [
      'triggers (',  // "ENDED with X triggers" où X > 0
      'requests sent', // Quand il y a eu des requêtes envoyées
      'Search Response', // Pour le scan réseau
      'Description Request', // Pour les requêtes de description
      'Try #', // Pour les attaques de flooding
      'Sending GroupValueWrite' // Pour les attaques d'écriture
    ];

    // Vérifier les indicateurs d'échec en premier
    for (const indicator of failureIndicators) {
      if (output.includes(indicator)) {
        return false;
      }
    }

    // Vérifier les indicateurs de succès
    for (const indicator of successIndicators) {
      if (output.includes(indicator)) {
        return true;
      }
    }

    // Si aucun indicateur spécifique, utiliser le code de sortie
    return exitCode === 0;
  }

  /**
   * Analyse la sortie de Shennina pour déterminer le succès
   */
  private analyzeShenninOutput(output: string, exitCode: number): boolean {
    // Indicateurs d'échec
    const failureIndicators = [
      'Connection refused',
      'Network is unreachable',
      'Host is down',
      'No route to host',
      'Permission denied',
      'Connection timeout',
      'Process failed',
      'Fatal error',
      'Critical error'
    ];

    // Indicateurs de succès - basés sur les logs réels de Shennina
    const successIndicators = [
      'FINAL ASSESSMENT REPORT',
      'Scan completed',
      'AI analysis completed',
      'Exploits tree initialized',
      'Assessment completed',
      'AI Recommendations:',
      'Compromise Rate:',
      'Successful Exploits:',
      'Risk Score:',
      '============================================================',
      'Process completed successfully'
    ];

    // Vérifier les indicateurs d'échec
    for (const indicator of failureIndicators) {
      if (output.includes(indicator)) {
        return false;
      }
    }

    // Vérifier les indicateurs de succès
    for (const indicator of successIndicators) {
      if (output.includes(indicator)) {
        return true;
      }
    }

    // Si on trouve le pattern du rapport final avec les recommandations, c'est un succès
    if (output.includes('AI Recommendations:') && output.includes('Patch identified vulnerabilities')) {
      return true;
    }

    return exitCode === 0;
  }

  /**
   * Analyse la sortie de Caldera pour déterminer le succès
   */
  private analyzeCalderaOutput(output: string, exitCode: number): boolean {
    // Indicateurs de succès pour Caldera
    const successIndicators = [
      'All systems ready',
      'Server started',
      'Application started'
    ];

    // Indicateurs d'échec
    const failureIndicators = [
      'Failed to start',
      'Port already in use',
      'Permission denied'
    ];

    // Vérifier les indicateurs d'échec
    for (const indicator of failureIndicators) {
      if (output.includes(indicator)) {
        return false;
      }
    }

    // Vérifier les indicateurs de succès
    for (const indicator of successIndicators) {
      if (output.includes(indicator)) {
        return true;
      }
    }

    return exitCode === 0;
  }

  /**
   * Analyse la sortie de MAIP pour déterminer le succès
   */
  private analyzeMaipOutput(output: string, exitCode: number): boolean {
    // Indicateurs de succès pour MAIP
    const successIndicators = [
      'MAIP Server started',
      'webpack compiled',
      'Local:            http://localhost:3001',
      'Server is running'
    ];

    // Indicateurs d'échec
    const failureIndicators = [
      'Port already in use',
      'EADDRINUSE',
      'Permission denied',
      'Failed to start'
    ];

    // Vérifier les indicateurs d'échec
    for (const indicator of failureIndicators) {
      if (output.includes(indicator)) {
        return false;
      }
    }

    // Vérifier les indicateurs de succès
    for (const indicator of successIndicators) {
      if (output.includes(indicator)) {
        return true;
      }
    }

    return exitCode === 0;
  }

  /**
   * Obtient la raison de l'échec basée sur la sortie
   */
  private getFailureReason(output: string, exitCode: number | null): string {
    if (output.includes('Connection timeout')) {
      return 'Connection timeout - target may be unreachable';
    }
    if (output.includes('ENDED with 0 triggers (0 total requests sent)')) {
      return 'No successful requests sent - target may be unreachable or not responding';
    }
    if (output.includes('Network is unreachable')) {
      return 'Network unreachable';
    }
    if (output.includes('Connection refused')) {
      return 'Connection refused by target';
    }
    if (output.includes('No route to host')) {
      return 'No route to host';
    }
    if (output.includes('Permission denied')) {
      return 'Permission denied';
    }
    if (output.includes('Port already in use')) {
      return 'Port already in use';
    }
    
    return `Exit code ${exitCode}`;
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

  private async checkScenarioCompletion(scenarioId: string): Promise<void> {
    try {
      // Vérifier que scenarioId est valide et non vide
      if (!scenarioId || scenarioId.trim() === '' || scenarioId === 'unknown') {
        logger.warn(`Invalid or empty scenarioId provided to checkScenarioCompletion: "${scenarioId}"`);
        return;
      }

      // Vérifier que c'est un ObjectId valide
      const mongoose = await import('mongoose');
      if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
        logger.warn(`Invalid ObjectId format for scenarioId: "${scenarioId}"`);
        return;
      }

      logger.info(`🔍 Checking scenario completion for: ${scenarioId}`);

      // Get all processes for this scenario
      const scenarioProcesses = Array.from(this.processes.values())
        .filter(p => p.scenarioId === scenarioId);

      logger.info(`📊 Found ${scenarioProcesses.length} active processes for scenario ${scenarioId}`);
      
      // Log process statuses for debugging
      scenarioProcesses.forEach(p => {
        logger.info(`  - Process ${p.id}: ${p.tool} - Status: ${p.status}`);
      });

      // Always check database status regardless of active processes
      try {
        const { Scenario, AttackStatus } = await import('../models/Scenario');
        const scenario = await Scenario.findById(scenarioId);
        
        if (!scenario) {
          logger.warn(`Scenario ${scenarioId} not found in database`);
          return;
        }

        logger.info(`📋 Current scenario status: ${scenario.status}`);
        logger.info(`🎯 Scenario attacks: ${scenario.attacks.length}`);
        
        // Log attack statuses
        scenario.attacks.forEach((attack: any, index: number) => {
          logger.info(`  - Attack ${index + 1} (${attack.tool}): ${attack.status}`);
        });

        // If scenario is still running, check if it should be completed
        if (scenario.status === AttackStatus.RUNNING) {
          // Check if all attacks have a final status (completed or failed)
          const allAttacksFinished = scenario.attacks.every(
            (attack: any) => attack.status === AttackStatus.COMPLETED || attack.status === AttackStatus.FAILED
          );
          
          // Also check if no processes are running for this scenario
          const hasRunningProcesses = scenarioProcesses.some(p => p.status === 'running');
          
          logger.info(`✅ All attacks finished: ${allAttacksFinished}`);
          logger.info(`🏃 Has running processes: ${hasRunningProcesses}`);
          
          if (allAttacksFinished || !hasRunningProcesses) {
            const hasFailedAttacks = scenario.attacks.some(
              (attack: any) => attack.status === AttackStatus.FAILED
            );
            
            const newStatus = hasFailedAttacks ? AttackStatus.FAILED : AttackStatus.COMPLETED;
            
            logger.info(`🎉 Updating scenario ${scenarioId} status from ${scenario.status} to ${newStatus}`);
            
            scenario.status = newStatus;
            scenario.endTime = new Date();
            
            if (scenario.startTime) {
              scenario.executionTime = Math.round((scenario.endTime.getTime() - scenario.startTime.getTime()) / 1000);
            }
            
            await scenario.save();
            logger.info(`✅ Scenario ${scenarioId} completed with status: ${scenario.status}`);
            
            // Broadcast scenario completion via WebSocket
            const wsManager = await import('../websocket/WebSocketManager');
            const wsInstance = wsManager.WebSocketManager.getInstance();
            if (wsInstance) {
              wsInstance.broadcastScenarioUpdate(scenarioId, {
                type: 'scenario-completed',
                status: newStatus,
                endTime: scenario.endTime,
                executionTime: scenario.executionTime,
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (dbError) {
        logger.error(`Error checking scenario completion in database for ${scenarioId}:`, dbError);
      }
    } catch (error) {
      logger.error(`Error checking scenario completion for ${scenarioId}:`, error);
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

  private async updateAttackStatusInDatabase(scenarioId: string, attackId: string, status: AttackStatus): Promise<void> {
    try {
      // Vérifier que scenarioId et attackId sont valides
      if (!scenarioId || scenarioId.trim() === '' || scenarioId === 'unknown') {
        logger.warn(`Invalid or empty scenarioId provided to updateAttackStatusInDatabase: "${scenarioId}"`);
        return;
      }

      if (!attackId || attackId.trim() === '' || attackId === 'unknown') {
        logger.warn(`Invalid or empty attackId provided to updateAttackStatusInDatabase: "${attackId}"`);
        return;
      }

      // Vérifier que c'est un ObjectId valide
      const mongoose = await import('mongoose');
      if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
        logger.warn(`Invalid ObjectId format for scenarioId: "${scenarioId}"`);
        return;
      }

      const { Scenario } = await import('../models/Scenario');
      
      const result = await Scenario.updateOne(
        { 
          _id: scenarioId,
          'attacks._id': attackId
        },
        { 
          $set: { 
            'attacks.$.status': status,
            'attacks.$.endTime': new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        logger.warn(`No scenario found with id ${scenarioId} and attack ${attackId}`);
      } else if (result.modifiedCount === 0) {
        logger.warn(`Attack ${attackId} in scenario ${scenarioId} was not updated (possibly already in target status)`);
      } else {
        logger.info(`Attack ${attackId} in scenario ${scenarioId} updated to status: ${status}`);
      }
    } catch (error) {
      logger.error(`Error updating attack status in database:`, error);
    }
  }

  /**
   * Vérifie et corrige les scénarios qui pourraient être bloqués en statut "running"
   */
  private async checkStuckScenarios(): Promise<void> {
    try {
      const { Scenario, AttackStatus } = await import('../models/Scenario');
      
      // Trouver tous les scénarios en cours d'exécution depuis plus de 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const stuckScenarios = await Scenario.find({
        status: AttackStatus.RUNNING,
        startTime: { $lt: fiveMinutesAgo }
      });

      logger.info(`🔍 Checking ${stuckScenarios.length} potentially stuck scenarios`);

      for (const scenario of stuckScenarios) {
        const scenarioId = scenario._id.toString();
        
        // Vérifier s'il y a encore des processus actifs pour ce scénario
        const activeProcesses = Array.from(this.processes.values())
          .filter(p => p.scenarioId === scenarioId && p.status === 'running');

        logger.info(`📊 Scenario ${scenarioId}: ${activeProcesses.length} active processes`);

        // Si aucun processus actif, forcer la vérification de completion
        if (activeProcesses.length === 0) {
          logger.info(`🚨 Found stuck scenario ${scenarioId} with no active processes, forcing completion check`);
          await this.checkScenarioCompletion(scenarioId);
        }
      }
    } catch (error) {
      logger.error('Error checking stuck scenarios:', error);
    }
  }

  /**
   * Force la vérification de completion d'un scénario spécifique
   */
  public async forceScenarioCompletionCheck(scenarioId: string): Promise<void> {
    logger.info(`🔧 Forcing completion check for scenario: ${scenarioId}`);
    await this.checkScenarioCompletion(scenarioId);
  }

  /**
   * Arrête spécifiquement les services MAIP (serveur et client)
   */
  public async stopMAIPServices(tabId: string, ports: number[], containers: string[], onOutput: (message: string) => void): Promise<void> {
    try {
      // Arrêter les processus sur les ports
      for (const port of ports) {
        onOutput(`🔄 Stopping processes on port ${port}...`);
        await this.killProcessOnPort(port);
      }

      // Arrêter les conteneurs Docker spécifiques
      for (const container of containers) {
        onOutput(`🐳 Stopping Docker container: ${container}`);
        await this.stopDockerContainer(container);
      }

      // Nettoyer le processus de la carte si il existe
      const processInfo = this.processes.get(tabId);
      if (processInfo) {
        this.processes.delete(tabId);
      }

      logger.info(`MAIP services stopped for tabId: ${tabId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error stopping MAIP services:', errorMessage);
      onOutput(`❌ Error stopping MAIP services: ${errorMessage}`);
    }
  }

  /**
   * Arrête spécifiquement le service Caldera
   */
  public async stopCalderaService(tabId: string, port: number, onOutput: (message: string) => void): Promise<void> {
    try {
      onOutput(`🔄 Stopping Caldera on port ${port}...`);
      await this.killProcessOnPort(port);

      // Arrêter les conteneurs Docker Caldera si ils existent
      try {
        await this.stopDockerContainer('caldera_server');
        onOutput(`🐳 Stopped Caldera Docker container`);
      } catch (err) {
        // Le conteneur peut ne pas exister, ce n'est pas grave
        logger.info('No Caldera Docker container to stop (this is normal)');
      }

      // Nettoyer le processus de la carte si il existe
      const processInfo = this.processes.get(tabId);
      if (processInfo) {
        this.processes.delete(tabId);
      }

      logger.info(`Caldera service stopped for tabId: ${tabId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error stopping Caldera service:', errorMessage);
      onOutput(`❌ Error stopping Caldera service: ${errorMessage}`);
    }
  }

  /**
   * Arrête un conteneur Docker spécifique
   */
  private async stopDockerContainer(containerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`docker stop ${containerName}`, (error) => {
        if (error) {
          logger.error(`Error stopping container ${containerName}:`, error);
          reject(error);
        } else {
          logger.info(`Container ${containerName} stopped successfully`);
          resolve();
        }
      });
    });
  }
}

export default ProcessManager;
