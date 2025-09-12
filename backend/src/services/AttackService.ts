import { ProcessManager } from './ProcessManager';
import { MonitoringService } from './MonitoringService';
import { WebSocketManager } from '../websocket/WebSocketManager';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface AttackResult {
  attackId: mongoose.Types.ObjectId;
  type: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  output: string;
}

interface TargetResult {
  targetId: mongoose.Types.ObjectId;
  host: string;
  status: 'reachable' | 'unreachable' | 'partial';
  startTime: Date;
  endTime?: Date;
  attackResults: AttackResult[];
}

export class AttackService {
  private static instance: AttackService;
  private processManager: ProcessManager;
  private monitoringService: MonitoringService;
  private wsManager: WebSocketManager;

  private constructor() {
    this.processManager = ProcessManager.getInstance();
    // Correction: Using getInstance() instead of private constructor
    this.monitoringService = MonitoringService.getInstance();
    this.wsManager = WebSocketManager.getInstance();
  }

  public static getInstance(): AttackService {
    if (!AttackService.instance) {
      AttackService.instance = new AttackService();
    }
    return AttackService.instance;
  }

  private async checkTargetReachability(target: { host: string; port?: number }): Promise<boolean> {
    const result = await this.monitoringService.checkTargetAvailability(target.host);
    return result.status === 'success';
  }

  public  async executeScenario(
    projectId: string,
    campaignId: string,
    scenarioId: string,
    targets: Array<{ host: string; _id: string }>,
    attacks: Array<{ type: string; parameters: any; _id: string }>
  ): Promise<void> {
    try {

      this.wsManager.broadcastScenarioUpdate(scenarioId, {
        type: 'scenario_status_update',
        data: {
          projectId,
          campaignId,
          scenarioId,
          status: 'running'
        },
        timestamp: Date.now()
      });

      const targetResults: TargetResult[] = [];
      let progress = 0;
      const totalSteps = targets.length * attacks.length;

      for (const target of targets) {
        const targetResult: TargetResult = {
          targetId: new mongoose.Types.ObjectId(),
          host: target.host,
          status: 'unreachable',
          startTime: new Date(),
          attackResults: []
        };

        const isReachable = await this.checkTargetReachability(target);
        if (!isReachable) {
          targetResult.status = 'unreachable';
          targetResults.push(targetResult);
          
          continue;
        }

        targetResult.status = 'reachable';

        for (const attack of attacks) {
          const attackResult: AttackResult = {
            attackId: new mongoose.Types.ObjectId(),
            type: attack.type,
            startTime: new Date(),
            status: 'running',
            output: ''
          };

          try {
            const command = this.buildAttackCommand(attack.type, {
              ...attack.parameters,
              host: target.host
            });
            await this.processManager.startProcess(
              command,
              attack.parameters,
              `${target._id}_${attack._id}`,
              (output: string) => {
                attackResult.output += output + '\n';
              },
              (error: string) => {
                attackResult.output += `ERROR: ${error}\n`;
                attackResult.status = 'failed';
              },
              () => {},
              {
                projectId,
                campaignId,
                scenarioId,
                targets: [target.host]
              }
            );

            const result = await this.processManager.waitForProcess(`${target._id}_${attack._id}`);
            
            attackResult.endTime = new Date();
            attackResult.status = result.success ? 'completed' : 'failed';

            this.wsManager.broadcastScenarioUpdate(scenarioId, {
              type: 'attack_status_update',
              data: {
                projectId,
                campaignId,
                scenarioId,
                attackId: attack._id,
                status: attackResult.status
              },
              timestamp: Date.now()
            });

          } catch (err) {
            logger.error('Attack execution error:', err);
            attackResult.status = 'failed';
            attackResult.endTime = new Date();
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            attackResult.output += `Error: ${errorMessage}\n`;
          }

          targetResult.attackResults.push(attackResult);
          progress++;

          this.wsManager.broadcastScenarioUpdate(scenarioId, {
            type: 'scenario_progress_update',
            data: {
              projectId,
              campaignId,
              scenarioId,
              progress: (progress / totalSteps) * 100
            },
            timestamp: Date.now()
          });
        }

        targetResult.endTime = new Date();
        targetResults.push(targetResult);
      }

      const allAttackResults = targetResults.flatMap(t => t.attackResults);
      
      // Mettre à jour les statistiques via WebSocket
      if (this.wsManager) {
        this.wsManager.broadcastScenarioUpdate(scenarioId, {
          type: 'attack_statistics',
          data: {
            total: allAttackResults.length,
            completed: allAttackResults.filter(r => r.status === 'completed').length,
            failed: allAttackResults.filter(r => r.status === 'failed').length
          }
        });
      }

      this.wsManager.broadcastScenarioUpdate(scenarioId, {
        type: 'scenario_status_update',
        data: {
          projectId,
          campaignId,
          scenarioId,
          status: 'completed'
        },
        timestamp: Date.now()
      });

    } catch (err) {
      logger.error('Scenario execution error:', err);
      
      

      this.wsManager.broadcastScenarioUpdate(scenarioId, {
        type: 'scenario_status_update',
        data: {
          projectId,
          campaignId,
          scenarioId,
          status: 'failed'
        },
        timestamp: Date.now()
      });

      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred during scenario execution');
    }
  }

  public async executeCampaign(projectId: string, campaignId: string): Promise<void> {
    try {
      this.wsManager.broadcastCampaignUpdate(campaignId, {
        type: 'campaign_status_update',
        data: {
          projectId,
          campaignId,
          status: 'running'
        }
      });



      this.wsManager.broadcastCampaignUpdate(campaignId, {
        type: 'campaign_status_update',
        data: {
          projectId,
          campaignId,
          status: 'completed'
        }
      });

    } catch (err) {
      logger.error('Campaign execution error:', err);

      this.wsManager.broadcastCampaignUpdate(campaignId, {
        type: 'campaign_status_update',
        data: {
          projectId,
          campaignId,
          status: 'failed'
        }
      });

      if (err instanceof Error) {
        throw err;
      }
      throw new Error('An unknown error occurred during campaign execution');
    }
  }

  /**
   * Executes an attack with multi-terminal support for tools like Shennina
   */
  async executeAttackWithMultiTerminal(
    attack: any,
    target: any,
    onOutput: (output: string, terminalId?: string) => void,
    onError: (error: string, terminalId?: string) => void
  ): Promise<{ tabId: string; additionalTerminals?: string[] }> {
    try {
      // Debug: log received attack object at method entry
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - Attack object received:`, JSON.stringify(attack, null, 2));
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - Attack tool: ${attack.tool}, typeof: ${typeof attack.tool}`);
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - Attack _id: ${attack._id}, typeof: ${typeof attack._id}`);
      
      const attackId = typeof attack._id === 'object' ? attack._id.toString() : attack._id;
      const scenarioId = attack.scenarioId || 'unknown';
      const attackSessionId = `attack-${attackId}-${Date.now()}`;
      
      // Debug: log processed values
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - Processed attackId: ${attackId}`);
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - scenarioId: ${scenarioId}`);
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - attackSessionId: ${attackSessionId}`);
      
      // Check if this tool requires multi-terminal setup
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - About to call getToolMultiTerminalConfig with tool: ${attack.tool}`);
      const toolConfig = this.getToolMultiTerminalConfig(attack.tool);
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - toolConfig result:`, toolConfig ? 'found' : 'not found');
      const additionalTerminals: string[] = [];
      
      if (toolConfig) {
        logger.info(`Creating ${toolConfig.preCommands.length + toolConfig.initCommands.length} additional terminals for ${attack.tool}`);
        
        // Start pre-commands in separate terminals
        for (let i = 0; i < toolConfig.preCommands.length; i++) {
          const preCommand = toolConfig.preCommands[i];
          // Create terminal ID in the format expected by TerminalManager: scenarioId-terminalKey
          const preTerminalId = `${scenarioId}-${attackSessionId}-pre-${i}`;
          additionalTerminals.push(preTerminalId);
          
          onOutput(`Starting ${preCommand.name}: ${preCommand.description}`, preTerminalId);
          
          try {
            await this.processManager.startProcess(
              preCommand.command,
              {},
              preTerminalId,
              (output: string) => onOutput(output, preTerminalId),
              (error: string) => onError(error, preTerminalId),
              (notification) => {
                if (notification.level === 'error') {
                  onError(notification.message, preTerminalId);
                } else if (notification.level === 'success') {
                  // Ne pas renvoyer les messages "Process completed successfully" car ils sont déjà envoyés par ProcessManager
                  if (!notification.message.includes('Process completed successfully')) {
                    onOutput(notification.message, preTerminalId);
                  }
                }
              },
              {
                projectId: attack.projectId || 'unknown',
                campaignId: attack.campaignId,
                scenarioId: scenarioId,
                attackId: attackId,
                targets: [target.host]
              }
            );
          } catch (preError) {
            onError(`Failed to start ${preCommand.name}: ${preError}`, preTerminalId);
          }
        }
        
        // Wait a bit for pre-commands to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Execute initialization commands
        for (let i = 0; i < toolConfig.initCommands.length; i++) {
          const initCommand = toolConfig.initCommands[i];
          // Create terminal ID in the format expected by TerminalManager: scenarioId-terminalKey
          const initTerminalId = `${scenarioId}-${attackSessionId}-init-${i}`;
          additionalTerminals.push(initTerminalId);
          
          onOutput(`Executing ${initCommand.name}: ${initCommand.description}`, initTerminalId);
          
          try {
            await this.processManager.startProcess(
              initCommand.command,
              {},
              initTerminalId,
              (output: string) => onOutput(output, initTerminalId),
              (error: string) => onError(error, initTerminalId),
              (notification) => {
                if (notification.level === 'error') {
                  onError(notification.message, initTerminalId);
                } else if (notification.level === 'success') {
                  // Ne pas renvoyer les messages "Process completed successfully" car ils sont déjà envoyés par ProcessManager
                  if (!notification.message.includes('Process completed successfully')) {
                    onOutput(notification.message, initTerminalId);
                  }
                }
              },
              {
                projectId: attack.projectId || 'unknown',
                campaignId: attack.campaignId,
                scenarioId: scenarioId,
                attackId: attackId,
                targets: [target.host]
              }
            );
            
            // Wait for each init command to complete
            await this.processManager.waitForProcess(initTerminalId);
          } catch (initError) {
            onError(`Failed to execute ${initCommand.name}: ${initError}`, initTerminalId);
          }
        }
      }
      
      // Now execute the main attack command
      // Debug: verify attack.tool is still available before buildAttackCommand call
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - Before buildAttackCommand - attack.tool: ${attack.tool}, typeof: ${typeof attack.tool}`);
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - Before buildAttackCommand - full attack object:`, JSON.stringify(attack, null, 2));
      
      const command = this.buildAttackCommand(attack.tool, {
        ...attack.parameters,
        host: target.host
      });
      
      // Debug: log command generation result
      logger.info(`[DEBUG] executeAttackWithMultiTerminal - buildAttackCommand result: ${command ? 'success' : 'failed'}`);
      if (!command) {
        logger.error(`[DEBUG] executeAttackWithMultiTerminal - buildAttackCommand failed for tool: ${attack.tool}`);
      }
      
      if (!command) {
        const errorMsg = `Unable to generate command for attack ${attack.tool}`;
        onError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const projectInfo = {
        projectId: attack.projectId || 'unknown',
        campaignId: attack.campaignId,
        scenarioId: scenarioId,
        attackId: attackId,
        targets: [target.host]
      };
      
      await this.processManager.startProcess(
        command,
        attack.tool === 'shennina' ? 
          // Pour Shennina, ne passer que les paramètres reconnus par le script Python
          {
            target: target.host || attack.parameters?.target,
            lhost: attack.parameters?.lhost,
            mode: attack.parameters?.mode
          } : 
          attack.parameters || {},
        attackSessionId,
        (output: string) => {
          onOutput(output);
        },
        (error: string) => {
          onError(error);
        },
        (notification) => {
          // Route notifications based on their level, mais éviter les doublons
          if (notification.level === 'error') {
            onError(notification.message);
          } else if (notification.level === 'success') {
            // Ne pas renvoyer les messages "Process completed successfully" car ils sont déjà envoyés par ProcessManager
            if (!notification.message.includes('Process completed successfully')) {
              onOutput(notification.message);
            }
          }
        },
        projectInfo
      );
      
      await this.processManager.waitForProcess(attackSessionId);
      
      return { 
        tabId: attackSessionId,
        additionalTerminals: additionalTerminals.length > 0 ? additionalTerminals : undefined
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[AttackService] Error executing multi-terminal attack ${attack.tool}: ${errorMsg}`);
      onError(errorMsg);
      throw error;
    }
  }

  /**
   * Get multi-terminal configuration for a tool
   */
  private getToolMultiTerminalConfig(toolId: string): any {
    const multiTerminalConfigs: Record<string, any> = {
      'shennina': {
        preCommands: [
          {
            name: "Exfiltration Server",
            command: "bash -c 'cd tools/shennina/exfiltration-server && ./run-server.sh'",
            description: "Starts the exfiltration server for data collection"
          },
          {
            name: "MSF RPC Server", 
            command: "bash -c 'cd tools/shennina && python3 scripts/run-msfrpc.py'",
            description: "Starts Metasploit RPC server for exploit execution"
          }
        ],
        initCommands: [
          {
            name: "Initialize Exploits Tree",
            command: "bash -c 'cd tools/shennina && python3 shennina_standalone.py --initialize-exploits-tree'",
            description: "Initialize the exploits database"
          }
        ]
      },
      'gan-fuzzer': {
        preCommands: [],
        initCommands: []
      }
    };
    
    return multiTerminalConfigs[toolId];
  }

  /**
   * Executes an attack
   */
  async executeAttack(
    attack: any,
    target: any,
    onOutput: (output: string) => void,
    onError: (error: string) => void
  ): Promise<{ tabId: string }> {
    try {
      // Debug: log attack object received in executeAttack
      logger.info(`[DEBUG] executeAttack - Attack object received:`, JSON.stringify(attack, null, 2));
      logger.info(`[DEBUG] executeAttack - Attack tool: ${attack.tool}, typeof: ${typeof attack.tool}`);
      logger.info(`[DEBUG] executeAttack - Attack _id: ${attack._id}, typeof: ${typeof attack._id}`);
      
      // Convert IDs to strings to avoid MongoDB errors
      const attackId = typeof attack._id === 'object' ? attack._id.toString() : attack._id;
      
      // Generate unique ID for this attack execution
      const attackSessionId = `attack-${attackId}-${Date.now()}`;
      
      // Debug: verify attack.tool is still available before buildAttackCommand call
      logger.info(`[DEBUG] executeAttack - Before buildAttackCommand - attack.tool: ${attack.tool}, typeof: ${typeof attack.tool}`);
      logger.info(`[DEBUG] executeAttack - Before buildAttackCommand - full attack object:`, JSON.stringify(attack, null, 2));
      
      // Build command based on tool and parameters
      const command = this.buildAttackCommand(attack.tool, {
        ...attack.parameters,
        host: target.host
      });
      
      if (!command) {
        const errorMsg = `Unable to generate command for attack ${attack.tool}`;
        onError(errorMsg);
        throw new Error(errorMsg);
      }

      // Report information
      const projectInfo = {
        projectId: attack.projectId || (attack.parameters && attack.parameters.projectId) || 'unknown',
        campaignId: attack.campaignId || (attack.parameters && attack.parameters.campaignId),
        scenarioId: attack.scenarioId || (attack.parameters && attack.parameters.scenarioId) || 'unknown',
        attackId: attackId,
        targets: [target.host]
      };

      // Start process
      try {
        await this.processManager.startProcess(
          command,
          attack.tool === 'shennina' ? 
            // Pour Shennina, ne passer que les paramètres reconnus par le script Python
            {
              target: target.host || attack.parameters?.target,
              lhost: attack.parameters?.lhost,
              mode: attack.parameters?.mode
            } : 
            attack.parameters || {},
          attackSessionId,          (output: string) => {
            onOutput(output);
          },
          (error: string) => {
            onError(error);
          },
          (notification) => {
            // Route notifications based on their level, mais éviter les doublons
            if (notification.level === 'error') {
              onError(notification.message);
            } else if (notification.level === 'success') {
              // Ne pas renvoyer les messages "Process completed successfully" car ils sont déjà envoyés par ProcessManager
              if (!notification.message.includes('Process completed successfully')) {
                onOutput(notification.message);
              }
            }
          },
          projectInfo
        );

        // Wait for process to complete
        await this.processManager.waitForProcess(attackSessionId);
        
      } catch (processError) {
        const errorMsg = processError instanceof Error ? processError.message : 'Error in process execution';
        logger.error(`[AttackService] Error during process execution: ${errorMsg}`);
        onError(errorMsg);
        throw processError;
      }

      return { tabId: attackSessionId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[AttackService] Error executing attack ${attack.tool}: ${errorMsg}`);
      onError(errorMsg);
      throw error;
    }
  }

  /**
   * Executes an attack with multiple outputs
   */
  async executeAttackWithMultiOutput(
    tool: string,
    outputId: string,
    parameters: Record<string, any>,
    tabId: string,
    onOutput: (output: string, outputId: string) => void,
    onError: (error: string, outputId: string) => void
  ): Promise<{ processId: string }> {
    try {
      const processId = `${tabId}-${outputId}-${Date.now()}`;
      
      // Build command for specific output
      const finalCommand = this.buildAttackCommand('maip-multi', {
        ...parameters,
        outputId
      });
      
      if (!finalCommand) {
        const errorMsg = `Unable to generate command for ${tool} output ${outputId}`;
        onError(errorMsg, outputId);
        throw new Error(errorMsg);
      }

      // Project info for reporting
      const projectInfo = {
        projectId: parameters.projectId || 'unknown',
        campaignId: parameters.campaignId,
        scenarioId: parameters.scenarioId || 'unknown',
        targets: parameters.targets || []
      };

      // Start process
      await this.processManager.startProcess(
        finalCommand,
        parameters,
        processId,
        (output: string) => onOutput(output, outputId),
        (error: string) => onError(error, outputId),
        (notification) => {
          if (notification.level === 'error') {
            onError(notification.message, outputId);
          } else {
            onOutput(notification.message, outputId);
          }
        },
        projectInfo
      );

      return { processId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[AttackService] Error executing multi-output attack ${tool}:${outputId}: ${errorMsg}`);
      onError(errorMsg, outputId);
      throw error;
    }
  }

  private buildAttackCommand(tool: string, params: Record<string, any>): string {
    // Debug: log all parameters at entry
    logger.info(`[DEBUG] buildAttackCommand - Entry - tool: "${tool}", typeof: ${typeof tool}`);
    logger.info(`[DEBUG] buildAttackCommand - Entry - params:`, JSON.stringify(params, null, 2));
    
    // Additional safety check
    if (tool === undefined || tool === null || tool === '') {
      const errorMsg = `buildAttackCommand called with invalid tool: ${tool} (typeof: ${typeof tool})`;
      logger.error(`[DEBUG] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // Dynamic command generation based on tool
    switch (tool) {
      // AI4Cyber Tools
      case 'gan-fuzzer': {
        const pcapFile = params['pcap-file'] || 'pcap/sa.pcap';
        const targetHost = params['target-host'] || params.target || '10.0.0.2';
        const targetPort = params['target-port'] || '38412';
        const nbCopies = params['nb-copies'] || '2000';
        const mutationRate = params['mutation-rate'];
        const seed = params['seed'];
        const protocol = params['protocol'];
        const field = params['field'];
        const dockerImage = params.dockerImage || 'ghcr.io/montimage/5greplay:latest';
        
        let cmd = `docker run --rm ${dockerImage} replay -t "${pcapFile}" -X forward.target-ports=${targetPort} -X forward.target-hosts=${targetHost} -X forward.nb-copies=${nbCopies} -X forward.default=FORWARD`;
        if (mutationRate) cmd += ` -X gan.mutation-rate=${mutationRate}`;
        if (seed) cmd += ` -X gan.seed=${seed}`;
        if (protocol) cmd += ` -X protocol=${protocol}`;
        if (field) cmd += ` -X field=${field}`;
        return cmd;
      }
      
      case 'knx-smart-fuzzer': {
        const attackIdText = params['attack-id'] || '1';
        const attackId = attackIdText.toString().charAt(0); // Extrait le premier caractère (l'ID)
        const knxServer = params['knx-server'] || params.target || '192.168.1.1';
        const knxPort = params['knx-port'] || '3671';
        const dockerImage = params.dockerImage || 'knxsmartfuzzer:latest';
        
        return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id ${attackId} --knxserver ${knxServer} --knxport ${knxPort}`;
      }
      
      // Maintien de la compatibilité avec l'ancien nom
      case 'ai-knx-fuzzer': {
        const attackIdText = params['attack-id'] || '1';
        const attackId = attackIdText.toString().charAt(0);
        const knxServer = params['knx-server'] || params['target-ip'] || params.target || '192.168.1.1';
        const knxPort = params['knx-port'] || '3671';
        const dockerImage = params.dockerImage || 'knxsmartfuzzer:latest';
        
        return `docker run --net=host --cap-add=NET_ADMIN --cap-add=NET_RAW --privileged ${dockerImage} ./main.sh --attack-id ${attackId} --knxserver ${knxServer} --knxport ${knxPort}`;
      }
      
      case 'maip': {
        const maipPath = process.env.MAIP_COMMAND || '/home/hamdouni-mohamed/start_maip_iframe_wrapper.sh';
        return `${maipPath}`;
      }
      
      // Gestion des commandes multiples pour MAIP
      case 'maip-multi': {
        const outputId = params.outputId;
        
        if (outputId === 'server') {
          return 'tools/maip/start_maip_iframe.sh';
        } else if (outputId === 'client') {
          return 'tools/maip/start-client.sh';
        }
        
        return '';
      }
      
      case 'shennina': {
        // Utiliser le vrai chemin Shennina du dossier tools
        const target = params.host || params.target || '192.168.1.100';
        const lhost = params.lhost || '192.168.1.1';
        
        // Déterminer automatiquement le mode selon l'ID de l'attaque
        let modeFlag = '--mode scan-only'; // Mode par défaut sécurisé
        const attackId = params.attackId || '';
        
        logger.info(`[AttackService] Shennina attackId: "${attackId}"`);
        
        if (attackId.includes('shennina-full-assessment') || attackId.includes('full-assessment')) {
          modeFlag = '--mode exploitation';
        } else if (attackId.includes('shennina-training') || attackId.includes('training')) {
          modeFlag = '--mode training';
        } else if (attackId.includes('scan-only') || attackId.includes('service-scan')) {
          modeFlag = '--mode scan-only';
        } else if (params.mode) {
          // Fallback: utiliser le paramètre mode s'il est fourni
          if (params.mode === 'training' || params.mode.includes('training')) {
            modeFlag = '--mode training';
          } else if (params.mode === 'exploitation' || params.mode.includes('exploitation')) {
            modeFlag = '--mode exploitation';
          }
        }
        
        logger.info(`[AttackService] Shennina mode final: "${modeFlag}"`);
        const command = `cd tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} ${modeFlag}`;
        return command;
      }
      
      case 'caldera': {
        const calderaCmd = process.env.CALDERA_COMMAND || 'tools/caldera/start_caldera.sh';
        return calderaCmd;
      }
      
      // Network Tools (Simplified)
      case 'nmap':
        if (params.scanType === 'syn') {
          let cmd = 'nmap';
          if (params.ports) cmd += ` -p ${params.ports}`;
          if (params.timing) cmd += ` -${params.timing}`;
          if (params.version) cmd += ' -sV';
          if (params.scripts) cmd += ' --script=default';
          cmd += ` ${params.target}`;
          return cmd;
        } else {
          return `nmap -sT -O ${params.target}`;
        }

      case 'masscan':
        const ports = params.ports || '80,443,22';
        const rate = params.rate || '1000';
        return `masscan ${params.target} -p${ports} --rate=${rate} --banners`;

      case 'netcat':
        return `nc -zvn ${params.target} ${params.port || 80}`;

      case 'telnet':
        return `telnet ${params.target} ${params.port || 23}`;

      // Web Tools
      case 'dirb': {
        const url = params.target.startsWith('http') ? params.target : `http://${params.target}`;
        let dirbCmd = `dirb ${url}`;
        if (params.wordlist) dirbCmd += ` ${params.wordlist}`;
        if (params.extensions) dirbCmd += ` -X ${params.extensions}`;
        return dirbCmd;
      }

      case 'gobuster': {
        const gobusterUrl = params.target.startsWith('http') ? params.target : `http://${params.target}`;
        const wordlist = params.wordlist || '/usr/share/wordlists/dirb/common.txt';
        const threads = params.threads || 10;
        let gobusterCmd = `gobuster dir -u ${gobusterUrl} -w ${wordlist} -t ${threads}`;
        if (params.extensions) gobusterCmd += ` -x ${params.extensions}`;
        return gobusterCmd;
      }

      case 'hydra': {
        const username = params.username || 'admin';
        const wordlist_hydra = params.wordlist || '/usr/share/wordlists/rockyou.txt';
        let hydraCmd = `hydra -l ${username} -P ${wordlist_hydra}`;
        if (params.service) hydraCmd += ` -s ${params.port || 22} ${params.target} ${params.service}`;
        return hydraCmd;
      }

      case 'john': {
        let johnCmd = `john`;
        if (params.wordlist) johnCmd += ` --wordlist=${params.wordlist}`;
        if (params.format) johnCmd += ` --format=${params.format}`;
        if (params.hashfile) johnCmd += ` ${params.hashfile}`;
        return johnCmd;
      }

      // Wireless Tools  
      case 'airmon':
        const interface_name = params.interface || 'wlan0';
        return `airmon-ng start ${interface_name}`;
      case 'airodump':
        const monitor_interface = params.interface || 'wlan0mon';
        return `airodump-ng ${monitor_interface}`;
      case 'aircrack':
        if (params.wordlist && params.capfile) {
          const wordlist_air = params.wordlist;
          const capfile = params.capfile;
          return `aircrack-ng -w ${wordlist_air} ${capfile}`;
        }
        return `aircrack-ng --help`;

      // Packet Analysis
      case 'wireshark':
        return 'wireshark';
      case 'tshark':
        if (params.capture_file) {
          const capture_file = params.capture_file;
          return `tshark -r ${capture_file}`;
        } else if (params.interface) {
          const interface_name = params.interface;
          return `tshark -i ${interface_name}`;
        }
        return 'tshark --help';

      case 'zmap':
        const port = params.port || 80;
        return `zmap -p ${port} ${params.target}`;

      // Exploitation Tools
      case 'metasploit':
        return 'msfconsole';
      case 'sqlmap':
        return `sqlmap -u "http://${params.target}" --batch`;
      case 'reaver':
        if (params.interface && params.bssid) {
          const interface_name = params.interface;
          const bssid = params.bssid;
          let cmd = `reaver -i ${interface_name} -b ${bssid}`;
          if (params.delay) cmd += ` -d ${params.delay}`;
          return cmd;
        }
        return 'reaver --help';

      case 'searchsploit': {
        const search_term = params.search || 'linux kernel';
        let searchCmd = `searchsploit "${search_term}"`;
        if (params.exclude) searchCmd += ` --exclude="${params.exclude}"`;
        return searchCmd;
      }

      // Password Tools
      case 'hashcat':
        const hash_type = params.hash_type || 0;
        const attack_mode = params.attack_mode || 0;
        const hashfile = params.hashfile || 'hashes.txt';
        const wordlist_hash = params.wordlist || '/usr/share/wordlists/rockyou.txt';
        return `hashcat -m ${hash_type} -a ${attack_mode} ${hashfile} ${wordlist_hash}`;

      // Social Engineering
      case 'setoolkit':
        return `setoolkit`;

      // Forensics Tools
      case 'autopsy':
        return 'autopsy';
      case 'sleuthkit':
        return 'tsk_loaddb';
      case 'volatility':
        const dumpfile = params.dumpfile || 'memory.dmp';
        const profile = params.profile || 'Win7SP1x64';
        const plugin = params.plugin || 'pslist';
        return `volatility -f ${dumpfile} --profile=${profile} ${plugin}`;

      case 'autopsy_server':
        return `autopsy`;

      case 'empire':
        return `empire`;

      // Sniffing Tools
      case 'ettercap':
        if (params.interface) {
          const interface_name = params.interface;
          let cmd = `ettercap -T -i ${interface_name}`;
          if (params.targets) cmd += ` ${params.targets}`;
          return cmd;
        }
        return 'ettercap --help';

      case 'dsniff':
        return 'dsniff';
      case 'tcpdump':
        if (params.interface) {
          const interface_name = params.interface;
          const count = params.count || 100;
          let cmd = `tcpdump -i ${interface_name} -c ${count}`;
          if (params.filter) cmd += ` '${params.filter}'`;
          return cmd;
        }
        return 'tcpdump --help';

      // Reverse Engineering
      case 'radare2':
        const binary = params.binary || '/bin/ls';
        const analysis = params.analysis || 'aaa; pdf @main';
        return `r2 -A -c "${analysis}" ${binary}`;

      case 'gdb':
      default:
        throw new Error(`No command generation logic for tool: ${tool}`);
    }
  }
}
