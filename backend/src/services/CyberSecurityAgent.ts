import { llmService, LLMRequest } from './LLMService';
import { IAgentConfig } from '../models/AgentConfig';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface CyberTask {
  id: string;
  type: 'reconnaissance' | 'scanning' | 'exploitation' | 'analysis' | 'reporting';
  description: string;
  command?: string;
  tool: string;
  target?: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  result?: any;
  requiresApproval: boolean;
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface CyberSecurityPlan {
  id: string;
  sessionId: string;
  objective: string;
  targetInfo: {
    ip?: string;
    domain?: string;
    description?: string;
  };
  tasks: CyberTask[];
  currentTaskIndex: number;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export class CyberSecurityAgent {
  private activePlans: Map<string, CyberSecurityPlan> = new Map();
  private toolsAvailable = [
    'nmap', 'nikto', 'dirb', 'gobuster', 'sqlmap', 'metasploit', 
    'hydra', 'john', 'hashcat', 'wireshark', 'burpsuite'
  ];

  /**
   * Analyse une demande utilisateur et génère un plan d'action intelligent
   */
  async analyzePenTestRequest(request: string, sessionId: string, config: IAgentConfig): Promise<CyberSecurityPlan> {
    logger.info(`🧠 Analyse de la demande: ${request}`);
    
    // Utiliser l'IA pour analyser la demande et créer un plan
    const analysisPrompt = `
Tu es un expert en cybersécurité et tests de pénétration. Analyse cette demande et crée un plan d'action structuré.

DEMANDE: "${request}"

Tu dois répondre UNIQUEMENT en JSON avec cette structure exacte:
{
  "objective": "Description claire de l'objectif",
  "targetInfo": {
    "ip": "IP cible si mentionnée ou null",
    "domain": "Domaine si mentionné ou null", 
    "description": "Description de la cible"
  },
  "tasks": [
    {
      "type": "reconnaissance|scanning|exploitation|analysis|reporting",
      "description": "Description de la tâche",
      "tool": "nom_de_l_outil",
      "target": "cible_specifique",
      "parameters": {"param1": "value1"},
      "requiresApproval": true/false
    }
  ]
}

RÈGLES IMPORTANTES:
- Toujours commencer par de la reconnaissance/scanning
- Ne jamais proposer d'attaques destructives
- Mettre requiresApproval à true pour toute action invasive
- Utiliser des outils réels (nmap, nikto, dirb, etc.)
- Ordonner les tâches logiquement
- Maximum 5 tâches par plan
`;

    const llmRequest: LLMRequest = {
      prompt: analysisPrompt,
      systemPrompt: 'Tu es un expert en cybersécurité. Réponds uniquement en JSON valide, sans texte avant ou après.',
      agentType: 'PlanningAgent',
      temperature: 0.3,
      maxTokens: 2000
    };

    try {
      const response = await llmService.sendRequest(llmRequest, config);
      const planData = JSON.parse(response.content.trim());
      
      // Créer le plan avec IDs uniques
      const plan: CyberSecurityPlan = {
        id: `plan_${Date.now()}`,
        sessionId,
        objective: planData.objective,
        targetInfo: planData.targetInfo,
        tasks: planData.tasks.map((task: any, index: number) => ({
          id: `task_${Date.now()}_${index}`,
          ...task,
          status: 'pending',
          createdAt: new Date()
        })),
        currentTaskIndex: 0,
        status: 'planning',
        createdAt: new Date()
      };

      this.activePlans.set(sessionId, plan);
      logger.info(`✅ Plan créé avec ${plan.tasks.length} tâches`);
      
      return plan;
      
    } catch (error: any) {
      logger.error('Erreur lors de l\'analyse:', error);
      throw new Error(`Impossible d'analyser la demande: ${error.message}`);
    }
  }

  /**
   * Exécute la prochaine tâche du plan
   */
  async executeNextTask(sessionId: string): Promise<{ task: CyberTask; completed: boolean }> {
    const plan = this.activePlans.get(sessionId);
    if (!plan) {
      throw new Error('Aucun plan actif trouvé');
    }

    if (plan.currentTaskIndex >= plan.tasks.length) {
      plan.status = 'completed';
      plan.completedAt = new Date();
      return { task: plan.tasks[plan.tasks.length - 1], completed: true };
    }

    const currentTask = plan.tasks[plan.currentTaskIndex];
    
    if (currentTask.requiresApproval && currentTask.status === 'pending') {
      currentTask.status = 'waiting_approval';
      logger.info(`⏸️ Tâche ${currentTask.id} en attente d'approbation`);
      return { task: currentTask, completed: false };
    }

    if (currentTask.status !== 'pending' && currentTask.status !== 'waiting_approval') {
      plan.currentTaskIndex++;
      return this.executeNextTask(sessionId);
    }

    // Exécuter la tâche
    currentTask.status = 'running';
    currentTask.executedAt = new Date();
    plan.status = 'executing';

    try {
      const result = await this.executeTask(currentTask);
      currentTask.result = result;
      currentTask.status = 'completed';
      currentTask.completedAt = new Date();
      
      plan.currentTaskIndex++;
      
      logger.info(`✅ Tâche ${currentTask.id} terminée`);
      return { task: currentTask, completed: plan.currentTaskIndex >= plan.tasks.length };
      
    } catch (error: any) {
      currentTask.status = 'failed';
      currentTask.error = error.message;
      currentTask.completedAt = new Date();
      
      logger.error(`❌ Tâche ${currentTask.id} échouée:`, error);
      throw error;
    }
  }

  /**
   * Approuve une tâche en attente
   */
  async approveTask(sessionId: string, taskId: string): Promise<void> {
    const plan = this.activePlans.get(sessionId);
    if (!plan) throw new Error('Plan non trouvé');

    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Tâche non trouvée');
    
    if (task.status !== 'waiting_approval') {
      throw new Error('La tâche n\'est pas en attente d\'approbation');
    }

    task.status = 'pending';
    logger.info(`✅ Tâche ${taskId} approuvée`);
  }

  /**
   * Exécute une tâche spécifique
   */
  private async executeTask(task: CyberTask): Promise<any> {
    logger.info(`🚀 Exécution de la tâche: ${task.description}`);

    switch (task.tool.toLowerCase()) {
      case 'nmap':
        return await this.executeNmapScan(task);
      case 'nikto':
        return await this.executeNiktoScan(task);
      case 'dirb':
      case 'gobuster':
        return await this.executeDirectoryBruteForce(task);
      case 'ping':
        return await this.executePing(task);
      case 'whois':
        return await this.executeWhois(task);
      default:
        throw new Error(`Outil ${task.tool} non supporté`);
    }
  }

  /**
   * Exécute un scan Nmap
   */
  private async executeNmapScan(task: CyberTask): Promise<any> {
    const { target, parameters } = task;
    
    // Construction de la commande Nmap sécurisée
    let nmapCmd = 'nmap';
    
    // Options de base sécurisées
    if (parameters.scanType === 'ping') {
      nmapCmd += ' -sn';
    } else if (parameters.scanType === 'tcp') {
      nmapCmd += ' -sT';
    } else {
      nmapCmd += ' -sS'; // SYN scan par défaut
    }
    
    // Ports spécifiques ou top ports
    if (parameters.ports) {
      nmapCmd += ` -p ${parameters.ports}`;
    } else {
      nmapCmd += ' --top-ports 1000';
    }
    
    // Options additionnelles
    if (parameters.serviceDetection) {
      nmapCmd += ' -sV';
    }
    
    if (parameters.osDetection) {
      nmapCmd += ' -O';
    }
    
    // Timeout et vitesse
    nmapCmd += ' -T4 --max-retries 2';
    
    // Cible (validée)
    if (!this.isValidTarget(target)) {
      throw new Error('Cible invalide ou dangereuse');
    }
    
    nmapCmd += ` ${target}`;
    
    try {
      logger.info(`Exécution: ${nmapCmd}`);
      const { stdout, stderr } = await execAsync(nmapCmd, { timeout: 300000 }); // 5 min timeout
      
      return {
        command: nmapCmd,
        output: stdout,
        error: stderr,
        timestamp: new Date(),
        parsed: this.parseNmapOutput(stdout)
      };
    } catch (error: any) {
      throw new Error(`Erreur Nmap: ${error.message}`);
    }
  }

  /**
   * Exécute un scan Nikto
   */
  private async executeNiktoScan(task: CyberTask): Promise<any> {
    const { target, parameters } = task;
    
    if (!this.isValidWebTarget(target)) {
      throw new Error('Cible web invalide');
    }
    
    let niktoCmd = `nikto -h ${target}`;
    
    if (parameters.port && parameters.port !== 80) {
      niktoCmd += ` -p ${parameters.port}`;
    }
    
    // Options de sécurité
    niktoCmd += ' -maxtime 300'; // 5 minutes max
    
    try {
      logger.info(`Exécution: ${niktoCmd}`);
      const { stdout, stderr } = await execAsync(niktoCmd, { timeout: 400000 });
      
      return {
        command: niktoCmd,
        output: stdout,
        error: stderr,
        timestamp: new Date(),
        vulnerabilities: this.parseNiktoOutput(stdout)
      };
    } catch (error: any) {
      throw new Error(`Erreur Nikto: ${error.message}`);
    }
  }

  /**
   * Exécute un ping simple
   */
  private async executePing(task: CyberTask): Promise<any> {
    const { target } = task;
    
    if (!this.isValidTarget(target)) {
      throw new Error('Cible invalide');
    }
    
    const pingCmd = `ping -c 4 ${target}`;
    
    try {
      const { stdout, stderr } = await execAsync(pingCmd, { timeout: 30000 });
      
      return {
        command: pingCmd,
        output: stdout,
        error: stderr,
        timestamp: new Date(),
        alive: stdout.includes('4 received') || stdout.includes('64 bytes')
      };
    } catch (error: any) {
      return {
        command: pingCmd,
        output: '',
        error: error.message,
        timestamp: new Date(),
        alive: false
      };
    }
  }

  /**
   * Exécute un whois
   */
  private async executeWhois(task: CyberTask): Promise<any> {
    const { target } = task;
    
    const whoisCmd = `whois ${target}`;
    
    try {
      const { stdout, stderr } = await execAsync(whoisCmd, { timeout: 30000 });
      
      return {
        command: whoisCmd,
        output: stdout,
        error: stderr,
        timestamp: new Date(),
        parsed: this.parseWhoisOutput(stdout)
      };
    } catch (error: any) {
      throw new Error(`Erreur Whois: ${error.message}`);
    }
  }

  /**
   * Exécute un brute force de répertoires
   */
  private async executeDirectoryBruteForce(task: CyberTask): Promise<any> {
    // Pour la sécurité, on simule cette tâche sans l'exécuter réellement
    logger.warn('⚠️ Directory brute force simulé pour des raisons de sécurité');
    
    return {
      command: `${task.tool} simulation`,
      output: 'Simulation: Directory brute force non exécuté pour des raisons de sécurité',
      timestamp: new Date(),
      directories: ['/', '/admin', '/login', '/api']
    };
  }

  /**
   * Valide qu'une cible est sûre à scanner
   */
  private isValidTarget(target?: string): boolean {
    if (!target) return false;
    
    // Liste des cibles interdites
    const forbiddenTargets = [
      'government.', 'military.', 'bank.', 'google.com', 'facebook.com',
      '1.1.1.1', '8.8.8.8', '127.0.0.1', 'localhost'
    ];
    
    return !forbiddenTargets.some(forbidden => 
      target.toLowerCase().includes(forbidden)
    );
  }

  /**
   * Valide qu'une cible web est sûre
   */
  private isValidWebTarget(target?: string): boolean {
    if (!target) return false;
    
    // Vérifier que c'est une URL valide et autorisée
    try {
      const url = new URL(target.startsWith('http') ? target : `http://${target}`);
      return this.isValidTarget(url.hostname);
    } catch {
      return this.isValidTarget(target);
    }
  }

  /**
   * Parse la sortie Nmap
   */
  private parseNmapOutput(output: string): any {
    const lines = output.split('\n');
    const openPorts: Array<{port: number, service: string, state: string}> = [];
    
    lines.forEach(line => {
      const portMatch = line.match(/(\d+)\/tcp\s+(\w+)\s+(.+)/);
      if (portMatch) {
        openPorts.push({
          port: parseInt(portMatch[1]),
          state: portMatch[2],
          service: portMatch[3].trim()
        });
      }
    });
    
    return { openPorts, hostsUp: output.includes('Host is up') };
  }

  /**
   * Parse la sortie Nikto
   */
  private parseNiktoOutput(output: string): Array<{severity: string, description: string}> {
    const vulnerabilities: Array<{severity: string, description: string}> = [];
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes('OSVDB-') || line.includes('CVE-')) {
        vulnerabilities.push({
          severity: 'medium',
          description: line.trim()
        });
      }
    });
    
    return vulnerabilities;
  }

  /**
   * Parse la sortie Whois
   */
  private parseWhoisOutput(output: string): any {
    const info: any = {};
    const lines = output.split('\n');
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        if (value) {
          info[key.trim().toLowerCase()] = value;
        }
      }
    });
    
    return info;
  }

  /**
   * Obtient le plan actif pour une session
   */
  getPlan(sessionId: string): CyberSecurityPlan | undefined {
    return this.activePlans.get(sessionId);
  }

  /**
   * Liste tous les outils disponibles
   */
  getAvailableTools(): string[] {
    return [...this.toolsAvailable];
  }

  /**
   * Génère un rapport final
   */
  async generateReport(sessionId: string, config: IAgentConfig): Promise<string> {
    const plan = this.activePlans.get(sessionId);
    if (!plan) throw new Error('Plan non trouvé');

    const reportPrompt = `
Génère un rapport de test de pénétration professionnel basé sur ces données:

OBJECTIF: ${plan.objective}
CIBLE: ${JSON.stringify(plan.targetInfo)}

TÂCHES EXÉCUTÉES:
${plan.tasks.map(task => `
- ${task.description} (${task.status})
  Outil: ${task.tool}
  ${task.result ? `Résultat: ${JSON.stringify(task.result, null, 2)}` : ''}
  ${task.error ? `Erreur: ${task.error}` : ''}
`).join('\n')}

Génère un rapport structuré avec:
1. Résumé exécutif
2. Méthodologie
3. Découvertes techniques
4. Vulnérabilités identifiées
5. Recommandations
6. Annexes techniques

Format en Markdown professionnel.
`;

    const llmRequest: LLMRequest = {
      prompt: reportPrompt,
      systemPrompt: 'Tu es un expert en cybersécurité qui rédige des rapports professionnels.',
      agentType: 'ReportAgent',
      temperature: 0.6,
      maxTokens: 4000
    };

    const response = await llmService.sendRequest(llmRequest, config);
    return response.content;
  }
}

export const cyberSecurityAgent = new CyberSecurityAgent(); 