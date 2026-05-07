import { AgentSession, IAgentSession, ExecutionStep, SessionStatus, AgentType } from '../models/AgentSession';
import { AgentConfig, IAgentConfig, getDefaultAgentConfigs } from '../models/AgentConfig';
import { llmService, LLMRequest } from './LLMService';
import { SocketService } from './SocketService';
import { logger } from '../utils/logger';

// Classes stubs temporaires (à remplacer par les vrais services plus tard)
class AgentService {
  async executeScanningAgent(_step: ExecutionStep, _config: IAgentConfig, _session: IAgentSession): Promise<any> {
    logger.info(`🔍 Exécution d'agent de scanning pour session ${_session.sessionId}`);
    
    try {
      const scanResults = {
        target: _step.parameters?.target || 'unknown',
        timestamp: new Date(),
        status: 'completed',
        findings: ['Service discovery completed', 'Port scan executed'],
        recommendation: 'Scan completed successfully'
      };
      
      logger.info(`✅ Agent de scanning terminé pour session ${_session.sessionId}`);
      return scanResults;
    } catch (error: any) {
      logger.error(`❌ Erreur lors du scanning:`, error);
      throw error;
    }
  }

  async executeMAIPAgent(_step: ExecutionStep, _config: IAgentConfig, _session: IAgentSession): Promise<any> {
    logger.info(`🤖 Exécution d'agent MAIP pour session ${_session.sessionId}`);
    
    try {
      const maipResults = {
        analysisType: 'attack_prediction',
        timestamp: new Date(),
        parameters: _step.parameters,
        predictions: ['Low risk attack vector detected', 'Network anomaly analysis completed'],
        confidence: 0.85,
        recommendation: 'Continue monitoring for suspicious activities'
      };
      
      logger.info(`✅ Agent MAIP terminé pour session ${_session.sessionId}`);
      return maipResults;
    } catch (error: any) {
      logger.error('❌ Erreur lors de l\'exécution MAIP:', error);
      throw error;
    }
  }

  async executeCalderaAgent(_step: ExecutionStep, _config: IAgentConfig, _session: IAgentSession): Promise<any> {
    logger.info(`⚔️ Exécution d'agent Caldera pour session ${_session.sessionId}`);
    
    try {
      const calderaResults = {
        operationType: 'adversary_simulation',
        timestamp: new Date(),
        operation: _step.parameters,
        techniques: ['T1059.001 - PowerShell', 'T1083 - File Discovery'],
        status: 'completed',
        recommendation: 'Review security controls based on simulation results'
      };
      
      logger.info(`✅ Agent Caldera terminé pour session ${_session.sessionId}`);
      return calderaResults;
    } catch (error: any) {
      logger.error('❌ Erreur lors de l\'exécution Caldera:', error);
      throw error;
    }
  }

  async executeShenninaPentestAgent(_step: ExecutionStep, _config: IAgentConfig, _session: IAgentSession): Promise<any> {
    logger.info(`🎯 Exécution d'agent Shennina Pentest pour session ${_session.sessionId}`);
    
    try {
      const shenninResults = {
        target: _step.parameters?.target || 'unknown',
        timestamp: new Date(),
        pentestType: 'automated_exploitation',
        exploits: ['SQL injection detection', 'XSS vulnerability scan', 'Authentication bypass attempt'],
        vulnerabilities: ['CVE-2023-1234', 'CVE-2023-5678'],
        severity: 'medium',
        recommendation: 'Patch identified vulnerabilities immediately'
      };
      
      logger.info(`✅ Agent Shennina Pentest terminé pour session ${_session.sessionId}`);
      return shenninResults;
    } catch (error: any) {
      logger.error('❌ Erreur lors du pentest Shennina:', error);
      throw error;
    }
  }

  
}

export interface StartSessionRequest {
  prompt: string;
  mode: 'auto' | 'semi-auto';
  userId: string;
  targetIp?: string;
  targetDescription?: string;
}

export class AgentOrchestrator {
  private agentService: AgentService;
  private socketService: SocketService;
  private activeSessions: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.agentService = new AgentService();
    this.socketService = SocketService.getInstance();
  }

  /**
   * Lance une nouvelle session d'attaque automatisée
   */
  async startNewSession(request: StartSessionRequest): Promise<IAgentSession> {
    logger.info(`🤖 Démarrage nouvelle session Agent pour user ${request.userId}`);
    
    // Extraire l'IP du prompt si non fournie
    const targetIp = request.targetIp || this.extractIPFromPrompt(request.prompt);
    if (!targetIp) {
      throw new Error('Impossible d\'extraire l\'adresse IP cible du prompt');
    }

    // Initialiser la configuration par défaut pour l'utilisateur si nécessaire
    await this.ensureUserAgentConfigs(request.userId);

    // Créer la session
    const session = new AgentSession({
      userId: request.userId,
      mode: request.mode,
      initialPrompt: request.prompt,
      targetIp: targetIp,
      targetDescription: request.targetDescription,
      status: 'ANALYZING',
      executionPlan: [],
      currentStep: 0,
      metadata: {
        startedAt: new Date(),
        lastActivity: new Date()
      }
    });

    const savedSession = await session.save();

    // Émettre l'événement de démarrage
    this.socketService.emitToUser(request.userId, 'agent:session-started', {
      sessionId: savedSession.sessionId,
      status: savedSession.status,
      targetIp: targetIp
    });

    // Démarrer le processus d'analyse et de planification
    this.startAnalysisPhase(savedSession);

    return savedSession;
  }

  /**
   * Phase 1: Analyse du prompt et planification
   */
  private async startAnalysisPhase(session: IAgentSession) {
    try {
      logger.info(`🧠 Phase d'analyse pour session ${session.sessionId}`);
      
      // Mettre à jour le statut
      session.status = 'PLANNING';
      await session.save();

      this.socketService.emitToUser(session.userId, 'agent:status-changed', {
        sessionId: session.sessionId,
        status: 'PLANNING'
      });

      // Obtenir la configuration du Planning Agent
      const planningConfig = await this.getAgentConfig(session.userId, 'PlanningAgent');
      
      // Préparer la requête pour le Planning Agent
      const planningRequest: LLMRequest = {
        prompt: this.buildPlanningPrompt(session),
        agentType: 'PlanningAgent',
        context: {
          targetIp: session.targetIp,
          mode: session.mode,
          availableTools: this.getAvailableTools()
        }
      };

      // Appeler le Planning Agent
      const planningResponse = await llmService.sendRequest(planningRequest, planningConfig);
      
      // Parser le plan d'exécution
      const executionPlan = this.parsePlanningResponse(planningResponse.content);
      
      // Mettre à jour la session avec le plan
      session.executionPlan = executionPlan;
      session.metadata.planningTime = Date.now() - session.metadata.startedAt.getTime();
      await session.save();

      // Émettre le plan généré
      this.socketService.emitToUser(session.userId, 'agent:plan-updated', {
        sessionId: session.sessionId,
        executionPlan: executionPlan
      });

      // Démarrer l'exécution
      if (session.mode === 'auto') {
        this.startExecution(session);
      } else {
        // Mode semi-auto: attendre l'approbation
        session.status = 'WAITING_USER_APPROVAL';
        await session.save();
        
        this.socketService.emitToUser(session.userId, 'agent:waiting-approval', {
          sessionId: session.sessionId,
          plan: executionPlan
        });
      }

    } catch (error: any) {
      console.error(`❌ Erreur pendant l'analyse:`, error);
      await this.handleError(session, error, 'PLANNING');
    }
  }

  /**
   * Phase 2: Exécution du plan d'attaque
   */
  private async startExecution(session: IAgentSession) {
    try {
      logger.info(`⚔️ Début d'exécution pour session ${session.sessionId}`);
      
      session.status = 'ATTACKING';
      session.metadata.attackingTime = Date.now();
      await session.save();

      this.socketService.emitToUser(session.userId, 'agent:status-changed', {
        sessionId: session.sessionId,
        status: 'ATTACKING'
      });

      // Exécuter les étapes séquentiellement
      const interval = setInterval(async () => {
        try {
          const currentSession = await AgentSession.findById(session._id);
          if (!currentSession) {
            clearInterval(interval);
            return;
          }

          const nextStep = currentSession.getNextPendingStep();
          if (!nextStep) {
            // Toutes les étapes terminées
            clearInterval(interval);
            this.activeSessions.delete(session.sessionId);
            await this.startReporting(currentSession);
            return;
          }

          // Vérifier si on attend une approbation en mode semi-auto
          if (session.mode === 'semi-auto' && nextStep.requiresApproval && 
              nextStep.status === 'PENDING') {
            nextStep.status = 'WAITING_APPROVAL';
            await currentSession.save();
            
            this.socketService.emitToUser(session.userId, 'agent:step-waiting-approval', {
              sessionId: session.sessionId,
              step: nextStep
            });
            return;
          }

          // Exécuter l'étape
          await this.executeStep(currentSession, nextStep);

        } catch (error: any) {
          console.error(`❌ Erreur pendant l'exécution:`, error);
          clearInterval(interval);
          this.activeSessions.delete(session.sessionId);
          await this.handleError(session, error, 'ATTACKING');
        }
      }, 2000); // Vérifier toutes les 2 secondes

      this.activeSessions.set(session.sessionId, interval);

    } catch (error: any) {
      console.error(`❌ Erreur de démarrage d'exécution:`, error);
      await this.handleError(session, error, 'ATTACKING');
    }
  }

  /**
   * Exécute une étape individuelle
   */
  private async executeStep(session: IAgentSession, step: ExecutionStep) {
    const stepIndex = session.executionPlan.findIndex(s => s.step === step.step);
    if (stepIndex === -1) return;

    logger.info(`🔄 Exécution étape ${step.step}: ${step.agent} - ${step.description}`);

    // Marquer comme en cours
    session.updateStepStatus(stepIndex, 'RUNNING');
    await session.save();

    this.socketService.emitToUser(session.userId, 'agent:step-started', {
      sessionId: session.sessionId,
      step: step
    });

    try {
      // Obtenir la configuration de l'agent
      const agentConfig = await this.getAgentConfig(session.userId, step.agent);

      // Exécuter selon le type d'agent
      let result;
      switch (step.agent) {
        case 'ScanningAgent':
          result = await this.agentService.executeScanningAgent(step, agentConfig, session);
          break;
        case 'MAIPAgent':
          result = await this.agentService.executeMAIPAgent(step, agentConfig, session);
          break;
        case 'CalderaAgent':
          result = await this.agentService.executeCalderaAgent(step, agentConfig, session);
          break;
        case 'ShenninaPentestAgent':
          result = await this.agentService.executeShenninaPentestAgent(step, agentConfig, session);
          break;
        default:
          throw new Error(`Agent non reconnu: ${step.agent}`);
      }

      // Marquer comme terminé avec succès
      session.updateStepStatus(stepIndex, 'DONE', result);
      session.addLog(stepIndex, `✅ Étape terminée avec succès`);
      await session.save();

      this.socketService.emitToUser(session.userId, 'agent:step-finished', {
        sessionId: session.sessionId,
        step: step,
        result: result
      });

    } catch (error: any) {
      console.error(`❌ Erreur étape ${step.step}:`, error.message);
      
      session.updateStepStatus(stepIndex, 'FAILED', null, error.message);
      session.addLog(stepIndex, `❌ Erreur: ${error.message}`);
      await session.save();

      this.socketService.emitToUser(session.userId, 'agent:step-failed', {
        sessionId: session.sessionId,
        step: step,
        error: error.message
      });

      // En mode auto, continuer avec les autres étapes
      // En mode semi-auto, arrêter et demander confirmation
      if (session.mode === 'semi-auto') {
        session.status = 'WAITING_USER_APPROVAL';
        await session.save();
      }
    }
  }

  /**
   * Phase 3: Génération du rapport
   */
  private async startReporting(session: IAgentSession) {
    try {
      logger.info(`📊 Phase de reporting pour session ${session.sessionId}`);
      
      session.status = 'REPORTING';
      session.metadata.reportingTime = Date.now();
      await session.save();

      this.socketService.emitToUser(session.userId, 'agent:status-changed', {
        sessionId: session.sessionId,
        status: 'REPORTING'
      });

      // Obtenir les configurations des agents de rapport
      const reportConfig = await this.getAgentConfig(session.userId, 'ReportAgent');
      const fixingConfig = await this.getAgentConfig(session.userId, 'FixingAgent');

      // Générer le rapport principal
      const reportRequest: LLMRequest = {
        prompt: this.buildReportingPrompt(session),
        agentType: 'ReportAgent',
        context: {
          executionPlan: session.executionPlan,
          discoveredData: session.discoveredData
        }
      };

      const reportResponse = await llmService.sendRequest(reportRequest, reportConfig);
      const report = this.parseReportResponse(reportResponse.content);

      // Générer les recommandations de remédiation
      const fixingRequest: LLMRequest = {
        prompt: this.buildFixingPrompt(session, report),
        agentType: 'FixingAgent',
        context: {
          findings: report.findings
        }
      };

      const fixingResponse = await llmService.sendRequest(fixingRequest, fixingConfig);
      const remediationPlan = this.parseFixingResponse(fixingResponse.content);

      // Combiner rapport et recommandations
      report.remediationPlan = remediationPlan;

      // Sauvegarder le rapport final
      session.finalReport = report;
      session.status = 'DONE';
      session.metadata.finishedAt = new Date();
      session.metadata.totalExecutionTime = Date.now() - session.metadata.startedAt.getTime();
      await session.save();

      this.socketService.emitToUser(session.userId, 'agent:session-finished', {
        sessionId: session.sessionId,
        report: report,
        executionTime: session.metadata.totalExecutionTime
      });

      logger.info(`✅ Session ${session.sessionId} terminée avec succès`);

    } catch (error: any) {
      console.error(`❌ Erreur pendant le reporting:`, error);
      await this.handleError(session, error, 'REPORTING');
    }
  }

  /**
   * Approuve la prochaine étape en mode semi-automatique
   */
  async approveStep(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await AgentSession.findOne({ sessionId, userId });
      if (!session) {
        throw new Error('Session non trouvée');
      }

      // Trouver l'étape en attente d'approbation
      const waitingStep = session.executionPlan.find(step => 
        step.status === 'WAITING_APPROVAL'
      );

      if (!waitingStep) {
        throw new Error('Aucune étape en attente d\'approbation');
      }

      // Marquer comme approuvée
      waitingStep.status = 'PENDING';
      waitingStep.approvedAt = new Date();
      waitingStep.approvedBy = userId;
      
      await session.save();

      this.socketService.emitToUser(userId, 'agent:step-approved', {
        sessionId: sessionId,
        step: waitingStep
      });

      // Redémarrer l'exécution si nécessaire
      if (session.status === 'WAITING_USER_APPROVAL') {
        session.status = 'ATTACKING';
        await session.save();
        
        if (!this.activeSessions.has(sessionId)) {
          this.startExecution(session);
        }
      }

      return true;

    } catch (error: any) {
      console.error(`❌ Erreur approbation étape:`, error.message);
      return false;
    }
  }

  /**
   * Récupère une session par ID
   */
  async getSession(sessionId: string, userId: string): Promise<IAgentSession | null> {
    return await AgentSession.findOne({ sessionId, userId });
  }

  /**
   * Liste les sessions d'un utilisateur
   */
  async getUserSessions(userId: string, limit: number = 20): Promise<IAgentSession[]> {
    return await AgentSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Arrête une session en cours
   */
  async stopSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await AgentSession.findOne({ sessionId, userId });
      if (!session) {
        return false;
      }

      // Arrêter le timer d'exécution
      const interval = this.activeSessions.get(sessionId);
      if (interval) {
        clearTimeout(interval);
        this.activeSessions.delete(sessionId);
      }

      // Marquer comme arrêtée
      session.status = 'FAILED';
      session.metadata.finishedAt = new Date();
      await session.save();

      this.socketService.emitToUser(userId, 'agent:session-stopped', {
        sessionId: sessionId
      });

      return true;

    } catch (error: any) {
      console.error(`❌ Erreur arrêt session:`, error.message);
      return false;
    }
  }

  // =============================================================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // =============================================================================

  private extractIPFromPrompt(prompt: string): string | null {
    const ipRegex = /(?:^|\s)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\s|$)/;
    const match = prompt.match(ipRegex);
    return match ? match[1] : null;
  }

  private async ensureUserAgentConfigs(userId: string) {
    const existingConfigs = await AgentConfig.find({ userId });
    
    if (existingConfigs.length === 0) {
      const defaultConfigs = getDefaultAgentConfigs(userId);
      await AgentConfig.insertMany(defaultConfigs);
    }
  }

  private async getAgentConfig(userId: string, agentType: AgentType): Promise<IAgentConfig> {
    const config = await AgentConfig.findOne({ userId, agentName: agentType, isActive: true });
    
    if (!config) {
      throw new Error(`Configuration non trouvée pour l'agent ${agentType}`);
    }
    
    return config;
  }

  private buildPlanningPrompt(session: IAgentSession): string {
    return `Tu es un expert en cybersécurité chargé de créer un plan d'attaque détaillé.

CONTEXTE:
- Cible: ${session.targetIp}
- Mode: ${session.mode}
- Prompt utilisateur: "${session.initialPrompt}"
- Description: ${session.targetDescription || 'Non spécifiée'}

OUTILS DISPONIBLES:
${this.getAvailableTools().map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

INSTRUCTIONS:
1. Analyse la demande de l'utilisateur
2. Crée un plan d'attaque logique en plusieurs étapes
3. Commence TOUJOURS par une reconnaissance (ScanningAgent)
4. Sélectionne les outils appropriés selon les services découverts
5. Termine par la génération de rapport

Retourne le plan au format JSON strict suivant:
{
  "steps": [
    {
      "step": 1,
      "agent": "ScanningAgent",
      "description": "Description de l'étape",
      "parameters": { "scanType": "nmap", "ports": "1-1000" },
      "requiresApproval": false
    }
  ]
}

${session.mode === 'semi-auto' ? 'IMPORTANT: Marque requiresApproval: true pour toutes les étapes d\'attaque.' : ''}`;
  }

  private buildReportingPrompt(session: IAgentSession): string {
    const completedSteps = session.executionPlan.filter(step => step.status === 'DONE');
    
    return `Tu es un expert en rédaction de rapports de sécurité.

DONNÉES D'EXÉCUTION:
Cible: ${session.targetIp}
Étapes réalisées: ${completedSteps.length}
Données découvertes: ${JSON.stringify(session.discoveredData, null, 2)}
Résultats des étapes:
${completedSteps.map(step => `
- ${step.description}
  Résultat: ${JSON.stringify(step.results, null, 2)}
  Logs: ${step.logs.join('\n  ')}
`).join('\n')}

Génère un rapport de sécurité professionnel au format JSON:
{
  "executiveSummary": "Résumé exécutif",
  "attackNarrative": "Narration des attaques",
  "methodologyUsed": ["Liste des méthodes"],
  "findings": [
    {
      "id": "finding-1",
      "vulnerability": "Nom de la vulnérabilité",
      "severity": "critical|high|medium|low",
      "service": "Service affecté",
      "port": 80,
      "description": "Description détaillée",
      "impact": "Impact business",
      "evidence": ["Preuves"],
      "fix": "Correction recommandée"
    }
  ],
  "statistiques": {
    "totalPortsScanned": 0,
    "openPorts": 0,
    "vulnerabilitiesFound": 0
  }
}`;
  }

  private buildFixingPrompt(_session: IAgentSession, report: any): string {
    return `Tu es un expert en remédiation cybersécurité.

VULNÉRABILITÉS IDENTIFIÉES:
${report.findings.map((f: any) => `
- ${f.vulnerability} (${f.severity})
  Service: ${f.service}:${f.port}
  Impact: ${f.impact}
`).join('\n')}

Génère un plan de remédiation prioritisé au format JSON:
{
  "remediationPlan": [
    {
      "priority": 1,
      "vulnerability": "Nom de la vulnérabilité",
      "fix": "Instructions détaillées avec commandes spécifiques",
      "estimatedEffort": "1-2 heures",
      "businessImpact": "Impact sur le business"
    }
  ]
}

INSTRUCTIONS:
- Priorise par criticité (1 = le plus critique)
- Fournis des commandes/configurations spécifiques
- Considère l'impact business
- Inclus les références CVE/CWE si pertinentes`;
  }

  private getAvailableTools() {
    return [
      { name: 'ScanningAgent', description: 'Reconnaissance réseau avec Nmap/Masscan' },
      { name: 'MAIPAgent', description: 'Attaques IA avec MAIP' },
      { name: 'CalderaAgent', description: 'Simulation d\'attaques avec Caldera' },
      { name: 'ShenninaPentestAgent', description: 'Framework Shennina pour tests avancés' },
    ];
  }

  private parsePlanningResponse(content: string): ExecutionStep[] {
    try {
      const parsed = JSON.parse(content);
      return parsed.steps || [];
    } catch (error) {
      console.error('❌ Erreur parsing plan:', error);
      // Plan par défaut si parsing échoue
      return [
        {
          step: 1,
          agent: 'ScanningAgent',
          description: 'Reconnaissance initiale de la cible',
          status: 'PENDING',
          parameters: { scanType: 'nmap', ports: '1-1000' },
          results: undefined,
          logs: [],
          requiresApproval: false
        }
      ];
    }
  }

  private parseReportResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Erreur parsing rapport:', error);
      return {
        executiveSummary: 'Erreur de génération du rapport',
        attackNarrative: content,
        findings: [],
        statistiques: { totalPortsScanned: 0, openPorts: 0, vulnerabilitiesFound: 0 }
      };
    }
  }

  private parseFixingResponse(content: string): any[] {
    try {
      const parsed = JSON.parse(content);
      return parsed.remediationPlan || [];
    } catch (error) {
      console.error('❌ Erreur parsing remédiation:', error);
      return [];
    }
  }

  private async handleError(session: IAgentSession, error: any, phase: SessionStatus) {
    session.status = 'FAILED';
    session.metadata.finishedAt = new Date();
    await session.save();

    this.socketService.emitToUser(session.userId, 'agent:session-failed', {
      sessionId: session.sessionId,
      error: error.message,
      phase: phase
    });

    // Nettoyer les timers actifs
    const interval = this.activeSessions.get(session.sessionId);
    if (interval) {
      clearTimeout(interval);
      this.activeSessions.delete(session.sessionId);
    }
  }
}

// Instance singleton
export const agentOrchestrator = new AgentOrchestrator(); 