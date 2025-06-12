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
      const attackId = typeof attack._id === 'object' ? attack._id.toString() : attack._id;
      const attackSessionId = `attack-${attackId}-${Date.now()}`;
      
      // Check if this tool requires multi-terminal setup
      const toolConfig = this.getToolMultiTerminalConfig(attack.tool);
      const additionalTerminals: string[] = [];
      
      if (toolConfig) {
        // Start pre-commands in separate terminals
        for (let i = 0; i < toolConfig.preCommands.length; i++) {
          const preCommand = toolConfig.preCommands[i];
          const preTerminalId = `${attackSessionId}-pre-${i}`;
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
                } else {
                  onOutput(notification.message, preTerminalId);
                }
              },
              {
                projectId: attack.projectId || 'unknown',
                campaignId: attack.campaignId,
                scenarioId: attack.scenarioId || 'unknown',
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
          const initTerminalId = `${attackSessionId}-init-${i}`;
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
                } else {
                  onOutput(notification.message, initTerminalId);
                }
              },
              {
                projectId: attack.projectId || 'unknown',
                campaignId: attack.campaignId,
                scenarioId: attack.scenarioId || 'unknown',
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
      const command = this.buildAttackCommand(attack.tool, {
        ...attack.parameters,
        host: target.host
      });
      
      if (!command) {
        const errorMsg = `Unable to generate command for attack ${attack.tool}`;
        onError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const projectInfo = {
        projectId: attack.projectId || 'unknown',
        campaignId: attack.campaignId,
        scenarioId: attack.scenarioId || 'unknown',
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
          console.log('[DEBUG-ATTACK] Received output from ProcessManager:', output);
          onOutput(output);
        },
        (error: string) => {
          console.log('[DEBUG-ATTACK] Received error from ProcessManager:', error);
          onError(error);
        },
        (notification) => {
          console.log('[DEBUG-ATTACK] Received notification from ProcessManager:', notification);
          // Route notifications based on their level
          if (notification.level === 'error') {
            onError(notification.message);
          } else {
            onOutput(notification.message);
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
            command: "bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina/exfiltration-server && ./run-server.sh'",
            description: "Starts the exfiltration server for data collection"
          },
          {
            name: "MSF RPC Server", 
            command: "bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 scripts/run-msfrpc.py'",
            description: "Starts Metasploit RPC server for exploit execution"
          }
        ],
        initCommands: [
          {
            name: "Initialize Exploits Tree",
            command: "bash -c 'cd /home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina && python3 shennina_standalone.py --initialize-exploits-tree'",
            description: "Initialize the exploits database"
          }
        ]
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
      // Convert IDs to strings to avoid MongoDB errors
      const attackId = typeof attack._id === 'object' ? attack._id.toString() : attack._id;
      
      // Generate unique ID for this attack execution
      const attackSessionId = `attack-${attackId}-${Date.now()}`;
      
      // Build command based on tool and parameters
      const command = this.buildAttackCommand(attack.tool, {
        ...attack.parameters,
        host: target.host
      });
      
      if (!command) {
        const errorMsg = `Unable to generate command for attack ${attack.tool}`;
        console.log('[DEBUG-ATTACK] Pre-execution error:', errorMsg);
        onError(errorMsg);
        throw new Error(errorMsg);
      }

      // Report information
      const projectInfo = {
        projectId: attack.projectId || (attack.parameters && attack.parameters.projectId) || 'unknown',
        campaignId: attack.campaignId || (attack.parameters && attack.parameters.campaignId),
        scenarioId: attack.scenarioId || (attack.parameters && attack.parameters.scenarioId) || 'unknown',
        targets: [target.host]
      };

      // Start process
      try {
        console.log('[DEBUG-ATTACK] Starting process with command:', command);
        
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
            console.log('[DEBUG-ATTACK] Received output from ProcessManager:', output);
              onOutput(output);
          },
          (error: string) => {
            console.log('[DEBUG-ATTACK] Received error from ProcessManager:', error);
            onError(error);
          },
          (notification) => {
            console.log('[DEBUG-ATTACK] Received notification from ProcessManager:', notification);
            // Route notifications based on their level
            if (notification.level === 'error') {
              onError(notification.message);
            } else {
              onOutput(notification.message);
            }
          },
          projectInfo
        );

        // Wait for process to complete
        console.log('[DEBUG-ATTACK] Waiting for process completion:', attackSessionId);
        await this.processManager.waitForProcess(attackSessionId);
        console.log('[DEBUG-ATTACK] Process completed');
        
      } catch (processError) {
        const errorMsg = processError instanceof Error ? processError.message : 'Error in process execution';
        logger.error(`[AttackService] Error during process execution: ${errorMsg}`);
        console.log('[DEBUG-ATTACK] Process error:', errorMsg);
        onError(errorMsg);
        throw processError;
      }

      return { tabId: attackSessionId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[AttackService] Error executing attack ${attack.tool}: ${errorMsg}`);
      console.log('[DEBUG-ATTACK] Final error from executeAttack:', errorMsg);
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
      
      case 'ai-knx-fuzzer': {
        const targetIp = params['target-ip'] || params.target || '192.168.1.1';
        const model = params['model'];
        const iterations = params['iterations'];
        const dockerSocket = process.env.DOCKER_SOCKET || 'unix:///var/run/docker.sock';
        const dockerImage = params.dockerImage || 'montimage/aiknxfuzzer:latest';
        
        let cmd = `docker -H ${dockerSocket} run --rm ${dockerImage} ${targetIp}`;
        if (model) cmd += ` --model=${model}`;
        if (iterations) cmd += ` --iterations=${iterations}`;
        return cmd;
      }
      
      case 'maip': {
        const maipPath = process.env.MAIP_COMMAND || '/opt/montimage/start_maip.sh';
        return `${maipPath}`;
      }
      
      // Gestion des commandes multiples pour MAIP
      case 'maip-multi': {
        const outputId = params.outputId;
        
        if (outputId === 'server') {
          return '/home/hamdouni-mohamed/Montimage/start_maip.sh';
        } else if (outputId === 'client') {
          return '/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/maip/start-client.sh';
        }
        
        return '';
      }
      
      case 'shennina': {
        // Utiliser l'IP de la cible du scénario en priorité, sinon la valeur par défaut
        const target = params.host || params.target || '172.17.0.2';
        const lhost = params.lhost || '172.17.0.1';
        const scriptPath = '/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/shennina/shennina_standalone.py';
        
        // Déterminer le type d'attaque basé sur les paramètres ou l'ID d'attaque
        if (params.attackType === 'training' || params.mode === 'training') {
          return `python3 ${scriptPath} --target ${target} --lhost ${lhost} --mode training`;
        } else if (params.attackType === 'scan-only' || params.mode === 'scan-only') {
          return `python3 ${scriptPath} --target ${target} --lhost ${lhost} --mode scan-only`;
        } else {
          // Mode par défaut : exploitation
          return `python3 ${scriptPath} --target ${target} --lhost ${lhost} --mode exploitation`;
        }
      }
      
      case 'caldera': {
        const calderaCmd = process.env.CALDERA_COMMAND || '/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/caldera/start_caldera.sh';
        return calderaCmd;
      }
      
      // Kali Linux Tools (Simplified)
      case 'nmap': {
        const target = params.target || params.host || '127.0.0.1';
        const scanType = params['scan-type'] || 'syn';
        const ports = params.ports || '1-1000';
        const timing = params.timing || 'T3';
        
        let cmd = 'docker run --rm kalilinux/kali-rolling nmap';
        
        // Scan type
        switch (scanType) {
          case 'syn': cmd += ' -sS'; break;
          case 'tcp': cmd += ' -sT'; break;
          case 'udp': cmd += ' -sU'; break;
          case 'ping': cmd += ' -sn'; break;
          default: cmd += ' -sS';
        }
        
        // Ports
        if (ports && scanType !== 'ping') cmd += ` -p ${ports}`;
        
        // Timing
        cmd += ` -${timing}`;
        
        // Additional options
        if (params.verbose) cmd += ' -v';
        if (params['os-detection']) cmd += ' -O';
        if (params['service-detection']) cmd += ' -sV';
        
        // Force output and add target
        cmd += ` --open ${target}`;
        
        console.log('[DEBUG-NMAP] Generated nmap command:', cmd);
        return cmd;
      }
      
      case 'masscan': {
        const target = params.target || params.host || '127.0.0.1';
        const ports = params.ports || '80,443';
        const rate = params.rate || '1000';
        return `docker run --rm kalilinux/kali-rolling masscan ${target} -p${ports} --rate=${rate}`;
      }
      
      case 'sqlmap': {
        const url = params.url || 'http://example.com';
        const level = params.level || '1';
        const risk = params.risk || '1';
        
        let cmd = `docker run --rm paoloo/sqlmap -u "${url}" --level=${level} --risk=${risk}`;
        if (params.dbs) cmd += ' --dbs';
        if (params.tables) cmd += ' --tables';
        if (params.dump) cmd += ' --dump';
        if (params.batch) cmd += ' --batch';
        return cmd;
      }
      
      case 'nikto': {
        const host = params.host || params.target || 'http://example.com';
        const port = params.port || '80';
        
        let cmd = `docker run --rm frapsoft/nikto -h ${host}`;
        if (port !== '80') cmd += ` -p ${port}`;
        if (params.ssl) cmd += ' -ssl';
        if (params.evasion) cmd += ` -evasion ${params.evasion}`;
        return cmd;
      }
      
      case 'dirb': {
        const url = params.url || 'http://example.com';
        const wordlist = params.wordlist || '/usr/share/dirb/wordlists/common.txt';
        
        let cmd = `docker run --rm kalilinux/kali-rolling dirb ${url}`;
        if (params.wordlist) cmd += ` ${wordlist}`;
        if (params.extensions) cmd += ` -X ${params.extensions}`;
        return cmd;
      }
      
      case 'gobuster': {
        const url = params.url || 'http://example.com';
        const wordlist = params.wordlist || '/usr/share/wordlists/dirb/common.txt';
        const threads = params.threads || '10';
        
        let cmd = `docker run --rm kalilinux/kali-rolling gobuster dir -u ${url} -w ${wordlist} -t ${threads}`;
        if (params.extensions) cmd += ` -x ${params.extensions}`;
        return cmd;
      }
      
      case 'hydra': {
        const target = params.target || params.host || '127.0.0.1';
        const service = params.service || 'ssh';
        const username = params.username || 'admin';
        const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
        
        let cmd = `docker run --rm kalilinux/kali-rolling hydra -l ${username} -P ${wordlist}`;
        if (params.threads) cmd += ` -t ${params.threads}`;
        cmd += ` ${target} ${service}`;
        return cmd;
      }
      
      case 'john': {
        const hashfile = params.hashfile || 'hashes.txt';
        const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
        const format = params.format;
        
        let cmd = `docker run --rm kalilinux/kali-rolling john`;
        if (wordlist) cmd += ` --wordlist=${wordlist}`;
        if (format) cmd += ` --format=${format}`;
        cmd += ` ${hashfile}`;
        return cmd;
      }
      
      case 'aircrack-ng': {
        const mode = params.mode || 'monitor';
        const interface_name = params['interface'] || 'wlan0';
        
        if (mode === 'monitor') {
          return `docker run --rm --privileged --net=host kalilinux/kali-rolling airmon-ng start ${interface_name}`;
        } else if (mode === 'scan') {
          return `docker run --rm --privileged --net=host kalilinux/kali-rolling airodump-ng ${interface_name}`;
        } else if (mode === 'crack') {
          const capfile = params.capfile || 'capture.cap';
          const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
          return `docker run --rm --privileged kalilinux/kali-rolling aircrack-ng -w ${wordlist} ${capfile}`;
        }
        return `docker run --rm --privileged --net=host kalilinux/kali-rolling aircrack-ng --help`;
      }
      
      case 'metasploit': {
        const module = params.module || 'exploit/multi/handler';
        const payload = params.payload || 'windows/meterpreter/reverse_tcp';
        const lhost = params.lhost || '127.0.0.1';
        const lport = params.lport || '4444';
        
        return `docker run --rm -it metasploitframework/metasploit-framework msfconsole -x "use ${module}; set PAYLOAD ${payload}; set LHOST ${lhost}; set LPORT ${lport}; exploit"`;
      }
      
      case 'wireshark': {
        const interface_name = params['interface'] || 'eth0';
        const capture_file = params.capture_file;
        
        if (capture_file) {
          return `docker run --rm -v /tmp:/tmp kalilinux/kali-rolling tshark -r ${capture_file}`;
        } else {
          return `docker run --rm --privileged --net=host kalilinux/kali-rolling tshark -i ${interface_name}`;
        }
      }
      
      // Legacy support for old tools
      case 'zmap': {
        const port = params.port || '80';
        const target = params.target || '192.168.1.0/24';
        return `docker run --rm --privileged kalilinux/kali-rolling zmap -p ${port} ${target}`;
      }
      
      case 'wpscan': {
        const url = params.url || 'http://example.com';
        
        let cmd = `docker run --rm wpscanteam/wpscan --url ${url}`;
        if (params.enumerate) cmd += ` --enumerate ${params.enumerate}`;
        if (params.plugins) cmd += ' --plugins-detection aggressive';
        if (params.themes) cmd += ' --themes-detection aggressive';
        return cmd;
      }
      
      case 'reaver': {
        const interface_name = params['interface'] || 'wlan0mon';
        const bssid = params.bssid || '00:00:00:00:00:00';
        
        let cmd = `docker run --rm --privileged --net=host kalilinux/kali-rolling reaver -i ${interface_name} -b ${bssid}`;
        if (params.delay) cmd += ` -d ${params.delay}`;
        if (params.verbose) cmd += ' -vv';
        return cmd;
      }
      
      case 'searchsploit': {
        const search_term = params.search_term || 'apache';
        
        let cmd = `docker run --rm kalilinux/kali-rolling searchsploit "${search_term}"`;
        if (params.exact) cmd += ' --exact';
        if (params.json) cmd += ' --json';
        return cmd;
      }
      
      case 'hashcat': {
        const hashfile = params.hashfile || 'hashes.txt';
        const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
        const attack_mode = params.attack_mode || '0';
        const hash_type = params.hash_type || '0';
        
        return `docker run --rm --gpus all kalilinux/kali-rolling hashcat -m ${hash_type} -a ${attack_mode} ${hashfile} ${wordlist}`;
      }
      
      case 'setoolkit': {
        return `docker run --rm -it kalilinux/kali-rolling setoolkit`;
      }
      
      case 'gophish': {
        const admin_port = params.admin_port || '3333';
        const phish_port = params.phish_port || '8080';
        
        return `docker run --rm -p ${admin_port}:3333 -p ${phish_port}:80 gophish/gophish`;
      }
      
      case 'volatility': {
        const dumpfile = params.dumpfile || 'memory.dump';
        const profile = params.profile || 'Win7SP1x64';
        const plugin = params.plugin || 'pslist';
        
        return `docker run --rm kalilinux/kali-rolling volatility -f ${dumpfile} --profile=${profile} ${plugin}`;
      }
      
      case 'autopsy': {
        const case_dir = params.case_dir || '/cases';
        
        return `docker run --rm -p 9999:9999 -v ${case_dir}:/cases kalilinux/kali-rolling autopsy`;
      }
      
      case 'ettercap': {
        const interface_name = params['interface'] || 'eth0';
        const target1 = params.target1;
        const target2 = params.target2;
        
        let cmd = `docker run --rm --privileged --net=host kalilinux/kali-rolling ettercap -T -i ${interface_name}`;
        if (target1 && target2) {
          cmd += ` -M arp:remote /${target1}// /${target2}//`;
        }
        return cmd;
      }
      
      case 'tcpdump': {
        const interface_name = params['interface'] || 'eth0';
        const filter = params.filter || '';
        const count = params.count || '100';
        
        let cmd = `docker run --rm --privileged --net=host kalilinux/kali-rolling tcpdump -i ${interface_name} -c ${count}`;
        if (filter) cmd += ` ${filter}`;
        return cmd;
      }
      
      case 'radare2': {
        const binary = params.binary || 'binary';
        const analysis = params.analysis || 'aa';
        
        return `docker run --rm -it -v /tmp:/tmp kalilinux/kali-rolling r2 -A -c "${analysis}" ${binary}`;
      }
      
      case 'empire': {
        const listener_port = params.listener_port || '8080';
        
        return `docker run --rm -it -p ${listener_port}:8080 kalilinux/kali-rolling empire`;
      }
      
      default:
        throw new Error(`No command generation logic for tool: ${tool}`);
    }
  }
}