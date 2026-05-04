import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { isValidTargetWithWhitelist } from './pentestRoutes';
import { LLMService, LLMRequest } from '../services/LLMService';
import { AgentType } from '../models/AgentSession';
import { IAgentConfig } from '../models/AgentConfig';
import { pdfService, SecurityReport } from '../services/PDFService';
import { NmapAnalyzer } from '../services/NmapAnalyzer';
import { PentestReport } from '../models/PentestReport';
import path from 'path';
import fs from 'fs';

const router = Router();

// Initialiser le service LLM
const llmService = new LLMService();

// Types pour les outils de pentesting réels
interface PentestConfig {
  toolName: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

interface ExecutionStep {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  command?: string;
  duration?: number;
  error?: string;
}

interface PentestSession {
  id: string;
  target: string;
  status: 'analyzing' | 'executing' | 'completed' | 'failed';
  mode: 'auto' | 'semi-auto';
  initialPrompt: string;
  tools: PentestConfig[];
  executionSteps: ExecutionStep[];
  startedAt: Date;
  completedAt?: Date;
  results: Record<string, any>;
  metadata?: {
    userId?: string;
  };
  finalReport?: any; // Ajout pour stocker le rapport final
}

// In-memory storage pour les sessions de pentest
const pentestSessions = new Map<string, PentestSession>();
const chatHistories = new Map<string, any[]>();
const conversationToPentestMap = new Map<string, string>(); // Map conversation IDs to pentest session IDs

// Fonction pour générer un rapport intelligent avec recherche internet
async function generateIntelligentReport(session: PentestSession, aiSettings: any) {
  const toolResults = session.results || {};
  const completedSteps = session.executionSteps?.filter(step => step.status === 'completed') || [];
  
  // Analyser les résultats nmap si disponibles
  let nmapFindings: any[] = [];
  let nmapStats = {
    totalPortsScanned: 0,
    openPorts: 0,
    vulnerabilitiesFound: 0,
    criticalFindings: 0,
    highFindings: 0,
    mediumFindings: 0,
    lowFindings: 0
  };

  if (toolResults.nmap && toolResults.nmap.output) {
    try {
      logger.info('🔍 Analyse nmap en cours...');
      const nmapResult = NmapAnalyzer.parseNmapOutput(toolResults.nmap.output);
      logger.info(`📊 Résultats nmap: ${nmapResult.openPorts.length} ports ouverts`);
      nmapFindings = NmapAnalyzer.analyzeVulnerabilities(nmapResult);
      logger.info(`🚨 Vulnérabilités détectées: ${nmapFindings.length}`);
      
      // Calculer les statistiques
      nmapStats = {
        totalPortsScanned: nmapResult.totalPortsScanned,
        openPorts: nmapResult.openPorts.length,
        vulnerabilitiesFound: nmapFindings.length,
        criticalFindings: nmapFindings.filter(f => f.severity === 'critical').length,
        highFindings: nmapFindings.filter(f => f.severity === 'high').length,
        mediumFindings: nmapFindings.filter(f => f.severity === 'medium').length,
        lowFindings: nmapFindings.filter(f => f.severity === 'low').length
      };
      logger.info(`📈 Statistiques: ${JSON.stringify(nmapStats)}`);
    } catch (error) {
      logger.error('Erreur lors de l\'analyse nmap:', error);
    }
  } else {
    logger.warn('⚠️ Pas de résultats nmap disponibles');
  }

  // Construire le prompt enrichi avec recherche internet
  const analysisPrompt = `Tu es un expert en cybersécurité qui analyse les résultats de tests de pénétration.

OBJECTIF: Analyser les résultats des outils de pentest et générer un rapport professionnel avec des recommandations précises ET rechercher sur internet les solutions les plus récentes pour les vulnérabilités trouvées.

DONNÉES D'ANALYSE:
Cible: ${session.target}
Outils exécutés: ${completedSteps.map(step => step.tool).join(', ')}
Durée totale: ${(session.metadata as any)?.totalExecutionTime ? Math.round((session.metadata as any).totalExecutionTime / 1000) : 0}s

RÉSULTATS DES OUTILS:
${completedSteps.map(step => `
${step.tool.toUpperCase()}:
- Statut: ${step.status}
- Durée: ${step.duration ? Math.round(step.duration / 1000) : 0}s
- Sortie complète: ${step.output || 'Aucune sortie'}
- Erreur: ${step.error || 'Aucune'}
`).join('\n')}

ANALYSE NMAP AUTOMATIQUE:
${nmapFindings.length > 0 ? `
Vulnérabilités détectées par analyse automatique:
${nmapFindings.map(finding => `
- ${finding.vulnerability} (${finding.severity.toUpperCase()})
  Service: ${finding.service}:${finding.port}
  Description: ${finding.description}
  Impact: ${finding.impact}
  Correction: ${finding.fix}
  ${finding.cve ? `CVE: ${finding.cve}` : ''}
  ${finding.cwe ? `CWE: ${finding.cwe}` : ''}
`).join('\n')}
` : 'Aucune vulnérabilité détectée par analyse automatique'}

RÉSULTATS DÉTAILLÉS:
${JSON.stringify(toolResults, null, 2)}

INSTRUCTIONS SPÉCIALES:
1. UTILISE L'ANALYSE NMAP AUTOMATIQUE fournie ci-dessus
2. Pour chaque vulnérabilité trouvée, RECHERCHE SUR INTERNET les solutions les plus récentes
3. Inclus des références CVE/CWE si disponibles
4. Fournis des commandes/configurations spécifiques et à jour
5. Considère l'impact business et la criticité
6. Sois technique mais compréhensible
7. Analyse chaque port/service trouvé pour identifier les vulnérabilités potentielles
8. Fournis des commandes de correction précises (iptables, firewall, configuration, etc.)
9. Inclus des vérifications de sécurité supplémentaires recommandées

Génère un rapport de sécurité professionnel au format JSON avec cette structure:

{
  "executiveSummary": "Résumé exécutif en 2-3 phrases avec score de risque basé sur les vulnérabilités trouvées",
  "attackNarrative": "Narration détaillée de ce qui s'est passé et des vulnérabilités trouvées",
  "methodologyUsed": ["Liste des méthodes et outils utilisés"],
  "findings": [
    {
      "id": "finding-1",
      "vulnerability": "Nom précis de la vulnérabilité",
      "severity": "critical|high|medium|low",
      "service": "Service affecté (ex: HTTP, SSH, MySQL)",
      "port": 80,
      "description": "Description technique détaillée de la vulnérabilité",
      "impact": "Impact business concret (ex: compromission, vol de données, etc.)",
      "evidence": ["Preuves spécifiques trouvées dans les scans"],
      "fix": "Correction précise avec commandes/configurations spécifiques (ex: iptables -A INPUT -p tcp --dport 22 -j DROP)",
      "cve": "CVE-2024-XXXX si applicable",
      "cwe": "CWE-XXX si applicable",
      "references": ["URLs de documentation officielle"],
      "latestSolutions": ["Solutions récentes trouvées sur internet"]
    }
  ],
  "statistiques": ${JSON.stringify(nmapStats)},
  "remediationPlan": [
    {
      "priority": 1,
      "vulnerability": "Nom de la vulnérabilité",
      "fix": "Instructions détaillées avec commandes spécifiques",
      "estimatedEffort": "Temps estimé (ex: 1-2 heures)",
      "businessImpact": "Impact sur le business",
      "internetResearch": "Solutions trouvées sur internet",
      "officialDocs": ["URLs de documentation officielle"]
    }
  ],
  "recommendations": [
    "Recommandation spécifique et actionnable"
  ],
  "riskScore": ${Math.max(50, nmapStats.criticalFindings * 20 + nmapStats.highFindings * 15 + nmapStats.mediumFindings * 10 + nmapStats.lowFindings * 5)},
  "nextSteps": [
    "Prochaine étape recommandée"
  ],
  "internetEnrichment": {
    "sources": ["Sources consultées pour les solutions"],
    "lastUpdated": "Date de dernière mise à jour des solutions",
    "credibility": "Niveau de crédibilité des sources"
  }
}

IMPORTANT: 
- Utilise l'analyse nmap automatique fournie
- Utilise tes capacités de recherche internet pour trouver les solutions les plus récentes et efficaces
- Analyse chaque port/service trouvé pour identifier les vulnérabilités
- Fournis des commandes de correction précises (iptables, firewall, configuration)
- Inclus des vérifications de sécurité supplémentaires
- Sois très spécifique dans les corrections proposées
- INCLUS LES VULNÉRABILITÉS DÉTECTÉES PAR L'ANALYSE NMAP AUTOMATIQUE`;

  // Appeler l'IA pour générer le rapport enrichi
  const defaultAiSettings = {
    provider: 'ollama',
    model: 'llama3.2:latest',
    baseUrl: 'http://localhost:11434',
    apiKey: ''
  };

  const finalAiSettings = aiSettings || defaultAiSettings;

  const llmRequest = {
    prompt: analysisPrompt,
    systemPrompt: 'Tu es un expert en cybersécurité qui rédige des rapports professionnels de tests de pénétration. Tu as accès à internet pour rechercher les solutions les plus récentes aux vulnérabilités. Analyse les données fournies et génère un rapport structuré avec des recommandations précises, actionnables et enrichies par tes recherches internet.',
    agentType: 'ReportAgent' as any,
    temperature: 0.3,
    maxTokens: 6000, // Plus de tokens pour les recherches internet
    context: {
      aiSettings: finalAiSettings
    }
  };

  let report;
  try {
    const llmResponse = await llmService.sendOllamaRequestDirect(llmRequest, {
      model: finalAiSettings.model,
      baseUrl: finalAiSettings.baseUrl
    });
    
    try {
      // Nettoyer la réponse si elle contient des blocs de code markdown
      let cleanContent = llmResponse.content;
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```\s*/g, '');
      }
      
      report = JSON.parse(cleanContent);
      logger.info('✅ Rapport généré avec succès par l\'IA');
    } catch (parseError) {
      logger.warn('⚠️ Erreur parsing JSON de la réponse IA, utilisation du fallback');
      throw parseError;
    }
  } catch (aiError) {
    logger.warn(`⚠️ Erreur IA (${aiError.message}), génération d'un rapport de base avec les données disponibles`);
    
    // Analyser les données directement sans IA
    const hasNmapResults = !!toolResults.nmap?.output;
    const portCount = hasNmapResults ? (toolResults.nmap.output.match(/open/g) || []).length : 0;
    const serviceCount = hasNmapResults ? (toolResults.nmap.output.match(/tcp|udp/g) || []).length : 0;
    
    // Générer un rapport basique mais informatif
    report = {
      executiveSummary: `Security analysis completed on ${session.target}. ${completedSteps.length} tools executed successfully${portCount > 0 ? `, ${portCount} open ports discovered` : ''}.`,
      attackNarrative: `Automated penetration testing was performed using ${completedSteps.map(s => s.tool).join(', ')}. ${hasNmapResults ? `Network reconnaissance revealed ${portCount} open ports and ${serviceCount} services.` : 'Network scan completed successfully.'} Analysis completed without AI enhancement due to service availability.`,
      methodologyUsed: completedSteps.map(step => step.tool),
      findings: nmapFindings.length > 0 ? nmapFindings.map((finding, index) => ({
        id: `finding-${index + 1}`,
        vulnerability: finding.vulnerability,
        severity: finding.severity,
        service: finding.service,
        port: finding.port,
        description: finding.description,
        impact: finding.impact,
        evidence: [`Detected by ${finding.tool || 'nmap'} scan`],
        fix: finding.fix,
        cve: finding.cve || null,
        cwe: finding.cwe || null
      })) : [],
      statistiques: nmapStats,
      remediationPlan: nmapFindings.map((finding) => ({
        priority: finding.severity === 'critical' ? 1 : finding.severity === 'high' ? 2 : finding.severity === 'medium' ? 3 : 4,
        vulnerability: finding.vulnerability,
        fix: finding.fix,
        estimatedEffort: finding.severity === 'critical' ? '1-2 hours' : finding.severity === 'high' ? '2-4 hours' : '4-8 hours',
        businessImpact: finding.impact
      })),
      recommendations: [
        "Review and apply security patches for discovered vulnerabilities",
        "Implement network segmentation and access controls",
        "Schedule regular security assessments",
        "Monitor network traffic for suspicious activities"
      ],
      riskScore: Math.max(50, nmapStats.criticalFindings * 20 + nmapStats.highFindings * 15 + nmapStats.mediumFindings * 10 + nmapStats.lowFindings * 5),
      nextSteps: [
        "Review detailed tool outputs for additional context",
        "Prioritize remediation based on risk scores",
        "Implement monitoring for detected vulnerabilities",
        "Schedule follow-up assessment after remediation"
      ],
      internetEnrichment: {
        sources: ["Local analysis only - AI service unavailable"],
        lastUpdated: new Date().toISOString(),
        credibility: "medium"
      },
      generatedBy: "fallback-system",
      note: "This report was generated using local analysis due to AI service unavailability. While comprehensive, an AI-enhanced analysis would provide additional insights and recommendations."
    };
  }

  return report;
}

/**
 * POST /api/agents/chat
 * Chat intelligent avec le LLM - VRAIE INTELLIGENCE ARTIFICIELLE
 */
router.post('/chat', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, context, aiSettings } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ 
        success: false,
        error: 'Message requis pour le chat LLM' 
      });
      return;
    }

    const userId = req.user?.id || 'anonymous';
    logger.info(`🤖 Chat LLM - Utilisateur ${userId}: ${message.substring(0, 100)}...`);

    // Detect if user wants to launch a pentest - more restrictive logic
    const extractTarget = (msg: string): string => {
      const lowerMsg = msg.toLowerCase();
      
      // Check for self-testing requests first using lowercase string
      if (lowerMsg.includes('my computer') ||
          lowerMsg.includes('my system') ||
          lowerMsg.includes('my machine') ||
          lowerMsg.includes('myself') ||
          lowerMsg.includes('this computer') ||
          lowerMsg.includes('this system') ||
          lowerMsg.includes('this machine') ||
          lowerMsg.includes('localhost') ||
          lowerMsg.includes('pentest me') ||
          lowerMsg.includes('test me') ||
          lowerMsg.includes('scan me') ||
          (lowerMsg.includes(' me ') && (lowerMsg.includes('pentest') || lowerMsg.includes('test'))) ||
          (lowerMsg.endsWith(' me') && (lowerMsg.includes('pentest') || lowerMsg.includes('test')))) {
        return '192.168.1.176'; // Default local network range
      }
      
      // Try to extract IP addresses from original message
      const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?\b/g;
      const ips = msg.match(ipPattern);
      if (ips && ips.length > 0) return ips[0];
      
      // Try to extract domain names from original message
      const domainPattern = /\b[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}\b/g;
      const domains = msg.match(domainPattern);
      if (domains && domains.length > 0) return domains[0];
      
      return '';
    };
    
    const hasValidTarget = extractTarget(message) !== '';
    const hasActionWords = message.toLowerCase().includes('lancer') || 
                          message.toLowerCase().includes('start') ||
                          message.toLowerCase().includes('launch') ||
                          message.toLowerCase().includes('begin') ||
                          message.toLowerCase().includes('go') ||
                          message.toLowerCase().includes('can') ||
                          message.toLowerCase().includes('could') ||
                          message.toLowerCase().includes('please') ||
                          message.toLowerCase().includes('run') ||
                          message.toLowerCase().includes('execute') ||
                          message.toLowerCase().includes('pentest') ||
                          message.toLowerCase().includes('test') ||
                          message.toLowerCase().includes('scan') ||
                          message.toLowerCase().includes('maintenant') ||
                          message.toLowerCase().includes('now');
    
    const pentestKeywords = ['pentest', 'penetration test', 'vulnerability scan', 'security audit', 'attack', 'attaque'];
    const hasPentestKeywords = pentestKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Debug logging for detection process
    logger.info(`🔍 Pentest Detection Debug:`);
    logger.info(`   Message: "${message}"`);
    logger.info(`   Target extracted: "${extractTarget(message)}"`);
    logger.info(`   Has valid target: ${hasValidTarget}`);
    logger.info(`   Has action words: ${hasActionWords}`);
    logger.info(`   Has pentest keywords: ${hasPentestKeywords}`);
    
    // More restrictive: require pentest keywords + action words + valid target
    const shouldStartPentest = hasPentestKeywords && hasActionWords && hasValidTarget;
    logger.info(`   Should start pentest: ${shouldStartPentest}`);

    // Si c'est une demande de lancement de pentest, créer une session et l'exécuter
    if (shouldStartPentest) {
      try {
        // Use the extracted target or fallback
        let target = extractTarget(message) || '192.168.1.176';
        logger.info(`� Target extracted from message: ${target}`);
        
        // ✅ Intelligent tool selection based on target analysis
        const getAdaptedTools = (target: string) => {
          const isWebTarget = target.includes('http') || target.includes('www') || 
                             target.includes('.com') || target.includes('.org') || 
                             target.includes('.net') || target.includes('.io');
          
          const isLocalMachine = target.includes('127.0.0.1') || 
                                target.includes('localhost') || 
                                target.includes('192.168.') ||
                                target.includes('10.0.') ||
                                target.includes('172.16.');
          
          const isInfrastructureTarget = target.includes('router') || 
                                        target.includes('switch') || 
                                        target.includes('firewall') ||
                                        target.match(/\d+\.\d+\.\d+\.1$/);
          
          const allTools = [
            { name: 'nmap', parameters: {} },
            { name: 'masscan', parameters: {} },
            { name: 'nikto', parameters: {} },
            { name: 'gobuster', parameters: {} },
            { name: 'sqlmap', parameters: {} },
            { name: 'shennina', parameters: {} },
            { name: 'gan-fuzzer', parameters: {} }
          ];
          
          // Filter tools based on target analysis
          const selectedTools = allTools.filter(tool => {
            if (isLocalMachine || isInfrastructureTarget) {
              // Exclude web-specific tools for local/infrastructure targets
              if (tool.name === 'nikto' || tool.name === 'gobuster' || tool.name === 'gan-fuzzer') {
                logger.info(`🚫 Excluding ${tool.name} - not suitable for local/infrastructure targets`);
                return false;
              }
            }
            
            // For web targets, include all tools but optimize parameters
            if (isWebTarget && tool.name === 'nikto') {
              tool.parameters = { port: 443, ssl: true };
            }
            
            return true;
          });
          
          logger.info(`🧠 Target analysis: ${target} | Type: ${isWebTarget ? 'Web' : isLocalMachine ? 'Local' : isInfrastructureTarget ? 'Infrastructure' : 'Network'} | Tools: ${selectedTools.length}/${allTools.length} selected`);
          return selectedTools;
        };
        
        // Fonction pour obtenir la description d'un outil
        const getToolDescription = (toolName: string): string => {
          const descriptions: { [key: string]: string } = {
            'nmap': 'Network discovery and port scanning for infrastructure analysis',
            'masscan': 'High-speed port scanner for network reconnaissance',
            'metasploit': 'Advanced exploitation framework for vulnerability assessment',
            'burpsuite': 'Web application security testing and vulnerability scanning',
            'nikto': 'Web server scanner for common vulnerabilities and misconfigurations',
            'sqlmap': 'SQL injection detection and database exploitation tool',
            'gobuster': 'Directory and file brute-forcing for web application discovery',
            'shennina': 'AI-powered vulnerability detection and exploitation tool',
            'gan-fuzzer': 'AI-powered fuzzing tool for discovering application vulnerabilities'
          };
          
          return descriptions[toolName] || 'Advanced security testing tool';
        };
        
        const tools = getAdaptedTools(target);

        // Créer la session de pentest
        const sessionId = `pentest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const session: PentestSession = {
          id: sessionId,
          target,
          status: 'executing',
          mode: 'auto',
          initialPrompt: message,
          tools: tools.map(tool => ({
            toolName: tool.name,
            enabled: true,
            parameters: tool.parameters
          })),
          executionSteps: [],
          startedAt: new Date(),
          results: {},
          metadata: {
            userId: req.user?.id
          }
        };

        pentestSessions.set(sessionId, session);

        // Map conversation ID to pentest session ID
        const conversationId = req.body.sessionId || 'general';
        conversationToPentestMap.set(`${userId}:${conversationId}`, sessionId);
        logger.info(`🔗 Mapped conversation ${userId}:${conversationId} to pentest session ${sessionId}`);

        // Démarrer l'exécution des outils en arrière-plan
        setImmediate(async () => {
          for (const tool of tools) {
            try {
              logger.info(`🚀 Executing ${tool.name} for session ${sessionId}`);
              
              // Importer et exécuter l'outil
              const pentestModule = await import('./pentestRoutes');
              let result: any;
              
              switch (tool.name.toLowerCase()) {
                case 'nmap':
                  result = await pentestModule.executeRealNmap(target, tool.parameters);
                  break;
                case 'masscan':
                  result = await pentestModule.executeRealMasscan(target, tool.parameters);
                  break;
                case 'nikto':
                  result = await pentestModule.executeRealNikto(target, tool.parameters);
                  break;
                case 'gobuster':
                  result = await pentestModule.executeRealGobuster(target, tool.parameters);
                  break;
                case 'sqlmap':
                  result = await pentestModule.executeRealSqlmap(target, tool.parameters);
                  break;
                case 'shennina':
                  result = await pentestModule.executeRealShennina(target, tool.parameters);
                  break;
                case 'gan-fuzzer':
                  result = await pentestModule.executeRealGanFuzzer(target, tool.parameters);
                  break;
                default:
                  logger.warn(`Tool ${tool.name} not supported`);
                  continue;
              }

              // Mettre à jour la session avec les résultats
              const currentSession = pentestSessions.get(sessionId);
              if (currentSession) {
                if (!currentSession.results) {
                  currentSession.results = {};
                }
                
                currentSession.results[tool.name] = {
                  command: result.command,
                  output: result.output,
                  summary: result.summary,
                  executedAt: new Date(),
                  duration: 0
                };

                // Ajouter l'étape d'exécution
                const executionStep: ExecutionStep = {
                  id: `${tool.name}-${Date.now()}`,
                  tool: tool.name,
                  description: `Exécution de ${tool.name} sur ${target}`,
                  status: 'completed',
                  command: result.command,
                  output: result.output,
                  duration: 0
                };

                if (!currentSession.executionSteps) {
                  currentSession.executionSteps = [];
                }
                currentSession.executionSteps.push(executionStep);
                pentestSessions.set(sessionId, currentSession);
                
                logger.info(`✅ Tool ${tool.name} executed successfully for session ${sessionId}`);
              }
            } catch (error) {
              logger.error(`❌ Error executing ${tool.name}:`, error);
            }
          }

          // Marquer la session comme terminée et générer le rapport
          const finalSession = pentestSessions.get(sessionId);
          if (finalSession) {
            finalSession.status = 'completed';
            finalSession.completedAt = new Date();
            
            try {
              const report = await generateIntelligentReport(finalSession, aiSettings);
              finalSession.finalReport = report;
              pentestSessions.set(sessionId, finalSession);
              logger.info(`📊 Report generated for session ${sessionId}`);
              
              // Save report to the new PentestReport model
              try {
                const nmapFindings = report.findings || [];
                const statistiques = report.statistiques || {
                  totalPortsScanned: 0,
                  openPorts: 0,
                  vulnerabilitiesFound: nmapFindings.length,
                  criticalFindings: nmapFindings.filter((f: any) => f.severity === 'critical').length,
                  highFindings: nmapFindings.filter((f: any) => f.severity === 'high').length,
                  mediumFindings: nmapFindings.filter((f: any) => f.severity === 'medium').length,
                  lowFindings: nmapFindings.filter((f: any) => f.severity === 'low').length
                };
                
                const pentestReport = new PentestReport({
                  scanId: sessionId,
                  target: finalSession.target,
                  status: 'completed',
                  metadata: {
                    userId: finalSession.metadata?.userId || userId,
                    scanType: 'ai-pentest',
                    tools: finalSession.tools.map(t => t.toolName),
                    startedAt: finalSession.startedAt,
                    completedAt: new Date(),
                    duration: finalSession.completedAt ? 
                      finalSession.completedAt.getTime() - finalSession.startedAt.getTime() : 0
                  },
                  executiveSummary: report.executiveSummary || '',
                  attackNarrative: report.attackNarrative || '',
                  methodologyUsed: report.methodologyUsed || [],
                  vulnerabilities: nmapFindings.map((f: any, index: number) => ({
                    id: `vuln-${index + 1}`,
                    vulnerability: f.vulnerability || f.vulnerabilityName || 'Unknown',
                    severity: f.severity || 'medium',
                    service: f.service || 'unknown',
                    port: f.port || 0,
                    description: f.description || '',
                    impact: f.impact || '',
                    evidence: f.evidence || [],
                    remediationInstructions: f.fix || '',
                    cve: f.cve || undefined,
                    cwe: f.cwe || undefined,
                    references: f.references || [],
                    latestSolutions: f.latestSolutions || []
                  })),
                  statistiques,
                  remediationPlan: (report.remediationPlan || []).map((r: any) => ({
                    priority: r.priority || 1,
                    vulnerability: r.vulnerability || '',
                    fix: r.fix || '',
                    estimatedEffort: r.estimatedEffort || 'Unknown',
                    businessImpact: r.businessImpact || 'Unknown'
                  })),
                  recommendations: report.recommendations || [],
                  riskScore: report.riskScore || 50,
                  nextSteps: report.nextSteps || [],
                  rawResults: finalSession.results || {}
                });
                
                await pentestReport.save();
                logger.info(`💾 Report saved to database with scanId: ${sessionId}`);
              } catch (saveError) {
                logger.error('Error saving report to database:', saveError);
              }
            } catch (reportError) {
              logger.error('Error generating report:', reportError);
            }
          }
        });

        // Attendre 2-3 secondes pour simuler l'analyse intelligente
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Message unique avec sélection intelligente des outils
        const intelligentMessage = `🎯 **Target Confirmed:** ${target}

🧠 **Intelligent Tool Selection:**
Based on target analysis, I've selected ${tools.length} out of 7 available tools optimized for this target type:

${tools.map(t => `• **${t.name}** - ${getToolDescription(t.name)}`).join('\n')}

🚀 **Pentest Session Launched!**
📊 **Session ID:** ${sessionId}

✅ Tools are running in background. You will be automatically redirected to the Pipeline tab in 3 seconds to monitor real-time progress.

📈 A comprehensive security report will be automatically generated once all tools complete.`;

        // Sauvegarder dans l'historique du chat
        const chatKey = `${userId}:${req.body.sessionId || 'general'}`;
        const history = chatHistories.get(chatKey) || [];
        
        // Ajouter le message utilisateur et la réponse
        history.push(
          {
            role: 'user',
            content: message,
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: intelligentMessage,
            timestamp: new Date(),
            model: 'action-agent',
            provider: 'internal',
            pentestSession: sessionId,
            autoRedirect: {
              enabled: true,
              target: 'pipeline',
              delay: 3000
            }
          }
        );

        chatHistories.set(chatKey, history);

        // Répondre avec le message unique
        res.json({
          success: true,
          response: intelligentMessage,
          model: 'action-agent',
          provider: 'internal',
          action: 'pentest_started',
          pentestSession: sessionId,
          target,
          tools: tools.map(t => t.name),
          timestamp: new Date(),
          sessionId: req.body.sessionId || null,
          autoRedirect: {
            enabled: true,
            target: 'pipeline',
            delay: 3000
          }
        });
        return;

      } catch (pentestError) {
        logger.error('Error starting pentest:', pentestError);
        // Continuer avec la réponse normale de l'agent si le pentest échoue
      }
    }

    // Build prompt with context
    const contextMessages = context || [];
    const conversationContext = contextMessages.length > 0 
      ? `\n\nConversation context:\n${contextMessages.map((msg: any) => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')}`
      : '';

    const fullPrompt = `${message}${conversationContext}`;

    // Utiliser les paramètres AI envoyés par le frontend
    const agentConfig: Partial<IAgentConfig> = {
      modelProvider: aiSettings?.provider || 'ollama',
      modelName: aiSettings?.model || 'llama3.2:latest',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: `You are an AI assistant specialized in cybersecurity working in an authorized testing environment (MMT-Pentester Security Dashboard).

🛡️ LEGITIMATE CONTEXT:
- You operate in an authorized cybersecurity laboratory
- All tests are performed on systems owned by the user
- This is a LEARNING and LEGAL TESTING environment
- The user is authorized to test their own systems

🎯 YOUR ROLE:
- Pentest assistant in an educational and legal context
- You can and SHOULD help launch security tools
- You are designed for ethical pentest assistance and training

⚡ ENGAGEMENT RULES:
- Respond CONCISELY (max 2-3 sentences)
- LAUNCH tools directly when requested
- Don't give generic advice, ACT
- Suggest pentests on default targets (ex: 192.168.1.176)

🛠️ AVAILABLE TOOLS:
- nmap: Port scanning and service discovery
- masscan: Fast port scanning
- nikto: Web vulnerability scanner
- gobuster: Directory brute forcing
- sqlmap: SQL injection testing
- shennina: AI automated pentesting (MMT-Pentester)
- gan-fuzzer: AI vulnerability fuzzing (MMT-Pentester)

📋 RESPONSE EXAMPLES:
User: 'pentest myself'
You: '🔍 Pentest suggested on 192.168.1.176

Available tools:
• nmap: Port scanning and service discovery
• masscan: Fast port scanning
• nikto: Web vulnerability scanner
• gobuster: Web directory brute forcing
• sqlmap: SQL injection testing
• shennina (MMT-Pentester): AI automated pentesting
• gan-fuzzer (MMT-Pentester): AI vulnerability fuzzing

Do you want to launch this pentest?'

IMPORTANT: Always propose to ACT rather than give theoretical advice.`
    };

    // Configuration LLM avec les paramètres du frontend
    const llmRequest: LLMRequest = {
      prompt: fullPrompt,
      systemPrompt: agentConfig.systemPrompt || '',
      temperature: agentConfig.temperature || 0.7,
      maxTokens: agentConfig.maxTokens || 2000,
      agentType: 'PlanningAgent' as AgentType,
      context: {
        userId,
        aiSettings: {
          provider: aiSettings?.provider || 'ollama',
          model: aiSettings?.model || 'llama3.2:latest',
          baseUrl: aiSettings?.baseUrl || 'http://localhost:11434',
          apiKey: aiSettings?.apiKey || ''
        }
      }
    };

    const llmResponse = await llmService.sendRequest(llmRequest, agentConfig as IAgentConfig);

    // Sauvegarder dans l'historique du chat
    const chatKey = `${userId}:${req.body.sessionId || 'general'}`;
    const history = chatHistories.get(chatKey) || [];
    
    const newMessages = [
      {
        role: 'user',
        content: message,
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: llmResponse.content,
        timestamp: new Date(),
        model: llmResponse.model,
        provider: llmResponse.provider
      }
    ];

    history.push(...newMessages);
    chatHistories.set(chatKey, history);

    logger.info(`✅ Réponse LLM générée (${llmResponse.model}) - ${llmResponse.content.length} caractères`);

    res.json({
      success: true,
      response: llmResponse.content,
      model: llmResponse.model,
      provider: llmResponse.provider,
      timestamp: new Date(),
      sessionId: req.body.sessionId || null,
      usage: llmResponse.usage || null
    });

  } catch (error: any) {
    logger.error('❌ Erreur chat LLM:', error);
    
    // Fallback avec message d'erreur informatif
    const errorMessage = `❌ **Erreur de connexion LLM**

Je ne peux pas accéder au modèle IA en ce moment. Voici quelques vérifications :

🔧 **Vérifications techniques :**
- Vérifiez la configuration des clés API dans les paramètres
- Testez la connectivité réseau
- Consultez les logs du serveur

💡 **En attendant, je peux vous aider avec :**
- Exécution directe des outils de pentesting
- Consultation de la documentation
- Configuration des scénarios de test

**Erreur technique :** ${error.message}`;

    res.status(500).json({ 
      success: false,
      error: 'Erreur LLM',
      fallbackMessage: errorMessage,
      details: error.message
    });
  }
});

// Route pour démarrer une session de pentesting
router.post('/start-session', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { target, tools = [], sessionId } = req.body;
    
    if (!target) {
      res.status(400).json({ 
        success: false,
        error: 'Target is required' 
      });
      return;
    }

    // Valider la cible
    if (!isValidTargetWithWhitelist(target, req.body.whitelistSettings)) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid or potentially dangerous target' 
      });
      return;
    }

    const newSessionId = sessionId || `pentest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: PentestSession = {
      id: newSessionId,
      target,
      status: 'analyzing',
      mode: 'semi-auto',
      initialPrompt: `Automatic pentest of ${target}`,
      tools: tools.map((tool: any) => ({
        toolName: tool.name,
        enabled: true,
        parameters: tool.parameters || {}
      })),
      executionSteps: [],
      startedAt: new Date(),
      results: {},
      metadata: {
        userId: req.user?.id
      }
    };

    pentestSessions.set(newSessionId, session);

    logger.info(`New pentest session started: ${newSessionId} for target ${target} by user ${req.user?.username || req.user?.id}`);

    res.json({
      success: true,
      session: {
        id: newSessionId,
        target,
        status: session.status,
        mode: session.mode,
        toolsCount: session.tools.length
      }
    });

  } catch (error: any) {
    logger.error('Error starting pentest session:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour exécuter un outil spécifique
router.post('/execute-tool', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tool, target, sessionId, parameters = {}, whitelistSettings } = req.body;

    if (!tool || !target) {
      res.status(400).json({ 
        success: false,
        error: 'Tool and target are required' 
      });
      return;
    }

    const session = pentestSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ 
        success: false,
        error: 'Session not found' 
      });
      return;
    }

    // Vérifier que l'utilisateur est propriétaire de la session
    if (session.metadata && session.metadata.userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access to this session'
      });
      return;
    }

    // Valider la cible avec whitelist
    if (!isValidTargetWithWhitelist(target, whitelistSettings)) {
      res.status(400).json({ 
        success: false,
        error: 'Target not allowed by whitelist configuration' 
      });
      return;
    }

    logger.info(`Executing ${tool} on ${target} by user ${req.user?.username || req.user?.id}`);

    const startTime = Date.now();
    
    // Appel direct aux fonctions d'exécution
    let result: any;
    
    try {
      // Importer les fonctions d'exécution depuis pentestRoutes
      const pentestModule = await import('./pentestRoutes');
      
      switch (tool.toLowerCase()) {
        case 'nmap':
          result = await pentestModule.executeRealNmap(target, parameters);
          break;
        case 'masscan':
          result = await pentestModule.executeRealMasscan(target, parameters);
          break;
        case 'nikto':
          result = await pentestModule.executeRealNikto(target, parameters);
          break;
        case 'gobuster':
          result = await pentestModule.executeRealGobuster(target, parameters);
          break;
        case 'sqlmap':
          result = await pentestModule.executeRealSqlmap(target, parameters);
          break;
        case 'shennina':
          result = await pentestModule.executeRealShennina(target, parameters);
          break;
        case 'gan-fuzzer':
          result = await pentestModule.executeRealGanFuzzer(target, parameters);
          break;
          res.status(400).json({
            success: false,
            error: `Tool ${tool} not supported`,
            supportedTools: ['nmap', 'masscan', 'nikto', 'gobuster', 'sqlmap', 'shennina', 'gan-fuzzer', 'mmt-attacker']
          });
          return;
      }
    } catch (importError) {
      logger.error('Error importing pentest functions:', importError);
      throw new Error(`Error executing ${tool}: functions not available`);
    }
    
    const duration = Date.now() - startTime;

    // Mettre à jour la session avec les résultats
    if (!session.results) {
      session.results = {};
    }
    
    session.results[tool] = {
      command: result.command,
      output: result.output,
      summary: result.summary,
      executedAt: new Date(),
      duration
    };

    // Ajouter l'étape d'exécution
    const executionStep: ExecutionStep = {
      id: `${tool}-${Date.now()}`,
      tool: tool,
      description: `Exécution de ${tool} sur ${target}`,
      status: 'completed',
      command: result.command,
      output: result.output,
      duration: duration,
      error: result.error || null
    };

    if (!session.executionSteps) {
      session.executionSteps = [];
    }
    session.executionSteps.push(executionStep);

    pentestSessions.set(sessionId, session);

    // Vérifier si c'est le dernier outil de la session
    const allToolsExecuted = session.tools.every(t => session.results[t.toolName.toLowerCase()]);
    
    // Si tous les outils sont exécutés, générer automatiquement le rapport
    if (allToolsExecuted) {
      logger.info(`All tools executed for session ${sessionId}, generating automatic report...`);
      
      try {
        // Générer le rapport automatiquement
        const report = await generateIntelligentReport(session, req.body.aiSettings);
        
        // Mettre à jour la session avec le rapport
        session.finalReport = report;
        session.status = 'completed';
        session.completedAt = new Date();
        
        pentestSessions.set(sessionId, session);
        
        logger.info(`Automatic report generated for session ${sessionId}`);
      } catch (reportError) {
        logger.error('Error generating automatic report:', reportError);
        // Continuer même si le rapport échoue
      }
    }

    res.json({ 
      success: true,
      tool,
      target,
      command: result.command,
      output: result.output,
      summary: result.summary,
      duration,
      timestamp: new Date(),
      sessionId,
      allToolsExecuted,
      reportGenerated: allToolsExecuted
    });

  } catch (error: any) {
    logger.error(`Error executing ${req.body.tool}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Routes pour la gestion des sessions
router.get('/session/:sessionId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = pentestSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    res.json({
      session: {
        id: session.id,
        target: session.target,
        status: session.status,
        mode: session.mode,
        tools: session.tools,
        executionSteps: session.executionSteps,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        results: session.results
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour générer un rapport PDF
router.post('/session/:sessionId/report', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = pentestSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    // Vérifier que l'utilisateur est propriétaire de la session
    if (session.metadata && session.metadata.userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access to this session'
      });
      return;
    }

    // Analyser les résultats des outils pour générer un rapport intelligent
    const toolResults = session.results || {};
    const completedSteps = session.executionSteps?.filter(step => step.status === 'completed') || [];
    
    // Construire le prompt pour l'IA
    const analysisPrompt = `Tu es un expert en cybersécurité qui analyse les résultats de tests de pénétration.

OBJECTIF: Analyser les résultats des outils de pentest et générer un rapport professionnel avec des recommandations précises.

DONNÉES D'ANALYSE:
Cible: ${session.target}
Outils exécutés: ${completedSteps.map(step => step.tool).join(', ')}
Durée totale: ${(session.metadata as any)?.totalExecutionTime ? Math.round((session.metadata as any).totalExecutionTime / 1000) : 0}s

RÉSULTATS DES OUTILS:
${completedSteps.map(step => `
${step.tool.toUpperCase()}:
- Statut: ${step.status}
- Durée: ${step.duration ? Math.round(step.duration / 1000) : 0}s
- Sortie: ${step.output ? step.output.substring(0, 500) + '...' : 'Aucune sortie'}
- Erreur: ${step.error || 'Aucune'}
`).join('\n')}

RÉSULTATS DÉTAILLÉS:
${JSON.stringify(toolResults, null, 2)}

Génère un rapport de sécurité professionnel au format JSON avec cette structure:

{
  "executiveSummary": "Résumé exécutif en 2-3 phrases",
  "attackNarrative": "Narration détaillée de ce qui s'est passé",
  "methodologyUsed": ["Liste des méthodes et outils utilisés"],
  "findings": [
    {
      "id": "finding-1",
      "vulnerability": "Nom précis de la vulnérabilité",
      "severity": "critical|high|medium|low",
      "service": "Service affecté (ex: HTTP, SSH, MySQL)",
      "port": 80,
      "description": "Description technique détaillée",
      "impact": "Impact business concret",
      "evidence": ["Preuves spécifiques trouvées"],
      "fix": "Correction précise avec commandes/configurations"
    }
  ],
  "statistiques": {
    "totalPortsScanned": 0,
    "openPorts": 0,
    "vulnerabilitiesFound": 0,
    "criticalFindings": 0,
    "highFindings": 0,
    "mediumFindings": 0,
    "lowFindings": 0
  },
  "remediationPlan": [
    {
      "priority": 1,
      "vulnerability": "Nom de la vulnérabilité",
      "fix": "Instructions détaillées avec commandes spécifiques",
      "estimatedEffort": "Temps estimé (ex: 1-2 heures)",
      "businessImpact": "Impact sur le business"
    }
  ],
  "recommendations": [
    "Recommandation spécifique et actionnable"
  ],
  "riskScore": 85,
  "nextSteps": [
    "Prochaine étape recommandée"
  ]
}

INSTRUCTIONS:
- Analyse les sorties des outils pour identifier les vulnérabilités réelles
- Fournis des recommandations spécifiques et actionnables
- Priorise par criticité (1 = le plus critique)
- Inclus des commandes/configurations précises
- Considère l'impact business
- Sois technique mais compréhensible`;

    // Appeler l'IA pour générer le rapport
    const aiSettings = req.body.aiSettings || {
      provider: 'ollama',
      model: 'llama3.2:latest',
      baseUrl: 'http://localhost:11434',
      apiKey: ''
    };

    const llmRequest = {
      prompt: analysisPrompt,
      systemPrompt: 'Tu es un expert en cybersécurité qui rédige des rapports professionnels de tests de pénétration. Analyse les données fournies et génère un rapport structuré avec des recommandations précises et actionnables.',
      agentType: 'ReportAgent' as any, // Type assertion pour compatibilité
      temperature: 0.3,
      maxTokens: 4000,
      context: { aiSettings } // Passer aiSettings dans le contexte
    };

    // Appeler directement le service LLM avec les paramètres Ollama
    const llmResponse = await llmService.sendOllamaRequestDirect(llmRequest, { 
      model: aiSettings.model, 
      baseUrl: aiSettings.baseUrl 
    });
    
    let report;
    try {
      report = JSON.parse(llmResponse.content);
    } catch (error) {
      // Fallback si le parsing JSON échoue
      report = {
        executiveSummary: `Analyse de sécurité terminée sur ${session.target}`,
        attackNarrative: "Les outils de pentest ont été exécutés avec succès",
        methodologyUsed: completedSteps.map(step => step.tool),
        findings: [],
        statistiques: {
          totalPortsScanned: 0,
          openPorts: 0,
          vulnerabilitiesFound: 0,
          criticalFindings: 0,
          highFindings: 0,
          mediumFindings: 0,
          lowFindings: 0
        },
        remediationPlan: [],
        recommendations: ["Effectuer des tests de sécurité réguliers"],
        riskScore: 50,
        nextSteps: ["Analyser les résultats en détail"]
      };
    }

    // Enrichir avec les métadonnées de session
    const finalReport = {
      sessionId: session.id,
      target: session.target,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      tools: completedSteps.map(step => step.tool),
      results: toolResults,
      ...report
    };

    // Générer le PDF automatiquement
    try {
      const pdfPath = await pdfService.generateSecurityReportPDF(finalReport as SecurityReport);
      
      res.json({
        success: true,
        report: finalReport,
        pdfPath: pdfPath,
        pdfFilename: path.basename(pdfPath)
      });
    } catch (pdfError) {
      logger.error('Error generating PDF:', pdfError);
      
      // Retourner le rapport même si le PDF échoue
      res.json({
        success: true,
        report: finalReport,
        pdfError: 'Erreur lors de la génération du PDF'
      });
    }

  } catch (error: any) {
    logger.error('Error generating report:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour exporter les données de session
router.get('/session/:sessionId/export', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = pentestSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    // Vérifier que l'utilisateur est propriétaire de la session
    if (session.metadata && session.metadata.userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access to this session'
      });
      return;
    }

    // Préparer les données d'export
    const exportData = {
      session: {
        id: session.id,
        target: session.target,
        status: session.status,
        mode: session.mode,
        tools: session.tools,
        executionSteps: session.executionSteps,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        results: session.results
      },
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        format: 'json'
      }
    };

    // Définir les headers pour le téléchargement
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="pentest-session-${sessionId}.json"`);
    
    res.json(exportData);

  } catch (error: any) {
    logger.error('Error exporting session:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour obtenir l'historique du chat
router.get('/session/:sessionId/chat-history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'anonymous';
    const chatKey = `${userId}:${sessionId}`;
    
    let history = chatHistories.get(chatKey) || [];
    
    // Check if this is a conversation ID that has an associated pentest session
    const pentestSessionId = conversationToPentestMap.get(chatKey);
    if (pentestSessionId) {
      const pentestSession = pentestSessions.get(pentestSessionId);
      if (pentestSession) {
        // Add pentest session info to the response
        res.json({
          success: true,
          history,
          sessionId,
          pentestSessionId,
          pentestSession: {
            id: pentestSession.id,
            target: pentestSession.target,
            status: pentestSession.status,
            tools: pentestSession.tools,
            executionSteps: pentestSession.executionSteps,
            results: pentestSession.results,
            finalReport: pentestSession.finalReport,
            startedAt: pentestSession.startedAt,
            completedAt: pentestSession.completedAt
          }
        });
        return;
      }
    }
    
    res.json({
      success: true,
      history,
      sessionId
    });

  } catch (error: any) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour obtenir les informations d'une session de pentest
router.get('/pentest-session/:sessionId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = pentestSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({ 
        success: false,
        error: 'Pentest session not found' 
      });
      return;
    }

    // Vérifier que l'utilisateur est propriétaire de la session
    if (session.metadata && session.metadata.userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access to this session'
      });
      return;
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        target: session.target,
        status: session.status,
        mode: session.mode,
        tools: session.tools,
        executionSteps: session.executionSteps,
        results: session.results,
        finalReport: session.finalReport,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        metadata: session.metadata
      }
    });

  } catch (error: any) {
    logger.error('Error fetching pentest session:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour obtenir toutes les sessions de pentest de l'utilisateur
router.get('/pentest-sessions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userSessions: any[] = [];
    
    for (const [, session] of pentestSessions.entries()) {
      if (session.metadata?.userId === userId) {
        userSessions.push({
          id: session.id,
          target: session.target,
          status: session.status,
          mode: session.mode,
          toolsCount: session.tools.length,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          hasReport: !!session.finalReport
        });
      }
    }

    res.json({
      success: true,
      sessions: userSessions
    });

  } catch (error: any) {
    logger.error('Error fetching pentest sessions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour sauvegarder l'historique du chat
router.post('/session/:sessionId/chat-history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { messages } = req.body;
    const userId = req.user?.id || 'anonymous';
    const chatKey = `${userId}:${sessionId}`;
    
    if (Array.isArray(messages)) {
      chatHistories.set(chatKey, messages);
    }
    
    res.json({
      success: true,
      message: 'Chat history saved'
    });

  } catch (error: any) {
    logger.error('Error saving chat history:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour supprimer l'historique du chat
router.delete('/session/:sessionId/chat-history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || 'anonymous';
    const chatKey = `${userId}:${sessionId}`;
    
    // Supprimer l'historique du chat
    chatHistories.delete(chatKey);
    
    logger.info(`🗑️ Chat history deleted for session ${sessionId} (user: ${userId})`);
    
    res.json({
      success: true,
      message: 'Chat history deleted successfully'
    });

  } catch (error: any) {
    logger.error('Error deleting chat history:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route pour télécharger le PDF du rapport
router.get('/session/:sessionId/pdf', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = pentestSessions.get(sessionId);
    
    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    // Vérifier que l'utilisateur est propriétaire de la session
    if (session.metadata && session.metadata.userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access to this session'
      });
      return;
    }

    // Chercher le PDF dans le dossier reports
    const reportsDir = path.join(__dirname, '../../reports');
    const pdfFiles = fs.readdirSync(reportsDir).filter(file => 
      file.includes(session.target.replace(/[^a-zA-Z0-9]/g, '')) && file.endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      res.status(404).json({ error: 'PDF non trouvé pour cette session' });
      return;
    }

    const pdfPath = path.join(reportsDir, pdfFiles[0]);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(pdfPath)) {
      res.status(404).json({ error: 'Fichier PDF introuvable' });
      return;
    }

    // Envoyer le fichier PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFiles[0]}"`);
    res.sendFile(pdfPath);

  } catch (error: any) {
    logger.error('Error downloading PDF:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router; 